import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const sql=read('../../server/src/system-support/migrations/20270320-design2-final-component-matrix.sql');
const originalSql=read('../../server/src/system-support/migrations/20270309-design2-contextual-ribbon.sql');
const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
const css=read('../src/core/builders/PageBuilder/SmartRibbonDesign2.css');
const icons=read('../src/core/builders/PageBuilder/Design2IconDropdown.tsx');
const colours=read('../src/core/builders/PageBuilder/RibbonColorPalette.tsx');
const server=read('../../server/src/system-support/server.ts');
const builder=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
const inventory=read('../src/core/builders/PageBuilder/uneBuilderPropertyInventory.ts');
const cart=read('../src/component-libraries/smart_cart/SmartCart.jsx');
const table=read('../src/component-libraries/smart_table/SmartTable.jsx');

const match=/^\s*\('([^']+)','([^']+)',(\d+),'([^']+)',(\d+),(\d+),(\d+),26,(NULL|'[^']+'),'([^']+)'\),?$/gm;
const rows=[...sql.matchAll(match)].map(([,component,area,areaOrder,key,row,column,width,property,fallback])=>({
 component,area,areaOrder:+areaOrder,key,row:+row,column:+column,width:+width,
 property:property==='NULL'?null:property.slice(1,-1),fallback
}));
const slot=(component,area,row,column)=>rows.find(item=>item.component===component&&
 item.area===area&&item.row===row&&item.column===column);

test('Approved Design 2 sheet creates 320 per-component 26px controls with no collisions',()=>{
 assert.equal(rows.length,320);
 assert.equal(new Set(rows.map(x=>x.component)).size,13);
 assert.equal(new Set(rows.map(x=>[x.component,x.area,x.row,x.column].join(':'))).size,320);
 assert.equal(new Set(rows.map(x=>[x.component,x.area,x.key].join(':'))).size,320);
 assert.ok(rows.every(x=>[1,2,3].includes(x.row)&&x.column>=1&&x.column<=6));
 assert.ok(rows.every(x=>[40,80].includes(x.width)));
 assert.match(sql,/ON CONFLICT\(component_api,area,slot_key\) DO UPDATE/);
});
test('Exact sheet placements cover all contextual controls and renamed cart buttons',()=>{
 assert.equal(slot('smart_button','Body',1,1)?.property,'backgroundColor');
 assert.equal(slot('smart_button','Body',1,5)?.width,80);
 assert.equal(slot('smart_cart','Footer',3,5)?.property,'summary2TextSize');
 assert.equal(slot('smart_image','Image',2,6)?.property,'imagePlacement');
 assert.equal(slot('smart_image','Image',3,6)?.property,'imageFill');
 assert.equal(slot('smart_tabs','Body',2,1)?.property,'selectedTabColor');
 assert.equal(slot('smart_tabs','Body',1,6)?.property,'tabOrientation');
 assert.equal(slot('smart_navigation','Body',1,6)?.property,'navigationDirection');
 assert.ok(rows.some(x=>x.component==='smart_cart'&&x.area==='Button 4'));
 assert.ok(rows.some(x=>x.component==='smart_cart'&&x.area==='Button 5'));
 assert.ok(!rows.some(x=>x.area==='Summary 2'||x.area==='Focused'));
});
test('Design and Design 2 remain independent, with exact control sizing',()=>{
 assert.match(inventory,/'Design'\|'Design2'/);
 assert.match(builder,/'Component Properties': 'Design'/);
 assert.match(builder,/'Component Design 2': 'Design 2'/);
 assert.match(ribbon,/const visible=definitions\.filter\(p=>p\.tab===tab\)/);
 assert.match(ribbon,/const componentDesign2Slots=design2Slots\.filter\(slot=>slot\.componentApi===api\)/);
 assert.match(ribbon,/if\(tab==='Design2'\)return p\.designWidth\?\?40/);
 assert.match(ribbon,/<span aria-hidden="true">Select<\/span>/);
 assert.doesNotMatch(ribbon,/Select it/);
 assert.match(ribbon,/\[1,2,3\]\.map\(row=>/);
 assert.match(ribbon,/gridTemplateColumns:design2Columns/);
 assert.match(css,/:has\(\.smart-design2-ribbon\)/);
 assert.match(originalSql,/CHECK\(tab IN \('Home','Data','Design','Design2','Shapes','Layout'\)\)/);
});
test('Focused, shape fill, alignment, orientation, image placement and image fill have icon controls',()=>{
 assert.match(colours,/iconVariant==='shape'/);
 assert.match(colours,/iconVariant==='focus'/);
 assert.match(ribbon,/tab==='Design2'&&\(property\.id==='shapeFill'\|\|\/\^shape_fill/);
 assert.match(ribbon,/mode="horizontal"/);
 assert.match(ribbon,/mode=\{property\.id==='imagePlacement'\?'placement'/);
 for(const token of ['top','middle','bottom','left','center','right','stretch'])
  assert.ok(icons.includes("'"+token+"'"),'missing '+token);
 assert.match(icons,/aria-haspopup="menu"/);
 assert.match(icons,/createPortal/);
 assert.match(icons,/role="menuitemradio"/);
});
test('Top visibility switches Badge visibility contextually without rewriting Design',()=>{
 assert.match(ribbon,/activeDesign2Area==='Badge'/);
 assert.match(ribbon,/update\('badgeVisible',!visible\)/);
 assert.match(ribbon,/onVisibleChange\(!componentVisible\)/);
});
test('Existing renderer property bindings remain available, and server uses scoped matrix',()=>{
 for(const key of ['headerTextSize','supportingBackgroundColor','supportingTextSize',
  'rowAlignment','rowTextSize','rowBold','summaryAlignment','summary2Alignment'])
  assert.ok(cart.includes('p.'+key),'Cart missing '+key);
 for(const key of ['headerTextSize','rowAlignment','rowTextSize','rowBold','summaryAlignment'])
  assert.ok(table.includes('p.'+key),'Table missing '+key);
 assert.match(server,/FROM md_builder_design2_component_slots/);
 assert.match(server,/componentApi:slot\.component_api/);
});

test('Component-specific Focus Fill is persisted and applied without changing original Design',()=>{
 const focusSql=read('../../server/src/system-support/migrations/20270321-design2-component-focus-colors.sql');
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 const sharedCss=read('../src/component-libraries/smart/shared/smart.css');
 for(const key of ['toggleFocusColor','lookupFocusColor','navigationFocusColor']){
  assert.ok(focusSql.includes("'"+key+"'"),key+' is not registered');
  assert.ok(runtime.includes('p.'+key),key+' has no runtime hook');
 }
 assert.match(runtime,/borderColor:p\.defaultValueColor\|\|/);
 assert.match(focusSql,/'smart_calendar','defaultValueColor'/);
 assert.match(focusSql,/'Design2','Contextual'/);
 assert.doesNotMatch(focusSql,/UPDATE md_builder_shared_properties SET tab='Design'/);
 assert.match(sharedCss,/smart-lookup-focus-color/);
 assert.match(sharedCss,/smart-navigation-focus-color/);
});

test('Smart Cart Footer controls target grand total line instead of whole summary',()=>{
 const footerSql=read('../../server/src/system-support/migrations/20270322-design2-smart-cart-footer.sql');
 for(const key of ['footerBodyColor','footerBorderColor','footerRadius','footerHeight',
                    'footerWidth','footerShape','footerShapeFill','footerWrapText']){
  assert.ok(footerSql.includes("'"+key+"'"),key+' not registered');
  assert.ok(cart.includes('p.'+key),key+' not used by SmartCart');
 }
 assert.match(cart,/className="smart-cart-summary-line smart-cart-total"/);
 assert.match(cart,/background:p\.footerShape&&p\.footerShapeFill/);
 assert.match(footerSql,/'Design2','Contextual'/);
 assert.doesNotMatch(footerSql,/SET\s+tab\s*=\s*'Design'/);
});
