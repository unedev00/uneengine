import {Parser,formulaTruth,type Expression} from './FormulaParser.js';
import {tokenize} from './FormulaTokenizer.js';
import {validateFormulaFunctions} from './FormulaFunctionRegistry.js';
import {actionFormulaFunctions} from './FormulaCategories.js';

const recordIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const identifier=/^[A-Za-z][A-Za-z0-9_]{0,79}$/;
function nameOf(node:Expression|undefined,label:string):string {
 const name=node?.kind==='reference'||node?.kind==='literal'?node.value:null;
 if(typeof name!=='string'||!identifier.test(name))throw Error('Invalid '+label);
 return name;
}

const fieldPath=/^[A-Za-z][A-Za-z0-9_]{0,79}(?:\.[A-Za-z][A-Za-z0-9_]{0,79})?$/;
/** Field/value criteria for GETRECORD and COUNTIFS: Field or one-level Lookup.Field paths. */
function recordCriteria(args:readonly Expression[],label:string):Map<string,Expression>{
 if(!args.length||args.length%2||args.length>40)throw Error(label+' requires field and value pairs');
 const criteria=new Map<string,Expression>();
 for(let i=0;i<args.length;i+=2){
  const node=args[i];
  const field=node?.kind==='reference'||node?.kind==='literal'?node.value:null;
  if(typeof field!=='string'||!fieldPath.test(field))throw Error('Invalid '+label+' field '+String(field));
  if(criteria.has(field))throw Error('Duplicate field '+field);
  validateFormulaFunctions(args[i+1],'ribbon_binding');
  criteria.set(field,args[i+1]);
 }
 return criteria;
}
/** Record API equality filters: blank values match blank fields; booleans and numbers as text. */
function criteriaFilters(criteria:Map<string,Expression>,evaluate:(node:Expression)=>unknown){
 return [...criteria].map(([field,node])=>{
  const value=evaluate(node);
  if(value===''||value===null||value===undefined)return {field,operator:'isBlank',value:''};
  if(!['string','number','boolean'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value))
   throw Error('Criteria for '+field+' must be a scalar value');
  return {field,operator:'eq',value:String(value)};
 });
}
const recordQueryPath=(object:string,filters:unknown[],limit=1,cursor?:string)=>
 '/records/'+encodeURIComponent(object)+'?limit='+limit+'&filters='+encodeURIComponent(JSON.stringify(filters))
  +(cursor?'&cursor='+encodeURIComponent(cursor):'');
/** Record aggregates resolved through the Record API (RBAC and field security apply). */
export const recordAggregateFunctions:ReadonlySet<string>=new Set(['COUNTIFS','SUMIFS','AVERAGEIFS','MINIFS','MAXIFS']);
/** Functions that need a server round-trip before the synchronous evaluator runs. */
export const serverFormulaFunctions:ReadonlySet<string>=new Set([...recordAggregateFunctions,'VERIFYPIN']);
const maxAggregateRecords=5000,maxLoopIterations=500;
/** True when an expression uses a server-resolved function (aggregates, VERIFYPIN). */
export function usesRecordCount(node:Expression|undefined):boolean{
 if(!node)return false;
 if(node.kind==='call')return serverFormulaFunctions.has(node.name)||node.args.some(usesRecordCount);
 if(node.kind==='binary')return usesRecordCount(node.left)||usesRecordCount(node.right);
 if(node.kind==='unary')return usesRecordCount(node.value);
 return false;
}
async function listMatching(request:ActionServices['request'],object:string,filters:unknown[],max:number,label:string){
 const rows:Record<string,unknown>[]=[];
 let cursor:string|undefined;
 for(;;){
  const page=await request<{records?:Record<string,unknown>[];total?:number;nextCursor?:string}>(
   recordQueryPath(object,filters,100,cursor));
  const records=Array.isArray(page.records)?page.records:[];
  if(typeof page.total==='number'&&page.total>max)throw Error(label+' matches more than '+max+' records; narrow the criteria');
  rows.push(...records);
  if(rows.length>max)throw Error(label+' matches more than '+max+' records; narrow the criteria');
  if(records.length<100||!page.nextCursor||typeof page.total==='number'&&rows.length>=page.total)return rows;
  cursor=page.nextCursor;
 }
}
const aggregateNumber=(value:unknown):number|null=>{
 if(typeof value==='number')return Number.isFinite(value)?value:null;
 if(typeof value==='string'&&value.trim()!==''){const n=Number(value);return Number.isFinite(n)?n:null;}
 return null;
};

/** Translate authoring syntax in the parsed tree so quoted text is preserved. */
export function normalizeFlowCalls(node:Expression):Expression {
 if(node.kind==='call'){
  if(node.name==='FLOW'){
   if(node.args.length!==1)throw Error('FLOW requires one Flow API name');
   return {kind:'reference',value:'$flow.'+nameOf(node.args[0],'Flow API name')};
  }
  return {...node,args:node.args.map(normalizeFlowCalls)};
 }
 if(node.kind==='binary')return {...node,left:normalizeFlowCalls(node.left),right:normalizeFlowCalls(node.right)};
 if(node.kind==='unary')return {...node,value:normalizeFlowCalls(node.value)};
 return node;
}

export const actionFunctionNames:readonly string[]=[...actionFormulaFunctions].filter(name=>name!=='AS');
export const isActionPlan=(source:string):boolean=>{
 if(/^\s*=?\s*(?:ACTIONS|CREATERECORD|UPDATERECORD|DELETERECORD|GETRECORD|STATE|FOREACH|CLOSESCREEN|PRINT|CREATEPDF|WAIT|EMAIL|WHATSAPP|SMS)\s*\(/i.test(source))return true;
 if(!/^\s*=?\s*IF\s*\(/i.test(source))return false;
 try{
  const root=new Parser(tokenize(source)).parse();
  const hasAction=(node:Expression):boolean=>node.kind==='call'?
   actionFunctionNames.includes(node.name)||node.args.some(hasAction):
   node.kind==='binary'?hasAction(node.left)||hasAction(node.right):
   node.kind==='unary'?hasAction(node.value):false;
  return hasAction(root);
 }catch{return false;}
};
export type ActionStep={
 name:string;object:string;id?:Expression;values?:Expression[];fields:Map<string,Expression>;alias?:string;
 guards?:readonly {condition:Expression;expected:boolean}[];
 /** FOREACH: the loop body, and a TABLE()/COLLECTION() source instead of record criteria. */
 body?:ActionStep[];source?:Expression
};
const reservedAliases=['state','event','session','constructor','prototype'];

export function compileActionPlan(source:string):ActionStep[] {
 const aliases=new Set<string>();
 const takeAlias=(node:Expression|undefined,label:string)=>{
  if(node?.kind!=='call'||node.name!=='AS'||node.args.length!==1)throw Error(label);
  const alias=nameOf(node.args[0],'result variable');
  if(reservedAliases.includes(alias))throw Error('Reserved result variable '+alias);
  if(aliases.has(alias))throw Error('Duplicate result variable '+alias);
  aliases.add(alias);
  return alias;
 };
 function add(steps:ActionStep[],node:Expression,guards:ActionStep['guards'],loop:boolean){
  if(node.kind==='literal'&&(node.value===''||node.value===null))return;
  if(node.kind==='call'&&node.name==='IF'){
   if(node.args.length!==3)throw Error('IF requires condition, true action and false action');
   validateFormulaFunctions(node.args[0],'ribbon_binding');
   add(steps,node.args[1],[...(guards??[]),{condition:node.args[0],expected:true}],loop);
   add(steps,node.args[2],[...(guards??[]),{condition:node.args[0],expected:false}],loop);
   return;
  }
  if(node.kind!=='call'||!actionFunctionNames.includes(node.name))throw Error('Expected an action formula');
  const args=[...node.args];
  if(node.name==='ACTIONS'){
   if(!args.length)throw Error('ACTIONS requires at least one action');
   args.forEach(arg=>add(steps,arg,guards,loop));
   return;
  }
  if(node.name==='CLOSESCREEN'){
   if(args.length)throw Error('CLOSESCREEN takes no arguments');
   steps.push({name:'CLOSESCREEN',object:'',fields:new Map(),guards});
   return;
  }
  if(node.name==='WAIT'){
   if(loop)throw Error('WAIT cannot run inside FOREACH');
   if(args.length!==2)throw Error('WAIT requires minutes and seconds');
   args.forEach(arg=>validateFormulaFunctions(arg,'ribbon_binding'));
   steps.push({name:'WAIT',object:'',values:args,fields:new Map(),guards});
   return;
  }
  if(node.name==='STATE'){
   if(args.length!==2)throw Error('STATE requires a Page State key and a value');
   const key=nameOf(args[0],'Page State key');
   if(key.length>63)throw Error('Invalid Page State key');
   validateFormulaFunctions(args[1],'ribbon_binding');
   steps.push({name:'STATE',object:key,values:[args[1]],fields:new Map(),guards});
   return;
  }
  if(node.name==='FOREACH'){
   // FOREACH(Object, Field, Value..., AS(item), Action) or FOREACH(TABLE(...), AS(item), Action)
   if(loop)throw Error('FOREACH cannot be nested');
   const body=args.pop();
   if(!body)throw Error('FOREACH requires an action');
   const alias=takeAlias(args.pop(),'FOREACH requires AS(item) before the action');
   const first=args[0];
   const bodySteps:ActionStep[]=[];
   let step:ActionStep;
   if(first?.kind==='call'){
    if(args.length!==1)throw Error('FOREACH over a collection takes the collection, AS(item) and an action');
    validateFormulaFunctions(first,'ribbon_binding');
    step={name:'FOREACH',object:'',source:first,fields:new Map(),alias,guards,body:bodySteps};
   }else{
    const object=nameOf(args.shift(),'FOREACH object API name');
    step={name:'FOREACH',object,fields:args.length?recordCriteria(args,'FOREACH'):new Map(),alias,guards,body:bodySteps};
   }
   add(bodySteps,body,[],true);
   if(!bodySteps.length)throw Error('FOREACH requires an action');
   steps.push(step);
   return;
  }
  const object=nameOf(args.shift(),'object API name');
  if(node.name==='GETRECORD'){
   const alias=takeAlias(args.at(-1),'GETRECORD requires AS(variable) for the found record');
   args.pop();
   steps.push({name:'GETRECORD',object,fields:recordCriteria(args,'GETRECORD'),alias,guards});
   return;
  }
  if(['EMAIL','WHATSAPP','SMS','FLOW','SCREEN'].includes(node.name)){
   const bounds:Record<string,[number,number]>={EMAIL:[3,23],WHATSAPP:[2,22],SMS:[2,2],FLOW:[0,0],SCREEN:[0,1]};
   const [min,max]=bounds[node.name];
   if(args.length<min||args.length>max)throw Error('Invalid '+node.name+' arguments');
   args.forEach(arg=>validateFormulaFunctions(arg,'ribbon_binding'));
   if(node.name==='SCREEN'&&args.length)nameOf(args[0],'screen mode');
   steps.push({name:node.name,object,values:args,fields:new Map(),guards});
   return;
  }
  const id=node.name==='CREATERECORD'?undefined:args.shift();
  if(node.name!=='CREATERECORD'&&!id)throw Error('Record ID is required');
  if(id)validateFormulaFunctions(id,'ribbon_binding');
  const last=args.at(-1);
  let alias:string|undefined;
  if(last?.kind==='call'&&last.name==='AS'){
   if(last.args.length!==1)throw Error('AS requires one variable');
   alias=takeAlias(last,'AS requires one variable');
   args.pop();
  }
  if(['PRINT','CREATEPDF','DELETERECORD'].includes(node.name)&&args.length)
   throw Error('Unexpected extra arguments for '+node.name);
  if(node.name==='PRINT'&&alias)throw Error('PRINT does not capture a result; use CREATEPDF');
  if(!['PRINT','CREATEPDF','DELETERECORD'].includes(node.name)
     &&(args.length%2||(!args.length&&node.name==='UPDATERECORD')))
    throw Error('Expected field and value pairs');
  const fields=new Map<string,Expression>();
  for(let i=0;i<args.length;i+=2){
   const field=nameOf(args[i],'field API name');
   if(fields.has(field))throw Error('Duplicate field '+field);
   validateFormulaFunctions(args[i+1],'ribbon_binding');
   fields.set(field,args[i+1]);
  }
  steps.push({name:node.name,object,id,fields,alias,guards});
 }
 const steps:ActionStep[]=[];
 add(steps,new Parser(tokenize(source)).parse(),[],false);
 return steps;
}

export const isScreenAction=(source:string)=>/^\s*=?\s*SCREEN\s*\(/i.test(source);
export function parseScreenAction(source:string){
 const node=new Parser(tokenize(source)).parse();
 if(node.kind!=='call'||node.name!=='SCREEN'||node.args.length<1||node.args.length>2)
  throw Error('SCREEN requires a page API name and optional mode');
 const page=nameOf(node.args[0],'page API name');
 const mode=node.args[1]?nameOf(node.args[1],'window mode').toLowerCase():'current';
 if(!['current','popup','newwindow'].includes(mode))throw Error('Choose current, popup or newwindow');
 return {page,mode};
}

function readsResultField(node:Expression,alias:string):boolean{
 if(node.kind==='reference')return node.value.startsWith(alias+'.')&&node.value!==alias+'.Id';
 if(node.kind==='unary')return readsResultField(node.value,alias);
 if(node.kind==='binary')return readsResultField(node.left,alias)||readsResultField(node.right,alias);
 return node.kind==='call'&&node.args.some(arg=>readsResultField(arg,alias));
}
const stepNodes=(step:ActionStep):Expression[]=>[...(step.id?[step.id]:[]),...step.fields.values(),
 ...(step.values??[]),...(step.source?[step.source]:[])];

/** Value-only diagnostics: never include formula source, record values, URLs or errors. */
export type ActionPlanStepTiming={
 name:string;durationMs:number;requestCount:number;status:'completed'|'skipped'|'failed';
};
export type ActionPlanTiming={
 formulaName:string;durationMs:number;stepCount:number;executedStepCount:number;
 completedActionCount:number;requestCount:number;status:'completed'|'failed';
 steps:ActionPlanStepTiming[];
};
export type ActionServices={
 request:<T>(path:string,init?:{method:string;body?:string})=>Promise<T>;
 print?:(template:string,id:string)=>Promise<void>;
 createPdf?:(template:string,id:string)=>Promise<{FileId:string}>;
 runPageAction?:(name:string,target:string,mode?:string)=>Promise<unknown>;
 /** Optional opt-in observer. Its errors must never affect action execution. */
 onTiming?:(timing:ActionPlanTiming)=>void;
 /** Stable metadata identifier, not the authored formula text or a field value. */
 formulaName?:string;
};
type EvaluateValue=(node:Expression,scope:Record<string,unknown>,aliases?:readonly string[],
 state?:Readonly<Record<string,unknown>>)=>unknown;
export async function executeActionPlan(formula:string,record:Record<string,unknown>,
 evaluateValue:EvaluateValue,{request,print,createPdf,runPageAction,onTiming,formulaName}:ActionServices){
  const trace=typeof onTiming==='function';
  const started=trace?performance.now():0;
  const steps=compileActionPlan(formula);
  const countSteps=(list:readonly ActionStep[]):number=>list.reduce(
   (total,step)=>total+1+(step.body?countSteps(step.body):0),0);
  const stepCount=trace?countSteps(steps):0;
  const traceSteps:ActionPlanStepTiming[]=[];
  let requestCount=0;
  let activeStep:ActionPlanStepTiming|undefined;
  // Keep the original request function entirely unchanged when tracing is disabled.
  const tracedRequest:typeof request=trace
   ?<T>(path:string,init?:{method:string;body?:string}):Promise<T>=>{
     requestCount++;
     if(activeStep)activeStep.requestCount++;
     return request<T>(path,init);
    }
   :request;
  // STATE results apply to the page when the plan finishes and are visible to later steps.
  const stateChanges:Record<string,unknown>=Object.create(null);
  const changes:Array<{key:string;value:unknown}>=[];
  const pins=new Map<string,boolean>();
  let completed=0;
  let recordChanged=false;
  const mutatedObjectApiNames=new Set<string>();
  let iterations=0;

  /** Runs one list of steps. Each IF condition is decided once, when its first step runs,
   * so an action inside an IF branch cannot flip the condition for the next action. */
  async function run(list:ActionStep[],variables:Record<string,unknown>,top:boolean):Promise<boolean>{
   const decided=new Map<Expression,boolean>();
   for(const [index,step] of list.entries()){
    const previousStep=activeStep;
    const stepTiming:ActionPlanStepTiming|undefined=trace
     ?{name:step.name,durationMs:0,requestCount:0,status:'completed'}:undefined;
    const stepStarted=stepTiming?performance.now():0;
    if(stepTiming){traceSteps.push(stepTiming);activeStep=stepTiming;}
    try{
     const scope={...record,...variables};
     const evaluateNow=(node:Expression):unknown=>evaluateValue(node,scope,Object.keys(variables),stateChanges);
     // Server functions (record aggregates, VERIFYPIN) resolve before the synchronous
     // evaluator runs; their results are substituted as literals.
     const resolved=new Map<Expression,unknown>();
     const substitute=(node:Expression):Expression=>{
      if(resolved.has(node))return {kind:'literal',value:resolved.get(node) as never};
      if(node.kind==='call')return {...node,args:node.args.map(substitute)};
      if(node.kind==='binary')return {...node,left:substitute(node.left),right:substitute(node.right)};
      if(node.kind==='unary')return {...node,value:substitute(node.value)};
      return node;
     };
     const resolveServer=async(node:Expression|undefined):Promise<void>=>{
      if(!node)return;
      if(node.kind==='binary'){await resolveServer(node.left);await resolveServer(node.right);return;}
      if(node.kind==='unary'){await resolveServer(node.value);return;}
      if(node.kind!=='call')return;
      for(const arg of node.args)await resolveServer(arg);
      if(!serverFormulaFunctions.has(node.name)||resolved.has(node))return;
      if(node.name==='VERIFYPIN'){
       if(node.args.length<1||node.args.length>2)throw Error('VERIFYPIN requires a PIN, or a user ID and a PIN');
       const values=node.args.map(arg=>evaluateNow(substitute(arg)));
       const [userId,pin]=values.length===2?values:['',values[0]];
       const key=String(userId)+'\u0000'+String(pin);
       if(!pins.has(key)){
        const result=await tracedRequest<{valid?:boolean}>('/action-formulas/verify-pin',{method:'POST',
         body:JSON.stringify({userId:userId===''||userId==null?undefined:String(userId),pin:pin==null?'':String(pin)})});
        pins.set(key,result.valid===true);
       }
       resolved.set(node,pins.get(key));
       return;
      }
      const [objectNode,...rest]=node.args;
      const object=nameOf(objectNode,node.name+' object API name');
      if(node.name==='COUNTIFS'){
       const filters=criteriaFilters(recordCriteria(rest,'COUNTIFS'),value=>evaluateNow(substitute(value)));
       const result=await tracedRequest<{total?:number}>(recordQueryPath(object,filters));
       if(typeof result.total!=='number'||!Number.isFinite(result.total))throw Error('COUNTIFS count unavailable');
       resolved.set(node,result.total);
       return;
      }
      const field=nameOf(rest.shift(),node.name+' value field');
      const filters=rest.length?criteriaFilters(recordCriteria(rest,node.name),value=>evaluateNow(substitute(value))):[];
      const rows=await listMatching(tracedRequest,object,filters,maxAggregateRecords,node.name);
      const numbers=rows.map(row=>aggregateNumber(row[field])).filter((value):value is number=>value!==null);
      const total=numbers.reduce((sum,value)=>sum+value,0);
      resolved.set(node,!numbers.length?0:node.name==='SUMIFS'?Math.round(total*1e9)/1e9:
       node.name==='AVERAGEIFS'?total/numbers.length:node.name==='MINIFS'?Math.min(...numbers):Math.max(...numbers));
     };
     const evaluate=(node:Expression):unknown=>evaluateNow(substitute(node));
     let skip=false;
     for(const guard of step.guards??[]){
      if(!decided.has(guard.condition)){
       await resolveServer(guard.condition);
       decided.set(guard.condition,formulaTruth(evaluate(guard.condition)));
      }
      if(decided.get(guard.condition)!==guard.expected){skip=true;break;}
     }
     if(skip){if(stepTiming)stepTiming.status='skipped';continue;}
     for(const node of stepNodes(step))await resolveServer(node);
     if(step.name==='STATE'){
      const value=evaluate(step.values![0]);
      if(!['string','number','boolean'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value))
       throw Error('STATE value must be text, a finite number or TRUE/FALSE');
      stateChanges[step.object]=value;
      changes.push({key:step.object,value});
      completed++;
      continue;
     }
     if(step.name==='GETRECORD'){
      const filters=criteriaFilters(step.fields,evaluate);
      const result=await tracedRequest<{records?:Record<string,unknown>[]}>(recordQueryPath(step.object,filters));
      // No match leaves an empty result so ISBLANK(alias.Id) selects the create branch.
      variables[step.alias!]=result.records?.[0]??{};
      completed++;
      continue;
     }
     if(step.name==='FOREACH'){
      let items:Record<string,unknown>[];
      if(step.source){
       const collection=evaluate(step.source) as {items?:unknown}|unknown[]|null;
       const list=Array.isArray(collection)?collection:collection&&typeof collection==='object'
        &&Array.isArray((collection as {items?:unknown}).items)?(collection as {items:unknown[]}).items:null;
       if(!list)throw Error('FOREACH requires a TABLE() or COLLECTION() source');
       items=list.map(item=>item&&typeof item==='object'&&!Array.isArray(item)
        ?item as Record<string,unknown>:{Id:item,Value:item});
      }else items=await listMatching(tracedRequest,step.object,criteriaFilters(step.fields,evaluate),maxLoopIterations,'FOREACH');
      if(items.length>maxLoopIterations)throw Error('FOREACH is limited to '+maxLoopIterations+' items');
      // Snapshot first, then act: deleting or updating rows cannot change the items visited.
      for(const item of items){
       if(++iterations>maxLoopIterations)throw Error('FOREACH is limited to '+maxLoopIterations+' iterations');
       const inner:Record<string,unknown>=Object.assign(Object.create(null),variables,{[step.alias!]:item});
       await run(step.body!,inner,false);
      }
      completed++;
      continue;
     }
     if(step.name==='CLOSESCREEN'){
      if(!runPageAction)throw Error('Page runtime unavailable');
      await runPageAction('CLOSESCREEN','');
      completed++;
      continue;
     }
     if(step.name==='WAIT'){
      const [minutes,seconds]=(step.values??[]).map(evaluate);
      if(typeof minutes!=='number'||typeof seconds!=='number'||
         !Number.isInteger(minutes)||!Number.isInteger(seconds)||
         minutes<0||seconds<0||seconds>=60||minutes>525600||
         minutes*60+seconds<1)throw Error('WAIT requires a positive duration (minutes, seconds)');
      if(index===list.length-1){completed++;continue;}
      if(!top)throw Error('WAIT cannot run inside FOREACH');
      await tracedRequest('/action-formulas/schedule',{method:'POST',body:JSON.stringify({
       formula,nextStep:index+1,seconds:minutes*60+seconds,
       scope:record,variables,sessionId:typeof record.sessionId==='string'?record.sessionId:null
      })});
      completed++;
      return false;
     }
     if(step.name==='FLOW'||step.name==='SCREEN'){
      if(!runPageAction)throw Error('Page runtime unavailable');
      const mode=step.values?.[0];
      await runPageAction(step.name,step.object,mode?.kind==='reference'?mode.value:mode?.kind==='literal'?String(mode.value):undefined);
      completed++;
      continue;
     }
     if(step.values){
      const values=step.values.map(evaluate);
      await tracedRequest('/action-formulas/communication',{method:'POST',body:JSON.stringify({
       channel:step.name,credential:step.object,values
      })});
      completed++;
      continue;
     }
     if(step.name==='CREATEPDF'){
      const id=step.id&&evaluate(step.id);
      if(typeof id!=='string'||!recordIdPattern.test(id)||!createPdf)
       throw Error('CREATEPDF requires a published Print Template and PDF file service');
      const pdf=await createPdf(step.object,id);
      if(step.alias)variables[step.alias]=pdf;
      completed++;continue;
     }
     if(step.name==='PRINT'){
      const id=step.id&&evaluate(step.id);
      if(typeof id!=='string'||!id||!print)throw Error('Print requires a template host and a record ID');
      await print(step.object,id);
      completed++;
      continue;
     }
     let path='/records/'+encodeURIComponent(step.object);
     if(step.id){
      const id=evaluate(step.id);
      if(typeof id!=='string'||!recordIdPattern.test(id))throw Error('Expected a record ID');
      path+='/'+encodeURIComponent(id);
     }
     const method=step.name==='CREATERECORD'?'POST':step.name==='UPDATERECORD'?'PUT':'DELETE';
     const values=Object.fromEntries([...step.fields].map(([field,node])=>[field,evaluate(node)]));
     const response=await tracedRequest<{record:Record<string,unknown>}>(path,{
      method,...(method==='DELETE'?{}:{body:JSON.stringify(values)})
     });
     completed++;
     recordChanged=true;
     mutatedObjectApiNames.add(step.object);
     if(step.alias){
      const alias=step.alias;
      const later=(next:ActionStep):boolean=>[...stepNodes(next),...(next.guards??[]).map(g=>g.condition)]
       .some(node=>readsResultField(node,alias))||(next.body??[]).some(later);
      variables[alias]=response.record;
      if(list.slice(index+1).some(later)){
       const id=response.record.Id;
       if(typeof id!=='string'||!recordIdPattern.test(id))throw Error('Missing saved record ID');
       const read=await tracedRequest<{record:Record<string,unknown>}>('/records/'+step.object+'/'+encodeURIComponent(id));
       variables[alias]=read.record;
      }
     }
    }catch(error){
     if(stepTiming)stepTiming.status='failed';
     if(error instanceof Error&&error.message.includes(' confirmed action(s). '))throw error;
     throw Error(step.name+' failed after '+completed+' confirmed action(s). '+(error instanceof Error?error.message:String(error)));
    }finally{
     if(stepTiming)stepTiming.durationMs=Math.max(0,performance.now()-stepStarted);
     activeStep=previousStep;
    }
   }
   return true;
  }
  let status:'completed'|'failed'='completed';
  try{
   await run(steps,Object.create(null),true);
   return {changes,recordChanged,mutatedObjectApiNames:[...mutatedObjectApiNames]};
  }catch(error){
   status='failed';
   throw error;
  }finally{
   if(trace){
    // The identifier is a trusted format, not a formula string or tenant-supplied prose.
    const safeName=typeof formulaName==='string'&&/^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/.test(formulaName)
     ?formulaName:'unnamed';
    const timing:ActionPlanTiming={
     formulaName:safeName,durationMs:Math.max(0,performance.now()-started),
     stepCount,executedStepCount:traceSteps.filter(step=>step.status!=='skipped').length,
     completedActionCount:completed,requestCount,status,
     steps:traceSteps
    };
    try{onTiming!(timing);}catch{/* Diagnostics must not change successful or failed action behavior. */}
   }
  }
}
