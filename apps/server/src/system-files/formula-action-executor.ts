import type {Expression} from '../expression-engine/FormulaParser.js';
import {Parser} from '../expression-engine/FormulaParser.js';
import {tokenize} from '../expression-engine/FormulaTokenizer.js';
import {validateFormulaFunctions} from '../expression-engine/FormulaFunctionRegistry.js';
import {waitDelaySeconds} from '../expression-engine/FormulaActions.js';
import {evaluateFlowFormula} from './flow-formula-runtime.js';
import type {RecordEngine} from './record-engine.js';
import type {FlowRuntime} from './flow-runtime.js';
import {ScheduledActionService} from '../system-support/scheduled-action-service.js';

export type ActionScalar=string|number|boolean|null;
export type ActionVariables=Record<string,ActionScalar>;
type ActionActor={tenantId:string;userId:string;sessionId:string;pageApi?:string};
type ActionCall=Extract<Expression,{kind:'call'}>;
const identifier=/^[A-Za-z][A-Za-z0-9_]{0,79}$/;
const scalar=(value:unknown):value is ActionScalar=>
 value===null||typeof value==='string'||typeof value==='boolean'
 ||typeof value==='number'&&Number.isFinite(value);

/** Serialize a parsed AST, never concatenate untrusted script/code. */
export function actionExpressionText(node:Expression):string {
 switch(node.kind){
  case 'literal':return typeof node.value==='string'?JSON.stringify(node.value):String(node.value).toUpperCase();
  case 'reference':return node.value;
  case 'unary':return '('+node.operator+' '+actionExpressionText(node.value)+')';
  case 'binary':return '('+actionExpressionText(node.left)+' '+node.operator+' '+actionExpressionText(node.right)+')';
  case 'call':return node.name+'('+node.args.map(actionExpressionText).join(',')+')';
 }
}

/** The same executor runs button actions and durable resumed steps. */
export class FormulaActionExecutor{
 constructor(private readonly records:RecordEngine,private readonly flows:FlowRuntime,
   private readonly scheduled:ScheduledActionService,
   private readonly createPdf?:(
     actor:ActionActor,templateApi:string,recordId:string
   )=>Promise<{FileId:string;FileRef:string}>){}

 private evaluate(node:Expression,variables:Readonly<ActionVariables>):unknown{
  // Existing Flow evaluator handles all universal formulas and their lazy IF
  // semantics. Action execution is never evaluated as an expression.
  return evaluateFlowFormula(actionExpressionText(node),reference=>{
   if(Object.prototype.hasOwnProperty.call(variables,reference))return variables[reference];
   if(identifier.test(reference))return reference; // object/field/credential API name
   throw Error('Uncaptured formula value: '+reference);
  },{},'flow_formula');
 }
 private name(node:Expression|undefined,variables:Readonly<ActionVariables>):string {
  if(!node)throw Error('Missing action identifier');
  const value=this.evaluate(node,variables);
  if(typeof value!=='string'||!identifier.test(value))throw Error('Invalid action identifier');
  return value;
 }
 private value(node:Expression|undefined,variables:Readonly<ActionVariables>):unknown{
  if(!node)throw Error('Missing action value');
  return this.evaluate(node,variables);
 }
 private capture(node:Expression|undefined):string|null{
  if(!node||node.kind!=='call'||node.name!=='AS')return null;
  const alias=node.args[0];
  if(alias.kind!=='reference'||!identifier.test(alias.value))throw Error('Invalid capture variable');
  return alias.value;
 }
 private async recordCapture(actor:ActionActor,objectName:string,id:string,alias:string){
  const output:ActionVariables={[alias+'.Id']:id};
  try {
   const record=await this.records.get(actor.tenantId,actor.userId,objectName,id);
   if(record&&typeof record==='object'&&!Array.isArray(record))
    for(const [key,value] of Object.entries(record as Record<string,unknown>))
     if(identifier.test(key)&&scalar(value)
       &&(typeof value!=='string'||value.length<=4096))
      output[alias+'.'+key]=value as ActionScalar;
  }catch {
   // A write permission never grants permission to see restricted record fields.
  }
  return output;
 }
 private async executeCall(node:ActionCall,actor:ActionActor,
   variables:ActionVariables):Promise<ActionVariables> {
  const args=node.args;
  const tenant=actor.tenantId,user=actor.userId;
  if(node.name==='IF'){
   const choice=this.value(args[0],variables);
   const branch=choice===true||choice===1||choice==='true'?args[1]:args[2];
   if(!branch||branch.kind==='literal'&&(branch.value===''||branch.value===null))
    return {};
   if(branch.kind==='call')return this.executeCall(branch,actor,variables);
   throw Error('Action IF branch must be an action or blank');
  }
  if(node.name==='FLOW'){
   const api=this.name(args[0],variables);
   await this.flows.execute(tenant,api,user,{});
   return {};
  }
  if(node.name==='CREATERECORD'||node.name==='UPDATERECORD'){
   const create=node.name==='CREATERECORD',object=this.name(args[0],variables);
   const id=create?'':String(this.value(args[1],variables)??'');
   const start=create?1:2;
   const alias=this.capture(args.at(-1));
   const end=args.length-(alias?1:0);
   const values:Record<string,unknown>={};
   for(let i=start;i<end;i+=2){
    const field=this.name(args[i],variables);
    if(Object.prototype.hasOwnProperty.call(values,field))throw Error('Duplicate action field');
    values[field]=this.value(args[i+1],variables);
   }
   const savedId=create?await this.records.create(tenant,user,object,values)
    :(await this.records.update(tenant,user,object,id,values),id);
   return alias?this.recordCapture(actor,object,savedId,alias):{};
  }
  if(node.name==='DELETERECORD'){
   const object=this.name(args[0],variables);
   const id=String(this.value(args[1],variables)??'');
   await this.records.remove(tenant,user,object,id);
   return {};
  }
  if(node.name==='CREATEPDF'){
   if(!this.createPdf)throw Error('Print Template PDF renderer is not available');
   const template=this.name(args[0],variables);
   const recordId=String(this.value(args[1],variables)??'');
   const result=await this.createPdf(actor,template,recordId);
   const alias=this.capture(args[2]);
   return alias?{[alias+'.FileId']:result.FileId,[alias+'.FileRef']:result.FileRef}:{};
  }
  // These actions are owned by the existing Page/Flow/communication runtime.
  // Never silently treat a missing handler as successful execution.
  throw Error('No server-side action handler registered for '+node.name);
 }

 async execute(formula:string,actor:ActionActor,initial:Readonly<ActionVariables>={}):
  Promise<{scheduledActionId?:string;completed:number;recordChanged:boolean;variables:ActionVariables}>{
  const parsed=new Parser(tokenize(formula)).parse();
  validateFormulaFunctions(parsed,'action_formula');
  const actions=parsed.kind==='call'&&parsed.name==='ACTIONS'?parsed.args:[parsed];
  const variables:ActionVariables={...initial,'$session':actor.sessionId,
    '$session.id':actor.sessionId};
  let completed=0,recordChanged=false;
  const completedSteps:string[]=[];
  for(const [index,node] of actions.entries()){
   if(node.kind!=='call')throw Error('ACTIONS entries must be action calls');
   const current=node.name==='IF'
     ?(this.value(node.args[0],variables)===true?node.args[1]:node.args[2])
     :node;
   if(current?.kind==='literal'&&(current.value===''||current.value===null)){
    completed++;
    completedSteps.push(actionExpressionText(node));
    continue;
   }
   if(current?.kind!=='call')throw Error('Action must evaluate to an action call');
   if(current.name==='WAIT'){
    const minutes=this.value(current.args[0],variables),seconds=this.value(current.args[1],variables);
    waitDelaySeconds(minutes,seconds);
    const remaining=actions.slice(index+1);
    if(!remaining.length)throw Error('WAIT needs a following action');
    // UI-only actions cannot execute in a closed browser session.
    if(remaining.some(item=>item.kind==='call'&&['SCREEN','PRINT'].includes(item.name)))
     throw Error('SCREEN/PRINT cannot be resumed in the background');
    const scheduled=await this.scheduled.schedule({
     tenantId:actor.tenantId,userId:actor.userId,sessionId:actor.sessionId,
     ...(actor.pageApi?{sourcePageApi:actor.pageApi}:{}),
     minutes:Number(minutes),seconds:Number(seconds),
     completedSteps,remainingSteps:remaining.map(actionExpressionText),
     variables
    });
    return {scheduledActionId:scheduled.id,completed,recordChanged,variables};
   }
   const updates=await this.executeCall(current,actor,variables);
   for(const [name,value] of Object.entries(updates))variables[name]=value;
   recordChanged ||= ['CREATERECORD','UPDATERECORD','DELETERECORD'].includes(current.name);
   completed++;
   completedSteps.push(actionExpressionText(node));
  }
  return {completed,recordChanged,variables};
 }
}
