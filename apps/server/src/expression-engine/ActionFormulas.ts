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

export const recordActionNames=['ACTIONS','CREATERECORD','UPDATERECORD','DELETERECORD'];
export const isRecordAction=(source:string)=>/^\s*=?\s*(?:ACTIONS|CREATERECORD|UPDATERECORD|DELETERECORD)\s*\(/i.test(source);
type RecordStep={name:string;object:string;id?:Expression;fields:Map<string,Expression>;alias?:string};

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
  const id=node.name==='CREATERECORD'?undefined:args.shift();
  if(node.name!=='CREATERECORD'&&!id)throw Error('Record ID is required');
  if(id)validateFormulaFunctions(id,'ribbon_binding');
  const last=args.at(-1);
  let alias:string|undefined;
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
