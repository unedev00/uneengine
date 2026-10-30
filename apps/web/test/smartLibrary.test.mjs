import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateFieldExpression} from '../src/component-libraries/shared/FieldExpression.js';
import {loadComponentCatalog,buildBundledComponent} from '../../../scripts/component-catalog.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('Smart Formula uses Excel semantics for maths, literals, fields and &',()=>{
 const row={Price:12,Qty:3,FirstName:'Ada',LastName:'Lovelace'};
 assert.equal(evaluateFieldExpression('@Price * @Qty',row),'36');
 assert.equal(evaluateFieldExpression('@Price + @Qty',row),'15');
 assert.equal(evaluateFieldExpression('@Price - @Qty',row),'9');
 assert.equal(evaluateFieldExpression('@Price / @Qty',row),'4');
 assert.equal(evaluateFieldExpression('@FirstName & " " & @LastName',row),'Ada Lovelace');
 for(const operator of ['+','-','*','/','&'])
   assert.equal(evaluateFieldExpression('"'+operator+'"',row),operator);
});
test('Smart component catalog is independent, twelve components and SQL-owned',async()=>{
 const source=JSON.parse(read('../src/component-libraries/manifest.json'));
 const names=source.components.map(p=>p.split('/')[0]).filter(name=>name.startsWith('smart_'));
 assert.deepEqual(names.sort(),['smart_button','smart_toggle','smart_lookup','smart_tabs',
  'smart_text','smart_card_grid','smart_image','smart_calendar','smart_navigation',
  'smart_container','smart_cart','smart_icon'].sort());
 const catalog=await loadComponentCatalog();
 for(const name of names){
  const c=catalog.components.find(c=>c.apiName===name);
  assert.ok(c);
  assert.deepEqual(c.propertyDefinitions,[]);
 }
});
test('Smart registry remains enabled through Core bundled-component cleanup',()=>{
 const content=read('../../server/src/app-seeders/bundled-components.ts');
 assert.match(content,/SMART_COMPONENTS/);
 assert.match(content,/\.\.\.UI_COMPONENTS,\.\.\.SMART_COMPONENTS/);
});
test('Smart SQL library matches approved table and retains Home',()=>{
 const migration=read('../../server/src/system-support/migrations/20270124-smart-component-library.sql');
 const rows=migration.split('\n').filter(s=>/^\('(?:backgroundColor|borderColor|shadow|label|labelAlignment|labelColor|defaultValueColor|radius|textSize|placeholderSize|width|height|x|y|defaultValue|tabHeight|tabWidth|tabCount|selectedTabColor|tabColor|cardsPerRow|cardsPerColumn|imageHeight|headerBoxHeight|wrapText|imagePlacement|imageBorderColor|headerBorderColor|headerAlignment|headerBold|objectApiName|imageSource|textSource|badgeText|badgeAlignment|badgeTextSize|badgeBold|badgeTextColor|badgeVisible|showDays|firstDay|navigationDirection|imageFill)'/.test(s));
 assert.equal(rows.length,43);
 assert.match(migration,/'headerBold','Bold','Design','Header'/);
 assert.match(migration,/component_api='smart_image' AND property_key IN \('cardsPerRow','cardsPerColumn'\)/);
 assert.match(migration,/component_api='smart_lookup' AND property_key='label'/);
 assert.doesNotMatch(migration,/DELETE\s+FROM\s+md_page_(?:definitions|components)/i);
 assert.doesNotMatch(migration,/DELETE\s+FROM\s+md_builder_shared_properties\s+WHERE\s+tab='Home'/i);
 const ui=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(ui,/ribbonTab === 'Home' && ribbonCatalog/);
 assert.match(ui,/<SmartRibbon/);
});

test('Insert Ribbon exposes visible Smart components without requiring a selected canvas component',()=>{
 const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const insert=read('../src/core/builders/PageBuilder/SmartInsertRibbon.tsx');
 const css=read('../src/core/builders/PageBuilder/SmartInsertRibbon.css');
 assert.match(view,/ribbonTab==='Add Block' && <SmartInsertRibbon/);
 assert.doesNotMatch(view,/selectedNewUne && ribbonTab==='Add Block'/);
 assert.match(view,/items=\{paletteComponents\}/);
 assert.match(view,/onInsert=\{addPaletteComponent\}/);
 assert.match(view,/setSelectedId\(id\)/);
 assert.match(insert,/onClick=\{\(\)=>onInsert\(item.type\)\}/);
 assert.match(insert,/filterSmartInsertItems\(items,scope,term\)/);
 assert.match(insert,/aria-label="Search Insert components"/);
 assert.match(insert,/Open full library/);
 assert.match(insert,/No Smart components are installed for this tenant/);
 assert.match(css,/grid-template-rows:repeat\(3,35px\)/);
 assert.match(css,/office-builder-ribbon #page-builder-tab-content:has\(>\.smart-insert-ribbon\)/);
});

test('Smart visual/property fixes are registered without changing historic SQL migrations',()=>{
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const formula=read('../src/core/builders/PageBuilder/SmartFormulaField.tsx');
 const sql=read('../../server/src/system-support/migrations/20270125-smart-ribbon-property-corrections.sql');
 assert.match(runtime,/className="smart-switch"/);
 assert.match(runtime,/p.defaultCheck/);
 assert.match(runtime,/textAlign:p.labelAlignment/);
 assert.match(runtime,/borderRadius:number\(p.radius,10\)/);
 assert.match(ribbon,/const visible=definitions\.filter\(p=>p\.tab===tab\)/);
 assert.doesNotMatch(ribbon,/p\.tab===tab&&p\.components\.includes\(api\)/);
 assert.match(ribbon,/const supported=property\.components\.includes\(api\)/);
 const calendar=read('../src/component-libraries/ui_calendar/app-properties.mjs');
 assert.match(calendar,/"propertyKey": "defaultValue",[\s\S]*?"group": "Values",\s*"section": "Data"/);
 assert.match(ribbon,/property.id==='defaultCheck'/);
 assert.match(formula,/createPortal/);
 assert.match(formula,/window.addEventListener\('scroll',recalc,true\)/);
 assert.match(sql,/DELETE FROM md_builder_ribbon_component_rules/);
 assert.match(sql,/smart_lookup/);
});

test('Smart canvas positions remain the source of truth for rendered sizes',()=>{
 const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.ok(view.includes('component.position.width,height:component.position.height'));
 assert.ok(view.includes("target.type==='Custom:smart_toggle'&&update.position"));
});

test('Default Check SQL uses globally unique order allocation',()=>{
 const sql=read('../../server/src/system-support/migrations/20270125-smart-ribbon-property-corrections.sql');
 assert.match(sql,/COALESCE\(MAX\(sort_order\),0\)\+1 FROM md_builder_shared_properties/);
 assert.doesNotMatch(sql,/Default Check[^\n]*'choice',44,/);
});

test('Smart ribbon keeps all shared properties and renders the approved compact Office layout',()=>{
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const css=read('../src/core/builders/PageBuilder/SmartRibbon.css');
 assert.match(ribbon,/const visible=definitions\.filter\(p=>p\.tab===tab\)/);
 assert.doesNotMatch(ribbon,/p\.tab===tab&&p\.components\.includes\(api\)/);
 assert.match(ribbon,/const supported=property\.components\.includes\(api\)/);
 assert.match(ribbon,/role="switch"/);
 assert.match(ribbon,/className="smart-default-check-switch"/);
 assert.match(ribbon,/aria-checked=\{value===true\|\|value==='true'\}/);
 assert.match(css,/grid-template-rows:repeat\(3,30px\)/);
 assert.match(css,/grid-auto-flow:column/);
 assert.match(css,/max-width:none/);
 assert.match(css,/overflow:visible;text-overflow:clip/);
 assert.match(css,/\.smart-ribbon-caption/);
 assert.match(css,/\.smart-property\.disabled/);
 assert.match(css,/\.smart-icons button>svg/);
 assert.match(css,/\.smart-default-check-switch/);
 assert.match(css,/#page-builder-tab-content\.office-ribbon-content:has\(>\.smart-ribbon\)/);
 assert.match(css,/height:146px!important/);
 assert.match(css,/input\.smart-office-number/);
 const metadata=read('../../server/src/system-support/migrations/20270126-une-ribbon-requirements.sql');
 assert.match(metadata,/WHEN property_key IN \('label','defaultValue'\) THEN 'Data'/);
 assert.match(metadata,/WHEN property_key IN \('tabHeight','tabWidth','headerBoxHeight','imageHeight'\) THEN 'Layout'/);
});

test('Smart ribbon compact corrections preserve visibility and size controls correctly',()=>{
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const css=read('../src/core/builders/PageBuilder/SmartRibbon.css');
 assert.match(ribbon,/const visible=definitions\.filter\(p=>p\.tab===tab\)/);
 assert.match(ribbon,/const supported=property\.components\.includes\(api\)/);
 assert.doesNotMatch(ribbon,/p\.tab===tab&&p\.components\.includes\(api\)/);
 assert.match(css,/padding:4px 26px 4px 0!important/);
 assert.match(css,/flex:0 0 52px!important/);
 assert.match(css,/width:52px!important;min-width:52px!important;max-width:52px!important/);
 assert.match(css,/grid-template-rows:repeat\(3,30px\)/);
});

test('shared SQL ribbon moves Default Check into Data Values and shortens Header labels',()=>{
 const sql=read('../../server/src/system-support/migrations/20270127-smart-ribbon-compact-property-placement.sql');
 assert.match(sql,/SET tab='Data', section_group='Values'\s+WHERE property_key='defaultCheck'/);
 assert.match(sql,/WHEN 'headerBorderColor' THEN 'Border'/);
 assert.match(sql,/WHEN 'headerAlignment' THEN 'Alignment'/);
 assert.match(sql,/tab='Design' AND section_group='Header'/);
 assert.doesNotMatch(sql,/DELETE\s+FROM\s+md_builder_shared_properties/i);
 assert.doesNotMatch(sql,/UPDATE\s+md_builder_ribbon_component_rules/i);
});

async function renderSmart(apiName, props) {
 const descriptor=JSON.parse(read('../src/component-libraries/'+apiName+'/component.json'));
 const built=await buildBundledComponent(descriptor);
 const sandbox={React,module:{exports:{}},Date,Intl,URL,crypto:globalThis.crypto};
 vm.runInNewContext(built.compiledJs,sandbox);
 return renderToStaticMarkup(React.createElement(sandbox.module.exports.default,props));
}
test('edited Smart Button label renders instead of metadata component name',async()=>{
 const html=await renderSmart('smart_button',{label:'Pay now',builderPreview:true});
 assert.match(html,/Pay now/);
 assert.doesNotMatch(html,/>Button<\/button>/);
 const canvas=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const runtime=read('../src/core/pages/PageRuntime/pageRuntimeViews.tsx');
 assert.match(canvas,/component\.type\.startsWith\('Custom:smart_'\) && typeof component\.properties\.label/);
 assert.match(runtime,/component\.type\.startsWith\('Custom:smart_'\) && typeof resolvedProperties\.label/);
 assert.match(runtime,/component\.type\.startsWith\('Custom:smart_'\) && typeof component\.properties\.label/);
});
test('Smart calendar chooses selected day, limits weekdays and exposes change controls',async()=>{
 const html=await renderSmart('smart_calendar',{
   defaultValue:'2026-10-21',showDays:['wed','fri'],firstDay:'wed',
   defaultValueColor:'#123456',calendarShadowColor:'#abcdef'
 });
 assert.match(html,/Select 2026-10-21/);
 assert.match(html,/Select 2026-10-23/);
 assert.doesNotMatch(html,/Select 2026-10-22/);
 assert.match(html,/aria-pressed="true"/);
 assert.match(html,/#123456/i);
 assert.match(html,/#abcdef/i);
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 assert.match(ribbon,/className="smart-weekday-popup" role="dialog"/);
 assert.match(ribbon,/document\.addEventListener\('pointerdown',outside\)/);
 assert.match(ribbon,/createPortal\(<div ref=\{daysMenu\}/);
});
test('Smart navigation uses metadata Text Source for each record and direction',async()=>{
 const html=await renderSmart('smart_navigation',{
   records:[{id:'1',Name:'Alpha'},{id:'2',Name:'Beta'}],
   textSource:'@Name',navigationDirection:'vertical'
 });
 assert.match(html,/>Alpha<\/button>/);
 assert.match(html,/>Beta<\/button>/);
 assert.match(html,/flex-direction:column/);
});
test('Smart Container displays children only and Card Grid uses Badge Body Color',async()=>{
 const container=await renderSmart('smart_container',{
   label:'Do not show',textSource:'Do not show',badgeVisible:true,badgeText:'Do not show',
   children:React.createElement('span',null,'Nested content')
 });
 assert.match(container,/Nested content/);
 assert.doesNotMatch(container,/Do not show/);
 const grid=await renderSmart('smart_card_grid',{
   records:[{id:'1',Name:'Desk',Badge:'New'}],textSource:'@Name',
   badgeVisible:true,badgeText:'@Badge',badgeBodyColor:'#123456'
 });
 assert.match(grid,/Desk/);
 assert.match(grid,/New/);
 assert.match(grid,/#123456/i);
});
test('SQL Smart applicability is disabled without hiding global slots or erasing values',()=>{
 const sql=read('../../server/src/system-support/migrations/20270128-smart-renderer-property-alignment.sql');
 assert.match(sql,/UPDATE md_builder_ribbon_component_rules/);
 assert.match(sql,/SET enabled=false/);
 for(const name of ['smart_card_grid','smart_calendar','smart_container'])
   assert.match(sql,new RegExp("component_api='"+name+"'"));
 assert.doesNotMatch(sql,/DELETE\\s+FROM/i);
 assert.doesNotMatch(sql,/UPDATE\\s+md_page_/i);
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 assert.match(ribbon,/const visible=definitions\.filter\(p=>p\.tab===tab\)/);
 assert.match(ribbon,/const supported=property\.components\.includes\(api\)/);
});

test('Smart Tabs, Input Box, Lookup and Toggle edit visible control styles',async()=>{
 const tabs=await renderSmart('smart_tabs',{
   tabs:['First','Second'],tabColor:'#123456',selectedTabColor:'#abcdef',
   borderColor:'#112233',radius:8,tabWidth:140,tabHeight:48
 });
 assert.match(tabs,/#abcdef/i,'selected tab colour');
 assert.match(tabs,/#123456/i,'inactive tab colour');
 assert.match(tabs,/#112233/i,'tab border colour');
 assert.match(tabs,/min-width:140px/);
 assert.match(tabs,/height:48px/);
 const input=await renderSmart('smart_text',{
   label:'Description',textSource:'@Title',record:{Title:'Hello'},
   backgroundColor:'#abc123',labelAlignment:'right',defaultValueColor:'#123abc'
 });
 assert.match(input,/Description/);
 assert.match(input,/value="Hello"/);
 assert.match(input,/background:#abc123/i);
 assert.match(input,/text-align:right/);
 assert.match(input,/#123abc/i);
 const lookup=await renderSmart('smart_lookup',{
   placeholder:'Find a record',backgroundColor:'#abcdef',borderColor:'#123456',
   labelAlignment:'center',textSize:18
 });
 assert.match(lookup,/placeholder="Find a record"/);
 assert.match(lookup,/background:#abcdef/i);
 assert.match(lookup,/border-color:#123456/i);
 assert.match(lookup,/text-align:center/);
 const toggle=await renderSmart('smart_toggle',{defaultCheck:true,backgroundColor:'#224466'});
 assert.match(toggle,/#224466/i);
 assert.match(toggle,/role="switch"/);
 const css=read('../src/core/builders/PageBuilder/SmartRibbon.css');
 assert.match(css,/\.smart-formula input/);
});
test('Smart Design Body, Header, Badge and Image match approved three-row positions',()=>{
 const css=read('../src/core/builders/PageBuilder/SmartRibbon.css');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const rule=(section,property)=>{
   const pattern=new RegExp('\\.smart-ribbon-group\\[aria-label="'+section+'"\\]\\s+\\.smart-property\\[data-property="'+property+'"\\]\\s*\\{([^}]*)\\}');
   const match=css.match(pattern);
   assert.ok(match,'Missing positioned '+section+'.'+property);
   return match[1];
 };
 const area=(section,property,expected)=>{
   assert.match(rule(section,property),new RegExp('grid-area:\\s*'+expected.replaceAll('/','\\s*/\\s*')));
 };
 area('Body','backgroundColor','1 / 1');
 area('Body','borderColor','1 / 2');
 area('Body','labelColor','1 / 3');
 area('Body','radius','2 / 1 / 3 / -1');
 area('Body','shadow','3 / 1 / 4 / -1');
 area('Header','wrapText','1 / 1');
 area('Header','headerBold','1 / 2');
 area('Header','headerBorderColor','1 / 3');
 area('Header','headerAlignment','3 / 1 / 4 / -1');
 area('Badge','badgeAlignment','1 / 1 / 2 / 4');
 area('Badge','badgeVisible','1 / 4');
 area('Badge','badgeTextSize','2 / 1 / 3 / 4');
 area('Badge','badgeBold','3 / 1');
 area('Badge','badgeTextColor','3 / 2');
 area('Badge','badgeBodyColor','3 / 3');
 area('Image','imagePlacement','1 / 1 / 2 / -1');
 area('Image','imageBorderColor','2 / 1 / 3 / -1');
 area('Image','imageFill','3 / 1 / 4 / -1');
 for(const section of ['Body','Header','Badge','Image'])
   assert.ok(css.includes('[aria-label="'+section+'"]'),'Missing scoped '+section+' CSS');
 assert.match(css,/grid-template-rows:repeat\(3,32px\)/);
 assert.match(css,/grid-auto-flow:row/);
 assert.match(ribbon,/const supported=property\.components\.includes\(api\)/);
 assert.match(ribbon,/aria-label=\{title\}/);
 assert.match(ribbon,/data-property=\{property\.id\}/);
});

test('Smart compact rows share measured tracks and align related controls, without shrinking other sections',()=>{
 const css=read('../src/core/builders/PageBuilder/SmartRibbon.css');
 assert.match(css,/width:max-content/);
 assert.match(css,/grid-template-columns:repeat\(3,52px\)/);
 assert.match(css,/grid-template-columns:repeat\(3,60px\)/);
 assert.match(css,/grid-template-columns:64px 64px 116px 100px/);
 assert.match(css,/grid-template-columns:82px 166px/);
 assert.match(css,/grid-template-columns:54px 34px/);
 assert.match(css,/grid-template-columns:72px 144px/);
 assert.match(css,/justify-self:end/);
 assert.match(css,/flex:0 0 75px!important/);
 assert.match(css,/flex:0 0 116px!important/);
 const imageGrid=css.slice(css.indexOf('/* IMAGE:'));
 assert.match(imageGrid,/grid-template-columns:72px 144px/);
 assert.match(imageGrid,/imageBorderColor"\] \.office-ribbon-colour-property\{\s*justify-self:end/);
 const badgeGrid=css.slice(css.indexOf('/* BADGE:'),css.indexOf('/* IMAGE:'));
 assert.match(badgeGrid,/badgeTextSize"\] \.smart-numeric\{\s*justify-self:end/);
 assert.match(badgeGrid,/badgeVisible"\]>input\[type=checkbox\]\{\s*justify-self:start/);
 assert.match(badgeGrid,/grid-area:3 \/ 1/);
 assert.match(badgeGrid,/grid-area:3 \/ 2/);
 assert.match(badgeGrid,/grid-area:3 \/ 3/);
 for(const property of ['backgroundColor','borderColor','labelColor','wrapText','headerBold','headerBorderColor','badgeBold','badgeTextColor','badgeBodyColor'])
   assert.ok(css.includes('[data-property="'+property+'"]'),'Hidden icon label mapping missing '+property);
 assert.match(css,/grid-template-rows:repeat\(3,30px\)/);
 assert.match(css,/height:146px!important/);
 assert.match(css,/\.smart-ribbon-caption/);
 // The two already-approved sections must stay on their original shared tracks.
 assert.doesNotMatch(css,/\[aria-label="Typography"\]/);
 assert.doesNotMatch(css,/\[aria-label="Tabs"\]/);
});

test('Smart Badge and Image short names come only from forward-only SQL metadata',()=>{
 const sql=read('../../server/src/system-support/migrations/20270129-smart-ribbon-short-section-labels.sql');
 for(const [key,label] of Object.entries({
   badgeAlignment:'Alignment',badgeVisible:'Visible',badgeTextSize:'Text Size',
   imagePlacement:'Placement',imageBorderColor:'Border',imageFill:'Fill'
 })) assert.ok(sql.includes("WHEN '"+key+"' THEN '"+label+"'"),key+' label missing');
 assert.match(sql,/WHERE tab='Design' AND scope='component'/);
 assert.match(sql,/section_group='Badge'/);
 assert.match(sql,/section_group='Image'/);
 assert.doesNotMatch(sql,/DELETE\s+FROM|UPDATE\s+md_page_|UPDATE\s+md_builder_ribbon_component_rules/i);
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 assert.match(ribbon,/const title=property\.label/);
});

test('Smart Cart ribbon is SQL-driven and visual preview defers cart data and actions',async()=>{
 const manifest=JSON.parse(read('../src/component-libraries/manifest.json'));
 assert.ok(manifest.components.includes('smart_cart/component.json'));
 const descriptor=JSON.parse(read('../src/component-libraries/smart_cart/component.json'));
 assert.deepEqual(descriptor.propertyDefinitions,[]);
 const sql=read('../../server/src/system-support/migrations/20270130-smart-cart-ribbon.sql');
 for(const k of ['headerTextColor','supportingBoxHeight','supportingBorderColor','supportingAlignment',
 'supportingBold','supportingTextColor','tableBackgroundColor','tableBorderColor','tableShadow',
 'tableRadius','rowBorderColor','rowLabelColor','rowRadius','rowHeight','summaryBackgroundColor',
 'summaryBorderColor','summaryShadow','summaryRadius','summaryHeight','summaryWidth',
 'summaryTextSize','summaryTextWeight','summaryTextColor','summary2TextSize',
 'summary2TextWeight','summary2TextColor'])assert.ok(sql.includes("'"+k+"'"),k);
 for(const k of ['objectApiName','imageSource','textSource','imagePlacement','imageHeight',
 'imageBorderColor','imageFill','headerBoxHeight','headerBorderColor','headerAlignment',
 'headerBold','width','height','x','y'])assert.ok(sql.includes("('"+k+"')"),k);
 assert.doesNotMatch(sql,/DELETE FROM md_page_|UPDATE md_page_|UPDATE md_builder_shared_properties/i);
 const renderer=read('../src/component-libraries/smart_cart/SmartCart.jsx');
 for(const k of ['headerTextColor','supportingBorderColor','tableBackgroundColor','rowLabelColor',
 'rowHeight','summaryTextSize','summary2TextWeight','summaryWidth'])assert.ok(renderer.includes('p.'+k),k);
 assert.doesNotMatch(renderer,/onClick=|fetch\(|createRecord|checkoutAction/);
 assert.match(read('../src/component-libraries/smart/shared/SmartRuntime.jsx'),/name==="smart_cart"/);
 assert.match(read('../src/core/builders/PageBuilder/SmartRibbon.tsx'),/summary2TextWeight/);
 const catalog=await loadComponentCatalog();
 const bundled=await buildBundledComponent(catalog.components.find(c=>c.apiName==='smart_cart'));
 assert.ok(bundled.compiledJs.length>0);
});

test('Smart Cart renders configured ribbon styles in the actual component output',async()=>{
 const html=await renderSmart('smart_cart',{
  headerTextColor:'#123abc',supportingBorderColor:'#aa2211',
  supportingAlignment:'right',supportingBold:true,tableBackgroundColor:'#ddeecc',
  rowLabelColor:'#119944',rowBorderColor:'#118899',rowHeight:88,rowRadius:7,
  imageHeight:34,imagePlacement:'right',imageBorderColor:'#ff00bb',
  summaryTextSize:22,summaryTextColor:'#234567',
  summary2TextSize:27,summary2TextWeight:false,summary2TextColor:'#123321',
  summaryWidth:222,summaryHeight:150,
  textSource:'@Name',records:[{id:'row-1',Name:'Bound sample product'}]
 });
 for(const fragment of ['Bound sample product','#123abc','#aa2211','#ddeecc',
  '#119944','#118899','#ff00bb','#234567','#123321',
  'min-height:88px','width:222px','image-right','font-size:27px']){
  assert.ok(html.includes(fragment),'Actual Smart Cart output missing '+fragment);
 }
 assert.match(html,/Total/);
 assert.match(html,/not bound/);
});

test('Smart Icon has 50 local monochrome SVG assets and a safe persisted icon selector',async()=>{
 const icons=JSON.parse(read('../src/component-libraries/smart_icon/iconCatalog.json'));
 assert.equal(icons.length,50);
 assert.equal(new Set(icons.map(icon=>icon.id)).size,50);
 assert.deepEqual([...new Set(icons.map(icon=>icon.category))],[
  'Navigation & interface','Security & accounts','Commerce & analytics',
  'Communication','Productivity & files']);
 for(const icon of icons){
  assert.match(icon.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  const svg=read('../public/smart-icons/'+icon.id+'.svg');
  assert.match(svg,/<svg\s/);
  assert.match(svg,/stroke="currentColor"/);
  assert.doesNotMatch(svg,/<script|onload=|<foreignObject/i);
 }
 for(const name of ['lock','settings','shopping-cart','message-circle','house'])
  assert.ok(icons.some(icon=>icon.id===name),name);
 const manifest=JSON.parse(read('../src/component-libraries/smart_icon/component.json'));
 assert.equal(manifest.apiName,'smart_icon');
 assert.deepEqual(manifest.propertyDefinitions,[]);
 assert.deepEqual(manifest.eventDefinitions,[]);
 const catalog=await loadComponentCatalog();
 const bundled=await buildBundledComponent(catalog.components.find(c=>c.apiName==='smart_icon'));
 assert.ok(bundled.compiledJs.length>0);
});
test('Smart Icon uses black default recolourable SVG and existing ribbon colour glyphs',()=>{
 const component=read('../src/component-libraries/smart_icon/SmartComponent.jsx');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const gallery=read('../src/core/builders/PageBuilder/SmartIconGallery.tsx');
 assert.match(component,/#000000/);
 assert.match(component,/iconFillColor/);
 assert.match(component,/backgroundColor/);
 assert.match(component,/WebkitMaskImage/);
 assert.match(component,/icons.find\(icon=>icon.id===p.iconId\)/);
 assert.doesNotMatch(component,/onClick=|fetch\(/);
 assert.match(ribbon,/property.id==='iconFillColor'/);
 assert.match(ribbon,/kind=\{\/border\/i.test/);
 assert.match(view,/selected\?\.type==='Custom:smart_icon'/);
 assert.match(view,/<SmartIconGallery/);
 assert.match(gallery,/aria-pressed=\{icon.id===current.id\}/);
 assert.match(gallery,/onClick=\{\(\)=>onChange\(icon.id\)\}/);
 assert.match(gallery,/aria-label="Search icons"/);
});
test('Smart Icon SQL enables only approved appearance and layout properties',()=>{
 const sql=read('../../server/src/system-support/migrations/20270130-smart-icon-library.sql');
 for(const name of ['backgroundColor','borderColor','shadow','radius','x','y','width','height','iconFillColor'])
  assert.match(sql,new RegExp("'"+name+"'"));
 assert.match(sql,/'iconFillColor','Icon Fill Color','Design','Icon','color'/);
 assert.match(sql,/'"#000000"'::jsonb/);
 assert.doesNotMatch(sql,/UPDATE\s+md_page_|DELETE\s+FROM\s+md_builder_shared_properties/i);
 const seeder=read('../../server/src/app-seeders/smart-components.ts');
 assert.match(seeder,/"smart_icon"/);
 assert.match(seeder,/core-smart-components-v3/);
});


test('Smart Button and Input Box own visible configured dimensions, not outer canvas boxes',async()=>{
 const button=await renderSmart('smart_button',{label:'Save',width:180,height:90});
 assert.match(button,/height:90px/);
 assert.match(button,/width:180px/);
 const input=await renderSmart('smart_text',{
   label:'Search products',labelAlignment:'center',textSize:21,
   backgroundColor:'#ffe500',width:260,height:90
 });
 assert.match(input,/placeholder="Search products"/);
 assert.match(input,/font-size:21px/);
 assert.match(input,/text-align:center/);
 assert.match(input,/height:90px/);
 assert.doesNotMatch(input,/<span>Search products<\/span>/);
 assert.doesNotMatch(input,/<label[^>]*>Search products/);
 const css=read('../src/component-libraries/smart/shared/smart.css');
 assert.match(css,/smart_text>\.smart-input-box/);
 assert.match(css,/smart_image>\.smart-card/);
 const canvas=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const dataRuntime=read('../src/core/pages/MetadataBoundPageComponent/MetadataBoundPageComponent.tsx');
 assert.match(canvas,/customDefinition\.apiName\.startsWith\('smart_'\) && component\.position/);
 assert.match(canvas,/width:component\.position\.width,height:component\.position\.height/);
 assert.match(dataRuntime,/smartCanvas\?\{width:component\.position!\.width,height:component\.position!\.height\}/);
});
test('Smart Image and Card Grid bind URL from each Product record independently',async()=>{
 const records=[{id:'a',ImageURL:'https://example.com/first.png'},
  {id:'b',ImageURL:'https://example.com/second.png'}];
 const props={objectApiName:'Product',imageSource:'@ImageURL',records,
   cardsPerRow:2,cardsPerColumn:1,width:600,height:350};
 const one=await renderSmart('smart_image',props);
 assert.match(one,/src="https:\/\/example.com\/first.png"/);
 assert.doesNotMatch(one,/second.png/);
 const grid=await renderSmart('smart_card_grid',props);
 assert.match(grid,/src="https:\/\/example.com\/first.png"/);
 assert.match(grid,/src="https:\/\/example.com\/second.png"/);
 assert.equal((grid.match(/<img /g)||[]).length,2);
});
test('Smart Image upload opens native file chooser directly and reuses tenant upload',()=>{
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const picker=read('../src/core/builders/ComponentProperties/TenantMediaPicker.tsx');
 assert.match(ribbon,/uploadInput\.current\?\.click\(\)/);
 assert.match(ribbon,/type="file"/);
 assert.match(ribbon,/uploadTenantImageFile\(file\)/);
 assert.doesNotMatch(ribbon,/mediaOpen&&createPortal/);
 assert.match(picker,/export async function uploadTenantImageFile/);
 assert.match(picker,/apiRequest<Asset>\('\/media-assets'/);
});
test('Independent components avoid automatic overlap and have Office-style shape gestures',()=>{
 const builder=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const css=read('../src/core/builders/PageBuilder/SmartCanvasHandles.css');
 assert.match(builder,/usedBounds\.every\(other=>/);
 assert.match(builder,/free-canvas-move-handle/);
 assert.match(builder,/onPointerMove=\{moveCanvasPointer\}/);
 assert.match(builder,/<MoveVertical size=\{15\}\/>/);
 assert.match(builder,/<MoveHorizontal size=\{15\}\/>/);
 assert.match(css,/\.free-canvas-move-handle/);
 assert.match(css,/\.free-canvas-component \.smart-runtime/);
});
