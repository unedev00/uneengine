import type {Expression} from './FormulaParser.js';

/** Action-only declarations. All handlers must delegate to existing authorised services. */
export const ACTION_FORMULA_DECLARATIONS = [
  {name:'ACTIONS',min:1,max:128,parameters:['action1','action2']},
  {name:'SCREEN',min:1,max:2,parameters:['page','mode']},
  {name:'FLOW',min:1,max:1,parameters:['flow']},
  {name:'CREATERECORD',min:3,max:128,parameters:['object','field1','value1','field2','value2','capture']},
  {name:'UPDATERECORD',min:4,max:128,parameters:['object','recordId','field1','value1','field2','value2','capture']},
  {name:'DELETERECORD',min:2,max:2,parameters:['object','recordId']},
  {name:'EMAIL',min:4,max:64,parameters:['namedCredential','to','subject','body','attachment1']},
  {name:'WHATSAPP',min:3,max:64,parameters:['namedCredential','recipient','message','attachment1']},
  {name:'SMS',min:3,max:3,parameters:['namedCredential','to','message']},
  {name:'PRINT',min:2,max:2,parameters:['template','recordId']},
  {name:'CREATEPDF',min:2,max:3,parameters:['template','recordId','capture']},
  {name:'WAIT',min:2,max:2,parameters:['minutes','seconds']},
  {name:'AS',min:1,max:1,parameters:['variable']}
] as const;

export const ACTION_FORMULA_FUNCTIONS: ReadonlySet<string> =
  new Set(ACTION_FORMULA_DECLARATIONS.map(entry=>entry.name));

const captureAllowed=new Set(['CREATERECORD','UPDATERECORD','CREATEPDF']);
const namePattern=/^[A-Za-z][A-Za-z0-9_]{0,63}$/;

/** Validate the action/control-flow boundary; data fields cannot execute actions. */
export function validateActionFormulaTree(tree:Expression):void {
  const walk=(node:Expression,parent:string|null=null,index=-1,count=0):void=>{
    if(node.kind==='unary')return walk(node.value,parent,index,count);
    if(node.kind==='binary'){walk(node.left,parent,index,count);walk(node.right,parent,index,count);return;}
    if(node.kind!=='call')return;
    const action=ACTION_FORMULA_FUNCTIONS.has(node.name);
    if(node.name==='AS'){
      if(!parent||!captureAllowed.has(parent)||index!==count-1
        ||node.args[0]?.kind!=='reference'||!namePattern.test(node.args[0].value))
        throw Error('AS(variable) must be the final argument of a record or PDF creation action');
      return;
    }
    if(action&&parent!==null){
      const validParent=parent==='ACTIONS'||parent==='IF'&&index>0;
      if(!validParent)throw Error('Action formulas are allowed only in ACTIONS or IF result branches');
    }
    if(node.name==='CREATERECORD'||node.name==='UPDATERECORD'){
      const start=node.name==='CREATERECORD'?1:2;
      const captured=node.args.at(-1)?.kind==='call'&&node.args.at(-1)?.name==='AS';
      const pairs=node.args.length-start-(captured?1:0);
      if(pairs<2||pairs%2!==0)throw Error('Record actions require Field, Value pairs');
    }
    if(node.name==='CREATEPDF'&&node.args.length===3
      &&(node.args[2].kind!=='call'||node.args[2].name!=='AS'))
      throw Error('CREATEPDF third argument must be AS(variable)');
    if(node.name==='ACTIONS'&&node.args.length>128)
      throw Error('ACTIONS exceeds the action limit');
    node.args.forEach((arg,i)=>walk(arg,node.name,i,node.args.length));
  };
  walk(tree);
}

/** Pure delay calculation; never sleep in a browser or keep its session alive. */
export function waitDelaySeconds(minutes:unknown,seconds:unknown):number {
  if(!Number.isSafeInteger(minutes)||!Number.isSafeInteger(seconds)
    ||Number(minutes)<0||Number(minutes)>525600
    ||Number(seconds)<0||Number(seconds)>59)
    throw Error('WAIT requires whole minutes (0–525600) and seconds (0–59)');
  const duration=Number(minutes)*60+Number(seconds);
  if(duration===0)throw Error('WAIT must be longer than zero');
  return duration;
}
