import { readPageBuilderModules } from './helpers/builderSources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {visibleCanvasBounds,placeNewCanvasComponent} from '../src/core/builders/PageBuilder/canvasInsertPlacement';
import {childrenOf,isLayoutContainer} from '../src/core/pages/TemplatePageRuntime/pageComponentLayout';
import {copyComponentTree,cloneComponentTree} from '../src/core/builders/PageBuilder/pageComponentTree';
import {componentInstanceNames,ensureComponentInstanceNames} from '../../server/src/system-support/page-component-names';
import type {PageComponentMetadata} from '../src/core/metadata/Definitions/metadata';
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

test('crowded viewport still inserts in the visible middle, never at the end of the page',()=>{
 const p=placeNewCanvasComponent({canvasWidth:900,canvasHeight:1100,
   width:250,height:200,used:[{x:0,y:0,width:900,height:730}],
   visible:{left:0,top:0,right:900,bottom:400}});
 assert.deepEqual(p,{x:325,y:100},'Do not search for an off-screen vacant row');
});

test('scrolled and zoomed viewport places new shapes near the visible centre',()=>{
 const visible=visibleCanvasBounds({left:0,top:-300,width:600,height:900},
   {left:0,top:100,right:600,bottom:550},1200,1800);
 const p=placeNewCanvasComponent({canvasWidth:1200,canvasHeight:1800,
   width:200,height:100,used:[],visible});
 assert.equal(visible.top,800);
 assert.equal(visible.bottom,1700);
 assert.deepEqual(p,{x:500,y:1200});
});

test('viewport narrower than inserted shape retains a centred, partially visible result',()=>{
 const p=placeNewCanvasComponent({canvasWidth:1200,canvasHeight:1200,
   width:400,height:200,used:[],visible:{left:500,top:420,right:580,bottom:520}});
 assert.deepEqual(p,{x:340,y:370});
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
 const builder=readPageBuilderModules();
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
 const builder=readPageBuilderModules();
 assert.match(builder,/placeNewCanvasComponent\(/);
 assert.match(builder,/visibleCanvasBounds\(stage\.getBoundingClientRect\(\)/);
 assert.match(builder,/pendingInsertedRef\.current=page\.layoutMode==='free-canvas'\?id:null/);
 assert.match(builder,/viewport\.scrollTo\(/);
 assert.match(builder,/added and selected/);
});

test('Smart Container accepts palette inserts and cut/paste children without changing tenant metadata',()=>{
 const parent:PageComponentMetadata={id:'container',type:'Custom:smart_container',
   label:'Container',visible:true,region:'main',properties:{},position:{x:100,y:100,width:600,height:380}};
 const image:PageComponentMetadata={id:'image',type:'Custom:smart_image',
   label:'Image',visible:true,region:'main',properties:{imageSource:''},position:{x:820,y:990,width:300,height:200}};
 assert.equal(isLayoutContainer(parent),true,'Legacy Smart Container must be a shared layout target');
 const clipped=copyComponentTree([image],image.id);
 const pasted=cloneComponentTree(clipped,parent.id,()=>'pasted-image');
 const components=[parent,...pasted.components];
 assert.equal(childrenOf(components,parent.id)[0]?.id,pasted.rootId);
 assert.equal(childrenOf(components,null).length,1,'Pasted image cannot become a root sibling');
 assert.equal(pasted.components[0].properties.layoutParentId,parent.id);
 const disabled={...parent,properties:{layoutContainer:false}};
 assert.equal(isLayoutContainer(disabled),false,'Explicitly disabled nesting remains respected');
 const builder=readPageBuilderModules();
 assert.match(builder,/isLayoutContainer\(selected\) \? selected.id : rawLayoutParentId\(selected\)/);
 assert.match(builder,/assignTabOnReparent\(components,cloned.rootId,parentId/);
});

test('duplicating custom-named components allocates unique CSV names without changing internal IDs',()=>{
 const original:PageComponentMetadata={id:'original-button-uuid',type:'Custom:smart_button',
   label:'Button',visible:true,region:'main',properties:{navigatorName:'PrintBill'}};
 const clipboard=copyComponentTree([original],original.id);
 const duplicate=cloneComponentTree(clipboard,null,()=>'new-button-uuid');
 assert.equal(duplicate.components[0].properties.navigatorName,undefined,'clone must not inherit the name');
 const first=ensureComponentInstanceNames([original,...duplicate.components]);
 assert.equal(componentInstanceNames(first).get('original-button-uuid'),'PrintBill');
 assert.equal(componentInstanceNames(first).get('new-button-uuid'),'smartbutton1');
 assert.equal(first[1].properties.navigatorName,'smartbutton1');
 assert.equal(first[1].id,'new-button-uuid','internal key stays stable');
 const secondClone=cloneComponentTree(copyComponentTree(first,first[1].id),null,()=>'third-button-uuid');
 const second=ensureComponentInstanceNames([...first,...secondClone.components]);
 assert.equal(componentInstanceNames(second).get('third-button-uuid'),'smartbutton2');
 assert.equal(new Set([...componentInstanceNames(second).values()].map(v=>v.toLowerCase())).size,3);
});
