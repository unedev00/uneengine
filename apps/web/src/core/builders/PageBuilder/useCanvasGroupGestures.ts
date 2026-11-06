import {useRef,type PointerEvent,type RefObject} from 'react';
import type {PageComponentMetadata} from '../../metadata/Definitions/metadata';
import {canvasUnitsFromScreenDelta} from '../../pages/PageRuntime/pageCanvas';
import {canvasGroupBounds,scaleCanvasGroup} from './canvasLayerGroups';

type Position=NonNullable<PageComponentMetadata['position']>;
type Edge='n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw';
type Gesture={
  pointerId:number;clientX:number;clientY:number;mode:'move'|'resize';edge:Edge;
  bounds:Position;members:PageComponentMetadata[];
  nodes:Map<string,HTMLElement>;stage:HTMLElement;outline:HTMLElement|null;current:Map<string,Position>;
};
type Options={
  members:PageComponentMetadata[];bounds:Position|null;
  width:number;height:number;scale:number;enabled:boolean;
  viewport?:RefObject<HTMLDivElement>;
  onCommit:(positions:Map<string,Position>)=>void;
};

/** Builder-only pointer interactions; published runtime never loads this module. */
export function useCanvasGroupGestures({members,bounds,width,height,scale,enabled,viewport,onCommit}:Options){
  const gesture=useRef<Gesture|null>(null);
  const start=(event:PointerEvent<HTMLElement>,mode:'move'|'resize',edge:Edge='se',
    overrideMembers?:PageComponentMetadata[])=>{
    const activeMembers=overrideMembers??members;
    const activeBounds=overrideMembers?canvasGroupBounds(overrideMembers):bounds;
    if(!enabled||!activeBounds||activeMembers.length<2||event.button!==0||gesture.current
      ||activeMembers.some(item=>item.properties.editorLocked===true))return;
    const stage=event.currentTarget.closest<HTMLElement>('.free-canvas-stage')
      ??viewport?.current?.querySelector<HTMLElement>('.free-canvas-stage')??null;
    // A drag may originate on any selected member, not only on the group handle.
    const outline=event.currentTarget.closest<HTMLElement>('.canvas-group-outline')
      ??stage?.querySelector<HTMLElement>('.canvas-group-outline')??null;
    if(!stage)return;
    const nodes=new Map<string,HTMLElement>();
    const candidates=Array.from(stage.querySelectorAll<HTMLElement>('.free-canvas-component[data-component-id]'));
    for(const member of activeMembers){
      const node=candidates.find(item=>item.dataset.componentId===member.id);
      if(!node||!member.position)return;
      nodes.set(member.id,node);
    }
    event.preventDefault();event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current={pointerId:event.pointerId,clientX:event.clientX,clientY:event.clientY,
      mode,edge,bounds:{...activeBounds},members:activeMembers,nodes,stage,outline,
      current:new Map(activeMembers.map(item=>[item.id,{...item.position!}]))};
  };
  const move=(event:PointerEvent<HTMLElement>)=>{
    const active=gesture.current;
    if(!active||active.pointerId!==event.pointerId)return;
    const dx=Math.round(canvasUnitsFromScreenDelta(event.clientX-active.clientX,scale));
    const dy=Math.round(canvasUnitsFromScreenDelta(event.clientY-active.clientY,scale));
    const {x,y,width:w,height:h}=active.bounds;
    const next={...active.bounds};
    if(active.mode==='move'){
      next.x=Math.max(0,Math.min(width-w,x+dx));
      next.y=Math.max(0,Math.min(height-h,y+dy));
    }else{
      const west=active.edge.includes('w'),east=active.edge.includes('e');
      const north=active.edge.includes('n'),south=active.edge.includes('s');
      const minW=Math.min(w,24),minH=Math.min(h,24);
      if(east)next.width=Math.max(minW,Math.min(width-x,w+dx));
      if(south)next.height=Math.max(minH,Math.min(height-y,h+dy));
      if(west){next.x=Math.max(0,Math.min(x+w-minW,x+dx));next.width=x+w-next.x;}
      if(north){next.y=Math.max(0,Math.min(y+h-minH,y+dy));next.height=y+h-next.y;}
    }
    active.current=scaleCanvasGroup(active.members,next);
    for(const [id,position] of active.current){
      const node=active.nodes.get(id);
      if(node)Object.assign(node.style,{left:position.x+'px',top:position.y+'px',
        width:position.width+'px',height:position.height+'px'});
    }
    active.outline=active.outline??active.stage.querySelector<HTMLElement>('.canvas-group-outline');
    if(active.outline)Object.assign(active.outline.style,{left:next.x+'px',top:next.y+'px',
      width:next.width+'px',height:next.height+'px'});
  };
  const end=(event:PointerEvent<HTMLElement>,cancelled=false)=>{
    const active=gesture.current;
    if(!active||active.pointerId!==event.pointerId)return;
    gesture.current=null;
    for(const member of active.members){
      const node=active.nodes.get(member.id),position=member.position;
      if(node&&position)Object.assign(node.style,{left:position.x+'px',top:position.y+'px',
        width:position.width+'px',height:position.height+'px'});
    }
    if(!cancelled&&[...active.current].some(([id,pos])=>{
      const original=active.members.find(item=>item.id===id)?.position;
      return original&&(pos.x!==original.x||pos.y!==original.y
        ||pos.width!==original.width||pos.height!==original.height);
    }))onCommit(active.current);
  };
  return {start,move,end};
}
