/** Build list queries from explicitly authorised server-side view IDs.
 * Filters, visibility and scope are resolved by the Record API, not the browser.
 */
export function standardListQuery(args:{
 limit:number;offset:number;search:string;sort:string;direction:'asc'|'desc';
 savedViewId?:string;recordFilter?:{field:string;recordId:string};
}):string{
 const params=new URLSearchParams({limit:String(args.limit),offset:String(args.offset)});
 if(args.savedViewId)params.set('viewId',args.savedViewId);
 if(args.search.trim())params.set('search',args.search.trim());
 if(args.sort){params.set('sortField',args.sort);params.set('sortDirection',args.direction);}
 if(args.recordFilter){
   params.set('relatedField',args.recordFilter.field);
   params.set('relatedId',args.recordFilter.recordId);
 }
 return params.toString();
}
