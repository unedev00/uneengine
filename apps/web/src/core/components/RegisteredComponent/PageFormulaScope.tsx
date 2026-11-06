import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {componentInstanceNames,type NamedComponent} from '../../../../../server/src/system-support/page-component-names';
import type {LibraryComponentMetadata} from '../../metadata/Definitions/metadata';
import {resolveFieldText,getAuthenticatedFormulaBindingContext} from './fieldExpressionRuntime';
import {componentReaderKey} from '../../../component-libraries/shared/FieldExpression.js';
import {tokenize} from '../../../../../server/src/expression-engine/FormulaTokenizer.js';

type Scalar=string|number|boolean;
type Entry={id:string;name:string;token:string;keys:string[]};
type Scope={
 entries:Entry[];
 read:(name:string,key:string)=>Scalar;
 publish:(id:string,values:Record<string,Scalar>|null)=>void;
};
const Context=createContext<Scope|null>(null);
/** Live user input (typed text, selections) published by the page runtime's onChange. */
export const componentInputEvent='metadrive:component-input';
export function publishComponentInput(componentId:string,value:unknown){
 window.dispatchEvent(new CustomEvent(componentInputEvent,{detail:{componentId,value}}));
}
export const usePageFormulaScope=()=>useContext(Context);
const safeKey=/^[A-Za-z_][A-Za-z0-9_]*$/;
// Preserve simple names. Reserve a prefix for reversible encoding of legacy names.
function nameToken(name:string){
 return safeKey.test(name)&&!name.startsWith('__n_')?name:
  '__n_'+Array.from(name,char=>char.codePointAt(0)!.toString(16)).join('_');
}
export function useComponentFormulaState(state:Record<string,unknown>){
 const scope=usePageFormulaScope();
 return useMemo(()=>scope?Object.assign({},state,{[componentReaderKey]:scope.read}):state,[state,scope]);
}
export function PageFormulaScope({components,catalog,children}:{
 components?:readonly NamedComponent[];catalog:readonly LibraryComponentMetadata[];children:ReactNode
}){
 const model=useMemo(()=>{
  const items=components??[];
  const names=componentInstanceNames(items);
  const entries:Entry[]=[];
  const edges=new Map<string,string[]>();
  for(const item of items){
   const definition=catalog.find(d=>'Custom:'+d.apiName===item.type);
   if(!definition)continue;
   const name=names.get(item.id)!;
   const token=nameToken(name);
   const authored=Object.keys(item.properties).filter(key=>['string','number','boolean'].includes(typeof item.properties[key]));
   const keys=Array.from(new Set([...authored,...(definition.propertyDefinitions??[])
    .filter(field=>field.kind!=='GROUP'&&field.kind!=='COLLECTION').map(field=>field.propertyKey)]))
    .filter(key=>safeKey.test(key)&&!['constructor','prototype','__proto__'].includes(key));
   // Every component exposes its live input as $component.Name.value (typed text, selection).
   if(!keys.includes('value'))keys.push('value');
   if(['smart_image','ui_image'].includes(definition.apiName)){
    for(const key of ['textSource','imageSource','badgeText'])if(!keys.includes(key))keys.push(key);
   }
   if(keys.includes('textSource')&&!keys.includes('text')){
    keys.push('text');
    edges.set(token+'.text',[token+'.textSource']);
   }
   entries.push({id:item.id,name,token,keys});
   for(const key of keys){
    const value=item.properties[key];
    if(typeof value!=='string'||!value.includes('$component.'))continue;
    try{
     const refs=tokenize(value).filter(t=>t.kind!=='string'&&t.value.startsWith('$component.'));
     edges.set(token+'.'+key,refs.map(t=>t.value.slice(11)));
    }catch{/* The binding editor reports malformed expressions. */}
   }
  }
  const seen=new Set<string>(),active=new Set<string>(),cyclic=new Set<string>();
  function visit(path:string):boolean{
   if(active.has(path))return true;
   if(seen.has(path))return cyclic.has(path);
   active.add(path);
   if(edges.get(path)?.some(visit))cyclic.add(path);
   active.delete(path);seen.add(path);
   return cyclic.has(path);
  }
  for(const path of edges.keys())visit(path);
  return {entries,cyclic};
 },[components,catalog]);
 const [values,setValues]=useState(()=>new Map<string,Record<string,Scalar>>());
 const publish=useMemo(()=>((id:string,next:Record<string,Scalar>|null)=>{
  setValues(old=>{
   if(next===null&&!old.has(id))return old;
   const updated=new Map(old);
   if(next===null)updated.delete(id);else updated.set(id,next);
   return updated;
  });
 }),[]);
 const [inputs,setInputs]=useState(()=>new Map<string,Scalar>());
 useEffect(()=>{
  const ids=new Set(model.entries.map(entry=>entry.id));
  const changed=(event:Event)=>{
   const detail=(event as CustomEvent<{componentId?:unknown;value?:unknown}>).detail;
   if(typeof detail?.componentId!=='string'||!ids.has(detail.componentId))return;
   const value=detail.value;
   const scalar:Scalar=typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)
    ?value:value==null?'':String(value);
   setInputs(old=>{const next=new Map(old);next.set(detail.componentId as string,scalar);return next;});
  };
  window.addEventListener(componentInputEvent,changed);
  return ()=>window.removeEventListener(componentInputEvent,changed);
 },[model]);
 const scope=useMemo(()=>({...model,publish,read(name:string,key:string){
  if(model.cyclic.has(name+'.'+key))throw Error('Circular component reference: '+name+'.'+key);
  const entry=model.entries.find(item=>item.token===name);
  if(!entry?.keys.includes(key))throw Error('Unknown component property: '+name+'.'+key);
  if(key==='value'&&inputs.has(entry.id))return inputs.get(entry.id)!;
  const row=values.get(entry.id);
  return row&&Object.hasOwn(row,key)?row[key]:'';
 }}),[model,values,inputs,publish]);
 return <Context.Provider value={scope}>{children}</Context.Provider>;
}
export function PublishedFormulaProperties({id,values,rendered}:{id?:string;values:Record<string,unknown>;rendered:Readonly<Record<string,string>>}){
 const scope=usePageFormulaScope();
 const entry=scope?.entries.find(item=>item.id===id);
 const publish=scope?.publish;
 const output:Record<string,Scalar>=Object.create(null);
 const rows=Array.isArray(values.records)?values.records:[];
 const record=values.record??rows[0];
 for(const key of entry?.keys??[]){
  const source=key==='text'&&values.text===undefined?'textSource':key;
  if(Object.hasOwn(rendered,source)){output[key]=rendered[source];continue;}
  if(typeof values.fieldAllowed==='function'&&!values.fieldAllowed(source,record??{}))continue;
  let value=values[source];
  if(typeof value==='string'&&(/^(?:=|@|\$component\.|\$state\.)/.test(value)||/^[A-Z]+\(/i.test(value))){
   if(rows.length>1&&!values.record&&/@[A-Za-z]/.test(value)&&!['smart_image','ui_image'].includes(String(values.kind??'')))continue;
   try{
    value=resolveFieldText(value,record,{...getAuthenticatedFormulaBindingContext(),
     rootObjectApiName:typeof values.objectApiName==='string'?values.objectApiName:undefined,
     pageState:values.pageState as Record<string,unknown>,readComponent:scope?.read});
   }catch{continue;}
  }
  if(typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))output[key]=value;
 }
 const snapshot=JSON.stringify(output);
 useEffect(()=>{
  if(id&&entry&&publish)publish(id,JSON.parse(snapshot));
 },[id,entry?.token,publish,snapshot]);
 useEffect(()=>()=>{if(id&&publish)publish(id,null)},[id,publish]);
 return null;
}
