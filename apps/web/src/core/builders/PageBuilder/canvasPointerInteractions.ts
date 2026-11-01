/** Shared Page Builder gesture rules: scrollbars are controls, content is movable.
 * The Page Builder frame (not its embedded app) owns geometry on a free canvas.
 */
export const MAX_CANVAS_EDGE = 10000;
export type CanvasRect = {x:number;y:number;width:number;height:number};
export type CanvasDimensions = {width:number;height:number};

/** Grow an authored canvas only when a move or resize crosses its edge.
 * Leave the opposite edge, other component coordinates, and the original
 * dimensions untouched. Values remain within the page runtime's 10000px limit.
 */
export function canvasDimensionsForGesture(
  canvas:CanvasDimensions, rect:CanvasRect
):CanvasDimensions {
  const grow=(current:number,edge:number)=>
    Math.min(MAX_CANVAS_EDGE,Math.max(current,Math.ceil(edge)));
  return {width:grow(canvas.width,rect.x+rect.width),
    height:grow(canvas.height,rect.y+rect.height)};
}

export type CanvasScrollMetrics={
 rect:{left:number;top:number;right:number;bottom:number};
 scrollHeight:number;clientHeight:number;offsetHeight:number;
 scrollWidth:number;clientWidth:number;offsetWidth:number;
 overflowY:string;overflowX:string;direction:string;
};

/** Test the genuine rail, not all of the content in a scrollable component. */
export function canvasScrollbarRailHit(
 m:CanvasScrollMetrics,clientX:number,clientY:number
):boolean {
 const vertical=m.scrollHeight>m.clientHeight+1;
 const horizontal=m.scrollWidth>m.clientWidth+1;
 const width=Math.max(8,m.offsetWidth-m.clientWidth);
 const height=Math.max(8,m.offsetHeight-m.clientHeight);
 const inside=clientX>=m.rect.left&&clientX<=m.rect.right
   &&clientY>=m.rect.top&&clientY<=m.rect.bottom;
 if(!inside)return false;
 return (vertical&&['auto','scroll'].includes(m.overflowY)
  &&(clientX>=m.rect.right-width||m.direction==='rtl'&&clientX<=m.rect.left+width))
  ||(horizontal&&['auto','scroll'].includes(m.overflowX)
    &&clientY>=m.rect.bottom-height);
}

/** Check every scrollable descendant through the frame, including native item
 * grids, smart carts/tabs/calendars, and future component types.
 */
export function canvasScrollbarHit(
  target:Element,clientX:number,clientY:number,container:Element
):boolean {
 let node:Element|null=target;
 while(node&&node!==container){
   if(node instanceof HTMLElement){
     const rect=node.getBoundingClientRect();
     const styles=getComputedStyle(node);
     if(canvasScrollbarRailHit({
       rect,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,
       offsetHeight:node.offsetHeight,scrollWidth:node.scrollWidth,
       clientWidth:node.clientWidth,offsetWidth:node.offsetWidth,
       overflowY:styles.overflowY,overflowX:styles.overflowX,
       direction:styles.direction
     },clientX,clientY))return true;
   }
   node=node.parentElement;
 }
 return false;
}
