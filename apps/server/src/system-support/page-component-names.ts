/** Shared, per-page component instance names; IDs remain immutable runtime keys. */
export type NamedComponent={id:string;type:string;properties:Record<string,unknown>};
export const componentNamePattern=/^[A-Za-z][A-Za-z0-9_]{0,79}$/;
export const canonicalComponentName=(name:string)=>name.trim().toLocaleLowerCase('en');
export function componentNameStem(type:string):string{
 const api=type.startsWith('Custom:')?type.slice(7):type;
 const stem=api.replace(/[^A-Za-z0-9]/g,'').toLowerCase().replace(/^[0-9]+/,'');
 return (stem||'component').slice(0,64);
}
export function componentInstanceNames(components:readonly NamedComponent[]):Map<string,string>{
 const explicit=new Set<string>(),result=new Map<string,string>();
 for(const item of components){
  const raw=item.properties?.navigatorName;
  if(typeof raw!=='string'||!raw.trim())continue;
  const name=raw.trim(),key=canonicalComponentName(name);
  // Legacy drafts may already contain duplicate navigator aliases. Never crash
  // the editor: give ambiguous instances a distinct virtual name until renamed.
  if(!componentNamePattern.test(name)||explicit.has(key))continue;
  explicit.add(key);result.set(item.id,name);
 }
 const used=new Set(explicit);
 for(const item of components){
  if(result.has(item.id))continue;
  const stem=componentNameStem(item.type);
  let n=1;
  while(used.has(canonicalComponentName(stem+n)))n++;
  const name=stem+n;
  result.set(item.id,name);used.add(canonicalComponentName(name));
 }
 return result;
}
export function ensureComponentInstanceNames<T extends NamedComponent>(components:T[]):T[]{
 const names=componentInstanceNames(components);
 return components.map(item=>{
  const assigned=names.get(item.id)!;
  return item.properties.navigatorName===assigned?item:
   {...item,properties:{...item.properties,navigatorName:assigned}};
 });
}
export function nextComponentInstanceName(components:readonly NamedComponent[],type:string,
 historicalMax=0):string{
 const stem=componentNameStem(type),names=componentInstanceNames(components);
 const regex=new RegExp('^'+stem+'([0-9]+)$','i');
 let last=historicalMax;
 for(const name of names.values()){
  const match=regex.exec(name);if(match)last=Math.max(last,Number(match[1]));
 }
 const taken=new Set([...names.values()].map(canonicalComponentName));
 let candidate=stem+(last+1);
 while(taken.has(canonicalComponentName(candidate)))candidate=stem+(++last+1);
 return candidate;
}
export function validateExplicitComponentNames(components:readonly NamedComponent[]):void{
 const seen=new Set<string>();
 for(const item of components){
  const raw=item.properties?.navigatorName;
  if(typeof raw!=='string'||!raw.trim())continue;
  const name=raw.trim(),key=canonicalComponentName(name);
  if(!componentNamePattern.test(name))throw Error('Invalid component name: '+name);
  if(seen.has(key))throw Error('Duplicate component name: '+name);
  seen.add(key);
 }
}
