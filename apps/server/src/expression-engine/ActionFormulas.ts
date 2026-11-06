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
const recordQueryPath=(object:string,filters:unknown[])=>
 '/records/'+encodeURIComponent(object)+'?limit=1&filters='+encodeURIComponent(JSON.stringify(filters));
/** True when an expression uses COUNTIFS (a server count resolved before evaluation). */
export function usesRecordCount(node:Expression|undefined):boolean{
 if(!node)return false;
 if(node.kind==='call')return node.name==='COUNTIFS'||node.args.some(usesRecordCount);
 if(node.kind==='binary')return usesRecordCount(node.left)||usesRecordCount(node.right);
 if(node.kind==='unary')return usesRecordCount(node.value);
 return false;
}

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
 if(/^\s*=?\s*(?:ACTIONS|CREATERECORD|UPDATERECORD|DELETERECORD|GETRECORD|STATE|PRINT|CREATEPDF|WAIT|EMAIL|WHATSAPP|SMS)\s*\(/i.test(source))return true;
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
 guards?:readonly {condition:Expression;expected:boolean}[]
};

export function compileActionPlan(source:string):ActionStep[] {
 const steps:ActionStep[]=[];
 const aliases=new Set<string>();
 function add(node:Expression,guards:ActionStep['guards']=[]){
  if(node.kind==='literal'&&(node.value===''||node.value===null))return;
  if(node.kind==='call'&&node.name==='IF'){
   if(node.args.length!==3)throw Error('IF requires condition, true action and false action');
   validateFormulaFunctions(node.args[0],'ribbon_binding');
   add(node.args[1],[...(guards??[]),{condition:node.args[0],expected:true}]);
   add(node.args[2],[...(guards??[]),{condition:node.args[0],expected:false}]);
   return;
  }
  if(node.kind!=='call'||!actionFunctionNames.includes(node.name))throw Error('Expected an action formula');
  const args=[...node.args];
  if(node.name==='ACTIONS'){
   if(!args.length)throw Error('ACTIONS requires at least one action');
   args.forEach(arg=>add(arg,guards));
   return;
  }
  if(node.name==='WAIT'){
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
  const object=nameOf(args.shift(),'object API name');
  if(node.name==='GETRECORD'){
   const last=args.at(-1);
   if(last?.kind!=='call'||last.name!=='AS'||last.args.length!==1)
    throw Error('GETRECORD requires AS(variable) for the found record');
   const alias=nameOf(last.args[0],'result variable');
   if(['state','event','session','constructor','prototype'].includes(alias))throw Error('Reserved result variable '+alias);
   if(aliases.has(alias))throw Error('Duplicate result variable '+alias);
   aliases.add(alias);
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
   alias=nameOf(last.args[0],'result variable');
   if(['state','event','session','constructor','prototype'].includes(alias))throw Error('Reserved result variable '+alias);
   if(aliases.has(alias))throw Error('Duplicate result variable '+alias);
   aliases.add(alias);
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
 add(new Parser(tokenize(source)).parse());
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

export type ActionServices={
 request:<T>(path:string,init?:{method:string;body?:string})=>Promise<T>;
 print?:(template:string,id:string)=>Promise<void>;
 createPdf?:(template:string,id:string)=>Promise<{FileId:string}>;
 runPageAction?:(name:string,target:string,mode?:string)=>Promise<unknown>;
};
export async function executeActionPlan(formula:string,record:Record<string,unknown>,
 evaluateValue:(node:Expression,scope:Record<string,unknown>,aliases?:readonly string[],
  state?:Readonly<Record<string,unknown>>)=>unknown,
 {request,print,createPdf,runPageAction}:ActionServices){
  const steps=compileActionPlan(formula);
  const variables:Record<string,unknown>=Object.create(null);
  // STATE results apply to the page when the plan finishes and are visible to later steps.
  const stateChanges:Record<string,unknown>=Object.create(null);
  const changes:Array<{key:string;value:unknown}>=[];
  let completed=0;
  let recordChanged=false;
  for(const [index,step] of steps.entries()){
   try{
    const scope={...record,...variables};
    const evaluateNow=(node:Expression):unknown=>evaluateValue(node,scope,Object.keys(variables),stateChanges);
    // COUNTIFS counts authorised records through the Record API before the
    // synchronous formula evaluator runs; its result is substituted as a literal.
    const counts=new Map<Expression,number>();
    const resolveCounts=async(node:Expression|undefined):Promise<void>=>{
     if(!node)return;
     if(node.kind==='binary'){await resolveCounts(node.left);await resolveCounts(node.right);return;}
     if(node.kind==='unary'){await resolveCounts(node.value);return;}
     if(node.kind!=='call')return;
     for(const arg of node.args)await resolveCounts(arg);
     if(node.name!=='COUNTIFS'||counts.has(node))return;
     const [objectNode,...criteriaArgs]=node.args;
     const object=nameOf(objectNode,'COUNTIFS object API name');
     const filters=criteriaFilters(recordCriteria(criteriaArgs,'COUNTIFS'),value=>evaluateNow(substitute(value)));
     const result=await request<{total?:number}>(recordQueryPath(object,filters));
     if(typeof result.total!=='number'||!Number.isFinite(result.total))throw Error('COUNTIFS count unavailable');
     counts.set(node,result.total);
    };
    const substitute=(node:Expression):Expression=>{
     const count=counts.get(node);
     if(count!==undefined)return {kind:'literal',value:count};
     if(node.kind==='call')return {...node,args:node.args.map(substitute)};
     if(node.kind==='binary')return {...node,left:substitute(node.left),right:substitute(node.right)};
     if(node.kind==='unary')return {...node,value:substitute(node.value)};
     return node;
    };
    for(const node of [...(step.guards??[]).map(guard=>guard.condition),...(step.id?[step.id]:[]),
      ...step.fields.values(),...(step.values??[])])
     await resolveCounts(node);
    const evaluate=(node:Expression):unknown=>evaluateNow(substitute(node));
    if(step.guards?.some(guard=>formulaTruth(evaluate(guard.condition))!==guard.expected))continue;
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
     const result=await request<{records?:Record<string,unknown>[]}>(recordQueryPath(step.object,filters));
     // No match leaves an empty result so ISBLANK(alias.Id) selects the create branch.
     variables[step.alias!]=result.records?.[0]??{};
     completed++;
     continue;
    }
    if(step.name==='WAIT'){
     const [minutes,seconds]=(step.values??[]).map(evaluate);
     if(typeof minutes!=='number'||typeof seconds!=='number'||
        !Number.isInteger(minutes)||!Number.isInteger(seconds)||
        minutes<0||seconds<0||seconds>=60||minutes>525600||
        minutes*60+seconds<1)throw Error('WAIT requires a positive duration (minutes, seconds)');
     if(index===steps.length-1){completed++;continue;}
     await request('/action-formulas/schedule',{method:'POST',body:JSON.stringify({
      formula,nextStep:index+1,seconds:minutes*60+seconds,
      scope:record,variables,sessionId:typeof record.sessionId==='string'?record.sessionId:null
     })});
     completed++;
     return {changes,recordChanged};
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
     await request('/action-formulas/communication',{method:'POST',body:JSON.stringify({
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
    const response=await request<{record:Record<string,unknown>}>(path,{
     method,...(method==='DELETE'?{}:{body:JSON.stringify(values)})
    });
    completed++;
    recordChanged=true;
    if(step.alias){
     const alias=step.alias;
     const needsFields=steps.slice(index+1).some(next=>
      [...next.fields.values(),...(next.values??[]),...(next.id?[next.id]:[])].some(node=>readsResultField(node,alias)));
     variables[alias]=response.record;
     if(needsFields){
      const id=response.record.Id;
      if(typeof id!=='string'||!recordIdPattern.test(id))throw Error('Missing saved record ID');
      const read=await request<{record:Record<string,unknown>}>('/records/'+step.object+'/'+encodeURIComponent(id));
      variables[alias]=read.record;
     }
    }
   }catch(error){
    throw Error(step.name+' failed after '+completed+' confirmed action(s). '+(error instanceof Error?error.message:String(error)));
   }
  }
  return {changes,recordChanged};
}
