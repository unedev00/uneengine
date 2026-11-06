import type {PageComponentMetadata} from '../../metadata/Definitions/metadata';
import {canvasGroupMembers} from './canvasLayerGroups';

type Rect={x:number;y:number;width:number;height:number};
type CanvasSize={width:number;height:number};
type SelectionMode='replace'|'toggle'|'range'|'add';
const parentOf=(item:PageComponentMetadata)=>
  typeof item.properties.layoutParentId==='string'&&item.properties.layoutParentId
    ?item.properties.layoutParentId:item.parentId??null;

/** Editor-only selection. Persisted groups are atomic, but ungrouped components are independent. */
export function expandCanvasSelection(components:readonly PageComponentMetadata[],ids:readonly string[]):string[]{
  const requested=new Set(ids);
  const expanded=new Set<string>();
  for(const item of components){
    if(!requested.has(item.id))continue;
    for(const member of canvasGroupMembers(components,item))expanded.add(member.id);
  }
  return components.filter(item=>expanded.has(item.id)).map(item=>item.id);
}

export function selectCanvasIds(
  components:readonly PageComponentMetadata[],current:readonly string[],targetId:string,
  mode:SelectionMode,anchorId?:string
):string[]{
  const target=components.find(item=>item.id===targetId);
  if(!target)return [...current];
  const clicked=expandCanvasSelection(components,[targetId]);
  if(mode==='replace')return clicked;
  if(mode==='range'&&anchorId){
    const anchor=components.find(item=>item.id===anchorId);
    if(anchor&&parentOf(anchor)===parentOf(target)){
      const siblings=components.filter(item=>parentOf(item)===parentOf(target));
      const a=siblings.findIndex(item=>item.id===anchorId);
      const b=siblings.findIndex(item=>item.id===targetId);
      if(a>=0&&b>=0)return expandCanvasSelection(components,[
        ...current,...siblings.slice(Math.min(a,b),Math.max(a,b)+1).map(item=>item.id)]);
    }
  }
  const selected=new Set(current);
  if(mode==='toggle'&&clicked.every(id=>selected.has(id)))
    for(const id of clicked)selected.delete(id);
  else for(const id of clicked)selected.add(id);
  return expandCanvasSelection(components,[...selected]);
}

/** Select anything the marquee touches, never expand across a different layout parent. */
export function selectCanvasInRect(
  components:readonly PageComponentMetadata[],rect:Rect,addTo:readonly string[]=[]
):string[]{
  const minX=Math.min(rect.x,rect.x+rect.width),maxX=Math.max(rect.x,rect.x+rect.width);
  const minY=Math.min(rect.y,rect.y+rect.height),maxY=Math.max(rect.y,rect.y+rect.height);
  const selected=components.filter(item=>{
    const p=item.position;
    return p&&!parentOf(item)&&p.x<maxX&&p.x+p.width>minX&&p.y<maxY&&p.y+p.height>minY;
  }).map(item=>item.id);
  return expandCanvasSelection(components,[...addTo,...selected]);
}

/** Nudge the complete selection using a single clamped delta so relative geometry never changes. */
export function nudgeCanvasSelection(
  components:readonly PageComponentMetadata[],ids:readonly string[],
  dx:number,dy:number,canvas:CanvasSize
):PageComponentMetadata[]{
  const selected=new Set(expandCanvasSelection(components,ids));
  const members=components.filter(item=>selected.has(item.id));
  if(!members.length||members.some(item=>!item.position||parentOf(item)||
    item.properties.editorLocked===true))return [...components];
  const left=Math.min(...members.map(item=>item.position!.x));
  const top=Math.min(...members.map(item=>item.position!.y));
  const right=Math.max(...members.map(item=>item.position!.x+item.position!.width));
  const bottom=Math.max(...members.map(item=>item.position!.y+item.position!.height));
  const moveX=Math.max(-left,Math.min(canvas.width-right,dx));
  const moveY=Math.max(-top,Math.min(canvas.height-bottom,dy));
  if(!moveX&&!moveY)return [...components];
  return components.map(item=>selected.has(item.id)
    ?{...item,position:{...item.position!,x:item.position!.x+moveX,y:item.position!.y+moveY}}
    :item);
}
