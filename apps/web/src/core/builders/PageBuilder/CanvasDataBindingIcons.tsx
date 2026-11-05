import {useLayoutEffect,useRef,useState} from 'react';
import {Database} from 'lucide-react';
import type {UneRibbonProperty} from './uneBuilderPropertyInventory';
import {bindingDisplayLabel,type CanvasBindingTarget} from './canvasDataBindingTargets';
import './CanvasDataBindingIcons.css';

type Target=Pick<CanvasBindingTarget,'propertyKey'|'itemIndex'|'itemId'>;
type IconPosition=Target&{key:string;label:string;x:number;y:number};
type Rect={left:number;top:number;right:number;bottom:number;width:number;height:number};
const ICON_SIZE=22;
const SPACING=4;
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
type Box={w:number;h:number};
/** Positions are computed in the host's own (unscaled) CSS pixels so icons
 * stay on their field at every canvas zoom level. */
function local(anchor:Rect,host:Rect,sx:number,sy:number):Rect{
 const left=(anchor.left-host.left)/sx,top=(anchor.top-host.top)/sy;
 const width=anchor.width/sx,height=anchor.height/sy;
 return {left,top,right:left+width,bottom:top+height,width,height};
}
function spot(box:Box,a:Rect,propertyKey:string,index:number,caption:boolean,used:IconPosition[]){
 const step=index*(ICON_SIZE+SPACING);
 const middle=a.top+(a.height-ICON_SIZE)/2;
 const centreX=a.left+(a.width-ICON_SIZE)/2;
 const large=a.width>=ICON_SIZE*3&&a.height>=ICON_SIZE*2;
 const candidates:{x:number;y:number}[]=propertyKey==='tabCaptionFormula'
  // Tabs always keep their source icon in their own caption box.
  ?[{x:a.right-ICON_SIZE-2-step,y:a.top+2}]
  :caption
  // Text: directly after the visible caption, vertically centred on it.
  ?[{x:a.right+SPACING+step,y:middle},{x:a.left-ICON_SIZE-SPACING-step,y:middle},
    {x:a.right-ICON_SIZE-2-step,y:middle}]
  // Image / box / input: centred in the field when there is room, otherwise
  // inside its right edge, vertically centred.
  :large
  ?[{x:centreX+step,y:middle},{x:centreX-step,y:middle}]
  :[{x:a.right-ICON_SIZE-4-step,y:middle},{x:a.right+SPACING+step,y:middle}];
 const fits=(c:{x:number;y:number})=>c.x>=2&&c.y>=2&&
  c.x+ICON_SIZE<=box.w-2&&c.y+ICON_SIZE<=box.h-2;
 for(const candidate of candidates){
  if(!fits(candidate))continue;
  if(used.some(other=>overlaps(other,candidate)))continue;
  return candidate;
 }
 // Still anchored to the field: clamp its first spot inside the component.
 const first=candidates[0];
 if(first){
  const clamped={x:Math.min(Math.max(2,first.x),box.w-ICON_SIZE-2),
   y:Math.min(Math.max(2,first.y),box.h-ICON_SIZE-2)};
  if(fits(clamped)&&!used.some(other=>overlaps(other,clamped)))return clamped;
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
   p.id!=='collectionFormula'&&(p.kindOverrides?.[api]??p.kind)==='expression')
   .map(p=>[p.id,bindingDisplayLabel(api,p.id,p.label)]));
  let frame=0;
  const position=()=>{
   frame=0;
   const hostRect=host.getBoundingClientRect();
   if(!validRect(hostRect)){setIcons([]);return;}
   // Canvas zoom scales the host with a transform; undo it for positioning.
   const sx=host.offsetWidth>0?hostRect.width/host.offsetWidth:1;
   const sy=host.offsetHeight>0?hostRect.height/host.offsetHeight:1;
   const box={w:host.offsetWidth||hostRect.width,h:host.offsetHeight||hostRect.height};
   const watched=new Set<Element>();
   const next:IconPosition[]=[];
   const selected=new Set<string>();
   for(const element of host.querySelectorAll<HTMLElement>('[data-md-bind]')){
    // Nested components manage their own bindings when selected.
    if(element.closest('[data-component-id]')!==host)continue;
    watched.add(element);
    const clipped=clipRect(element,host);
    if(!clipped)continue;
    const caption=textRect(element);
    const isCaption=element.dataset.mdBind!=='tabCaptionFormula'&&Boolean(caption&&validRect(caption));
    const anchor=local(isCaption?caption!:clipped,hostRect,sx,sy);
    const properties=(element.dataset.mdBind??'').trim().split(/\s+/).filter(Boolean);
    const titles=(element.dataset.mdBindTitles??'').split('|');
    properties.forEach((propertyKey,index)=>{
     const label=allowed.get(propertyKey);
     if(!label)return;
     const displayLabel=titles[index]?.trim()||label;
     const indexText=element.dataset.mdBindIndex;
     const itemIndex=indexText===undefined?undefined:Number(indexText);
     const itemId=element.dataset.mdBindItem||undefined;
     // Repeated record rows are ONE binding. Static tabs instead have one
     // independent caption formula per tab (stable item identity).
     const perItem=propertyKey==='tabCaptionFormula';
     const identity=perItem?itemId??String(itemIndex??0):'shared';
     const key=propertyKey+':'+identity;
     if(selected.has(key))return;
     const pos=spot(box,anchor,propertyKey,index,isCaption,next);
     // Try the next visible row/card if this one has no room for the icon.
     if(!pos)return;
     selected.add(key);
     next.push({key,propertyKey,label:displayLabel,x:pos.x,y:pos.y,
      ...(perItem?{itemIndex:Number.isFinite(itemIndex)?itemIndex:undefined,itemId}: {})});
    });
   }
   // Fields that load or resize later (images, async records) re-position.
   for(const element of watched)if(!observedFields.has(element)){observedFields.add(element);resize.observe(element);}
   setIcons(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
  };
  const observedFields=new WeakSet<Element>();
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(position);};
  const resize=new ResizeObserver(schedule);
  resize.observe(host);
  const observer=new MutationObserver(mutations=>{
   // Moving one of our own buttons must not trigger a re-render feedback loop.
   if(mutations.every(change=>change.target instanceof Element&&
     change.target.closest('.canvas-data-bindings')))return;
   schedule();
  });
  observer.observe(host,{childList:true,subtree:true,characterData:true,
   attributes:true,attributeFilter:['data-md-bind','style','class','src']});
  // Images change size without DOM mutations once they finish loading.
  host.addEventListener('load',schedule,true);
  host.addEventListener('scroll',schedule,true);
  window.addEventListener('resize',schedule);
  schedule();
  return ()=>{
   if(frame)cancelAnimationFrame(frame);
   resize.disconnect();observer.disconnect();
   host.removeEventListener('scroll',schedule,true);
   host.removeEventListener('load',schedule,true);
   window.removeEventListener('resize',schedule);
  };
 },[componentId,api,definitions]);
 return <div ref={root} className="canvas-data-bindings" role="group" aria-label="Selected component data bindings">
  {icons.map(icon=><button key={icon.key} type="button"
   className={'canvas-data-icon-button'+(active?.componentId===componentId&&
    active.propertyKey===icon.propertyKey&&(active.itemId??null)===(icon.itemId??null)&&
    (active.itemIndex??null)===(icon.itemIndex??null)?' is-active':'')}
   aria-pressed={active?.componentId===componentId&&active.propertyKey===icon.propertyKey}
   style={{left:icon.x,top:icon.y}} data-binding-property={icon.propertyKey}
   data-binding-item={icon.itemId??icon.itemIndex}
   title={'Edit '+icon.label+' in Data formula bar'}
   aria-label={'Edit '+icon.label+' data source'}
   draggable={false}
   onPointerDown={event=>event.stopPropagation()}
   onMouseDown={event=>event.stopPropagation()}
   onDragStart={event=>{event.preventDefault();event.stopPropagation();}}
   onClick={event=>{event.preventDefault();event.stopPropagation();
    onChoose({propertyKey:icon.propertyKey,itemIndex:icon.itemIndex,itemId:icon.itemId,displayLabel:icon.label});}}>
   <Database aria-hidden="true" size={14}/>
  </button>)}
 </div>;
}
