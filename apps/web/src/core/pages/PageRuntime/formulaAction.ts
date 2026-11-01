import type {FieldMetadata} from '../../metadata/Definitions/metadata';
import {evaluateFieldExpressionDetailed} from '../../../component-libraries/shared/FieldExpression.js';
import {adjustNumberRecord,type AdjustNumberBinding} from './adjustNumberRecord';

type Request=<T>(path:string,init?:RequestInit)=>Promise<T>;
type Change={key:string;value:unknown};

/**
 * Universal no-code numeric Formula action: updates an authorised row via the
 * existing guarded Record API, or an explicit numeric Page State key. Never
 * evaluates JavaScript or bypasses OneEngine/tenant/record/field permissions.
 */
export async function executePageFormulaAction(
 request:Request,binding:Record<string,unknown>,payload:Record<string,unknown>,
 pageState:Readonly<Record<string,unknown>>,
 objects:ReadonlyArray<{apiName:string;fields:ReadonlyArray<FieldMetadata>}>,
 objectApiName:string
):Promise<{changes:Change[];recordChanged:boolean}>{
 const formula=String(binding.formula??'');
 if(!formula.trim()||formula.length>300)
  throw Error('Enter a valid action formula in the Actions ribbon.');
 if(payload.recordId&&binding.fieldApiName){
  const delta=payload.delta===-1?-1:1;
  const config={...binding,actionType:'AdjustNumber' as const,
    deltaSource:'$event.delta' as const,
    incrementFormula:formula,decrementFormula:formula};
  const changes=await adjustNumberRecord(request,config as AdjustNumberBinding,
    {...payload,delta},pageState,objects,objectApiName);
  return {changes,recordChanged:true};
 }
 const key=String(binding.stateKey??'');
 if(!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key))
  throw Error('Formula requires an authorised record or a Page State key.');
 const refs=[...formula.matchAll(/@([A-Za-z][A-Za-z0-9_.]*)/g)].map(match=>match[1]);
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
