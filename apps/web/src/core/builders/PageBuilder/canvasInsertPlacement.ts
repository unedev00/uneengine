/** Geometry only: choose insertion near the *visible* canvas, not the first
 * vacant location in an off-screen row. No page-specific metadata defaults. */
export type CanvasBounds={left:number;top:number;right:number;bottom:number};
export type CanvasBox={x:number;y:number;width:number;height:number};

const clamp=(value:number,max:number)=>Math.max(0,Math.min(max,value));
export function visibleCanvasBounds(
 stage:{left:number;top:number;width:number;height:number},
 viewport:{left:number;top:number;right:number;bottom:number},
 canvasWidth:number,canvasHeight:number
):CanvasBounds{
 const scaleX=stage.width>0?stage.width/canvasWidth:1;
 const scaleY=stage.height>0?stage.height/canvasHeight:1;
 const left=clamp((viewport.left-stage.left)/scaleX,canvasWidth);
 const top=clamp((viewport.top-stage.top)/scaleY,canvasHeight);
 return {
  left,top,
  right:Math.max(left,clamp((viewport.right-stage.left)/scaleX,canvasWidth)),
  bottom:Math.max(top,clamp((viewport.bottom-stage.top)/scaleY,canvasHeight))
 };
}
export function placeNewCanvasComponent(input:{
 canvasWidth:number;canvasHeight:number;width:number;height:number;
 used:readonly CanvasBox[];visible?:CanvasBounds;
}):{x:number;y:number}{
 const {canvasWidth,canvasHeight,width,height,used}=input;
 const maxX=Math.max(0,canvasWidth-width),maxY=Math.max(0,canvasHeight-height);
 const v=input.visible??{left:0,top:0,right:canvasWidth,bottom:canvasHeight};
 const targetX=clamp(Math.round(v.left+16),maxX);
 const targetY=clamp(Math.round(v.top+16),maxY);
 const clear=(x:number,y:number)=>used.every(item=>
  x+width<=item.x||item.x+item.width<=x||
  y+height<=item.y||item.y+item.height<=y);
 const positions=(max:number,target:number)=>{
  const choices=new Set<number>([target,clamp(24,max),0,max]);
  // Small increments within visible area; coarser samples limit search cost
  // when the authored canvas is very large.
  const step=max>2400?64:24;
  for(let n=0;n<=max;n+=step)choices.add(n);
  return [...choices].sort((a,b)=>Math.abs(a-target)-Math.abs(b-target));
 };
 const xs=positions(maxX,targetX),ys=positions(maxY,targetY);
 // First try to keep the whole block within the user's viewport.
 for(const y of ys)for(const x of xs){
  if(x<v.left-8||y<v.top-8||x+width>v.right+8||y+height>v.bottom+8)continue;
  if(clear(x,y))return{x,y};
 }
 // If visible space is occupied, find the nearest free place. The caller will
 // pan to it, making insertion immediately discoverable.
 for(const y of ys)for(const x of xs)if(clear(x,y))return{x,y};
 // Very crowded canvases still insert visibly, with normal Arrange tools.
 return{x:targetX,y:targetY};
}
