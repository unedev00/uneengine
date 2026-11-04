/** Geometry only: each icon has a real rendered field anchor; no fallback grid. */
export type BindingRect={left:number;top:number;right:number;bottom:number;width:number;height:number};
export type BindingPlacement='inline'|'top-right';
export type BindingIconTarget={propertyKey:string;itemId?:string;itemIndex?:number};
export type BindingAnchor=BindingIconTarget&{
 label:string;anchorId:string;rect:BindingRect;slot:number;placement?:BindingPlacement
};
export const ICON_SIZE=20;
export function bindingTargetIdentity(target:BindingIconTarget):string {
 // Static tabs have individual captions; all repeating rows otherwise share a field formula.
 return target.propertyKey==='tabCaptionFormula'
  ?target.propertyKey+':'+(target.itemId??target.itemIndex??'')
  :target.propertyKey;
}
export function bindingAnchorPosition(
 host:BindingRect,anchor:Pick<BindingAnchor,'rect'|'slot'|'placement'>
):{x:number;y:number}|null {
 const box=anchor.rect;
 if(host.width<ICON_SIZE+4||host.height<ICON_SIZE+4||
    box.width<=0||box.height<=0||box.right<=host.left||box.left>=host.right||
    box.bottom<=host.top||box.top>=host.bottom)return null;
 const space=ICON_SIZE+4;
 const left=box.left-host.left;
 const right=box.right-host.left;
 // Text/table fields anchor at their own end, not at a component-level fallback point.
 // A wide collection surface instead anchors in its top-right corner.
 const x=anchor.placement==='top-right'
   ?right-ICON_SIZE-4-anchor.slot*space
   :right-ICON_SIZE-3-anchor.slot*space;
 const y=anchor.placement==='top-right'
   ?box.top-host.top+4
   :box.top-host.top+Math.max(0,(box.height-ICON_SIZE)/2);
 const clamp=(n:number,max:number)=>Math.min(Math.max(2,n),max);
 // Too-narrow source elements can place icons just outside their right edge,
 // but never use a global missing-properties grid.
 const natural=x>=left-2?x:right+4+anchor.slot*space;
 // For exceptionally narrow controls, allow a field-adjacent handle to sit
 // just outside the selected frame instead of clamping several icons together.
 const safeX=natural>host.width-ICON_SIZE-2?natural:clamp(natural,host.width-ICON_SIZE-2);
 return {x:safeX,y:clamp(y,host.height-ICON_SIZE-2)};
}
