import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateFieldExpression,evaluateCollectionFormula} from '../src/component-libraries/shared/FieldExpression.js';
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
test('Smart component catalog is independent, sixteen components and SQL-owned',async()=>{
 const source=JSON.parse(read('../src/component-libraries/manifest.json'));
 const names=source.components.map(p=>p.split('/')[0]).filter(name=>name.startsWith('smart_'));
 assert.deepEqual(names.sort(),['smart_button','smart_toggle','smart_lookup','smart_tabs',
  'smart_text','smart_textbox','smart_label','smart_card_grid','smart_image','smart_calendar','smart_navigation',
  'smart_container','smart_cart','smart_icon','smart_table','smart_numpad'].sort());
 const catalog=await loadComponentCatalog();
 for(const name of names){
  const c=catalog.components.find(c=>c.apiName===name);
  assert.ok(c);
  if(name==='smart_textbox')assert.ok(c.propertyDefinitions.some(p=>p.propertyKey==='readonly'&&p.kind==='BOOLEAN'));
  else assert.deepEqual(c.propertyDefinitions,[]);
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
 assert.match(ui,/design-canvas-settings/);
 assert.match(ui,/office-ribbon-quick-access/);
 assert.match(ui,/<SmartRibbon/);
});

test('Insert Ribbon exposes visible Smart components without requiring a selected canvas component',()=>{
 const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const insert=read('../src/core/builders/PageBuilder/SmartInsertRibbon.tsx');
 const css=read('../src/core/builders/PageBuilder/SmartInsertRibbon.css');
 assert.match(view,/ribbonTab==='Add Block' && insertRibbon/);
 assert.match(view,/const insertRibbon = \(<SmartInsertRibbon/);
 assert.doesNotMatch(view,/selectedNewUne && ribbonTab==='Add Block'/);
 assert.match(view,/items=\{paletteComponents\}/);
 assert.match(view,/onInsert=\{addPaletteComponent\}/);
 assert.match(view,/setSelectedId\(id\)/);
 assert.match(insert,/onClick=\{\(\)=>onInsert\(item.type\)\}/);
 assert.match(insert,/const visible=items\.filter\(isSmartInsertItem\)/);
 assert.match(insert,/\^Custom:smart_/);
 assert.doesNotMatch(insert,/Search Insert components|Find a component|Component sources|smart-insert-browser|smart-insert-categories|<select/);
 assert.doesNotMatch(insert,/Open full library/);
 assert.match(insert,/No Smart components are installed for this tenant/);
 assert.match(css,/display:flex!important;flex-direction:row!important/);
 assert.doesNotMatch(css,/smart-insert-browser|smart-insert-categories|grid-template-columns:170px/);
 assert.match(css,/grid-template-rows:repeat\(2,55px\)/);
 assert.match(read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css'),/grid-template-rows: repeat\(2,55px\)/);
 assert.match(read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css'),/> \.smart-insert-ribbon/);
});

test('Layout hides exact Design 2 duplicates and retired ribbon-only colours',()=>{
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const visibility=read('../src/core/builders/PageBuilder/layoutRibbonVisibility.ts');
 const matrix=read('../../server/src/system-support/migrations/20271104-zz-design2-exact-approved-matrix.sql');
 const parity=read('../../server/src/system-support/migrations/20271106-design2-functional-control-parity.sql');
 const imageParity=read('../../server/src/system-support/migrations/20271108-design2-four-control-parity.sql');
 const rowZero=read('../../server/src/system-support/migrations/20271106-design2-row0-xy-position.sql');
 const inventory=read('../../server/src/system-support/migrations/20270124-smart-component-library.sql');
 const registered=['smart_button','smart_toggle','smart_lookup','smart_tabs','smart_text',
   'smart_textbox','smart_card_grid','smart_image','smart_calendar','smart_navigation',
   'smart_container','smart_cart','smart_icon','smart_table'];
 assert.ok(ribbon.includes('!HIDDEN_RIBBON_PROPERTY_KEYS.has(p.id)'));
 assert.ok(ribbon.includes("tab==='Layout'&&hasDesign2LayoutEquivalent("));
 assert.ok(visibility.includes("propertyKey==='x'||propertyKey==='y'"));
 assert.ok(visibility.includes("propertyKey==='badgeVisible'"));
 assert.ok(visibility.includes('rule.componentApi===api&&rule.propertyKey===propertyKey'));
 assert.ok(visibility.includes('slots.some(slot=>slot.area===rule.area&&slot.slotKey===rule.slotKey)'));
 for(const removed of ['imageBorderColor','iconFillColor'])
  assert.ok(visibility.includes("'"+removed+"'"),'Retired ribbon control '+removed);
 for(const api of registered){
  for(const size of ['width','height'])
   assert.ok((matrix+'\\n'+parity).includes("('"+api+"','Body','"+size+"','"+size+"')"),
     api+' must provide Design 2 '+size+' before Layout hides it');
  assert.ok(rowZero.includes("('"+api+"')"),api+' must support Design 2 X/Y');
 }
 for(const api of ['smart_image','smart_card_grid','smart_cart'])
  for(const [slot,key] of [['placement','imagePlacement'],['imageFill','imageFill']])
   assert.ok(matrix.includes("('"+api+"','Image','"+slot+"','"+key+"')"),
     api+' must provide Design 2 '+key);
 assert.ok(imageParity.includes("('smart_navigation','Image','imageFill','imageFill')"));
 // Runtime support and saved metadata are deliberately preserved.
 assert.ok(inventory.includes("('imageBorderColor','Image Border'"));
 assert.ok(inventory.includes("('smart_image','imageBorderColor',true"));
});

test('unrequested Row, Column and Card layout tiles are hidden without breaking existing pages',()=>{
 const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const layouts=read('../src/core/pages/TemplatePageRuntime/pageComponentLayout.ts');
 assert.match(view,/layoutTypes\.filter\(type=>!\['Row','Column','Card','Container'\]\.includes\(type\)\)/);
 const manifest=JSON.parse(read('../src/component-libraries/manifest.json'));
 assert.equal(manifest.components.filter(path=>path==='smart_container/component.json').length,1);
 assert.match(view,/component\.apiName\.startsWith\('smart_'\)/);
 assert.match(layouts,/layoutTypes = \['Container', 'Row', 'Column', 'Card', 'Grid'\]/);
 assert.match(view,/component\.apiName==='smart_card_grid'\?'Card Grid'/);
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
 assert.ok(view.includes('canvasFrameSized:true'));
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
 assert.match(read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css'),/#page-builder-tab-content\.office-ribbon-content/);
 assert.match(read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css'),/--page-ribbon-scroll-strip-height: 127px/);
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
 assert.match(read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css'),/padding: 2px 6px !important/);
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
 // The app runs bundles with new Function in the page's own global, so they share the
 // tenant brand key; this isolated VM gets the same shared object explicitly.
 const brandKey=Symbol.for('une.tenantBrand');
 if(globalThis[brandKey])sandbox[brandKey]=globalThis[brandKey];
 vm.runInNewContext(built.compiledJs,sandbox);
 return renderToStaticMarkup(React.createElement(sandbox.module.exports.default,props));
}

test('unbound Card Grid displays sample cards only in editable canvas, not live or published',async()=>{
 const props={textSource:'@Name',imageSource:'@ImageUrl',badgeVisible:true,
  badgeText:'@Price',cardsPerRow:3,records:[]};
 const editor=await renderSmart('smart_card_grid',{...props,builderPreview:true,previewOnly:true});
 assert.match(editor,/Product Name 1/);
 assert.match(editor,/Product Name 2/);
 assert.match(editor,/Image Here/);
 assert.match(editor,/Price/);
 assert.doesNotMatch(editor,/smart-grid-action/,'demo cards must not trigger add-item actions');
 const published=await renderSmart('smart_card_grid',props);
 assert.doesNotMatch(published,/Product Name 1|Image Here/);
 const withRecords=await renderSmart('smart_card_grid',{
  ...props,records:[{Id:'real-1',Name:'Real product',Price:150}],
  builderPreview:true,previewOnly:true
 });
 assert.match(withRecords,/Real product/);
 assert.doesNotMatch(withRecords,/Product Name 1|Image Here/);
});

test('Cart sample lines stay in editor and never appear in read-only preview',async()=>{
 const editor=await renderSmart('smart_cart',{builderPreview:true,previewOnly:true,records:[]});
 assert.match(editor,/Preview items \(3\)/);
 const runtime=await renderSmart('smart_cart',{previewOnly:true,records:[]});
 assert.doesNotMatch(runtime,/Preview items \(3\)|Sample item/);
});

test('Image, Tabs, Navigation, Text and Container have editor-only empty previews',async()=>{
 const image=await renderSmart('smart_image',{builderPreview:true,imageSource:'@ImageUrl'});
 assert.match(image,/Image Here/);
 const publishedImage=await renderSmart('smart_image',{imageSource:'@ImageUrl'});
 assert.doesNotMatch(publishedImage,/Image Here/);
 const tabs=await renderSmart('smart_tabs',{
  objectApiName:'Category',textSource:'@Name',records:[],builderPreview:true
 });
 assert.match(tabs,/Tab 1/);
 assert.doesNotMatch(tabs,/No matching records/);
 const publishedTabs=await renderSmart('smart_tabs',{
  objectApiName:'Category',textSource:'@Name',records:[]
 });
 assert.match(publishedTabs,/No matching records/);
 const nav=await renderSmart('smart_navigation',{builderPreview:true,items:[]});
 assert.match(nav,/>Home<\/button>/);
 const publishedNav=await renderSmart('smart_navigation',{items:[]});
 assert.doesNotMatch(publishedNav,/>Home<\/button>/);
 const input=await renderSmart('smart_text',{builderPreview:true,label:''});
 assert.match(input,/placeholder="Text Here"/);
 const container=await renderSmart('smart_container',{builderPreview:true});
 assert.match(container,/Drop components here/);
 const publishedContainer=await renderSmart('smart_container',{});
 assert.doesNotMatch(publishedContainer,/Drop components here/);
 const nested=await renderSmart('smart_container',{
  builderPreview:true,children:React.createElement('span',null,'My content')
 });
 assert.match(nested,/My content/);
 assert.doesNotMatch(nested,/Drop components here/);
});

test('all editor previews are ephemeral and never stored or visible in published runtime',()=>{
 const canvas=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const bound=read('../src/core/pages/MetadataBoundPageComponent/MetadataBoundPageComponent.tsx');
 const css=read('../src/core/builders/PageBuilder/PageBuilderEditorPreview.css');
 assert.match(canvas,/builderPreview: !previewMode/);
 assert.match(bound,/builderPreview: builderPreview===true&&disableActions/);
 assert.match(canvas,/page-editor-generic-hint/);
 assert.match(canvas,/data-builder-editor=\{!previewMode/);
 assert.match(css,/pointer-events:none/);
 assert.doesNotMatch(css,/\.free-canvas-component\.selected\s*\{/);
});
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
   defaultValueColor:'#123456',shadow:'medium'
 });
 assert.match(html,/Select 2026-10-21/);
 assert.match(html,/Select 2026-10-23/);
 assert.doesNotMatch(html,/Select 2026-10-22/);
 assert.match(html,/aria-pressed="true"/);
 assert.match(html,/#123456/i);
 assert.match(html,/0 3px 9px/);
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
   actionFlows:{change:{actionType:'PageState',stateKey:'description'}},
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
test('Smart Input Box has a complete four-sided border with metadata-controlled width',async()=>{
 const fallback=await renderSmart('smart_text',{});
 assert.match(fallback,/border-style:solid/);
 assert.match(fallback,/border-width:1px/);
 assert.match(fallback,/border-color:#b8c7d7/i);
 const authored=await renderSmart('smart_text',{borderColor:'#123456',borderWidth:3});
 assert.match(authored,/border-style:solid/);
 assert.match(authored,/border-width:3px/);
 assert.match(authored,/border-color:#123456/i);
 const borderless=await renderSmart('smart_text',{borderWidth:0});
 assert.match(borderless,/border-width:0(?:;|")/);
});

test('Smart Label is a read-only Smart Input Box with the same binding and styling',async()=>{
 const label=await renderSmart('smart_label',{
  record:{Name:'BiteBurst Classic'},textSource:'@Name',
  labelColor:'#8b0000',backgroundColor:'#fff4cc',textSize:22,headerBold:true,labelAlignment:'center'
 });
 assert.match(label,/BiteBurst Classic/);
 assert.doesNotMatch(label,/<input/);
 assert.doesNotMatch(label,/contenteditable/i);
 assert.match(label,/smart-display-text/);
 assert.match(label,/color:#8b0000/i);
 assert.match(label,/background:#fff4cc/i);
 assert.match(label,/font-size:22px/);
 assert.match(label,/font-weight:700/);
 assert.match(label,/justify-content:center/);
 const staticText=await renderSmart('smart_label',{label:'Welcome'});
 assert.match(staticText,/>Welcome</);
 const pill=await renderSmart('smart_label',{label:'Bestseller',shapeId:'shape:oval',borderColor:'#f5b700'});
 assert.match(pill,/border-radius:50%/);
 assert.match(pill,/border-width:1px/);
 assert.match(await renderSmart('smart_label',{builderPreview:true}),/>Label</);
 assert.doesNotMatch(await renderSmart('smart_label',{}),/>Label</);
 // The existing Smart Input Box is unchanged.
 assert.match(await renderSmart('smart_text',{label:'Name'}),/<input/);
 const sql=read('../../server/src/system-support/migrations/20271112-smart-label-component.sql');
 assert.match(sql,/WHERE r\.component_api='smart_text' AND r\.property_key<>'displayMode'/);
 assert.match(sql,/'one-bundled:smart_label'/);
 assert.doesNotMatch(sql,/DELETE\s+FROM/i);
 assert.match(read('../../server/src/app-seeders/smart-components.ts'),/"smart_label"/);
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
 assert.match(read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css'),/--page-ribbon-scroll-strip-height: 127px/);
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
 assert.doesNotMatch(renderer,/fetch\(|createRecord|checkoutAction/);
 assert.match(renderer,/smart-cart-qty-controls/);
 assert.match(renderer,/actions\.qtyIncrease\?'qtyIncrease':'qtyIcon'/);
 assert.match(renderer,/actions\.qtyDecrease\?'qtyDecrease':'qtyIcon'/);
 assert.match(read('../src/component-libraries/smart/shared/SmartRuntime.jsx'),/name==="smart_cart"/);
 assert.match(read('../src/core/builders/PageBuilder/SmartRibbon.tsx'),/summary2TextWeight/);
 const catalog=await loadComponentCatalog();
 const bundled=await buildBundledComponent(catalog.components.find(c=>c.apiName==='smart_cart'));
 assert.ok(bundled.compiledJs.length>0);
});

test('Quick Access Delete uses one guarded removal for all selected draft components',()=>{
 const builder=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(builder,/case 'delete':return <button/);
 assert.match(builder,/aria-label="Delete selected component"/);
 assert.match(builder,/disabled=\{!selected\|\|previewMode\|\|deleteBlockedByLock\}/);
 assert.match(builder,/onClick=\{removeSelected\}/);
 assert.match(builder,/quickAccessOrder=\['save','activate','preview','exitPreview','resetIcon','undo','redo','cut','copy','paste','delete'\]/);
 assert.match(builder,/const deleteTargetIds = selectionIds.length > 1 \? selectionIds : selected \? \[selected.id\] : \[\]/);
 assert.match(builder,/removePageComponentSelection\(page.components, deleteTargetIds\)/);
 assert.match(builder,/if \(!confirmDestructiveAction\('Delete'/);
 assert.match(builder,/setSelectionIds\(\[\]\)/);
});
test('Clicking canvas releases any focused ribbon formula editor and closes field suggestions',()=>{
 const builder=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const formula=read('../src/core/builders/PageBuilder/SmartFormulaField.tsx');
 assert.match(builder,/className="page-stage" key=\{canvasRefreshKey\}\s*onPointerDownCapture=/);
 assert.match(builder,/active\.closest\('\.office-builder-ribbon'\)/);
 assert.match(builder,/active\.matches\('input,textarea,select,\[contenteditable="true"\]'\)/);
 assert.match(builder,/active\.blur\(\)/);
 assert.match(formula,/if\(error&&isFormulaDraft\(draft\.trim\(\)\)\)setConfirmIncomplete\(true\)/);
});
test('Smart Event ribbon matches On Click and Qty Icon component support',()=>{
 const ribbon=read('../src/core/builders/PageBuilder/SmartEventActionsRibbon.tsx');
 const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 assert.ok(ribbon.includes("'smart_card_grid'"));
 assert.match(ribbon,/key:'qtyIcon',label:'Qty icon',enabled:members.every\(member=>member==='smart_cart'\)/);
 assert.match(ribbon,/key:'change',label:'On Change'/);
 assert.match(ribbon,/key:'start',label:'On Session Start',enabled:members.every\(member=>member.startsWith\('smart_'\)\)/);
 assert.match(ribbon,/Autolaunched Flow/);
 assert.match(ribbon,/Screen Flow/);
 assert.match(view,/ribbonTab==='Component Action' &&\s*<PageBuilderActionRibbon/);
  assert.match(view,/disabled=\{!selected\|\|actionSelectionDisabled\}/);
 assert.match(runtime,/fire=\{fire\}/);
 for(const name of ['smart_button','smart_toggle','smart_calendar','smart_cart','smart_card_grid']){
  const descriptor=JSON.parse(read('../src/component-libraries/'+name+'/component.json'));
  assert.ok(descriptor.eventDefinitions.some(e=>e.apiName==='click'),name);
 }
 const cart=JSON.parse(read('../src/component-libraries/smart_cart/component.json'));
 assert.ok(cart.eventDefinitions.some(e=>e.apiName==='qtyIcon'));
 for(const name of ['smart_lookup','smart_tabs','smart_text','smart_label',
  'smart_image','smart_navigation','smart_container','smart_icon']){
  const descriptor=JSON.parse(read('../src/component-libraries/'+name+'/component.json'));
  assert.ok(!descriptor.eventDefinitions.some(e=>e.apiName==='click'),name);
 }
});
test('Smart Card Grid has accessible metadata-bound product selection and does not invent actions',async()=>{
 const regular=await renderSmart('smart_card_grid',{records:[{Id:'p1',Name:'Cola'}],textSource:'@Name'});
 assert.doesNotMatch(regular,/smart-grid-action/);
 const actionable=await renderSmart('smart_card_grid',{records:[{Id:'p1',Name:'Cola'}],
  textSource:'@Name',actionFlows:{click:{actionType:'Flow',flowApiName:'ConfiguredProductFlow'}}});
 assert.match(actionable,/class="smart-grid-action"/);
 assert.match(actionable,/aria-label="Select Cola"/);
 const preview=await renderSmart('smart_card_grid',{records:[{Id:'p1',Name:'Cola'}],
  actionFlows:{click:{actionType:'Flow',flowApiName:'ConfiguredProductFlow'}},builderPreview:true});
 assert.doesNotMatch(preview,/smart-grid-action/);
 const ribbon=read('../src/core/builders/PageBuilder/SmartEventActionsRibbon.tsx');
 assert.ok(ribbon.includes("'smart_card_grid'"));
});

test('Smart Cart only renders amounts supplied by metadata/Flow and shows no fabricated totals',async()=>{
 const empty=await renderSmart('smart_cart',{records:[{Id:'r1',Name:'Cola',Quantity:2}]});
 assert.match(empty,/Total not bound/);
 assert.doesNotMatch(empty,/Visual preview/);
 const bound=await renderSmart('smart_cart',{label:'Current sale',records:[{Id:'r1',Quantity:2}],
  subtotalValue:12.5,discountValue:1,taxValue:2.3,totalValue:13.8,currencyCode:'GBP'});
 assert.match(bound,/Current sale/);
 for(const amount of ['£12.50','£1.00','£2.30','£13.80'])assert.ok(bound.includes(amount),amount);
 assert.ok(bound.includes('<span>Total</span><span>£13.80</span>'),'bound summary total');
 const formula=await renderSmart('smart_cart',{
  records:[{Id:'line1',Quantity:2,UnitPrice:5}],
  totalValue:'@Quantity * @UnitPrice',currencyCode:'GBP'
 });
 assert.ok(formula.includes('£10.00'),'ribbon formula should calculate from the authorised row');
 const sql=read('../../server/src/system-support/migrations/20270210-smart-cart-summary-bindings.sql');
 for(const field of ['subtotalValue','discountValue','taxValue','totalValue'])
  assert.ok(sql.includes("'"+field+"'"));
 assert.doesNotMatch(sql,/DELETE FROM md_page_|UPDATE md_page_/i);
});

test('Smart Cart renders Flow-backed plus and minus controls',async()=>{
 const preview=await renderSmart('smart_cart',{builderPreview:true});
 assert.match(preview,/Decrease quantity for Sample item 1/);
 assert.match(preview,/Increase quantity for Sample item 1/);
 assert.match(preview,/disabled=""/);
 const bound=await renderSmart('smart_cart',{records:[{id:'line-123',Name:'Pepsi',Quantity:2}],
  textSource:'@Name',actionFlows:{qtyIcon:{actionType:'Flow',flowApiName:'AdjustQuantity'}}});
 assert.match(bound,/Decrease quantity for Pepsi/);
 assert.match(bound,/Increase quantity for Pepsi/);
 assert.match(bound,/Quantity 2/);
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
  textSource:'@Name',imageSource:'@ImageUrl',records:[{id:'row-1',Name:'Bound sample product',
     ImageUrl:'https://example.com/product-image.png'}]
 });
 for(const fragment of ['Bound sample product','#123abc','#aa2211','#ddeecc',
  '#119944','#118899','#ff00bb','#234567','#123321',
  'min-height:88px','width:222px','image-right','font-size:27px']){
  assert.ok(html.includes(fragment),'Actual Smart Cart output missing '+fragment);
 }
 assert.match(html,/Total/);
 assert.match(html,/not bound/);
});

test('Smart Icon has 71 local monochrome SVG assets and a safe persisted icon selector',async()=>{
 const icons=JSON.parse(read('../src/component-libraries/smart_icon/iconCatalog.json'));
 assert.equal(icons.length,71);
 assert.equal(new Set(icons.map(icon=>icon.id)).size,71);
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
 for(const name of ['lock','settings','shopping-cart','message-circle','house',
  'globe','circle-help','chevron-right','chevron-down','chevron-up','x','minus','utensils','car',
  'hamburger','sliders-horizontal','gift','star','crown','flame','timer','printer','qr-code',
  'smartphone','contactless','info'])
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
 assert.match(gallery,/aria-pressed=\{value===item.id\}/);
 assert.match(gallery,/onClick=\{\(\)=>select\(item.id\)\}/);
 assert.doesNotMatch(gallery,/Search icons|Search 50 icons|Home selected/);
 assert.match(gallery,/smart-shapes-popup/);
 assert.match(gallery,/shapeGroups/);
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
 assert.match(seeder,/core-smart-components-v7/);
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
 assert.match(canvas,/canvasFrameSized:true/);
 assert.match(dataRuntime,/smartCanvas\?\{canvasFrameSized:true\}/);
});
test('Smart Cart follows the canvas frame during resizing, not its previous pixel height',async()=>{
 const fixed=await renderSmart('smart_cart',{width:440,height:700,canvasFrameSized:true,
  records:[],previewOnly:true});
 assert.match(fixed,/class="smart-runtime smart_cart"/);
 assert.match(fixed,/width:100%;height:100%/);
 const standalone=await renderSmart('smart_cart',{width:440,height:700,records:[]});
 assert.match(standalone,/width:440px;height:700px/);
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
 const placement=read('../src/core/builders/PageBuilder/canvasInsertPlacement.ts');
 assert.match(builder,/placeNewCanvasComponent\(\{/);
 assert.match(placement,/used\.every\(item=>/);
 assert.match(builder,/free-canvas-move-edge/);
 assert.doesNotMatch(builder,/className="free-canvas-move-handle"/);
 assert.match(builder,/onPointerMove=\{moveCanvasPointer\}/);
 assert.doesNotMatch(builder,/<MoveVertical size=\{15\}\/>/);
 assert.doesNotMatch(builder,/<MoveHorizontal size=\{15\}\/>/);
 assert.match(css,/\.free-canvas-move-edge/);
 assert.match(css,/\.free-canvas-component \.smart-runtime/);
});


test('Smart Tabs renders only bounded matching record labels from a filtered Object source',async()=>{
 const records=Array.from({length:50},(_,i)=>({id:String(i),Name:'Product '+i}));
 const html=await renderSmart('smart_tabs',{objectApiName:'Product',textSource:'@Name',tabCount:4,records,builderPreview:true});
 for(let i=0;i<4;i++)assert.match(html,new RegExp('Product '+i));
 assert.doesNotMatch(html,/Product 4/);
 assert.doesNotMatch(html,/Tab 1/);
 const empty=await renderSmart('smart_tabs',{objectApiName:'Product',textSource:'@Name',records:[]});
 assert.match(empty,/No matching records/);
});


test('Smart Tabs uses first actual Object tab rather than deprecated synthetic first-tab settings',async()=>{
 const base={objectApiName:'MenuCategory',textSource:'@Name',tabCount:2,
  records:[{Id:'category-1',Name:'Desserts'},{Id:'category-2',Name:'Drinks'}]};
 const original=await renderSmart('smart_tabs',base);
 assert.equal((original.match(/role="tab"/g)??[]).length,2);
 assert.match(original,/aria-selected="true"[^>]*>Desserts<\/button>/);
 const legacy=await renderSmart('smart_tabs',{...base,firstTabCustom:true,
  firstTabCaption:'Deprecated first',firstTabValue:'*'});
 assert.equal((legacy.match(/role="tab"/g)??[]).length,2);
 assert.doesNotMatch(legacy,/Deprecated first|Custom tab/);
 assert.match(legacy,/aria-selected="true"[^>]*>Desserts<\/button>/);
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 for(const property of ['firstTabCustom','firstTabCaption','firstTabValue'])
  assert.doesNotMatch(runtime,new RegExp(property));
 assert.match(runtime,/const tabs=dynamic\|\|hasCollection\?recordTabs:recordTabs\.map/);
});
test('SQL and ribbon retire the three first-tab properties without deleting saved metadata',()=>{
 const sql=read('../../server/src/system-support/migrations/20270305-retire-smart-tabs-custom-first-tab.sql');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const server=read('../../server/src/system-support/server.ts');
 for(const property of ['firstTabCustom','firstTabCaption','firstTabValue']){
  assert.match(sql,new RegExp("'"+property+"'"));
  assert.match(ribbon,new RegExp("'"+property+"'"));
  assert.match(server,new RegExp("'"+property+"'"));
 }
 assert.match(sql,/UPDATE md_builder_ribbon_component_rules/);
 assert.match(sql,/SET enabled=false/);
 assert.match(ribbon,/!retiredTabs\.has\(p\.id\)/);
 assert.match(server,/WHERE p\.property_key NOT IN \('firstTabCustom','firstTabCaption','firstTabValue'\)/);
 assert.doesNotMatch(sql,/DELETE|DROP|md_page_definitions|md_page_components|md_records/i);
});
 
test('named COLLECTION mixes manual items with authorised Object.Field values',async()=>{
 const value=evaluateCollectionFormula(
  'COLLECTION("Mycollection", "a22", "none", @MenuCategory.Name)',
  {MenuCategory:[{Id:'c1',Name:'Burgers'},{Id:'c2',Name:'Drinks'}]});
 assert.equal(value.error,undefined);
 assert.equal(value.value.name,'Mycollection');
 assert.equal(value.value.items.length,4);
 assert.deepEqual(value.value.items.slice(0,2),['a22','none']);
 assert.equal(value.value.items[2].label,'Burgers');
 assert.equal(value.value.items[2].value,'c1');
 assert.equal(value.value.items[3].label,'Drinks');
 assert.match(evaluateCollectionFormula('COLLECTION("1bad", "none")').error,/name/);
 assert.match(evaluateCollectionFormula('COLLECTION("Missing", @Missing.Name)').error,/unavailable|field/);
 const records=value.value.items.map((item,index)=>item&&typeof item==='object'
  ?{...item.record,__collectionLabel:item.label,__collectionValue:item.value}
  :{Id:'',Name:item,__collectionLabel:item,__collectionValue:item});
 const markup=await renderSmart('smart_tabs',{objectApiName:'MenuCategory',textSource:'@Name',
  records,tabCount:5,dataCollection:value.value});
 for(const label of ['a22','none','Burgers','Drinks'])assert.match(markup,new RegExp(label));
 assert.equal((markup.match(/role="tab"/g)??[]).length,4);
 assert.ok(markup.indexOf('>a22</button>')<markup.indexOf('>none</button>'));
 const sql=read('../../server/src/system-support/migrations/20270303-universal-named-collection-formula.sql');
 assert.match(sql,/'collectionFormula','Collection','Data','Source','expression'/);
 assert.doesNotMatch(sql,/All items|MenuCategory|CODEXTILL|UPDATE md_page_/i);
});

test('Dynamic Tabs use Object text values inside tabs even when old static tabs were saved',async()=>{
 const records=[{Id:'a',Barcode:'DEMO10001',Name:'First'},
  {Id:'b',Barcode:'DEMO10002',Name:'Second'},
  {Id:'c',Barcode:'DEMO10003',Name:'Third'}];
 const markup=await renderSmart('smart_tabs',{objectApiName:'Product',
   textSource:'@Barcode',label:'@Name',tabs:['Tab 1','Tab 2'],records,tabCount:2,
   height:125,width:330});
 assert.match(markup,/DEMO10001/);
 assert.match(markup,/DEMO10002/);
 assert.doesNotMatch(markup,/DEMO10003|Tab 1|Tab 2/);
 assert.doesNotMatch(markup,/smart-tabs-heading/);
 assert.match(markup,/height:125px/);
 assert.match(markup,/min-height:0/);
});
test('Smart Image and Card Grid display real record ImageUrl even when earlier records have none',async()=>{
 const records=[{Id:'empty1',Name:'Empty'},{Id:'filled1',Name:'Image record 1',
   ImageUrl:'https://images.pexels.com/photos/12178045/pexels-photo-12178045.jpeg?auto=compress&cs=tinysrgb&w=800'},
  {Id:'empty2',Name:'Another empty'},{Id:'filled2',Name:'Image record 2',
   ImageUrl:'https://images.pexels.com/photos/14686449/pexels-photo-14686449.jpeg'}];
 const props={imageSource:'@ImageUrl',imageSourceMode:'field',objectApiName:'Product',
   records,cardsPerRow:2,cardsPerColumn:1,width:600,height:350};
 const image=await renderSmart('smart_image',props);
 assert.match(image,/photos\/12178045/);
 const grid=await renderSmart('smart_card_grid',props);
 assert.match(grid,/photos\/12178045/);
 assert.match(grid,/photos\/14686449/);
 assert.doesNotMatch(grid,/aria-label="Image area"/);
 assert.equal((grid.match(/<img /g)||[]).length,2);
});
test('Calendar selected value colour fills date and Shadow uses shared three presets',async()=>{
 const markup=await renderSmart('smart_calendar',{
   defaultValue:'2026-10-30',defaultValueColor:'#ff0000',shadow:'medium',
   width:440,height:480});
 assert.match(markup,/background:#ff0000/);
 assert.match(markup,/color:#fff/);
 assert.match(markup,/0 3px 9px/);
 const ui=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const migration=read('../../server/src/system-support/migrations/20270131-smart-calendar-shadow-control.sql');
 assert.match(ui,/api==='smart_calendar'&&property.id==='shadow'/);
 assert.match(migration,/value_key=NULL/);
});
test('Page Builder keyboard shortcuts and visible PowerPoint-style resize cursor handles',()=>{
 const builder=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const css=read('../src/core/builders/PageBuilder/SmartCanvasHandles.css');
 assert.match(builder,/command && key === 'x'/);
 assert.match(builder,/command && key === 'c'/);
 assert.match(builder,/command && key === 'v'/);
 assert.match(builder,/command && key === 'y'/);
 assert.match(builder,/command && key === 'z'/);
 assert.match(builder,/if\(!editorMode\)return/);
 assert.match(builder,/cutSelected\(\)/);
 assert.match(builder,/root.position.x\+24/);
 assert.doesNotMatch(builder,/<MoveVertical size=\{15\}/);
 assert.match(css,/\.free-canvas-resize-handle:is\(:hover,:focus-visible,:active\)/);
 assert.match(css,/\.free-canvas-move-edge:focus-visible/);
 assert.match(css,/opacity:1/);
 assert.match(builder,/rawLayoutParentId\(selected\)/);
});
test('Image source is editable @ text, with upload only for the Image component',()=>{
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 assert.match(ribbon,/className="smart-formula-filter smart-image-source-editor"/);
 assert.match(ribbon,/rootObjectApiName=\{objectName\}/);
 assert.match(ribbon,/api==='smart_image'/);
 assert.doesNotMatch(ribbon,/Image source type|allImageFields/);
 assert.match(ribbon,/SmartFormulaField/);
 assert.doesNotMatch(ribbon,/smart-data-field-picker|relationshipFormulaFields\(objects,sourceObjectNames/);
 assert.match(ribbon,/activeDataProperty\.id==='imageSource'\?'image':'text'/);
 assert.match(ribbon,/uploadInput.current\?\.click\(\)/);
 assert.doesNotMatch(ribbon,/>Library<\/button>/);
 assert.doesNotMatch(ribbon,/setLibraryOpen/);
 const proxy=read('../../../scripts/oracle/ensure-frontend-api-proxy.sh');
 assert.match(proxy,/client_max_body_size 8m/);
});
test('Shared Smart runtime leaves no decorative surrounding selection container',async()=>{
 const names=['smart_button','smart_text','smart_label','smart_lookup','smart_tabs',
  'smart_toggle','smart_image','smart_card_grid','smart_calendar',
  'smart_navigation','smart_cart','smart_container'];
 const props={width:260,height:120,label:'Example',tabs:['A','B']};
 for(const name of names){
  const html=await renderSmart(name,props);
  assert.match(html,/class="smart-runtime smart_/);
  assert.match(html,/width:260px/);
  assert.match(html,/height:120px/);
  assert.match(html,/background:transparent/);
  assert.match(html,/box-shadow:none/);
 }
 const css=read('../src/component-libraries/smart/shared/smart.css');
 assert.match(css,/smart-runtime > :first-child/);
 assert.match(css,/smart-calendar-grid/);
});

test('Smart Cart ribbon packs Header Supporting, Table and Row without hidden editors',()=>{
 const css=read('../src/core/builders/PageBuilder/SmartRibbon.css');
 const scoped=css.slice(css.indexOf('/* SMART CART compact Design:'));
 assert.ok(scoped.startsWith('/* SMART CART compact Design:'),'Smart Cart-only rules missing');
 assert.match(scoped,/data-smart-api="smart_cart"/);
 assert.match(scoped,/grid-auto-flow:row/);
 for(const [group,columns] of [
  ['Header Supporting','88px 148px'],['Table','116px 152px'],['Row','124px 88px']
 ]){
  const block=new RegExp('\\.smart-ribbon-group\\[aria-label="'+group+'"\\] \\.smart-ribbon-items\\{\\s*grid-template-columns:'+columns.replace(' ','\\s+')+';');
  assert.match(scoped,block,group+' compact tracks missing');
 }
 const slots=[
  ['Header Supporting','supportingBorderColor','1 / 1'],
  ['Header Supporting','supportingTextColor','1 / 2'],
  ['Header Supporting','supportingAlignment','2 / 1 / 3 / -1'],
  ['Header Supporting','supportingBold','3 / 1 / 4 / -1'],
  ['Table','tableBackgroundColor','1 / 1'],
  ['Table','tableBorderColor','1 / 2'],
  ['Table','tableRadius','2 / 1 / 3 / -1'],
  ['Table','tableShadow','3 / 1 / 4 / -1'],
  ['Row','rowBorderColor','1 / 1'],
  ['Row','rowLabelColor','1 / 2'],
  ['Row','rowHeight','2 / 1 / 3 / -1'],
  ['Row','rowRadius','3 / 1 / 4 / -1']
 ];
 for(const [section,key,area] of slots)
  assert.ok(scoped.includes('.smart-ribbon-group[aria-label="'+section+'"] .smart-property[data-property="'+key+'"]{grid-area:'+area+'}'),
   section+'.'+key+' missing compact position');
 assert.match(scoped,/input\.smart-office-number\{[\s\S]*?width:75px!important/);
 assert.doesNotMatch(scoped,/\.smart-property\s*\{[^}]*display:none/);
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 assert.match(ribbon,/aria-label=\{title\}/);
 assert.match(ribbon,/data-property=\{property\.id\}/);
});

test('Smart Cart Summary and Summary 2 use compact separate icon-first rows',()=>{
 const css=read('../src/core/builders/PageBuilder/SmartRibbon.css');
 const sql=read('../../server/src/system-support/migrations/20270201-smart-cart-summary2-ribbon.sql');
 const section=css.slice(css.indexOf('/* Smart Cart Summary:'));
 assert.match(section,/data-smart-api="smart_cart"/);
 assert.match(section,/grid-template-columns:repeat\(3,78px\) 10px 126px 80px/);
 assert.match(section,/grid-template-columns:repeat\(3,76px\)/);
 for(const [group,property,area] of [
  ['Summary','summaryBackgroundColor','1 / 1'],
  ['Summary','summaryBorderColor','1 / 2'],
  ['Summary','summaryTextColor','1 / 3'],
  ['Summary','summaryTextSize','2 / 1 / 3 / 3'],
  ['Summary','summaryTextWeight','2 / 3'],
  ['Summary','summaryShadow','3 / 1 / 4 / 4'],
  ['Summary','summaryRadius','1 / 5 / 2 / 7'],
  ['Summary','summaryHeight','2 / 5 / 3 / 7'],
  ['Summary','summaryWidth','3 / 5 / 4 / 7'],
  ['Summary 2','summary2TextSize','1 / 1 / 2 / -1'],
  ['Summary 2','summary2TextColor','2 / 2'],
  ['Summary 2','summary2TextWeight','2 / 3']
 ]) {
  const positioned='.smart-ribbon-group[aria-label="'+group+'"] .smart-property[data-property="'+property+'"]';
  assert.ok(section.includes(positioned+'{grid-area:'+area) ||
    section.includes(positioned+'{\n  grid-area:'+area),
    group+' '+property+' should have a compact slot');
 }
 assert.match(section,/\[data-property="summary2TextWeight"\]\)>.smart-label\{\s*display:none/);
 assert.match(sql,/SET section_group='Summary 2'/);
 for(const key of ['summary2TextSize','summary2TextWeight','summary2TextColor'])
  assert.match(sql,new RegExp("'"+key+"'"));
 assert.match(sql,/WHEN 'summary2TextSize' THEN 'Text Size'/);
 assert.doesNotMatch(sql,/UPDATE\s+md_page_|DELETE\s+FROM/i);
});

test('Shared @ binding and canvas fill are metadata-driven for arbitrary objects',()=>{
 const formula=read('../src/core/builders/PageBuilder/SmartFormulaField.tsx');
 const mentions=read('../src/component-libraries/shared/primitives/SmartFieldInput/smartFieldMentions.ts');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const filter=read('../src/component-libraries/shared/primitives/RecordFilterEditor/RecordFilterEditor.tsx');
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const sql=read('../../server/src/system-support/migrations/20270202-canvas-fill-color.sql');
 assert.match(read('../src/core/builders/PageBuilder/relationshipFormulaFields.ts'),/mentionGroups\(objects,root/);
 assert.match(mentions,/resolveCollectionMentionRows/);
 assert.match(mentions,/MAX_HOPS = 3/);
 assert.match(ribbon,/rootObjectApiName=\{objectName\}/);
 assert.match(filter,/FieldExpression/);
 assert.match(filter,/Related Lookup Fields/);
 assert.match(runtime,/__mentionValues/);
 assert.match(runtime,/onError=\{\(\)=>setFailed\(true\)\}/);
 assert.match(view,/case 'canvasFillColor'/);
 assert.match(sql,/md_page_layout_versions/);
});
test('Smart dynamic content scrolls only when the rendered component overflows',()=>{
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 const css=read('../src/component-libraries/smart/shared/smart.css');
 assert.match(runtime,/gridAutoRows:"max\("\+minimumCardHeight\+"px, calc\(/);
 assert.match(runtime,/const minimumCardHeight=number\(p\.cardMinHeight,96,96,1200\)/);
 assert.match(runtime,/p\.cardsPerColumn/);
 assert.match(runtime,/overflowY:"auto"/);
 assert.match(runtime,/previewRows\.map\(\(r,i\)=>/);
 assert.match(runtime,/const boundRows=recordsOf\(p\)/);
 assert.doesNotMatch(runtime,/recordsOf\(p\)\.slice\(0,200\)\.map/);
 assert.match(runtime,/p\.cardsPerRow/);
 assert.match(runtime,/p\.actionFlows\?\.click/);
 assert.match(runtime,/onClick=\{selectRecord\}/);
 assert.doesNotMatch(css,/grid-auto-rows:minmax\(160px,auto\)!important/);
 assert.doesNotMatch(css,/min-height:160px!important/);
 assert.match(css,/\.smart-runtime\.smart_navigation>\.smart-navigation/);
 assert.match(css,/\.smart-runtime\.smart_card_grid>\.smart-grid/);
 assert.match(css,/\.smart-runtime\.smart_tabs>\.smart-tabs-shell/);
 assert.match(css,/overscroll-behavior:contain/);
});


test('Current three-row renderer keeps disabled metadata slots and numerical SVGs',()=>{
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const icons=read('../src/core/builders/PageBuilder/SmartRibbonIcons.tsx');
 const css=read('../src/core/builders/PageBuilder/SmartRibbonApprovedThreeRow.css');
 assert.match(ribbon,/const visible=definitions\.filter\(p=>p\.tab===tab\)/);
 assert.match(ribbon,/const supported=property\.components\.includes\(api\)/);
 assert.match(ribbon,/data-supported=\{supported\}/);
 assert.match(ribbon,/data-numeric-icon=\{hasNumericIcon/);
 assert.match(ribbon,/RibbonTextSizeIcon/);
 assert.match(ribbon,/RibbonCornerRadiusIcon/);
 assert.match(icons,/stopColor="#ec2c88"/);
 assert.match(icons,/stopColor="#ffe153"/);
 assert.match(icons,/useId\(\)/);
 assert.match(css,/\.smart-property\.disabled/);
 assert.match(css,/grid-template-columns:none!important/);
 assert.doesNotMatch(ribbon,/SmartRibbonCompact\.css/);
 assert.doesNotMatch(ribbon,/tab==='Colors'/);
});

test('SQL-backed eight-tab ribbon retains existing controls and correct geometry',()=>{
 const sql=read('../../server/src/system-support/migrations/20270211-eight-tab-ribbon-geometry.sql');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const css=read('../src/core/builders/PageBuilder/SmartRibbonApprovedThreeRow.css');
 const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const insert=read('../src/core/builders/PageBuilder/SmartInsertRibbon.tsx');
 const arrange=read('../src/core/builders/PageBuilder/ArrangeRibbon.tsx');
 const visual=read('../src/core/builders/PageBuilder/PageBuilderEightTabRibbon.css');
 assert.match(view,/'Component Design 2','Component Action','Advanced','Preview'/);
 assert.match(view,/Preview: 'View'/);
 assert.doesNotMatch(view,/Shapes: 'Shapes'/);
 assert.doesNotMatch(view,/Grok: 'Grok'/);
 assert.match(view,/ribbonTab==='Preview' && <div className="office-ribbon-group preview-visibility-group"/);
 assert.match(view,/<PageBuilderVisibilityDialog/);
 assert.match(view,/design2Arrange=\{canvasArrangeProps\}/);
 assert.match(arrange,/onAlign/);
 assert.match(arrange,/onNesting/);
 assert.match(insert,/onClick=\{\(\)=>onInsert\(item.type\)\}/);
 assert.match(ribbon,/RibbonColorPalette variant="property"/);
 assert.match(ribbon,/RibbonTextSizeIcon/);
 assert.match(ribbon,/RibbonCornerRadiusIcon/);
 assert.match(ribbon,/SmartIconDropdown kind="align"/);
 assert.match(ribbon,/SmartIconDropdown kind="shadow"/);
 assert.match(ribbon,/smart-default-check-switch/);
 assert.match(ribbon,/filterCount>0/);
 assert.match(ribbon,/smart-formula-prefix/);
 assert.match(css,/padding:6px 7px 1px!important/);
 assert.match(read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css'),/overflow-x: auto !important/);
 for(const id of ['badgeAlignment','summaryTextSize','summary2TextSize',
  'cardsPerRow','cardsPerColumn','column2Source','columnVisibility','iconFillColor'])
   assert.ok(sql.includes("'"+id+"'"),'Missing SQL placement '+id);
 assert.doesNotMatch(sql,/DELETE FROM md_page_|UPDATE md_page_|DELETE FROM md_builder_ribbon_component_rules/i);
});

test('Cart Data group reuses SQL property registry; only Smart Cart has the five new enabled controls',()=>{
 const sql=read('../../server/src/system-support/migrations/20270207-smart-cart-column-bindings.sql');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const multi=read('../src/core/builders/PageBuilder/SmartMultiSelect.tsx');
 const css=read('../src/component-libraries/smart_cart/SmartComponent.css');
 for(const name of ['column2Source','column3Source','column4Source','column5Source','columnVisibility'])
   assert.ok(sql.includes("'"+name+"'"),name);
 assert.match(sql,/SELECT 'smart_cart',p.property_key,true/);
 assert.match(sql,/section_group/);
 assert.match(sql,/'Data','Cart'/);
 assert.match(sql,/'cardsPerRow',true/);
 assert.doesNotMatch(sql,/DELETE FROM md_page_|UPDATE md_page_|DELETE FROM md_builder_ribbon_component_rules/i);
 assert.match(ribbon,/Array.isArray\(value\)\)editor=<SmartMultiSelect/);
 assert.match(multi,/aria-haspopup="dialog"/);
 assert.match(multi,/choices\.map\(choice=>/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/--smart-cart-columns/);
});
test('Cart supports five formula columns, computed totals, and visibility without recomputing summary',async()=>{
 const source={
  records:[{Id:'line-1',Name:'Pepsi',UnitPrice:12.5,Quantity:2,Discount:3,Description:'Cola'}],
  textSource:'@Name',column2Source:'@Description',column3Source:'@Quantity',
  column4Source:'@Quantity * @UnitPrice',column5Source:'@Discount',
  objectApiName:'CartLine',
  objects:[{apiName:'CartLine',fields:[{apiName:'Quantity',dataType:'Number'}]}],
  actionFlows:{qtyIcon:{actionType:'Flow',flowApiName:'AdjustQty'}}
 };
 const html=await renderSmart('smart_cart',source);
 for(const expected of ['Unit price','Quantity','Discount','Cola','25','Decrease quantity for Pepsi','Increase quantity for Pepsi'])
  assert.ok(html.includes(expected),expected);
 assert.match(html,/Quantity 2/);
 assert.match(html,/Cart summary/);
 assert.match(html,/Total not bound/); // Cell formula is not an invented summary total.
 const hidden=await renderSmart('smart_cart',{...source,columnVisibility:['Column 1','Column 4']});
 assert.match(hidden,/Pepsi/);
 assert.match(hidden,/>Total<\/span>/);
 const headers=hidden.split('class="smart-cart-columns"')[1]?.split('</div>')[0]??'';
 assert.doesNotMatch(headers,/Unit price|Quantity|Discount/);
 assert.doesNotMatch(hidden,/Decrease quantity for Pepsi/);
 assert.match(hidden,/>25<\/span>/);
 const empty=await renderSmart('smart_cart',{...source,columnVisibility:[]});
 assert.match(empty,/No columns selected/);
});
test('Cart quantity icons are displayed only for direct numeric fields, not text fields or computed values',async()=>{
 const base={objectApiName:'Item',
  records:[{id:'a',Name:'Alpha',Quantity:2,Description:'2',UnitPrice:5}],
  textSource:'@Name',actionFlows:{qtyIcon:{actionType:'Flow',flowApiName:'QuantityFlow'}}};
 const numeric=await renderSmart('smart_cart',{...base,column3Source:'@Quantity',
  objects:[{apiName:'Item',fields:[{apiName:'Quantity',dataType:'Currency'}]}]});
 assert.match(numeric,/Increase quantity for Alpha/);
 const text=await renderSmart('smart_cart',{...base,column3Source:'@Description',
  objects:[{apiName:'Item',fields:[{apiName:'Description',dataType:'Text'}]}]});
 assert.doesNotMatch(text,/Increase quantity for Alpha|Decrease quantity for Alpha/);
 const formula=await renderSmart('smart_cart',{...base,column3Source:'@Quantity * 2',
  objects:[{apiName:'Item',fields:[{apiName:'Quantity',dataType:'Number'}]}]});
 assert.doesNotMatch(formula,/Increase quantity for Alpha|Decrease quantity for Alpha/);
 assert.match(formula,/>4<\/span>/);
});
test('Cart visible-row setting constrains item region, not header and summary',async()=>{
 const html=await renderSmart('smart_cart',{
  cardsPerRow:2,rowHeight:40,records:Array.from({length:8},(_,i)=>({id:'item-'+i,Name:'Item '+i,Quantity:i+1})),
  textSource:'@Name'
 });
 assert.match(html,/aria-label="Cart item rows"/);
 assert.match(html,/max-height:128px/);
 assert.match(html,/Item 7/);
 assert.match(html,/Cart summary/);
 assert.match(html,/Cart columns/);
 assert.match(html,/Total not bound/);
});

test('Design source scopes @ fields to explicitly selected metadata objects and preserves SQL ownership',()=>{
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const formula=read('../src/core/builders/PageBuilder/SmartFormulaField.tsx');
 const page=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const sql=read('../../server/src/system-support/migrations/20270207-page-builder-ribbon-sources-layout.sql');
 const styles=read('../src/core/builders/PageBuilder/SmartRibbonApprovedThreeRow.css');
 assert.match(ribbon,/sourceKey=\(index:number\)=>index===1\?'objectApiName':'objectApiName'\+index/);
 assert.match(ribbon,/sourceObjectKeys=Object\.keys\(properties\)/);
 assert.match(ribbon,/objectSourceCount/);
 assert.match(ribbon,/const objectName=sourceObjectNames\[0\]\?\?''/);
 assert.doesNotMatch(ribbon,/fallback\(properties\.objectApiName\)\|\|pageObjectApiName/);
 assert.match(formula,/relationshipFormulaFields/);
 assert.match(formula,/selectedSourceObjects!==undefined/);
 assert.match(read('../src/core/builders/PageBuilder/relationshipFormulaFields.ts'),/field.reference/);
 assert.match(sql,/section_group='Others'/);
 assert.match(sql,/Navigation Placement/);
 assert.match(sql,/section_group='Component'/);
 assert.match(sql,/objectApiName3/);
 assert.match(read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css'),/--page-ribbon-content-height: 114px/);
 assert.match(styles,/gap:4px!important/);
 assert.match(read('../src/core/builders/PageBuilder/PageDetailsDialog.tsx'),/Restore &amp; Design/);
 assert.doesNotMatch(page,/homeValue\('restoreVersion'\)/);
 assert.doesNotMatch(page,/case 'canvasMode'/);
 assert.doesNotMatch(page,/ribbonTab==='Icons'/);
 assert.doesNotMatch(page,/office-ribbon-stepper/);
});


test('Layout Image Background uses SQL fill palette for only Image and Container',()=>{
 const sql=read('../../server/src/system-support/migrations/20270212-image-container-background-fill.sql');
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const palette=read('../src/core/builders/PageBuilder/RibbonColorPalette.tsx');
 assert.match(sql,/imageBackgroundColor','Background','Layout','Image','color'/);
 assert.match(sql,/\('smart_image'\),\('smart_container'\)/);
 assert.match(sql,/NULL::jsonb,'\[\]'::jsonb,'component'/);
 assert.match(runtime,/single\?\(p\.imageBackgroundColor\?\?p\.backgroundColor\?\?"transparent"\)/);
 assert.match(runtime,/background:p\.imageBackgroundColor\?\?p\.backgroundColor\?\?"transparent"/);
 assert.match(ribbon,/kind==='color'/);
 assert.match(palette,/kind==='fill'\?'No fill'/);
});

test('two shared Tabs source paths preserve Object IDs and named Collection IDs',()=>{
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 assert.match(runtime,/row\?\.Id\?\?row\?\.id/);
 assert.match(runtime,/collectionName:p\.dataCollection\.key\?\?p\.dataCollection\.name/);
 assert.doesNotMatch(runtime,/isCustom:true/);
 assert.match(ribbon,/p\.id!=='collectionFormula'/);
});
 
test('Smart Tabs starts on first actual tab and keeps explicit selections across sources',async()=>{
 const base={objectApiName:'Category',textSource:'@Name',tabCount:2,
  records:[{Id:'a',Name:'Food'},{Id:'b',Name:'Drinks'}]};
 for(const action of [
  {actionType:'PageState',stateKey:'categoryId'},
  {actionType:'Formula',formula:'@state.categoryId := @event.record.Id'}
 ]){
  const configured={...base,actionFlows:{change:action}};
  const chosen=await renderSmart('smart_tabs',{...configured,pageState:{categoryId:'b'}});
  assert.match(chosen,/aria-selected="true"[^>]*>Drinks<\/button>/);
  const initial=await renderSmart('smart_tabs',{...configured,pageState:{}});
  assert.match(initial,/aria-selected="true"[^>]*tabindex="0"[^>]*>Food<\/button>/);
  assert.doesNotMatch(initial,/aria-selected="true"[^>]*>Drinks<\/button>/);
 }
 const dataCollection={name:'Children',items:[]};
 const records=[{Id:'a',Name:'Food',__collectionLabel:'Food',__collectionValue:'a'},
  {Id:'b',Name:'Drinks',__collectionLabel:'Drinks',__collectionValue:'b'}];
 const selected=await renderSmart('smart_tabs',{...base,records,dataCollection,
  pageState:{collectionSelections:{Children:{Id:'b'}}}});
 assert.match(selected,/aria-selected="true"[^>]*>Drinks<\/button>/);
 const unselected=await renderSmart('smart_tabs',{...base,records,dataCollection,
  pageState:{collectionSelections:{}}});
 assert.match(unselected,/aria-selected="true"[^>]*>Food<\/button>/);
 const legacy=await renderSmart('smart_tabs',{...base,records,dataCollection,
  firstTabCustom:true,firstTabCaption:'Featured',firstTabValue:'featured',
  pageState:{collectionSelections:{}}});
 assert.match(legacy,/aria-selected="true"[^>]*>Food<\/button>/);
 assert.doesNotMatch(legacy,/Featured/);
 const empty=await renderSmart('smart_tabs',{...base,records:[],dataCollection,
  pageState:{collectionSelections:{}}});
 assert.doesNotMatch(empty,/aria-selected="true"/);
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 assert.match(runtime,/React\.useEffect\(\(\)=>\{[\s\S]*?selectTab\(defaultTabIndex,true\)/);
 assert.match(runtime,/if\(!tabs\.length\|\|p\.loading\|\|p\.previewOnly\|\|p\.builderPreview/);
 assert.match(runtime,/if\(indexForSelection>=0\)\{autoSelected\.current=null;return;/);
 assert.match(runtime,/if\(autoSelected\.current===key\)return;/);
 assert.match(runtime,/changeAction\.actionType!=="PageState"/);
 assert.match(runtime,/changeAction\.actionType==="Formula"&&formulaStateKey/);
 assert.match(runtime,/selectedTabRef\.current\?\.focus\(\{preventScroll:true\}\)/);
 assert.match(runtime,/document\.activeElement!==document\.body/);
});
 
test('collection-driven Smart Card Grid renders authorised record title and other fields, not lookup criterion',async()=>{
 const formula='=COLLECTION("FilteredProducts",@Product.MenuCategory=@CatCollection.state.Id)';
 const collectionResult=evaluateCollectionFormula(formula,{Product:[
  {Id:'missing',Name:'Uncategorised',Price:3},
  {Id:'p1',Name:'Cola',MenuCategory:'drinks',Price:1.25,
   ImageUrl:'https://example.com/cola.png'}
 ]},{primaryObject:'Product',collectionSourceFields:{Product:['MenuCategory','Name','Price','ImageUrl']},
  state:{collectionSelections:{CatCollection:{Id:'drinks'}}}});
 assert.equal(collectionResult.error,undefined);
 const collection=collectionResult.value;
 assert.deepEqual(collection.items.map(item=>item.value),['p1']);
 // Render the authorised rows with the generic page adapter's public record
 // projection. The adapter itself has focused tests in collectionSessionState.
 const rows=collection.items.map(item=>({...item.record,Id:item.value,
  __collectionLabel:item.label,__collectionValue:item.value,__collectionManual:false}));
 const html=await renderSmart('smart_card_grid',{
  objectApiName:'Product',dataCollection:collection,records:rows,
  textSource:'=COLLECTION("FilteredProducts",@Product.MenuCategory=@CatCollection.state.Id)',
  badgeVisible:true,badgeText:'@Price',imageSource:'@ImageUrl',
  imageSourceMode:'field',cardsPerRow:2,cardsPerColumn:1
 });
 assert.match(html,/Cola/);
 assert.match(html,/1\.25/);
 assert.match(html,/cola\.png/);
 assert.doesNotMatch(html,/>drinks<\/span>/,'Category ID must never replace the product title');
});

test('Smart Textbox stays directly visible in the Insert gallery without a search control',()=>{
 const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const insert=read('../src/core/builders/PageBuilder/SmartInsertRibbon.tsx');
 assert.match(view,/component\.apiName==='smart_textbox'\?'Smart Textbox'/);
 assert.match(insert,/const visible=items\.filter\(isSmartInsertItem\)/);
 assert.match(insert,/<span className="smart-insert-tile-label">\{item\.label\}<\/span>/);
 assert.doesNotMatch(insert,/compactQuery|Search Insert components|<select/);
});

test('Smart Textbox renders one left caption and one right field value using remarks styling',async()=>{
 const html=await renderSmart('smart_textbox',{
  label:'Email',textSource:'@Email',record:{Email:'person@example.com'},
  readonly:true,backgroundColor:'#112233',labelColor:'#ccddee',
  headerBodyColor:'#fefefe',headerTextColor:'#112244',headerAlignment:'center',
  headerBold:true,supportingBorderColor:'#334455',supportingTextColor:'#445566',
  supportingBold:true,supportingAlignment:'right',borderColor:'#556677',
  radius:9,textSize:15,wrapText:true
 });
 assert.match(html,/smart-textbox-pair/);
 assert.match(html,/smart-textbox-caption/);
 assert.match(html,/smart-textbox-value-panel/);
 assert.match(html,/smart-textbox-value/);
 assert.match(html,/person@example\.com/);
 assert.match(html,/Email/);
 assert.match(html,/aria-readonly="true"/);
 for(const colour of ['#112233','#ccddee','#fefefe','#334455','#445566','#556677'])
  assert.ok(html.includes(colour),colour+' should be rendered');
 assert.doesNotMatch(html,/onchange=|onclick=/i);
});
test('Smart Textbox SQL enables only approved properties and User pilot requires explicit single-tenant opt-in',()=>{
 const sql=read('../../server/src/system-support/migrations/20270309-smart-textbox-shared-ribbon.sql');
 const allowed=['label','textSource','backgroundColor','labelColor','shadow','borderColor','radius',
  'wrapText','headerTextColor','headerAlignment','headerBodyColor','headerBold',
  'supportingBorderColor','supportingBold','supportingTextColor','supportingAlignment',
  'labelAlignment','textSize','width','height','x','y'];
 for(const key of allowed)assert.ok(sql.includes("('"+key+"')"),key+' must be enabled');
 for(const key of ['customButton1','customButton2','column2Source','objectApiName',
  'defaultValue','badgeText','headerBorderColor','rowHeight','tabCount'])
  assert.ok(!sql.includes("('"+key+"')"),key+' must stay disabled');
 const pilot=read('../../../scripts/pilots/user-smart-textbox-record-view.sql');
 assert.match(pilot,/current_setting\('metadrive\.pilot_tenant_id',true\)/);
 assert.match(pilot,/ORDER BY d\.page_id LIMIT 1/);
 assert.match(pilot,/RAISE EXCEPTION/);
 assert.match(pilot,/d\.target_object='User'|d\.target_object='User'/);
 assert.match(pilot,/d\.record_mode='View'/);
 assert.match(pilot,/published_version=excluded\.published_version/);
 assert.match(pilot,/NOT EXISTS \(SELECT 1 FROM md_page_layout_audit/);
 assert.match(pilot,/Custom:smart_textbox/);
 const runtime=read('../src/core/records/RecordWorkspace/recordWorkspaceViews.tsx');
 assert.match(runtime,/component\.type === 'Custom:smart_textbox'/);
 assert.match(runtime,/if\(referenced\.some\(field=>available\.has\(field\)&&!readable\.has\(field\)\)\)return null/);
});


test('Data ribbon retains Source, filtering and image upload with one Formula Bar',()=>{
 const markup=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const css=read('../src/core/builders/PageBuilder/SmartRibbonDataFormula.css');
 const cart=read('../src/component-libraries/smart_cart/SmartCart.jsx');
 const filter=markup.indexOf('className="smart-data-filter-button"');
 const upload=markup.indexOf('className="smart-data-image-upload"');
 const formula=markup.indexOf('className="smart-data-formula-input"');
 assert.ok(filter>=0&&upload>filter&&formula>upload);
 assert.match(markup,/disabled=\{uploadBusy\|\|!activeDataEnabled\|\|activeDataProperty\?\.id!=='imageSource'\|\|api!=='smart_image'\}/);
 assert.doesNotMatch(markup,/className="smart-data-summary-name"/);
 assert.match(cart,/data-md-bind=\{p\.builderPreview\?"totalLabel":undefined\}/);
 assert.match(cart,/data-md-bind=\{p\.builderPreview\?"totalValue":undefined\}/);
 for(const width of ['34px','40px','35px'])
  assert.ok(css.includes(width),'Missing retained Data control width '+width);
 assert.match(css,/smart-data-active-binding/);
});
test('Action ribbon retains all existing supported events while fixing component slot widths',()=>{
 const markup=read('../src/core/builders/PageBuilder/PageBuilderActionRibbon.tsx');
 const css=read('../src/core/builders/PageBuilder/PageBuilderActionRibbonCompact.css');
 for(const event of ["key:'click'","key:'change'","key:'start'","key:'qtyIncrease'","key:'qtyDecrease'"])
  assert.ok(markup.includes(event),'Supported action removed: '+event);
 assert.match(markup,/Other supported event/,'Do not remove existing generic events without approval');
 assert.match(css,/width:225px;min-width:225px;max-width:225px/);
 assert.match(css,/grid-template-columns:repeat\(2,225px\)/);
});
test('Visibility ribbon keeps disabled controls in place without a selected component',()=>{
 const markup=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(markup,/checked=\{selected\?\.visible\?\?false\} disabled=\{!selected\}/);
 assert.match(markup,/title="Edit conditional visibility" disabled=\{!selected\}/);
 assert.match(markup,/<button type="button" disabled=\{!selected\} onClick=\{openVisibilityEditor\}>Conditions<\/button>/);
});

test('Smart Button Bold and icon side follow text alignment',async()=>{
 const left=await renderSmart('smart_button',{label:'Start Order',shapeId:'arrow-right',labelAlignment:'left',headerBold:true});
 assert.match(left,/data-icon-side="end"/);
 assert.match(left,/order:2;margin-left:auto/);
 assert.match(left,/font-weight:700/);
 const right=await renderSmart('smart_button',{label:'Back',shapeId:'arrow-left',labelAlignment:'right'});
 assert.match(right,/data-icon-side="start"/);
 assert.match(right,/margin-right:auto/);
 const centre=await renderSmart('smart_button',{label:'Help',shapeId:'circle-help',labelAlignment:'center',headerBold:false});
 assert.doesNotMatch(centre,/data-icon-side/);
 assert.match(centre,/font-weight:400/);
 // Unchanged when nothing is configured.
 const plain=await renderSmart('smart_button',{label:'Save',shapeId:'check'});
 assert.doesNotMatch(plain,/data-icon-side|font-weight/);
 assert.ok(plain.indexOf('smart-button-glyph')<plain.indexOf('smart-button-label'));
});
test('Card Grid description uses Header Supporting text and price uses Footer text',async()=>{
 const html=await renderSmart('smart_card_grid',{records:[{Id:'p1',Name:'Fries',Desc:'Crispy',Price:'$2.99'}],
  textSource:'@Name',cardDescription:'@Desc',cardValue:'@Price',
  supportingTextColor:'#5b5b5b',supportingTextSize:18,supportingBold:false,supportingAlignment:'center',
  footerTextColor:'#c8102e',footerTextSize:34,footerBold:true});
 assert.match(html,/class="smart-card-description" style="color:#5b5b5b;font-weight:400;font-size:18px;text-align:center"/);
 assert.match(html,/class="smart-card-value" style="color:#c8102e;font-weight:700;font-size:34px"/);
 const plain=await renderSmart('smart_card_grid',{records:[{Id:'p1',Name:'Fries',Desc:'Crispy',Price:'$2.99'}],
  textSource:'@Name',cardDescription:'@Desc',cardValue:'@Price'});
 assert.match(plain,/<span class="smart-card-description">Crispy<\/span>/);
 assert.match(plain,/<strong class="smart-card-value">\$2\.99<\/strong>/);
});
test('Smart Cart quantity buttons take shape and colour from Button 2/3 properties',async()=>{
 const sql=read('../../server/src/system-support/migrations/20271113-kiosk-text-button-ribbon-extensions.sql');
 for(const key of ['qtyIncreaseFill','qtyDecreaseShape','qtyIncreaseTextColor','customButton1Radius'])
  assert.match(sql,new RegExp("'"+key+"'"));
 assert.match(sql,/\('smart_cart','Button 2','text','qtyIncreaseTextColor'\)/);
 assert.match(sql,/\('smart_card_grid','Header Supporting','text','supportingTextColor'\)/);
 assert.match(sql,/\('smart_button','Body','bold','headerBold'\)/);
 assert.doesNotMatch(sql,/DELETE\s+FROM|UPDATE\s+md_page_/i);
 const cart=read('../src/component-libraries/smart_cart/SmartCart.jsx');
 assert.match(cart,/smartCustomButtonAppearance\(p,"qtyDecrease"\)/);
 assert.match(cart,/smartCustomButtonAppearance\(p,"qtyIncrease"\)/);
 const {smartCustomButtonAppearance}=await import('../src/component-libraries/smart/shared/SmartCustomButtonAppearance.js');
 assert.deepEqual(smartCustomButtonAppearance({qtyIncreaseFill:'#fff3c9',qtyIncreaseTextColor:'#f28c28',
  qtyIncreaseShape:'shape:oval'},'qtyIncrease'),{backgroundColor:'#fff3c9',borderRadius:'50%',color:'#f28c28'});
 assert.deepEqual(smartCustomButtonAppearance({customButton1Radius:20},'customButton1'),{borderRadius:20});
});

test('$tenant.name and $tenant.logo read the signed-in tenant brand in formulas and images',async()=>{
 const brand=await import('../src/component-libraries/shared/TenantBrand.js');
 const logo='data:image/png;base64,iVBORw0KGgo=';
 brand.setTenantBrand({name:'BiteBurst',logo});
 assert.equal(evaluateFieldExpression('$tenant.name',{}),'BiteBurst');
 assert.equal(evaluateFieldExpression('="Welcome to " & $tenant.name',{}),'Welcome to BiteBurst');
 assert.equal(evaluateFieldExpression('$tenant.logo',{}),logo);
 const detailed=await import('../src/component-libraries/shared/FieldExpression.js');
 assert.match(detailed.evaluateFieldExpressionDetailed('$tenant.email',{}).error,/Unsupported tenant reference: \$tenant\.email/);
 // A component context can supply its own brand (e.g. a tenant preview).
 assert.equal(evaluateFieldExpression('$tenant.name',{},{tenant:{name:'Other',logo:''}}),'Other');
 const label=await renderSmart('smart_label',{textSource:'$tenant.name'});
 assert.match(label,/>BiteBurst</);
 const image=await renderSmart('smart_image',{imageSource:'$tenant.logo'});
 assert.match(image,/<img src="data:image\/png;base64,iVBORw0KGgo="/);
 // Only safe logo values are kept.
 brand.setTenantBrand({name:'X',logo:'javascript:alert(1)'});
 assert.equal(brand.getTenantBrand().logo,'');
 brand.setTenantBrand({name:'X',logo:'https://cdn.example.com/logo.png'});
 assert.equal(brand.getTenantBrand().logo,'https://cdn.example.com/logo.png');
 brand.clearTenantBrand();
 assert.equal(evaluateFieldExpression('$tenant.name',{}),'');
 // Live bundles share the page global (new Function), which holds the one brand store.
 assert.match(read('../src/core/components/RegisteredComponent/componentRuntimeModule.ts'),/new Function\('React', 'module', 'exports', compiledJs\)/);
 const server=read('../../server/src/system-support/server.ts');
 assert.match(server,/app\.get\('\/api\/tenant\/brand',route\(/);
 assert.match(server,/name:text\(values\.tradingName\)\|\|text\(values\.legalName\)\|\|text\(tenant\.rows\[0\]\?\.name\)/);
 assert.match(read('../src/core/branding/tenantBrandLoader.ts'),/apiRequest<\{name\?:unknown;logo\?:unknown\}>\('\/tenant\/brand'\)/);
});

test('Data formulas display by default across shared UI component families',async()=>{
 const cases=[
  ['ui_button',{textSource:'"Formula Button"'},'Formula Button'],
  ['ui_metric',{textSource:'=6*7',title:'Revenue'},'42'],
  ['ui_alert',{textSource:'"Ready"'},'Ready'],
  ['ui_progress',{textSource:'=25+25',max:100},'50%'],
  ['ui_card',{textSource:'"Account Summary"'},'Account Summary'],
  ['ui_input',{textSource:'=3+4',allowTyping:false},'7'],
  ['ui_image',{textSource:'"Product Image"',badgeText:'"NEW"'},'Product Image'],
  ['ui_navigation',{textSource:'@Name',records:[{Id:'a',Name:'Inventory'}]},'Inventory'],
  ['ui_repeater',{records:[{Id:'a',Name:'Orders'}]},'Orders'],
  ['ui_table',{records:[{Id:'a',Name:'Desk'}]},'Desk'],
  ['smart_button',{label:'=6*7'},'42'],
  ['smart_text',{textSource:'=6*7'},'42'],
  ['smart_label',{textSource:'=6*7'},'42'],
  ['smart_textbox',{textSource:'=6*7'},'42'],
  ['smart_card_grid',{records:[{Id:'a',Name:'Product'}],
    textSource:'"Calculated item"',imageHeight:0},'Calculated item'],
 ];
 for(const [api,props,value] of cases){
  const html=await renderSmart(api,props);
  assert.ok(html.includes(value),api+' must display its Data formula result without displayMode');
 }
});

test('Formula-only UI bindings resolve without Object records and respect field rules',async()=>{
 const metric=await renderSmart('ui_metric',{title:'Totals',value:'=2+5'});
 assert.match(metric,/>7</);
 const state=await renderSmart('ui_metric',{textSource:'$state.total',pageState:{total:38}});
 assert.match(state,/>38</);
 const field=await renderSmart('ui_metric',{textSource:'@Price',record:{Price:19}});
 assert.match(field,/>19</);
 const denied=await renderSmart('ui_metric',{textSource:'@Price',record:{Price:19},
  fieldAllowed:(key)=>key!=='textSource'});
 assert.doesNotMatch(denied,/>19</,'field filters must continue to reject hidden values');
 const fallback=await renderSmart('ui_input',{defaultValue:'=2*3',allowTyping:false});
 assert.match(fallback,/une-input-display/);
 assert.match(fallback,/>6</);
 const email=await renderSmart('ui_metric',{value:'support@example.com'});
 assert.match(email,/support@example.com/,'literal email text must remain visible');
});

test('All installed component definitions are independent of displayMode metadata',async()=>{
 const catalog=await loadComponentCatalog();
 assert.ok(catalog.components.length>=50,'test must cover the full bundled component catalog');
 for(const component of catalog.components){
  assert.ok(!(component.propertyDefinitions??[]).some(p=>p.propertyKey==='displayMode'),
   component.apiName+' must not require displayMode');
 }
 const sql=read('../../server/src/system-support/migrations/20271119-smart-formula-display-runtime.sql');
 assert.match(sql,/DELETE FROM md_builder_shared_properties/);
 assert.match(sql,/WHERE property_key='displayMode'/);
});
