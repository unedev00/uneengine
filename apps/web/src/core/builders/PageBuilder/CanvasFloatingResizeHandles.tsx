import {useEffect,useState,useRef,type RefObject,type PointerEvent as ReactPointerEvent} from 'react';
import {createPortal} from 'react-dom';
import './CanvasFloatingActions.css';

export type CanvasResizeEdge='n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw';
const edges:CanvasResizeEdge[]=['n','ne','e','se','s','sw','w','nw'];
const coordinates:Record<CanvasResizeEdge,[number,number]>={
 n:[.5,0],ne:[1,0],e:[1,.5],se:[1,1],
 s:[.5,1],sw:[0,1],w:[0,.5],nw:[0,0]
};

/** Chrome lives outside sibling stacking contexts so another card/grid cannot
 * cover the selected component's resize handles. Only the handles accept hits;
 * the authored canvas and its z-order remain untouched.
 */
export default function CanvasFloatingResizeHandles({componentId,componentLabel,viewportRef,onStart,onMove,onEnd,onCancel}:{
 componentId:string;
 componentLabel:string;
 viewportRef:RefObject<HTMLDivElement|null>;
 onStart:(event:ReactPointerEvent<HTMLButtonElement>,edge:CanvasResizeEdge)=>void;
 onMove:(event:ReactPointerEvent<HTMLButtonElement>)=>void;
 onEnd:(event:ReactPointerEvent<HTMLButtonElement>)=>void;
 onCancel:(event:ReactPointerEvent<HTMLButtonElement>)=>void;
}){
 const [rect,setRect]=useState({left:0,top:0,width:0,height:0,visible:false});
 const rectRef=useRef(rect);
 useEffect(()=>{
  const viewport=viewportRef.current;
  const anchor=Array.from(viewport?.querySelectorAll<HTMLElement>('.free-canvas-component[data-component-id]')??[])
   .find(el=>el.dataset.componentId===componentId);
  if(!anchor||!viewport)return;
  let frame=0;
  const reposition=()=>{
   frame=0;
   const box=anchor.getBoundingClientRect();
   const view=viewport.getBoundingClientRect();
   const next={left:box.left,top:box.top,width:box.width,height:box.height,
    visible:box.width>0&&box.height>0&&box.right>view.left&&box.left<view.right
      &&box.bottom>view.top&&box.top<view.bottom};
   const old=rectRef.current;
   if(Object.keys(next).some(key=>next[key as keyof typeof next]!==old[key as keyof typeof old])){
    rectRef.current=next;
    setRect(next);
   }
  };
  const schedule=()=>{if(!frame)frame=window.requestAnimationFrame(reposition);};
  reposition();
  const observer=new ResizeObserver(schedule);
  observer.observe(anchor);observer.observe(viewport);
  window.addEventListener('scroll',schedule,true);
  window.addEventListener('resize',schedule);
  window.addEventListener('pointermove',schedule,true);
  return()=>{
   if(frame)window.cancelAnimationFrame(frame);
   observer.disconnect();
   window.removeEventListener('scroll',schedule,true);
   window.removeEventListener('resize',schedule);
   window.removeEventListener('pointermove',schedule,true);
  };
 },[componentId,viewportRef]);
 if(typeof document==='undefined')return null;
 return createPortal(<div className="canvas-floating-resize-overlay" data-canvas-resize-for={componentId}
   style={{visibility:rect.visible?'visible':'hidden'}}>
   {edges.map(edge=><button key={edge} type="button"
    className={`free-canvas-resize-handle floating-resize-${edge}`}
    style={{left:rect.left+rect.width*coordinates[edge][0],
      top:rect.top+rect.height*coordinates[edge][1]}}
    aria-label={`Resize ${componentLabel} ${edge}`} title={`Drag ${edge} corner or edge to resize`}
    onPointerDown={event=>onStart(event,edge)}
    onPointerMove={onMove} onPointerUp={onEnd}
    onPointerCancel={onCancel} onLostPointerCapture={onCancel}
    onClick={event=>event.stopPropagation()}/>)}
 </div>,document.body);
}
