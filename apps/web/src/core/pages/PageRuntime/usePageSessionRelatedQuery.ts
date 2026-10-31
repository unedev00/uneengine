import {useEffect,useState} from 'react';
import type {FieldMetadata,ObjectMetadata} from '../../metadata/Definitions/metadata';
import {pageComponentSessionRelatedQuery,type PageQueryFilter} from './pageComponentBindings';

type RelatedScope={blocked:boolean;filter?:PageQueryFilter};
type RecordPage={records:Record<string,unknown>[];total:number};
type RecordLoader=(objectApiName:string,query:{
 limit:number;offset:number;filter:{field:string;value:string;related:boolean}
})=>Promise<RecordPage>;

/** A page-local, permission-checked session lookup; never caches across tenants. */
export function usePageSessionRelatedQuery(
 enabled:boolean,fields:ReadonlyArray<FieldMetadata>,objects:ReadonlyArray<ObjectMetadata>,
 sessionId:string,revision:number,load:RecordLoader
):RelatedScope{
 const key=JSON.stringify([enabled,sessionId,revision,fields
  .filter(field=>field.relationship).map(field=>[field.apiName,field.relationship?.targetObject]),
  objects.filter(object=>object.fields.some(field=>field.apiName==='SessionKey'))
   .map(object=>object.apiName)]);
 const [result,setResult]=useState<{key:string;query:RelatedScope}|null>(null);
 useEffect(()=>{
  if(!enabled)return;
  let active=true;
  void pageComponentSessionRelatedQuery(fields,objects,sessionId,
   (objectApiName,sessionKey)=>load(objectApiName,{
    limit:2,offset:0,filter:{field:'SessionKey',value:sessionKey,related:false}
   })).then(query=>{if(active)setResult({key,query});});
  return()=>{active=false;};
 },[key]);
 return enabled&&result?.key===key?result.query:{blocked:true};
}
