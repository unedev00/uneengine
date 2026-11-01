import {canvasResizeOverlayGeometry} from '../src/core/builders/PageBuilder/canvasResizeOverlayGeometry';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canvasDimensionsForGesture,canvasScrollbarRailHit,MAX_CANVAS_EDGE}
 from '../src/core/builders/PageBuilder/canvasPointerInteractions';

test('Cart and every other free-canvas component can move and grow beyond page height',()=>{
 const initial={width:1440,height:900};
 assert.deepEqual(canvasDimensionsForGesture(initial,{x:470,y:500,width:900,height:520}),
  {width:1440,height:1020});
 assert.deepEqual(canvasDimensionsForGesture(initial,{x:470,y:650,width:900,height:600}),
  {width:1440,height:1250});
 assert.deepEqual(canvasDimensionsForGesture(initial,{x:0,y:0,width:300,height:220}),initial);
 assert.deepEqual(canvasDimensionsForGesture(initial,{x:9500,y:9900,width:700,height:500}),
  {width:MAX_CANVAS_EDGE,height:MAX_CANVAS_EDGE});
});

const base={
 rect:{left:200,top:100,right:700,bottom:500},
 scrollHeight:900,clientHeight:400,offsetHeight:400,
 scrollWidth:500,clientWidth:500,offsetWidth:500,
 overflowY:'auto',overflowX:'hidden',direction:'ltr'
};
test('drag may start anywhere in scrollable Cart or Card Grid content but not the scroll rail',()=>{
 assert.equal(canvasScrollbarRailHit(base,400,210),false,'content must remain draggable');
 assert.equal(canvasScrollbarRailHit(base,698,210),true,'vertical scrollbar must be usable');
 assert.equal(canvasScrollbarRailHit(base,100,210),false,'outside the component');
 assert.equal(canvasScrollbarRailHit({...base,scrollHeight:400},698,210),false,'no scroll rail without overflow');
 assert.equal(canvasScrollbarRailHit({...base,direction:'rtl'},202,210),true,'RTL scrollbar still usable');
 assert.equal(canvasScrollbarRailHit({...base,scrollHeight:400,scrollWidth:1000,
  overflowY:'hidden',overflowX:'scroll'},350,497),true,'horizontal scrollbar still usable');
});
test('resize controls are in an independent portal, not hidden under sibling component layers',()=>{
 const builder=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
 const portal=readFileSync(new URL('../src/core/builders/PageBuilder/CanvasFloatingResizeHandles.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/core/builders/PageBuilder/CanvasFloatingActions.css',import.meta.url),'utf8');
 assert.match(builder,/<CanvasFloatingResizeHandles componentId=\{component\.id\}/);
 assert.match(builder,/canvasDimensionsForGesture\(\{width:page\.canvasWidth,height:page\.canvasHeight\},position\)/);
 assert.match(builder,/canvasScrollbarHit\(target,event\.clientX,event\.clientY,event\.currentTarget\)/);
 assert.match(portal,/return createPortal\(/);
 assert.match(portal,/points\.map\(point=>/);
 assert.match(portal,/observer\.observe\(anchor\)/);
 assert.match(css,/\.canvas-floating-resize-overlay\{/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/pointer-events:auto/);
 for(const name of ['smart_cart','smart_card_grid','smart_tabs','smart_calendar','smart_navigation','ui_item_grid']){
  assert.ok(!builder.includes("component.type==='Custom:"+name+"'&&target.closest("),
    name+' content drag must not be blocked by the scroll handler');
 }
});

test('handles never cover the ribbon and offscreen south edge remains reachable',()=>{
 const screen={width:1649,height:928};
 const editor={left:0,top:300,right:1649,bottom:858,width:1649,height:558};
 const cart={left:1074,top:214,right:1624,bottom:1144,width:550,height:930};
 const g=canvasResizeOverlayGeometry(cart,editor,screen);
 const topEdges=g.points.filter(p=>p.edge==='n'||p.edge==='ne'||p.edge==='nw');
 assert.equal(topEdges.length,0,'north handles scrolled above editor must NOT cover the ribbon');
 const south=g.points.find(p=>p.edge==='s');
 assert.ok(south,'south resize handle must be available even below fold');
 assert.equal(south.proxy,true);
 assert.ok(south.top>editor.top+20&&south.top<editor.bottom-50,'bottom proxy must have drag room');
 assert.ok(g.points.every(p=>p.top>=editor.top+10&&p.top<=editor.bottom-10));
 assert.ok(g.points.every(p=>p.left>=editor.left+10&&p.left<=editor.right-10));
 assert.equal(g.clip.top,300,'portal itself is clipped at ribbon boundary');
});
test('normally visible bounds retain true eight-handle resize placement',()=>{
 const editor={left:0,top:300,right:1649,bottom:858,width:1649,height:558};
 const block={left:280,top:330,right:780,bottom:650,width:500,height:320};
 const points=canvasResizeOverlayGeometry(block,editor,{width:1649,height:928}).points;
 assert.equal(points.length,8);
 assert.equal(points.find(p=>p.edge==='s')?.top,650);
 assert.equal(points.find(p=>p.edge==='nw')?.top,330);
 assert.ok(points.every(p=>!p.proxy));
});
test('bottom drag expands scroll space while scrolling; a cancellation restores it',()=>{
 const builder=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
 assert.match(builder,/const scrollDelta=start\.viewport \? start\.viewport\.scrollTop-start\.scrollStart/);
 assert.match(builder,/start\.viewport\.scrollTop\+=step/);
 assert.match(builder,/y\+height\+240/);
 assert.match(builder,/if\(start\.stage\)start\.stage\.style\.height=start\.stageHeight/);
 assert.match(builder,/if\(start\.preview\)start\.preview\.style\.height=start\.previewHeight/);
 const portal=readFileSync(new URL('../src/core/builders/PageBuilder/CanvasFloatingResizeHandles.tsx',import.meta.url),'utf8');
 assert.match(portal,/clipPath:/,'overlay must clip inside editor viewport');
 assert.match(portal,/data-offscreen-bottom=/);
});
