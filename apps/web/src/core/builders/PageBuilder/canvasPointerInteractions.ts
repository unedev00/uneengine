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

/** Identify a native scrollbar rail without disabling drag for the whole cart/grid.
 * Browser scrollbars may be overlay (zero offset/client delta): reserve an 8px
 * hit strip only when scrollable content actually exceeds the available axis.
 */
export function canvasScrollbarHit(
  target:Element,clientX:number,clientY:number,container:Element
):boolean {
  let node:Element|null=target;
  while(node&&node!==container){
    if(node instanceof HTMLElement){
      const rect=node.getBoundingClientRect();
      const vertical=node.scrollHeight>node.clientHeight+1;
      const horizontal=node.scrollWidth>node.clientWidth+1;
      if(vertical||horizontal){
        const styles=getComputedStyle(node);
        const width=Math.max(8,node.offsetWidth-node.clientWidth);
        const height=Math.max(8,node.offsetHeight-node.clientHeight);
        const inRect=clientX>=rect.left&&clientX<=rect.right
          &&clientY>=rect.top&&clientY<=rect.bottom;
        if(inRect&&vertical&&['auto','scroll'].includes(styles.overflowY)
          && (clientX>=rect.right-width||styles.direction==='rtl'&&clientX<=rect.left+width))
          return true;
        if(inRect&&horizontal&&['auto','scroll'].includes(styles.overflowX)
          &&clientY>=rect.bottom-height)return true;
      }
    }
    node=node.parentElement;
  }
  return false;
}
