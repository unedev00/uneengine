import {isActionPlan} from '../../../../../server/src/expression-engine/ActionFormulas.js';
import type {FieldMetadata} from '../../metadata/Definitions/metadata';
import {executeActionFormula,evaluateFieldExpressionDetailed} from '../../../component-libraries/shared/FieldExpression.js';
import {adjustNumberRecord,type AdjustNumberBinding} from './adjustNumberRecord';

type Request=<T>(path:string,init?:RequestInit)=>Promise<T>;
type Change={key:string;value:unknown};


/** Simple assignment target; RHS uses the existing shared expression engine.
 * The page runtime still owns navigation, filters, and the guarded Record API. */
export type ActionFormulaAssignment={kind:'state'|'filter'|'navigate';key:string;value:string};
const fieldIdentifier=/^[A-Za-z][A-Za-z0-9_]{0,63}$/;
export function parseActionFormulaAssignment(formula:string):ActionFormulaAssignment|null{
 const parts=/^@(state|filter|navigate)\.([A-Za-z][A-Za-z0-9_]{0,63})\s*:=\s*([\s\S]+)$/.exec(formula.trim());
 if(!parts)return null;
 if(formula.length>300||!parts[3].trim())throw Error('Invalid action assignment formula.');
 if(parts[1]==='navigate'&&!['page','list','home'].includes(parts[2]))
  throw Error('Navigation targets are page, list or home.');
 return {kind:parts[1] as ActionFormulaAssignment['kind'],key:parts[2],value:parts[3].trim()};
}
export function resolveActionFormulaValue(expression:string,payload:Record<string,unknown>,
 pageState:Readonly<Record<string,unknown>>,sessionId=''):unknown{
 if(expression.length>300)throw Error('Action formula expression is too long.');
 const evaluated=evaluateFieldExpressionDetailed(expression,{
  state:pageState,event:payload,session:{id:sessionId}
 },{pageState,sessionId});
 if(evaluated.error)throw Error('Invalid action formula: '+evaluated.error);
 return evaluated.value;
}

/**
 * Universal no-code numeric Formula action: updates an authorised row via the
 * existing guarded Record API, or an explicit numeric Page State key. Never
 * evaluates JavaScript or bypasses OneEngine/tenant/record/field permissions.
 */
export async function executePageFormulaAction(
 request:Request,binding:Record<string,unknown>,payload:Record<string,unknown>,
 pageState:Readonly<Record<string,unknown>>,
 objects:ReadonlyArray<{apiName:string;fields:ReadonlyArray<FieldMetadata>}>,
 objectApiName:string,sessionId='',print?:(template:string,id:string)=>Promise<void>,
 runPageAction?:(name:string,target:string,mode?:string)=>Promise<unknown>,
 createPdf?:(template:string,id:string)=>Promise<{FileId:string;AssetRef:string}>
):Promise<{changes:Change[];recordChanged:boolean}>{
 const formula=String(binding.formula??'');
 if(isActionPlan(formula)){
  return executeActionFormula(formula,{...payload,state:pageState,event:payload},
   {pageState,sessionId,timeZone:'UTC',now:new Date()},{request,print,runPageAction,createPdf});
 }
 if(!formula.trim()||formula.length>300)
  throw Error('Enter a valid action formula in the Actions ribbon.');
 const assignment=parseActionFormulaAssignment(formula);
 if(assignment){
  if(assignment.kind!=='state')throw Error('This assignment is handled by the page action runtime.');
  const value=resolveActionFormulaValue(assignment.value,payload,pageState,sessionId);
  return {changes:[{key:assignment.key,value}],recordChanged:false};
 }
 const refs=[...formula.matchAll(/@([A-Za-z][A-Za-z0-9_.]*)/g)].map(match=>match[1]);
 const metadata=objects.find(item=>item.apiName===objectApiName);
 const numeric=/^(Number|Currency|Percent|Integer|Decimal|Double|Float|Long|Short|Int)(\(|$)/i;
 const inferredField=refs.find(ref=>fieldIdentifier.test(ref)&&
   metadata?.fields.some(field=>field.apiName===ref&&numeric.test(field.dataType)));
 const recordTarget=String(binding.fieldApiName??inferredField??'');
 if(payload.recordId&&recordTarget){
  const delta=payload.delta===-1?-1:1;
  const config={...binding,fieldApiName:recordTarget,actionType:'AdjustNumber' as const,
    deltaSource:'$event.delta' as const,
    incrementFormula:formula,decrementFormula:formula};
  const changes=await adjustNumberRecord(request,config as AdjustNumberBinding,
    {...payload,delta},pageState,objects,objectApiName);
  return {changes,recordChanged:true};
 }
 const key=String(binding.stateKey??refs.find(name=>
  fieldIdentifier.test(name)&&Object.prototype.hasOwnProperty.call(pageState,name))??'');
 if(!fieldIdentifier.test(key))
  throw Error('Formula requires an authorised record or a Page State key.');
 if(!refs.includes(key)||refs.some(name=>
  !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name)||
  !Object.prototype.hasOwnProperty.call(pageState,name)||
  typeof pageState[name]!=='number'||!Number.isFinite(pageState[name])))
  throw Error('Formula may only reference numeric Page State values.');
 const values=Object.fromEntries(refs.map(name=>[name,pageState[name]]));
 const result=evaluateFieldExpressionDetailed(formula,values);
 if(result.error||typeof result.value!=='string'||!result.value.trim()||
   !Number.isFinite(Number(result.value)))
  throw Error('Formula must return a finite number.');
 return {changes:[{key,value:Number(result.value)}],recordChanged:false};
}
