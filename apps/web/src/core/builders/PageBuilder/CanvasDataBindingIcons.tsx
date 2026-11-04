import {useLayoutEffect,useRef,useState} from 'react';
import {Database} from 'lucide-react';
import type {UneRibbonProperty} from './uneBuilderPropertyInventory';
import type {CanvasBindingTarget} from './canvasDataBindingTargets';
import './CanvasDataBindingIcons.css';

type Target=Pick<CanvasBindingTarget,'propertyKey'|'itemIndex'|'itemId'>;
type IconPosition=Target&{key:string;label:string;x:number;y:number};
type Rect={left:number;top:number;right:number;bottom:number;width:number;height:number};
const ICON_SIZE=22;
const SPACING=4;
const labels:Record<string,Record<string,string>>={
 smart_tabs:{tabCaptionFormula:'Tab caption',textSource:'Tab caption',collectionFormula:'Tabs data source'},
 smart_lookup:{label:'Search placeholder',lookupValueFormula:'Search value',textSource:'Result text',
  collectionFormula:'Lookup results source'},
 smart_cart:{label:'Cart title',collectionFormula:'Cart items source',textSource:'Product name',
  imageSource:'Product image',cartSupportingSource:'Item count / supporting text'},
 smart_calendar:{selectedDate:'Selected date'},
 smart_card_grid:{collectionFormula:'Product items source',textSource:'Product title'},
 smart_table:{textSource:'Table data source'},
 smart_navigation:{collectionFormula:'Navigation items source',textSource:'Item caption'}
};
const validRect=(r:Rect)=>Number.isFinite(r.left)&&Number.isFinite(r.top)&&r.width>0&&r.height>0;
const overlaps=(a:{x:number;y:number},b:{x:number;y:number})=>
 Math.abs(a.x-b.x)<ICON_SIZE+SPACING&&Math.abs(a.y-b.y)<ICON_SIZE+SPACING;
function clipRect(element:HTMLElement,host:HTMLElement):Rect|null{
 const actual=element.getBoundingClientRect();
 if(!validRect(actual))return null;
 let left=actual.left,top=actual.top,right=actual.right,bottom=actual.bottom;
 for(let node=element.parentElement;node&&node!==host;node=node.parentElement){
  const style=getComputedStyle(node);
  if(!/(auto|scroll|hidden|clip)/.test(style.overflowX+' '+style.overflowY))continue;
  const clip=node.getBoundingClientRect();
  left=Math.max(left,clip.left);top=Math.max(top,clip.top);
  right=Math.min(right,clip.right);bottom=Math.min(bottom,clip.bottom);
 }
 if(right-left<8||bottom-top<8)return null;
 return {left,top,right,bottom,width:right-left,height:bottom-top};
}
function textRect(element:HTMLElement):Rect|null{
 // Bind an icon to the visible caption, rather than the far edge of a large
 // card, column or container. Inputs have no measurable caption text nodes.
 for(const node of element.childNodes){
  if(node.nodeType!==Node.TEXT_NODE||!(node.textContent??'').trim())continue;
  const range=document.createRange();
  range.selectNodeContents(node);
  const rect=range.getBoundingClientRect();
  if(validRect(rect))return rect;
 }
 return null;
}
function spot(rect:Rect,anchor:Rect,propertyKey:string,index:number,used:IconPosition[]){
 const top=anchor.top-rect.top;
 const middle=top+(anchor.height-ICON_SIZE)/2;
 const right=anchor.right-rect.left;
 const left=anchor.left-rect.left;
 const candidates:{x:number;y:number}[]=[
  // Tabs always keep their source icon in their own caption box.
  ...(propertyKey==='tabCaptionFormula'?[{x:right-ICON_SIZE-2,y:top+2}]:[]),
  {x:right+SPACING+index*(ICON_SIZE+SPACING),y:middle},
  {x:right-ICON_SIZE-2-index*(ICON_SIZE+SPACING),y:top+2},
  {x:left-ICON_SIZE-SPACING-index*(ICON_SIZE+SPACING),y:middle},
  {x:left+2+index*(ICON_SIZE+SPACING),y:top+2}
 ];
 for(const candidate of candidates){
  if(candidate.x<2||candidate.y<2||candidate.x+ICON_SIZE>rect.width-2||
     candidate.y+ICON_SIZE>rect.height-2)continue;
  if(used.some(other=>overlaps(other,candidate)))continue;
  return candidate;
 }
 return null; // Never manufacture a grid of unanchored fallback icons.
}
/** Builder-only overlay. Metadata selects eligible properties; visible runtime
 * field anchors select their actual positions. No icon exists without a field. */
export default function CanvasDataBindingIcons({componentId,api,definitions,active,onChoose}:{
 componentId:string;api:string;definitions:readonly UneRibbonProperty[];
 active?:CanvasBindingTarget|null;
 onChoose:(target:Omit<CanvasBindingTarget,'componentId'|'requestId'>)=>void;
}){
 const root=useRef<HTMLDivElement>(null);
 const [icons,setIcons]=useState<IconPosition[]>([]);
 useLayoutEffect(()=>{
  const overlay=root.current,host=overlay?.closest<HTMLElement>('[data-component-id]');
  if(!host)return;
  const allowed=new Map(definitions.filter(p=>p.tab==='Data'&&p.components.includes(api)&&
   (p.kindOverrides?.[api]??p.kind)==='expression')
   .map(p=>[p.id,labels[api]?.[p.id]??p.label]));
  let frame=0;
  const position=()=>{
   frame=0;
   const hostRect=host.getBoundingClientRect();
   if(!validRect(hostRect)){setIcons([]);return;}
   const next:IconPosition[]=[];
   const selected=new Set<string>();
   for(const element of host.querySelectorAll<HTMLElement>('[data-md-bind]')){
    // Nested components manage their own bindings when selected.
    if(element.closest('[data-component-id]')!==host)continue;
    const clipped=clipRect(element,host);
    if(!clipped)continue;
    const caption=textRect(element);
    const anchor=caption&&validRect(caption)?caption:clipped;
    const properties=(element.dataset.mdBind??'').trim().split(/\s+/).filter(Boolean);
    properties.forEach((propertyKey,index)=>{
     const label=allowed.get(propertyKey);
     if(!label)return;
     const indexText=element.dataset.mdBindIndex;
     const itemIndex=indexText===undefined?undefined:Number(indexText);
     const itemId=element.dataset.mdBindItem||undefined;
     // Repeated record rows are ONE binding. Static tabs instead have one
     // independent caption formula per tab (stable item identity).
     const perItem=propertyKey==='tabCaptionFormula';
     const identity=perItem?itemId??String(itemIndex??0):'shared';
     const key=propertyKey+':'+identity;
     if(selected.has(key))return;
     selected.add(key);
     const pos=spot(hostRect,anchor,propertyKey,index,next);
     if(!pos)return;
     next.push({key,propertyKey,label,x:pos.x,y:pos.y,
      ...(perItem?{itemIndex:Number.isFinite(itemIndex)?itemIndex:undefined,itemId}: {})});
    });
   }
   setIcons(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(position);};
  const resize=new ResizeObserver(schedule);
  resize.observe(host);
  const observer=new MutationObserver(mutations=>{
   // Moving one of our own buttons must not trigger a re-render feedback loop.
   if(mutations.every(change=>change.target instanceof Element&&
     change.target.closest('.canvas-data-bindings')))return;
   schedule();
  });
  observer.observe(host,{childList:true,subtree:true,characterData:true});
  host.addEventListener('scroll',schedule,true);
  window.addEventListener('resize',schedule);
  schedule();
  return ()=>{
   if(frame)cancelAnimationFrame(frame);
   resize.disconnect();observer.disconnect();
   host.removeEventListener('scroll',schedule,true);
   window.removeEventListener('resize',schedule);
  };
 },[componentId,api,definitions]);
 return <div ref={root} className="canvas-data-bindings" role="group" aria-label="Selected component data bindings">
  {icons.map(icon=><button key={icon.key} type="button"
   className={'canvas-data-icon-button'+(active?.componentId===componentId&&
    active.propertyKey===icon.propertyKey&&active.itemId===icon.itemId&&
    active.itemIndex===icon.itemIndex?' is-active':'')}
   style={{left:icon.x,top:icon.y}}
   title={'Edit '+icon.label+' in Data formula bar'}
   aria-label={'Edit '+icon.label+' data source'}
   onPointerDown={event=>event.stopPropagation()}
   onClick={event=>{event.preventDefault();event.stopPropagation();
    onChoose({propertyKey:icon.propertyKey,itemIndex:icon.itemIndex,itemId:icon.itemId});}}>
   <Database aria-hidden="true" size={14}/>
  </button>)}
 </div>;
}
