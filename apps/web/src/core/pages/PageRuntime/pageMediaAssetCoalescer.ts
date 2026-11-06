/** Share only simultaneous authorised media requests. Never cache response
 * bodies after completion and never share across credential identities.
 * The existing Record/media API is still the OneEngine permission authority.
 */
type Request=<T>(path:string,init?:RequestInit)=>Promise<T>;
const inFlight=new WeakMap<Request,Map<string,Promise<unknown>>>();
const validMediaId=/^[0-9a-f-]{36}$/i;
export function requestPageMediaAsset<T>(
 request:Request,id:string,authorizationIdentity:string
):Promise<T>{
 if(!validMediaId.test(id))return Promise.reject(Error('Invalid media asset ID'));
 if(!authorizationIdentity)return request<T>('/media-assets/'+id);
 let entries=inFlight.get(request);
 if(!entries){entries=new Map();inFlight.set(request,entries);}
 const key=authorizationIdentity+'|'+id;
 const found=entries.get(key);
 if(found)return found as Promise<T>;
 if(entries.size>=128)return request<T>('/media-assets/'+id);
 const pending=request<T>('/media-assets/'+id);
 entries.set(key,pending);
 void pending.then(()=>{if(entries!.get(key)===pending)entries!.delete(key);},
  ()=>{if(entries!.get(key)===pending)entries!.delete(key);});
 return pending;
}
