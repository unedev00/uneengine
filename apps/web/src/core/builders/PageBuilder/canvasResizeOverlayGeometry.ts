/** Viewport-safe resize chrome. The canvas can scroll behind a fixed ribbon,
 * but none of its editing handles may appear on top of ribbon controls.
 */
export type OverlayRect={left:number;top:number;right:number;bottom:number;width:number;height:number};
export type OverlayEdge='n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw';
const edges:OverlayEdge[]=['n','ne','e','se','s','sw','w','nw'];
const xRatio:Record<OverlayEdge,number>={n:.5,ne:1,e:1,se:1,s:.5,sw:0,w:0,nw:0};
const yRatio:Record<OverlayEdge,number>={n:0,ne:0,e:.5,se:1,s:1,sw:1,w:.5,nw:0};
export type OverlayPoint={edge:OverlayEdge;left:number;top:number;proxy:boolean};
export type OverlayGeometry={points:OverlayPoint[];clip:{left:number;top:number;right:number;bottom:number}};
const clamp=(value:number,low:number,high:number)=>Math.max(low,Math.min(value,high));
export function canvasResizeOverlayGeometry(
 box:OverlayRect,viewport:OverlayRect,screen:{width:number;height:number}
):OverlayGeometry {
 const clip={left:clamp(viewport.left,0,screen.width),top:clamp(viewport.top,0,screen.height),
  right:clamp(viewport.right,0,screen.width),bottom:clamp(viewport.bottom,0,screen.height)};
 const visible={left:Math.max(box.left,clip.left),top:Math.max(box.top,clip.top),
  right:Math.min(box.right,clip.right),bottom:Math.min(box.bottom,clip.bottom)};
 if(visible.right-visible.left<20||visible.bottom-visible.top<20)
  return {points:[],clip};
 const points:OverlayPoint[]=[];
 for(const edge of edges){
  const topEdge=yRatio[edge]===0;
  const bottomEdge=yRatio[edge]===1;
  const x=box.left+box.width*xRatio[edge];
  const originalY=box.top+box.height*yRatio[edge];
  // The north edge can be scrolled under the ribbon. Never draw its handles
  // over the ribbon or misrepresent the true north edge with a proxy.
  if(topEdge&&originalY<clip.top+10)continue;
  if(x<clip.left+10||x>clip.right-10)continue;
  const proxy=bottomEdge&&originalY>clip.bottom-14;
  // When the true bottom is off-screen, expose its resize handles in the
  // visible lower area. Leave enough space below to begin a downward drag.
  const y=proxy?Math.max(visible.top+30,visible.bottom-74):
   topEdge||bottomEdge?originalY:clamp(originalY,visible.top+14,visible.bottom-14);
  if(y<clip.top+10||y>clip.bottom-10)continue;
  points.push({edge,left:x,top:y,proxy});
 }
 return {points,clip};
}
