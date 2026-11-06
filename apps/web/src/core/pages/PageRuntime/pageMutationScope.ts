/** Object-scoped page invalidation. Unscoped events remain compatible with existing Flows. */
export type PageMutationDetail={
 pageSessionKey?:string;
 sessionId?:string;
 /** Exact objects written by a Formula/record action; omitted for unknown Flow writes. */
 objectApiNames?:readonly string[];
};

export function shouldInvalidatePageComponent(detail:PageMutationDetail|undefined,
 pageSessionKey:string,sessionId:string,readObjectApiNames:readonly string[]):boolean{
 if(detail?.pageSessionKey!==pageSessionKey)return false;
 // A new cart/page session must reset all consumers, even of otherwise unrelated objects.
 if(detail.sessionId&&detail.sessionId!==sessionId)return true;
 // Legacy and Flow events have unknown write sets: preserve the safe broad refresh.
 if(!Array.isArray(detail.objectApiNames)||detail.objectApiNames.length===0)return true;
 return readObjectApiNames.some(name=>Boolean(name)&&detail.objectApiNames!.includes(name));
}
