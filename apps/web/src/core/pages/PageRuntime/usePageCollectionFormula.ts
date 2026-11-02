import {useEffect,useState} from 'react';
import {Parser,type Expression} from '../../../../../server/src/expression-engine/FormulaParser.js';
import {tokenize} from '../../../../../server/src/expression-engine/FormulaTokenizer.js';
import {evaluateCollectionFormula} from '../../../component-libraries/shared/FieldExpression.js';
import {loadFlowScreenRecordPage} from '../../authentication/Client/authClient';
import type {ObjectMetadata} from '../../metadata/Definitions/metadata';

type Row=Record<string,unknown>;
export type PageNamedCollection={name:string;items:unknown[]};
type SourceResult={key:string;records:Record<string,Row[]>;error?:string};

export function collectionFormulaReferences(formula:string):Array<{object:string;field:string}>{
 if(!/^\\s*COLLECTION\\s*\\(/i.test(formula))return [];
 const found=new Map<string,{object:string;field:string}>();
 const visit=(node:Expression):void=>{
  if(node.kind==='reference'){
   const match=/^([A-Za-z][A-Za-z0-9_]*)\\.([A-Za-z][A-Za-z0-9_]*)$/.exec(node.value);
   if(match)found.set(match[0],{object:match[1],field:match[2]});
  }else if(node.kind==='call')node.args.forEach(visit);
  else if(node.kind==='unary')visit(node.value);
  else if(node.kind==='binary'){visit(node.left);visit(node.right);}
 };
 try{visit(new Parser(tokenize(formula)).parse());}catch{/* evaluator reports syntax errors */}
 return [...found.values()];
}

/** Source queries are standard RBAC-protected Object API reads. Formula evaluation
 * never fetches data, and no incomplete record page is presented as a collection.
 * This hook is reusable by any metadata collection consumer, not Smart Tabs only.
 */
export function usePageCollectionFormula(
 formula:unknown,properties:Readonly<Row>,objects:readonly ObjectMetadata[],
 primaryObject:string,primaryRecords:readonly Row[],primaryTotal:number,
 revision:number,pageState:Readonly<Row>,sessionId:string
):{collection:PageNamedCollection|null;error:string|null;loading:boolean}{
 const source=typeof formula==='string'?formula.trim():'';
 const refs=collectionFormulaReferences(source);
 const selected=['objectApiName','objectApiName2','objectApiName3']
  .map(key=>String(properties[key]??'')).filter(Boolean);
 const referenced=[...new Set(refs.map(ref=>ref.object))];
 const secondary=referenced.filter(name=>name!==primaryObject);
 const key=JSON.stringify([source,selected,secondary,revision]);
 const [remote,setRemote]=useState<SourceResult|null>(null);
 useEffect(()=>{
  let active=true;
  if(!source||!secondary.length){setRemote({key,records:{}});return()=>{active=false;};}
  setRemote(null);
  void Promise.all(secondary.map(async name=>{
   if(!selected.includes(name)||!objects.some(o=>o.apiName===name))
    throw Error('COLLECTION source Object is not selected: '+name);
   const response=await loadFlowScreenRecordPage(name,{limit:200,offset:0});
   if(response.total>200||response.total>response.records.length)
    throw Error('COLLECTION source '+name+' has more records than can be safely loaded; narrow its filters');
   return [name,response.records] as const;
  })).then(results=>{if(active)setRemote({key,records:Object.fromEntries(results)});})
   .catch((error:unknown)=>{if(active)setRemote({key,records:{},
     error:error instanceof Error?error.message:'COLLECTION source failed'});});
  return()=>{active=false;};
 },[key]);
 if(!source)return {collection:null,error:null,loading:false};
 if(!/^COLLECTION\\s*\\(/i.test(source))
  return {collection:null,error:'Use COLLECTION("Name", values, @Object.Field)',loading:false};
 const notSelected=refs.find(ref=>!selected.includes(ref.object));
 if(notSelected)return {collection:null,error:'Select Object '+notSelected.object+' in Data Source before referencing it',loading:false};
 const missingField=refs.find(ref=>!objects.find(o=>o.apiName===ref.object)?.fields.some(f=>f.apiName===ref.field));
 if(missingField)return {collection:null,error:'COLLECTION field unavailable: '+missingField.object+'.'+missingField.field,loading:false};
 if(referenced.includes(primaryObject)&&primaryTotal>primaryRecords.length)
  return {collection:null,error:'COLLECTION primary source has more records than are loaded; narrow its filters',loading:false};
 if(secondary.length&&remote?.key!==key)return {collection:null,error:null,loading:true};
 if(remote?.error)return {collection:null,error:remote.error,loading:false};
 const sources:Record<string,Row[]>={...remote?.records};
 if(primaryObject&&referenced.includes(primaryObject))sources[primaryObject]=[...primaryRecords];
 const resolved=evaluateCollectionFormula(source,sources,{state:pageState,session:{id:sessionId}});
 const value=resolved.value as PageNamedCollection|null;
 return {collection:value,error:resolved.error??null,loading:false};
}

/** Read-only record-shaped adapter for collection-capable Tables, Lists and Cards.
 * Synthetic manual values have no database ID and cannot masquerade as records.
 */
export function namedCollectionRows(collection:PageNamedCollection):Row[]{
 return collection.items.map((item,index)=>{
  if(item&&typeof item==='object'&&!Array.isArray(item)
    &&'label' in item&&'value' in item){
   const entry=item as {label:unknown;value:unknown;record?:unknown};
   const record=entry.record&&typeof entry.record==='object'&&!Array.isArray(entry.record)
    ?entry.record as Row:{};
   return {...record,Name:String(entry.label??''),Id:record.Id??record.id??'',
     __collectionLabel:String(entry.label??''),__collectionValue:entry.value,
     __collectionManual:!entry.record,__collectionIndex:index};
  }
  return {Id:'',Name:item===null||item===undefined?'':String(item),
   __collectionLabel:item===null||item===undefined?'':String(item),
   __collectionValue:item,__collectionManual:true,__collectionIndex:index};
 });
}
