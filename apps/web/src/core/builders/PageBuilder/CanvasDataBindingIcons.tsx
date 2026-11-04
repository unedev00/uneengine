import {useLayoutEffect,useRef,useState} from 'react';
import {Database} from 'lucide-react';
import type {UneRibbonProperty} from './uneBuilderPropertyInventory';
import type {CanvasBindingTarget} from './canvasDataBindingTargets';
import './CanvasDataBindingIcons.css';

type IconPosition={key:string;propertyKey:string;label:string;x:number;y:number;itemIndex?:number;itemId?:string;fallback?:boolean};
/** One editor-only overlay for every component. The runtime never imports it. */
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
   (p.kindOverrides?.[api]??p.kind)==='expression').map(p=>[p.id,p.label]));
  const content=host.querySelector<HTMLElement>('.free-canvas-content-viewport')||
   host.querySelector<HTMLElement>('.smart-runtime')||
   host.querySelector<HTMLElement>('.smart-table-root')||host;
  let frame=0;
  const position=()=>{
   frame=0;
   const rect=host.getBoundingClientRect();
   const next:IconPosition[]=[];
   const encountered=new Set<string>();
   for(const element of host.querySelectorAll<HTMLElement>('[data-md-bind]')){
    if(element.closest('[data-component-id]')!==host)continue;
    const bounds=element.getBoundingClientRect();
    if(!bounds.width||!bounds.height||bounds.bottom<=rect.top||
       bounds.top>=rect.bottom||bounds.right<=rect.left||bounds.left>=rect.right)continue;
    // A scrolled-out row must not leak an icon into a clipped Cart/Grid viewport.
    let clipped=false;
    for(let ancestor=element.parentElement;ancestor&&ancestor!==host;ancestor=ancestor.parentElement){
     const computed=getComputedStyle(ancestor);
     if(!/(auto|scroll|hidden|clip)/.test(computed.overflowX+' '+computed.overflowY))continue;
     const clip=ancestor.getBoundingClientRect();
     if(bounds.bottom<=clip.top||bounds.top>=clip.bottom||
        bounds.right<=clip.left||bounds.left>=clip.right){clipped=true;break;}
    }
    if(clipped)continue;
    const tokens=(element.dataset.mdBind||'').trim().split(/\s+/);
    for(const key of tokens)if(allowed.has(key))encountered.add(key);
    tokens.forEach((propertyKey,index)=>{
     const label=allowed.get(propertyKey);
     if(!label)return;
     const itemIndex=element.dataset.mdBindIndex===undefined?undefined:Number(element.dataset.mdBindIndex);
     const itemId=element.dataset.mdBindItem||undefined;
     const wide=bounds.width>rect.width*.8;
     // Full-width surfaces anchor within the selected frame; text spans anchor beside text.
     const x=Math.max(2,Math.min(rect.width-27,
       wide?rect.width-28-index*27:bounds.right-rect.left+3+index*25));
     const y=Math.max(2,Math.min(rect.height-26,
       (wide?bounds.top-rect.top+5:bounds.top-rect.top+(bounds.height-23)/2)));
     next.push({key:propertyKey+':'+(itemId??itemIndex??'')+':'+next.length,
       propertyKey,label,x,y,itemIndex:Number.isFinite(itemIndex)?itemIndex:undefined,itemId});
    });
   }
   // Some formula fields have no visible element until authored (e.g. card
   // buttons and supporting text). Keep them accessible without reviving a ribbon.
   const missing=[...allowed].filter(([key])=>!encountered.has(key));
   const columns=Math.max(1,Math.min(6,Math.floor(Math.max(rect.width,28)/28)));
   missing.forEach(([propertyKey,label],index)=>{
    const col=index%columns,row=Math.floor(index/columns);
    next.push({key:'unrendered:'+propertyKey,propertyKey,label,
     x:Math.max(2,rect.width-28-col*27),y:Math.max(2,rect.height-28-row*27),
     fallback:true});
   });
   setIcons(current=>JSON.stringify(current)===JSON.stringify(next)?current:next);
  };
  const schedule=()=>{
   if(!frame)frame=requestAnimationFrame(position);
  };
  schedule();
  const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(schedule):null;
  resize?.observe(host);
  if(content!==host)resize?.observe(content);
  const observer=typeof MutationObserver!=='undefined'&&content!==host
   ?new MutationObserver(schedule):null;
  observer?.observe(content,{childList:true,subtree:true,characterData:true});
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
   className={'canvas-data-icon-button'+(icon.fallback?' is-fallback':'')+(active?.componentId===componentId&&
     active.propertyKey===icon.propertyKey&&active.itemIndex===icon.itemIndex
     ?' is-active':'')}
   style={{left:icon.x,top:icon.y}} title={'Edit '+icon.label+' in Data formula bar'}
   aria-label={'Edit '+icon.label+' data source'} onPointerDown={event=>event.stopPropagation()}
   onClick={event=>{event.preventDefault();event.stopPropagation();
     onChoose({propertyKey:icon.propertyKey,itemIndex:icon.itemIndex,itemId:icon.itemId});}}>
   <Database aria-hidden="true" size={14}/>
  </button>)}
 </div>;
}
