/** Object-scoped page invalidation. Unscoped events remain compatible with existing Flows. */
export type SavedRecordMutation={
 objectApiName:string;operation:'create'|'update'|'delete';record:Readonly<Record<string,unknown>>;
};
export type PageMutationDetail={
 pageSessionKey?:string;
 sessionId?:string;
 /** Exact objects written by a Formula/record action; omitted for unknown Flow writes. */
 objectApiNames?:readonly string[];
 /** Authorized saved fields only, never the untrusted submitted write body. */
 recordChanges?:readonly SavedRecordMutation[];
};

export function shouldInvalidatePageComponent(detail:PageMutationDetail|undefined,
 pageSessionKey:string,sessionId:string,readObjectApiNames:readonly string[]):boolean{
 if(detail?.pageSessionKey!==pageSessionKey)return false;
 if(detail.sessionId&&detail.sessionId!==sessionId)return true;
 if(!Array.isArray(detail.objectApiNames)||detail.objectApiNames.length===0)return true;
 return readObjectApiNames.some(name=>Boolean(name)&&detail.objectApiNames!.includes(name));
}

/** Fast path only for an existing complete row in an already authorized,
 * unfiltered and fully loaded page. Other mutations force ordinary refresh.
 */
export function applyCompleteRecordMutation(
 rows:ReadonlyArray<Record<string,unknown>>,objectApiName:string,
 detail:PageMutationDetail|undefined
):Record<string,unknown>[]|null{
 const changes=detail?.recordChanges;
 if(!Array.isArray(changes)||!changes.length||!rows.length)return null;
 const own=changes.filter(c=>c.objectApiName===objectApiName);
 if(!own.length||own.some(c=>c.operation!=='update'||!c.record||
  typeof c.record.Id!=='string'))return null;
 if(!Array.isArray(detail?.objectApiNames)||!detail.objectApiNames.includes(objectApiName))
  return null;
 const next=rows.map(row=>({...row}));
 for(const change of own){
  const index=next.findIndex(row=>row.Id===change.record.Id);
  if(index<0)return null;
  const old=next[index];
  if(Object.keys(old).some(field=>!Object.hasOwn(change.record,field)))return null;
  next[index]={...old,...change.record};
 }
 return next;
}
