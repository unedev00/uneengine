import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {visibleCanvasBounds,placeNewCanvasComponent} from '../src/core/builders/PageBuilder/canvasInsertPlacement';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('insertion prefers the visible portion of a scrollable, zoomed canvas',()=>{
 const visible=visibleCanvasBounds({left:100,top:-540,width:700,height:900},
   {left:100,top:110,right:800,bottom:410},1400,1800);
 assert.equal(visible.top,1300);
 assert.equal(visible.bottom,1800);
 const p=placeNewCanvasComponent({canvasWidth:1400,canvasHeight:1800,
   width:200,height:140,used:[{x:0,y:0,width:400,height:350}],visible});
 assert.ok(p.y>=1280 && p.y<=1660,'The new block should start in the currently viewed area');
 assert.ok(p.x>=0&&p.x+200<=1400);
});

test('occupied visible area selects a free location instead of stacking on an existing component',()=>{
 const visible={left:0,top:0,right:640,bottom:480};
 const used=[{x:0,y:0,width:350,height:300}];
 const placed=placeNewCanvasComponent({canvasWidth:1200,canvasHeight:1200,
   width:200,height:130,used,visible});
 assert.ok(placed.x>=350||placed.y>=300,'Inserted component must not be invisible behind the existing shape');
 assert.ok(placed.x<640&&placed.y<480,'Visible free space should be preferred');
});

test('crowded viewport still chooses an authored canvas position for scroll-to-reveal',()=>{
 const p=placeNewCanvasComponent({canvasWidth:900,canvasHeight:1100,
   width:250,height:200,used:[{x:0,y:0,width:900,height:730}],
   visible:{left:0,top:0,right:900,bottom:400}});
 assert.ok(p.y>=700,'Off-screen free space must be found when view is full');
});

test('Smart Image and UI Image share one stable, source-keyed media loader',()=>{
 const shared=read('../src/component-libraries/shared/TenantImage.jsx');
 const smart=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 assert.match(shared,/export function useTenantImageSource/);
 assert.match(shared,/React\.useEffect\(\(\)=>\{/);
 assert.match(shared,/\},\[src\]\)/);
 assert.doesNotMatch(shared,/\},\[src,loadAsset\]\)/);
 assert.match(shared,/loaded\.src===src\?loaded\.url/);
 assert.match(smart,/useTenantImageSource\(src,loadAsset\)/);
 assert.doesNotMatch(smart,/setData\(""/);
});

test('canvas action toolbars are portalled above authored sibling layers without changing page data',()=>{
 const builder=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const portal=read('../src/core/builders/PageBuilder/CanvasFloatingActions.tsx');
 const css=read('../src/core/builders/PageBuilder/CanvasFloatingActions.css');
 assert.match(builder,/CanvasFloatingActions componentId=\{component\.id\}/);
 assert.match(builder,/portalGrip/);
 assert.match(portal,/createPortal\(/);
 assert.match(portal,/window\.addEventListener\('scroll',schedule,true\)/);
 assert.match(css,/z-index:11000!important/);
 assert.doesNotMatch(builder,/zIndex:11000/);
});

test('inserted element becomes selected and is revealed in the canvas viewport',()=>{
 const builder=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(builder,/placeNewCanvasComponent\(/);
 assert.match(builder,/visibleCanvasBounds\(stage\.getBoundingClientRect\(\)/);
 assert.match(builder,/pendingInsertedRef\.current=page\.layoutMode==='free-canvas'\?id:null/);
 assert.match(builder,/viewport\.scrollTo\(/);
 assert.match(builder,/added and selected/);
});
