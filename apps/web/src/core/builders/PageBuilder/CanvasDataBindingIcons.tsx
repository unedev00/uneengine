import {useLayoutEffect,useRef,useState} from 'react';
import {Database} from 'lucide-react';
import type {UneRibbonProperty} from './uneBuilderPropertyInventory';
import type {CanvasBindingTarget} from './canvasDataBindingTargets';
import {bindingAnchorPosition,bindingTargetIdentity,type BindingRect} from './canvasBindingIconLayout';
import './CanvasDataBindingIcons.css';

type IconPosition={key:string;propertyKey:string;label:string;x:number;y:number;itemIndex?:number;itemId?:string};
/** Builder-only: icons attach to rendered fields, never to missing metadata. */
export default function CanvasDataBindingIcons({componentId,api,definitions,active,onChoose}:{
 componentId:string;api:string;definitions:readonly UneRibbonProperty[];
 active?:CanvasBindingTarget|null;
 onChoose:(target:Omit<CanvasBindingTarget,'componentId'|'requestId'>)=>void;
}){
 const root=useRef<HTMLDivElement>(null);
 const [icons,setIcons]=useState<IconPosition[]>([]);
 useLayoutEffect(()=>{
  const host=root.current?.closest<HTMLElement>('[data-component-id]');
  if(!host)return;
  const allowed=new Map(definitions.filter(p=>p.tab==='Data'&&p.components.includes(api)&&
   (p.kindOverrides?.[api]??p.kind)==='expression').map(p=>[p.id,p.label]));
  const content=host.querySelector<HTMLElement>('.free-canvas-content-viewport')||
   host.querySelector<HTMLElement>('.smart-runtime')||
   host.querySelector<HTMLElement>('.smart-table-root')||host;
  let frame=0;
  const position=()=>{
   frame=0;
   const hostRect=host.getBoundingClientRect() as BindingRect;
   const next:IconPosition[]=[];
   const seen=new Set<string>();
   for(const element of host.querySelectorAll<HTMLElement>('[data-md-bind]')){
    if(element.closest('[data-component-id]')!==host)continue;
    const bounds=element.getBoundingClientRect() as BindingRect;
    if(!bounds.width||!bounds.height||bounds.bottom<=hostRect.top||
       bounds.top>=hostRect.bottom||bounds.right<=hostRect.left||bounds.left>=hostRect.right)continue;
    // Do not place icons for rows that are scrolled or clipped out of view.
    let clipped=false;
    for(let ancestor=element.parentElement;ancestor&&ancestor!==host;ancestor=ancestor.parentElement){
     const computed=getComputedStyle(ancestor);
     if(!/(auto|scroll|hidden|clip)/.test(computed.overflowX+' '+computed.overflowY))continue;
     const clip=ancestor.getBoundingClientRect();
     if(bounds.bottom<=clip.top||bounds.top>=clip.bottom||
        bounds.right<=clip.left||bounds.left>=clip.right){clipped=true;break;}
    }
    if(clipped)continue;
    const tokens=(element.dataset.mdBind||'').trim().split(/\s+/).filter(Boolean);
    const titles=(element.dataset.mdBindTitles||'').split('|');
    const itemIndex=element.dataset.mdBindIndex===undefined?undefined:Number(element.dataset.mdBindIndex);
    const itemId=element.dataset.mdBindItem||undefined;
    const placement=element.dataset.mdBindPosition==='top-right'?'top-right':'inline';
    let slot=0;
    tokens.forEach((propertyKey,index)=>{
     if(!allowed.has(propertyKey))return;
     const identity=bindingTargetIdentity({propertyKey,itemId,itemIndex});
     // One icon per shared row/column formula; one per independently editable tab.
     if(seen.has(identity))return;
     const position=bindingAnchorPosition(hostRect,{rect:bounds,slot,placement});
     if(!position)return;
     seen.add(identity);slot+=1;
     const label=titles[index]?.trim()||allowed.get(propertyKey)||propertyKey;
     next.push({key:identity,propertyKey,label,...position,
      itemIndex:Number.isInteger(itemIndex)?itemIndex:undefined,itemId});
    });
   }
   setIcons(current=>JSON.stringify(current)===JSON.stringify(next)?current:next);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(position);};
  schedule();
  const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(schedule):null;
  resize?.observe(host);
  if(content!==host)resize?.observe(content);
  const observer=typeof MutationObserver!=='undefined'&&content!==host
   ?new MutationObserver(schedule):null;
  observer?.observe(content,{childList:true,subtree:true,characterData:true,attributes:true,
   attributeFilter:['data-md-bind','data-md-bind-item','data-md-bind-index','data-md-bind-titles','class','style']});
  host.addEventListener('scroll',schedule,true);
  window.addEventListener('resize',schedule);
  return ()=>{
   if(frame)cancelAnimationFrame(frame);
   resize?.disconnect();observer?.disconnect();
   host.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);
  };
 },[componentId,api,definitions]);
 return <div ref={root} className="canvas-data-bindings" role="group" aria-label="Selected component data bindings">
  {icons.map(icon=><button key={icon.key} type="button"
   data-binding-property={icon.propertyKey} data-binding-item={icon.itemId}
   className={'canvas-data-icon-button'+(active?.componentId===componentId&&
     active.propertyKey===icon.propertyKey&&
     (icon.propertyKey!=='tabCaptionFormula'||active.itemId===icon.itemId&&active.itemIndex===icon.itemIndex)
     ?' is-active':'')}
   style={{left:icon.x,top:icon.y}} title={'Edit '+icon.label+' in Data formula bar'}
   aria-label={'Edit '+icon.label+' data source'} onPointerDown={event=>event.stopPropagation()}
   onClick={event=>{event.preventDefault();event.stopPropagation();
     onChoose({propertyKey:icon.propertyKey,itemIndex:icon.itemIndex,itemId:icon.itemId,displayLabel:icon.label});}}>
   <Database aria-hidden="true" size={13}/>
  </button>)}
 </div>;
}
