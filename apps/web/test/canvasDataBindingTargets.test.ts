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
 assert.match(ribbon,/canvasBinding\?\.requestId/);
 assert.match(ribbon,/querySelector<HTMLInputElement>\('\.smart-formula input'\)\?\.focus\(\)/);
 assert.doesNotMatch(ribbon,/<div className="smart-data-sections">/);
 for(const key of ['cartSupportingSource','cartColumn1Header','subtotalLabel',
  'lookupValueFormula','selectedDate','tabCaptionFormula'])assert.ok(sql.includes("'"+key+"'"));
 for(const attr of ['"collectionFormula label"','"imageSource"','"totalLabel"','"totalValue"'])
  assert.ok(cart.includes('data-md-bind={p.builderPreview?'+attr+':undefined}'),attr);
 for(const attr of ['"selectedDate defaultValue"','"collectionFormula"','"label lookupValueFormula"'])
  assert.ok(runtime.includes('data-md-bind={p.builderPreview?'+attr+':undefined}'),attr);
});
