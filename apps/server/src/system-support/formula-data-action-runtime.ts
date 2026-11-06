import type {SqlPersistence} from '../system-files/sql-persistence.js';
import type {RecordEngine} from '../system-files/record-engine.js';
import {parseRecordFilters,parseRecordCursor} from '../object-engine/QueryBuilder.js';
import {executeActionPlan,splitServerDataActionPlan} from '../expression-engine/ActionFormulas.js';
import {evaluateFlowFormulaNode} from '../system-files/flow-formula-runtime.js';
import type {Expression} from '../expression-engine/FormulaParser.js';

type Actor={tenant_id:string;user_id:string};
type Records=Pick<RecordEngine,'list'|'get'|'create'|'update'|'remove'>;
type Sql=Pick<SqlPersistence,'transaction'|'query'>;
const name=/^[A-Za-z][A-Za-z0-9_]{0,79}$/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function tenantServerFormulaEnabled(db:Pick<SqlPersistence,'query'>,tenant:string){
 const {rows}=await db.query<{enabled:boolean}>(`
  SELECT COALESCE(properties->>'formulaServerExecutionEnabled','false')='true' AS enabled
  FROM md_tenant_settings WHERE tenant_id=$1 AND setting_key='automation-settings'`,[tenant]);
 return rows[0]?.enabled===true;
}

const own=(value:unknown,key:string):unknown=>
 value&&typeof value==='object'&&!Array.isArray(value)&&Object.hasOwn(value,key)
  ?(value as Record<string,unknown>)[key]:undefined;

function evaluateDataNode(node:Expression,scope:Record<string,unknown>,
 _aliases?:readonly string[],state?:Readonly<Record<string,unknown>>):unknown{
 const resolve=(path:string):unknown=>{
  if(path==='$session')return scope.sessionId??'';
  if(path==='$session.id')return scope.sessionId??'';
  if(path.startsWith('$state.')){
   const key=path.slice(7);
   return own(state,key)??own(scope.state,key);
  }
  if(path.startsWith('$component.')||path.startsWith('$flow.'))
   throw Error('Browser-only Formula reference');
  let current:unknown=scope;
  for(const part of path.split('.')){
   if(!name.test(part)||['constructor','prototype','__proto__'].includes(part))
    throw Error('Invalid Formula reference');
   current=own(current,part);
  }
  return current;
 };
 return evaluateFlowFormulaNode(node,resolve,{timeZone:'UTC'});
}

function parseRecordOperation(path:string,init?:{method:string;body?:string}){
 const url=new URL(path,'http://formula.internal.invalid');
 const parts=url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
 if(parts.length<2||parts.length>3||parts[0]!=='records'||!name.test(parts[1])||
   parts.length===3&&!uuid.test(parts[2]))
  throw Error('Unsupported Formula data route');
 const method=init?.method??'GET';
 if(!['GET','POST','PUT','DELETE'].includes(method))throw Error('Unsupported Formula data method');
 const body=init?.body===undefined?{}:JSON.parse(init.body) as unknown;
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid record values');
 return {url,object:parts[1],id:parts[2],method,body:body as Record<string,unknown>};
}

/** Run only a vetted contiguous data prefix. One SQL transaction, one browser
 * request, and nested savepoints per Record API operation. On a failed action,
 * preserve existing confirmed-action semantics by committing earlier successful
 * writes, then surface the original error to the browser.
 */
export async function executeServerDataAction(
 db:Sql,records:Records,actor:Actor,formula:string,scope:Record<string,unknown>,dataSteps:number
):Promise<{supported:true;error?:string;changes?:Array<{key:string;value:unknown}>;
 recordChanged?:boolean;mutatedObjectApiNames?:string[];variables?:Record<string,unknown>;
 completedActionCount?:number;recordChanges?:Array<{objectApiName:string;operation:'create'|'update'|'delete';record:Record<string,unknown>}>}>{
 const split=splitServerDataActionPlan(formula);
 if(!split||dataSteps!==split.dataSteps)
  throw Error('Invalid Formula data segment');
 // An explicit serial queue protects nested PostgreSQL savepoints when the
 // shared interpreter later parallelizes independent read-only functions.
 let pending:Promise<unknown>=Promise.resolve();
 const request=<T>(path:string,init?:{method:string;body?:string}):Promise<T>=>{
  const operation=pending.then(()=>db.transaction(async()=>{
   const {url,object,id,method,body}=parseRecordOperation(path,init);
   const tenant=actor.tenant_id,user=actor.user_id;
   if(method==='GET'){
    if(id)return {record:await records.get(tenant,user,object,id)};
    const limit=Number(url.searchParams.get('limit')??1);
    if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Invalid record limit');
    const cursor=parseRecordCursor(url.searchParams.get('cursor')??undefined);
    return records.list(tenant,user,object,limit,0,{
     filters:parseRecordFilters(url.searchParams.get('filters')??undefined),cursor
    });
   }
   if(method==='POST'&&!id){
    const savedId=await records.create(tenant,user,object,body);
    let record:Record<string,unknown>={Id:savedId};
    try{record=await db.transaction(()=>records.get(tenant,user,object,savedId));}
    catch{/* A write-only actor must retain the existing Id-only response. */}
    return {record};
   }
   if(method==='PUT'&&id){
    await records.update(tenant,user,object,id,body);
    let record:Record<string,unknown>={Id:id};
    try{record=await db.transaction(()=>records.get(tenant,user,object,id));}
    catch{/* Preserve successful write even if read access is absent. */}
    return {record};
   }
   if(method==='DELETE'&&id){
    await records.remove(tenant,user,object,id);
    return {record:{Id:id}};
   }
   throw Error('Unsupported Formula data action');
  }));
  pending=operation.then(()=>undefined,()=>undefined);
  return operation as Promise<T>;
 };
 // A caught interpreter failure must not cause the outer transaction to roll
 // back its already confirmed actions. Each failing API operation uses a
 // savepoint; no external side effects or browser operations run in this scope.
 return db.transaction(async()=>{
  try{
   const result=await executeActionPlan(formula,scope,evaluateDataNode,{
    request,planWindow:{start:0,end:dataSteps,includeVariables:true}
   });
   return {supported:true,...result};
  }catch(error){
   return {supported:true,error:error instanceof Error?error.message:'Formula data action failed'};
  }
 });
}