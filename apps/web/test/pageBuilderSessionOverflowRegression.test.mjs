import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=(path)=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('Smart SQL ribbon renders all properties in every selected tab, including invalid design rows',()=>{
 const ribbon=file('core/builders/PageBuilder/SmartRibbon.tsx');
 assert.match(ribbon,/const visible=definitions\.filter\(p=>p\.tab===tab\)/);
 assert.match(ribbon,/sections\.map\(section=>/);
 assert.match(ribbon,/sectionRow\(section,row\)\.map\(controls\)/);
 assert.match(ribbon,/p\.designRow\?\?2/);
 assert.match(ribbon,/<=3\?p\.designRow\?\?2:2/);
 assert.match(ribbon,/data-supported=\{supported\}/);
});
test('all Page Builder tabs share one 114px content lane and a separate scrollbar',()=>{
 const css=file('core/builders/PageBuilder/PageBuilderRibbonLayout.css');
 const page=file('core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(css,/--page-ribbon-content-height: 114px/);
 assert.match(css,/--page-ribbon-scrollbar-height: 9px/);
 assert.match(css,/--page-ribbon-scroll-strip-height: 127px/);
 assert.match(css,/overflow-x: auto !important/);
 assert.match(css,/overflow-y: hidden !important/);
 assert.match(css,/direction: ltr !important/);
 assert.match(css,/scrollbar-width: thin !important/);
 assert.match(css,/width: max-content !important/);
 assert.match(page,/PageBuilderRibbonLayout\.css/);
});

test('Cart supports selected-row custom Flow actions and Container only has one normal border',()=>{
 const cart=file('component-libraries/smart_cart/SmartCart.jsx');
 const actions=file('core/builders/PageBuilder/SmartEventActionsRibbon.tsx');
 const appearance=file('core/pages/TemplatePageRuntime/pageComponentAppearance.css');
 assert.match(cart,/\[selectedKey,setSelectedKey\]/);
 assert.match(cart,/customButton1/);
 assert.match(cart,/customButton2/);
 assert.match(actions,/api==='smart_cart'&&<section.*Component Custom/);
 assert.match(appearance,/data-page-appearance="layout"\]\.selected/);
});
