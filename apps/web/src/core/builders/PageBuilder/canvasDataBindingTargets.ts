/** Builder-only targets. The persisted component stays the single source of truth. */
export type CanvasBindingTarget={
 componentId:string;propertyKey:string;itemIndex?:number;itemId?:string;requestId:number;
};
type Props=Record<string,unknown>;
type Tab={id:string;label:string;[key:string]:unknown};
const asTab=(entry:unknown,index:number):Tab=>{
 if(entry&&typeof entry==='object'&&!Array.isArray(entry)){
  const row=entry as Record<string,unknown>;
  return {...row,id:typeof row.id==='string'&&row.id?row.id:'static-tab-'+index,
   label:String(row.label??'Tab '+(index+1))};
 }
 return {id:'static-tab-'+index,label:typeof entry==='string'?entry:'Tab '+(index+1)};
};
export function tabCaptionIndex(properties:Props,target:Pick<CanvasBindingTarget,'itemId'|'itemIndex'>):number{
 const rows=Array.isArray(properties.tabs)?properties.tabs:[];
 if(target.itemId){
  const found=rows.findIndex((row,i)=>asTab(row,i).id===target.itemId);
  if(found>=0)return found;
 }
 return Number.isInteger(target.itemIndex)&&Number(target.itemIndex)>=0
  ?Number(target.itemIndex):0;
}
export function readCanvasBinding(properties:Props,target:Pick<CanvasBindingTarget,'propertyKey'|'itemId'|'itemIndex'>,valueKey?:string):string{
 if(target.propertyKey!=='tabCaptionFormula')return String(properties[valueKey??target.propertyKey]??'');
 const index=tabCaptionIndex(properties,target);
 const raw=Array.isArray(properties.tabs)?properties.tabs[index]:undefined;
 return asTab(raw,index).label;
}
export function writeCanvasBinding(properties:Props,target:Pick<CanvasBindingTarget,'propertyKey'|'itemId'|'itemIndex'>,value:string,valueKey?:string):Props{
 if(target.propertyKey!=='tabCaptionFormula')
  return {...properties,[valueKey??target.propertyKey]:value,
   ...(target.propertyKey==='imageSource'?{imageSourceMode:'field'}:{})};
 const count=Math.max(1,Math.min(20,Number(properties.tabCount)||3));
 const original=Array.isArray(properties.tabs)&&properties.tabs.length
  ?properties.tabs:Array.from({length:count},(_,i)=>i===0&&typeof properties.label==='string'&&
     properties.label&&!properties.label.startsWith('@')?properties.label:'Tab '+(i+1));
 const tabs=original.map(asTab);
 const index=tabCaptionIndex(properties,target);
 if(index<0||index>=tabs.length)return properties;
 tabs[index]={...tabs[index],label:value};
 return {...properties,tabs};
}
