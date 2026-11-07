import {useEffect,useState} from 'react';
import type {PageMutationDetail} from './pageMutationScope';
import type {FieldMetadata,ObjectMetadata} from '../../metadata/Definitions/metadata';
import {pageComponentSessionRelatedQuery,pageComponentRelatedQuery,
 pageComponentActiveRecordQuery,hasPageActiveRecordSelection,
 type PageQueryFilter} from './pageComponentBindings';

type RelatedScope={blocked:boolean;filter?:PageQueryFilter};
type RecordPage={records:Record<string,unknown>[];total:number};
type CachedRelatedQuery={scopeKey:string;query:RelatedScope};
/** Parent lookups are refreshed only for parent mutations or unknown Flow writes. */
export function shouldRevalidateSessionParent(
 detail:PageMutationDetail|undefined,pageSessionKey:string,sessionId:string,
 parentObjects:readonly string[]
):boolean{
 if(!detail||detail.pageSessionKey!==pageSessionKey)return false;
 if(detail.sessionId&&detail.sessionId!==sessionId)return false;
 if(!Array.isArray(detail.objectApiNames)||detail.objectApiNames.length===0)return true;
 return detail.objectApiNames.some(name=>parentObjects.includes(name));
}

/** Retain the authorised parent filter during same-session revalidation only. */
export function visibleSessionRelatedQuery(enabled:boolean,scopeKey:string,
 cached:CachedRelatedQuery|null):RelatedScope{
 return enabled&&cached?.scopeKey===scopeKey?cached.query:{blocked:true};
}
type RecordLoader=(objectApiName:string,query:{
 limit:number;offset:number;filter:{field:string;value:string;related:boolean}
})=>Promise<RecordPage>;

/** A page-local, permission-checked session lookup; never caches across tenants. */
export function usePageSessionRelatedQuery(
 enabled:boolean,fields:ReadonlyArray<FieldMetadata>,objects:ReadonlyArray<ObjectMetadata>,
 sessionId:string,revision:number,load:RecordLoader,pageSessionKey=''
):RelatedScope{
 const scopeKey=JSON.stringify([enabled,sessionId,fields
  .filter(field=>field.relationship).map(field=>[field.apiName,field.relationship?.targetObject]),
  objects.filter(object=>object.fields.some(field=>field.apiName==='SessionKey'))
   .map(object=>object.apiName)]);
 // Child-record writes need not repeat every parent SessionKey lookup.
 const parentObjects=[...new Set(fields.filter(field=>field.relationship)
  .map(field=>field.relationship!.targetObject).filter(name=>objects.some(object=>
   object.apiName===name&&object.fields.some(field=>field.apiName==='SessionKey'))))];
 const parentKey=JSON.stringify(parentObjects);
 const [parentRevision,setParentRevision]=useState(0);
 useEffect(()=>{
  if(!enabled||!pageSessionKey)return;
  const changed=(event:Event)=>{
   const detail=(event as CustomEvent<PageMutationDetail>).detail;
   if(shouldRevalidateSessionParent(detail,pageSessionKey,sessionId,parentObjects))
    setParentRevision(value=>value+1);
  };
  window.addEventListener('metadrive:page-flow-mutated',changed);
  return ()=>window.removeEventListener('metadrive:page-flow-mutated',changed);
 },[enabled,pageSessionKey,sessionId,parentKey]);
 // Older callers without page identity retain revision-driven behavior.
 const requestKey=JSON.stringify([scopeKey,pageSessionKey?parentRevision:revision]);
 const [result,setResult]=useState<CachedRelatedQuery|null>(null);
 useEffect(()=>{
  if(!enabled)return;
  let active=true;
  void pageComponentSessionRelatedQuery(fields,objects,sessionId,
   (objectApiName,sessionKey)=>load(objectApiName,{
    limit:2,offset:0,filter:{field:'SessionKey',value:sessionKey,related:false}
   })).then(query=>{if(active)setResult({scopeKey,query});});
  return()=>{active=false;};
 },[requestKey]);
 return visibleSessionRelatedQuery(enabled,scopeKey,result);
}

/**
 * One shared resolution contract for the app Page Runtime and standalone
 * metadata-bound components. A configured parent picker always has precedence;
 * otherwise active record Flow state wins, followed by session discovery.
 */
export function usePageComponentRelatedScope(
 properties:Readonly<Record<string,unknown>>,componentType:string,
 fields:ReadonlyArray<FieldMetadata>,objects:ReadonlyArray<ObjectMetadata>,
 pageState:Readonly<Record<string,unknown>>,sessionId:string,revision:number,
 load:RecordLoader,manualParentId:unknown,disableActions:boolean,pageSessionKey=''
):{relatedQuery:RelatedScope;relatedField:string;parentId:unknown}{
 const relatedKey=String(properties.relatedFilterKey??'');
 const auto=properties.autoRecordScope===true||
  (properties.autoRecordScope!==false && ['smart_cart','Custom:smart_cart'].includes(componentType));
 const selected=hasPageActiveRecordSelection(fields,pageState);
 const direct=pageComponentActiveRecordQuery(fields,pageState);
 const session=usePageSessionRelatedQuery(auto&&!relatedKey&&!selected&&!disableActions,
  fields,objects,sessionId,revision,load,pageSessionKey);
 const relatedQuery=relatedKey
  ?pageComponentRelatedQuery(properties as Record<string,unknown>,fields,manualParentId)
  :auto?(selected?direct:session)
   :pageComponentRelatedQuery(properties as Record<string,unknown>,fields,undefined);
 return {
  relatedQuery,
  relatedField:relatedKey?String(properties.relatedFieldApiName??''):relatedQuery.filter?.field??'',
  parentId:relatedKey?manualParentId:relatedQuery.filter?.value
 };
}
