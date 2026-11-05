import {Parser,type Expression} from './FormulaParser.js';
import {tokenize} from './FormulaTokenizer.js';
import {validateFormulaFunctions} from './FormulaFunctionRegistry.js';

const identifier=/^[A-Za-z][A-Za-z0-9_]{0,79}$/;
function nameOf(node:Expression|undefined,label:string):string {
 const name=node?.kind==='reference'||node?.kind==='literal'?node.value:null;
 if(typeof name!=='string'||!identifier.test(name))throw Error('Invalid '+label);
 return name;
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

export const recordActionNames=['ACTIONS','CREATERECORD','UPDATERECORD','DELETERECORD','PRINT','EMAIL','WHATSAPP','SMS','FLOW','SCREEN'];
export const isRecordAction=(source:string)=>/^\s*=?\s*(?:ACTIONS|CREATERECORD|UPDATERECORD|DELETERECORD|PRINT|EMAIL|WHATSAPP|SMS)\s*\(/i.test(source);
type RecordStep={name:string;object:string;id?:Expression;values?:Expression[];fields:Map<string,Expression>;alias?:string};

export function compileRecordActions(source:string):RecordStep[] {
 const steps:RecordStep[]=[];
 const aliases=new Set<string>();
 function add(node:Expression){
  if(node.kind!=='call'||!recordActionNames.includes(node.name))throw Error('Expected a record action');
  const args=[...node.args];
  if(node.name==='ACTIONS'){
   if(!args.length)throw Error('ACTIONS requires at least one action');
   args.forEach(add);
   return;
  }
  const object=nameOf(args.shift(),'object API name');
  if(['EMAIL','WHATSAPP','SMS','FLOW','SCREEN'].includes(node.name)){
   const bounds:Record<string,[number,number]>={EMAIL:[3,23],WHATSAPP:[2,22],SMS:[2,2],FLOW:[0,0],SCREEN:[0,1]};
   const [min,max]=bounds[node.name];
   if(args.length<min||args.length>max)throw Error('Invalid '+node.name+' arguments');
   args.forEach(arg=>validateFormulaFunctions(arg,'ribbon_binding'));
   if(node.name==='SCREEN'&&args.length)nameOf(args[0],'screen mode');
   steps.push({name:node.name,object,values:args,fields:new Map()});
   return;
  }
  const id=node.name==='CREATERECORD'?undefined:args.shift();
  if(node.name!=='CREATERECORD'&&!id)throw Error('Record ID is required');
  if(id)validateFormulaFunctions(id,'ribbon_binding');
  const last=args.at(-1);
  let alias:string|undefined;
  if(node.name==='PRINT'&&args.length)throw Error('PRINT requires template and record ID');
  if(node.name==='DELETERECORD'&&args.length)throw Error('DELETERECORD requires object and ID');
  if(last?.kind==='call'&&last.name==='AS'){
   if(last.args.length!==1)throw Error('AS requires one variable');
   alias=nameOf(last.args[0],'result variable');
   if(aliases.has(alias))throw Error('Duplicate result variable '+alias);
   aliases.add(alias);
   args.pop();
  }
  if(args.length%2||(!args.length&&node.name==='UPDATERECORD'))throw Error('Expected field and value pairs');
  const fields=new Map<string,Expression>();
  for(let i=0;i<args.length;i+=2){
   const field=nameOf(args[i],'field API name');
   if(fields.has(field))throw Error('Duplicate field '+field);
   validateFormulaFunctions(args[i+1],'ribbon_binding');
   fields.set(field,args[i+1]);
  }
  steps.push({name:node.name,object,id,fields,alias});
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
