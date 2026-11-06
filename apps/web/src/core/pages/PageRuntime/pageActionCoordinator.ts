import {compileActionPlan,type ActionStep} from '../../../../../server/src/expression-engine/ActionFormulas.js';

/** Logical Object-set mutex, scoped to one page/tenant session.
 * Book all required keys synchronously so multi-Object plans cannot deadlock.
 * Every intentional action runs; no debouncing, swallowed errors or retries.
 * The Record API remains the authoritative cross-operator concurrency guard.
 */
const tails=new Map<string,Promise<void>>();
export async function runSerializedPageAction<T>(
 scope:string,objects:readonly string[],execute:()=>Promise<T>
):Promise<T>{
 const keys=[...new Set(objects.filter(name=>/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(name)))]
  .sort().map(name=>scope+'|'+name);
 if(!keys.length)return execute();
 const earlier=keys.map(key=>tails.get(key)??Promise.resolve());
 let release!:()=>void;
 const own=new Promise<void>(resolve=>{release=resolve;});
 keys.forEach(key=>tails.set(key,own));
 try{await Promise.all(earlier);return await execute();}
 finally{
  release();
  keys.forEach(key=>{if(tails.get(key)===own)tails.delete(key);});
 }
}

/** Reads plus writes are coordinated to avoid an earlier read being reused
 * while another plan mutates its source. No app-specific Object names.
 */
export function planReadWriteObjects(binding:Readonly<Record<string,unknown>>,
 primaryObject:string):string[]{
 const kind=String(binding.actionType??'');
 if(kind==='AdjustNumber')return primaryObject?[primaryObject]:[];
 if(kind!=='Formula')return [];
 const formula=typeof binding.formula==='string'?binding.formula:'';
 if(!/\b(?:ACTIONS|CREATERECORD|UPDATERECORD|DELETERECORD|GETRECORD|FOREACH)\s*\(/i.test(formula))
  return [];
 let steps:ActionStep[];
 try{steps=compileActionPlan(formula);}catch{return [];}
 const names=new Set<string>();
 const visit=(step:ActionStep):void=>{
  if(['GETRECORD','CREATERECORD','UPDATERECORD','DELETERECORD','FOREACH'].includes(step.name))
   names.add(step.object);
  step.body?.forEach(visit);
 };
 steps.forEach(visit);
 return [...names];
}
