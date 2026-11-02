import {useEffect,useRef,useState} from 'react';
import {Parser,type Expression} from '../../../../../server/src/expression-engine/FormulaParser.js';
import {tokenize} from '../../../../../server/src/expression-engine/FormulaTokenizer.js';
import {evaluateCollectionFormula} from '../../../component-libraries/shared/FieldExpression.js';
import {loadFlowScreenRecordPage} from '../../authentication/Client/authClient';
import type {ObjectMetadata} from '../../metadata/Definitions/metadata';
import {registerSessionCollection,useSessionCollectionSnapshot} from './pageCollectionSession';
import {formulaCollectionReferenceKey} from '../../../../../server/src/expression-engine/FormulaCollection.js';
import {parseCollectionListBinding,filteredCollectionItems} from './pageCollectionListBinding';

type Row=Record<string,unknown>;
export type PageNamedCollection={name:string;key?:string;items:unknown[]};
type SourceResult={key:string;records:Record<string,Row[]>;error?:string};

export function collectionFormulaReferences(formula:string,primaryObject='',namedCollections:Readonly<Record<string,PageNamedCollection>>={}):Array<{object:string;field:string}>{
 if(!/\bCOLLECTION\s*\(/i.test(formula))return [];
 const found=new Map<string,{object:string;field:string}>();
 const visit=(node:Expression,insideCollection=false):void=>{
  if(node.kind==='reference'&&insideCollection){
   const match=/^([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z][A-Za-z0-9_]*)$/.exec(node.value);
   if(match)found.set(match[0],{object:match[1],field:match[2]});
   else if(primaryObject&&!Object.keys(namedCollections).some(name=>name.toLowerCase()===node.value.toLowerCase())
     &&/^[A-Za-z][A-Za-z0-9_]*$/.test(node.value)
     &&!['state','session','event'].includes(node.value.toLowerCase()))
     found.set(primaryObject+'.'+node.value,{object:primaryObject,field:node.value});
  }else if(node.kind==='call')node.args.forEach(arg=>visit(arg,insideCollection||node.name==='COLLECTION'));
  else if(node.kind==='unary')visit(node.value,insideCollection);
  else if(node.kind==='binary'){visit(node.left,insideCollection);visit(node.right,insideCollection);}
 };
 try{visit(new Parser(tokenize(formula.trim().replace(/^=\s*/,''))).parse());}catch{/* evaluator reports syntax errors */}
 return [...found.values()];
}

/** Source queries are standard RBAC-protected Object API reads. Formula evaluation
 * never fetches data, and no incomplete record page is presented as a collection.
 * This hook is reusable by any metadata collection consumer, not Smart Tabs only.
 */
export function usePageCollectionFormula(
 formula:unknown,properties:Readonly<Row>,objects:readonly ObjectMetadata[],
 primaryObject:string,primaryRecords:readonly Row[],primaryTotal:number,
 revision:number,pageState:Readonly<Row>,sessionId:string,pageSessionKey:string,componentId:string
):{collection:PageNamedCollection|null;error:string|null;loading:boolean}{
 const declared=typeof formula==='string'?formula.trim():'';
 // A Collection is authored in any existing formula property. The old hidden
 // collectionFormula metadata remains readable for previously published pages.
 const expressions=Object.entries(properties).filter(([key,value])=>
   key!=='collectionFormula'&&typeof value==='string').map(([,value])=>String(value).trim());
 const explicit=expressions.find(value=>/^=\s*(?:IF|IFERROR|COLLECTION)\s*\(/i.test(value))
   ??expressions.find(value=>/^=\s*@[A-Za-z][A-Za-z0-9_]{0,79}$/.test(value));
 const reference=expressions.find(value=>/^@[A-Za-z][A-Za-z0-9_]{0,79}$/.test(value));
 const listExpression=expressions.find(value=>Boolean(parseCollectionListBinding(value,primaryObject)));
 // List-expression metadata is distinct from scalar Boolean expressions. A
 // source binding selects records; individual row property formulas remain scalar.
 const entered=explicit||listExpression||declared||reference||'';
 const source=entered.startsWith('=')?entered.slice(1).trim():entered;
 const scope=pageSessionKey+'#'+sessionId;
 const lastValid=useRef<{object:string;collection:PageNamedCollection}|null>(null);
 const listBinding=parseCollectionListBinding(source,primaryObject);
 const registry=useSessionCollectionSnapshot(scope);
 const namedListSource=listBinding?Object.entries(registry.collections)
  .find(([key,collection])=>key.toLowerCase()===listBinding.field.toLowerCase()
   ||collection.name.toLowerCase()===listBinding.field.toLowerCase())?.[1]:undefined;
 const refs=listBinding&&!namedListSource?[{object:listBinding.object,field:listBinding.field}]:
  collectionFormulaReferences(source,primaryObject,registry.collections);
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
 const result=(()=>{
 if(!source)return {collection:null,error:null,loading:false};
 const saved=/^@([A-Za-z][A-Za-z0-9_]{0,79})$/.exec(source);
 if(saved){
  const named=Object.entries(registry.collections).find(([name])=>name.toLowerCase()===saved[1].toLowerCase())?.[1];
  return named?{collection:named,error:null,loading:false}:
   {collection:null,error:null,loading:false};
 }
 if(!listBinding&&!/\bCOLLECTION\s*\(/i.test(source))
  return {collection:null,error:null,loading:false};
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
 if(listBinding){
  const rows=namedListSource?namedCollectionRows(namedListSource):sources[listBinding.object]??[];
  const criteria=namedListSource?{...listBinding,field:'Name'}:listBinding;
  return {collection:{name:'__filtered_list__',
    items:filteredCollectionItems(criteria,rows)},error:null,loading:false};
 }
 const resolved=evaluateCollectionFormula(source,sources,{state:pageState,session:{id:sessionId},primaryObject,
  namedCollections:registry.collections});
 const value=resolved.value as PageNamedCollection|null;
 return {collection:value?{...value,key:formulaCollectionReferenceKey(value.name)}:null,
   error:resolved.error??null,loading:false};
 })();
 const recoverable=Boolean(result.error&&/^COLLECTION has a blank value|^Invalid Flow formula|^COLLECTION requires|^Unexpected|^Unterminated/.test(result.error));
 // Keep the last successful rendering when legacy persisted metadata contains
 // an invalid expression. Do not turn parser errors into visible list items.
 if(result.collection&&result.collection.name!=='__filtered_list__')
   lastValid.current={object:primaryObject,collection:result.collection};
 const visible=recoverable?{collection:lastValid.current?.object===primaryObject
   ?lastValid.current.collection:null,error:null,loading:false}:result;
 const owned=/\bCOLLECTION\s*\(/i.test(source)?visible.collection:null;
 const identity=owned?JSON.stringify(owned):'';
 useEffect(()=>registerSessionCollection(scope,componentId,owned),[scope,componentId,identity]);
 const duplicate=registry.errors[componentId];
 return duplicate?{collection:null,error:duplicate,loading:false}:visible;
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
   return {...record,Name:String(entry.label??''),Id:record.Id??record.id??entry.value??'',
     __collectionLabel:String(entry.label??''),__collectionValue:entry.value,
     __collectionCriteriaField:typeof (item as Row).criteriaField==='string'?(item as Row).criteriaField:'',
     __collectionCriteria:typeof (item as Row).criteria==='string'?(item as Row).criteria:'',
     __collectionManual:!entry.record,__collectionIndex:index};
  }
  return {Id:'',Name:item===null||item===undefined?'':String(item),
   __collectionLabel:item===null||item===undefined?'':String(item),
   __collectionValue:item,__collectionManual:true,__collectionIndex:index};
 });
}
