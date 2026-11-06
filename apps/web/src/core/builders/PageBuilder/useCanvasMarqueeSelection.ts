import {useRef,useState,type PointerEvent} from 'react';

type Point={x:number;y:number};
export type CanvasMarquee={x:number;y:number;width:number;height:number};
type Options={
  enabled:boolean;
  onSelect:(rect:CanvasMarquee,additive:boolean)=>void;
  onClear:()=>void;
};

/** Builder-only selection rectangle, scaled from viewport pixels to canvas units. */
export function useCanvasMarqueeSelection({enabled,onSelect,onClear}:Options){
  const [rect,setRect]=useState<CanvasMarquee|null>(null);
  const pending=useRef<{
    pointerId:number;start:Point;last:Point;additive:boolean;dragging:boolean;
  }|null>(null);
  const position=(event:PointerEvent<HTMLDivElement>):Point=>{
    const bounds=event.currentTarget.getBoundingClientRect();
    return {
      x:(event.clientX-bounds.left)*event.currentTarget.offsetWidth/Math.max(1,bounds.width),
      y:(event.clientY-bounds.top)*event.currentTarget.offsetHeight/Math.max(1,bounds.height)
    };
  };
  const down=(event:PointerEvent<HTMLDivElement>)=>{
    if(!enabled||event.button!==0||event.pointerType==='touch'||
      event.target!==event.currentTarget)return;
    event.preventDefault();event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const start=position(event);
    pending.current={pointerId:event.pointerId,start,last:start,additive:event.ctrlKey||event.metaKey||event.shiftKey,dragging:false};
  };
  const move=(event:PointerEvent<HTMLDivElement>)=>{
    const active=pending.current;
    if(!active||event.pointerId!==active.pointerId)return;
    active.last=position(event);
    active.dragging=active.dragging||Math.hypot(active.last.x-active.start.x,active.last.y-active.start.y)>=4;
    if(active.dragging)setRect({
      x:Math.min(active.start.x,active.last.x),y:Math.min(active.start.y,active.last.y),
      width:Math.abs(active.last.x-active.start.x),height:Math.abs(active.last.y-active.start.y)
    });
  };
  const end=(event:PointerEvent<HTMLDivElement>,cancelled=false)=>{
    const active=pending.current;
    if(!active||event.pointerId!==active.pointerId)return;
    pending.current=null;
    setRect(null);
    if(cancelled)return;
    if(active.dragging)onSelect({
      x:Math.min(active.start.x,active.last.x),y:Math.min(active.start.y,active.last.y),
      width:Math.abs(active.last.x-active.start.x),height:Math.abs(active.last.y-active.start.y)
    },active.additive);
    else if(!active.additive)onClear();
  };
  return {rect,down,move,end};
}
