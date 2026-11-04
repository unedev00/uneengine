import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readCanvasBinding,writeCanvasBinding} from '../src/core/builders/PageBuilder/canvasDataBindingTargets';

const source=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
test('editing a static tab caption upgrades legacy arrays to stable editable identities',()=>{
 const original={tabs:['Home','Offers','Settings'],tabCount:3};
 const target={propertyKey:'tabCaptionFormula',itemIndex:1};
 const edited=writeCanvasBinding(original,target,'=@OfferName');
 assert.deepEqual(original.tabs,['Home','Offers','Settings']);
 assert.equal(readCanvasBinding(edited,target),'=@OfferName');
 const tabs=edited.tabs as Array<{id:string;label:string}>;
 assert.deepEqual(tabs.map(t=>t.id),['static-tab-0','static-tab-1','static-tab-2']);
 const reordered={...edited,tabs:[tabs[2],tabs[1],tabs[0]]};
 assert.equal(readCanvasBinding(reordered,{propertyKey:'tabCaptionFormula',itemId:'static-tab-1'}),'=@OfferName');
});
test('generated tabs are persisted only when authored, and direct fields retain original metadata keys',()=>{
 const props={tabCount:4,label:'All'};
 assert.equal(readCanvasBinding(props,{propertyKey:'tabCaptionFormula',itemIndex:0}),'Tab 1');
 const edited=writeCanvasBinding(props,{propertyKey:'tabCaptionFormula',itemIndex:2},'=@Category');
 assert.equal((edited.tabs as unknown[]).length,4);
 assert.equal(readCanvasBinding(edited,{propertyKey:'tabCaptionFormula',itemIndex:2}),'=@Category');
 assert.deepEqual(props,{tabCount:4,label:'All'});
 const image=writeCanvasBinding({imageSource:'@Old'}, {propertyKey:'imageSource'}, '@New');
 assert.deepEqual(image,{imageSource:'@New',imageSourceMode:'field'});
 assert.equal(readCanvasBinding({placeholder:'@Search'}, {propertyKey:'label'},'placeholder'),'@Search');
});
test('stale tab binding ids never redirect an edit to another tab',()=>{
 const original={tabs:[{id:'a',label:'First'},{id:'b',label:'Second'}]};
 const stale={propertyKey:'tabCaptionFormula',itemId:'deleted',itemIndex:0};
 assert.equal(readCanvasBinding(original,stale),'');
 assert.deepEqual(writeCanvasBinding(original,stale,'Wrong'),original);
});
test('one builder-only overlay routes selected icons to SQL-approved expressions',()=>{
 const icons=source('../src/core/builders/PageBuilder/CanvasDataBindingIcons.tsx');
 const builder=source('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const ribbon=source('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const sql=source('../../server/src/system-support/migrations/20271113-canvas-formula-binding-icons.sql');
 const cart=source('../src/component-libraries/smart_cart/SmartCart.jsx');
 const runtime=source('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 assert.match(icons,/p\.tab==='Data'&&p\.components\.includes\(api\)/);
 assert.match(icons,/onPointerDown=\{event=>event\.stopPropagation\(\)\}/);
 assert.match(builder,/!previewMode&&!libraryPreview&&selectedId===component\.id/);
 assert.match(builder,/setRibbonTab\('Component Data'\)/);
 assert.match(builder,/data-component-id=\{libraryPreview \? undefined : component\.id\}/);
 assert.match(builder,/setRibbonCollapsed\(false\)/);
 assert.match(builder,/canvasBinding=\{canvasBinding\}/);
 assert.match(builder,/const smartRibbonElement =/);
 assert.match(ribbon,/canvasBinding\?\.requestId/);
 assert.match(ribbon,/querySelector<HTMLInputElement>\('\.smart-formula input'\)\?\.focus\(\)/);
 assert.doesNotMatch(ribbon,/<div className="smart-data-sections">/);
 for(const key of ['cartSupportingSource','cartColumn1Header','subtotalLabel',
  'lookupValueFormula','selectedDate','tabCaptionFormula'])assert.ok(sql.includes("'"+key+"'"));
 for(const attr of ['"label"','"imageSource"','"totalLabel"','"totalValue"'])
  assert.ok(cart.includes('data-md-bind={p.builderPreview?'+attr+':undefined}'),attr);
 for(const attr of ['"selectedDate"','"label lookupValueFormula textSource"','"tabCaptionFormula"'])
  assert.ok(runtime.includes(attr),attr);
 assert.match(ribbon,/hasItemsSource&&<button/);
 assert.match(ribbon,/Select items source formula/);
 const overlay=source('../src/core/builders/PageBuilder/CanvasDataBindingIcons.tsx');
 assert.doesNotMatch(overlay,/fallback|unrendered|const missing=/i);
 assert.match(overlay,/bindingTargetIdentity/);
 assert.match(overlay,/data-md-bind/);
});

test('field anchoring is stable, contextual and never a fallback icon grid',async()=>{
 const {bindingAnchorPosition,bindingTargetIdentity,ICON_SIZE}=
  await import('../src/core/builders/PageBuilder/canvasBindingIconLayout');
 const host={left:0,top:0,right:500,bottom:300,width:500,height:300};
 const col={left:20,top:30,right:180,bottom:62,width:160,height:32};
 const summary={left:350,top:200,right:480,bottom:220,width:130,height:20};
 const fields=Array.from({length:4},(_,slot)=>bindingAnchorPosition(host,{rect:col,slot}));
 assert.equal(new Set(fields.map(v=>v?.x+':'+v?.y)).size,4,'four Cart bindings keep separate anchors');
 assert.ok(fields.every(p=>p&&p.y>=30&&p.y<65),'Cart bindings remain at their own heading');
 const end=bindingAnchorPosition(host,{rect:summary,slot:0});
 assert.ok(end&&end.y>=195&&end.y<=225,'summary amount stays next to its own value');
 assert.equal(bindingAnchorPosition(host,{rect:{...col,width:0,right:20},slot:0}),null);
 assert.equal(bindingAnchorPosition(host,{rect:{...col,top:400,bottom:420},slot:0}),null);
 assert.equal(bindingTargetIdentity({propertyKey:'textSource',itemIndex:0}),
              bindingTargetIdentity({propertyKey:'textSource',itemIndex:8}),
              'repeating card/record values share one formula');
 assert.notEqual(bindingTargetIdentity({propertyKey:'tabCaptionFormula',itemId:'t1'}),
                 bindingTargetIdentity({propertyKey:'tabCaptionFormula',itemId:'t2'}),
                 'separate tab captions have separate formulas');
 const narrow={left:0,top:0,right:48,bottom:40,width:48,height:40};
 const small=Array.from({length:4},(_,slot)=>bindingAnchorPosition(narrow,{
  rect:{left:0,top:0,right:48,bottom:40,width:48,height:40},slot
 }));
 assert.equal(new Set(small.map(v=>v?.x+':'+v?.y)).size,4,
  'even a narrow control cannot collapse multiple bindings into one position');
 assert.equal(ICON_SIZE,20);
});
