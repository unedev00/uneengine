/** In-memory cache for reviewed static bundled component renderers.
 * Tenant-authored source is never loaded here and still uses ComponentSandbox.
 * Failed loads are not cached; their next mount retries.
 */
const inFlight=new Map<string,Promise<unknown>>();
const settled=new Map<string,unknown>();
const MAX_RENDERER_ASSETS=96;

/** Every successful result is validated by the caller before being shared. */
export function loadBundledRenderer<T>(key:string,loader:()=>Promise<T>,persistent=true):Promise<T>{
 if(persistent&&settled.has(key))return Promise.resolve(settled.get(key) as T);
 const pending=inFlight.get(key);
 if(pending)return pending as Promise<T>;
 // Use Promise.resolve().then so a synchronous throw also clears in-flight state.
 const next=Promise.resolve().then(loader).then(result=>{
  inFlight.delete(key);
  if(persistent){
   settled.delete(key);
   if(settled.size>=MAX_RENDERER_ASSETS)settled.delete(settled.keys().next().value!);
   settled.set(key,result);
  }
  return result;
 },error=>{
  inFlight.delete(key);
  throw error;
 });
 inFlight.set(key,next);
 return next;
}
