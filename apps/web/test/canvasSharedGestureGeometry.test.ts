import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canvasScrollbarRailHit,constrainCanvasRect}
  from '../src/core/builders/PageBuilder/canvasPointerInteractions';
import {canvasResizeOverlayGeometry} from '../src/core/builders/PageBuilder/canvasResizeOverlayGeometry';

const read=(path:string)=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('fixed PowerPoint-style page: moving and resizing shapes never increases canvas size',()=>{
 const page={width:1440,height:900};
 assert.deepEqual(constrainCanvasRect({x:470,y:500,width:900,height:520},page),
   {x:470,y:500,width:900,height:400});
 assert.deepEqual(constrainCanvasRect({x:470,y:650,width:900,height:600},page),
   {x:470,y:650,width:900,height:250});
 assert.deepEqual(constrainCanvasRect({x:1400,y:840,width:500,height:500},page),
   {x:1400,y:840,width:40,height:60});
 assert.deepEqual(constrainCanvasRect({x:-10,y:-20,width:100,height:50},page),
   {x:0,y:0,width:100,height:50});
 assert.deepEqual(page,{width:1440,height:900});
});

const scroll={
 rect:{left:200,top:100,right:700,bottom:500},
 scrollHeight:900,clientHeight:400,offsetHeight:400,
 scrollWidth:500,clientWidth:500,offsetWidth:500,
 overflowY:'auto',overflowX:'hidden',direction:'ltr'
};
test('scrollbar rails are interactive without blocking moves from Cart/Card Grid content',()=>{
 assert.equal(canvasScrollbarRailHit(scroll,400,210),false);
 assert.equal(canvasScrollbarRailHit(scroll,698,210),true);
 assert.equal(canvasScrollbarRailHit({...scroll,scrollHeight:400},698,210),false);
 assert.equal(canvasScrollbarRailHit({...scroll,direction:'rtl'},202,210),true);
 assert.equal(canvasScrollbarRailHit({...scroll,scrollHeight:400,scrollWidth:1000,
  overflowY:'hidden',overflowX:'scroll'},350,497),true);
});

test('resize handles lie on real component edges, never in the ribbon or in empty middle',()=>{
 const screen={width:1649,height:928};
 const viewport={left:0,top:300,right:1649,bottom:858,width:1649,height:558};
 const offscreen={left:1074,top:214,right:1624,bottom:1144,width:550,height:930};
 const hidden=canvasResizeOverlayGeometry(offscreen,viewport,screen);
 assert.ok(hidden.points.every(p=>p.top>=310&&p.top<=848));
 assert.equal(hidden.points.filter(p=>['n','ne','nw','s','se','sw'].includes(p.edge)).length,0,
   'never fabricate resize grips in the middle of an offscreen shape');
 const onScreen={left:280,top:330,right:780,bottom:650,width:500,height:320};
 const visible=canvasResizeOverlayGeometry(onScreen,viewport,screen);
 assert.equal(visible.points.length,8);
 assert.equal(visible.points.find(p=>p.edge==='s')?.top,650);
 assert.equal(visible.points.find(p=>p.edge==='nw')?.top,330);
 assert.ok(visible.points.every(p=>!p.proxy));
 assert.equal(visible.clip.top,300);
});

test('moving/resizing affects component metadata only and preserves page dimensions',()=>{
 const builder=read('core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(builder,/const fixedCanvas=\{width:page\.canvasWidth,height:page\.canvasHeight\}/);
 assert.match(builder,/canvasBoundPosition\(\{ \.\.\.start\.original, x, y \}, fixedCanvas, false\)/);
 assert.match(builder,/constrainCanvasRect\(size,\{width:page\.canvasWidth,height:page\.canvasHeight\}\)/);
 assert.match(builder,/Math\.min\(page\.canvasHeight - start\.y, start\.height \+ dy\)/);
 assert.match(builder,/Math\.min\(page\.canvasWidth - start\.x, start\.width \+ dx\)/);
 assert.doesNotMatch(builder,/canvasDimensionsForGesture/);
 assert.doesNotMatch(builder,/dragRoom/);
 assert.doesNotMatch(builder,/start\.preview\.style\.height/);
 assert.match(builder,/overflow: 'hidden'/);
 const handles=read('core/builders/PageBuilder/SmartCanvasHandles.css');
 assert.match(handles,/\.free-canvas-stage\.canvas-editing\{\s*overflow:hidden;/);
});

test('Smart Cart and other Smart components fill the actual resized frame in editor AND published runtime',()=>{
 const smart=read('component-libraries/smart/shared/SmartRuntime.jsx');
 const editor=read('core/builders/PageBuilder/pageBuilderView.tsx');
 const binding=read('core/pages/MetadataBoundPageComponent/MetadataBoundPageComponent.tsx');
 const published=read('core/pages/PageRuntime/pageRuntimeViews.tsx');
 assert.match(smart,/width:p\.canvasFrameSized===true\?"100%"/);
 assert.match(smart,/height:p\.canvasFrameSized===true\?"100%"/);
 assert.match(editor,/canvasFrameSized:true/);
 assert.match(binding,/canvasFrameSized:true/);
 assert.match(published,/canvasFrameSized:true/);
 const cart=read('component-libraries/smart_cart/SmartComponent.css');
 assert.match(cart,/width:100%;height:100%;min-height:0;padding:8px 8px 3px;overflow:auto/);
 const overlay=read('core/builders/PageBuilder/CanvasFloatingResizeHandles.tsx');
 assert.match(overlay,/clipPath:/);
 assert.doesNotMatch(overlay,/data-offscreen-bottom/);
});
