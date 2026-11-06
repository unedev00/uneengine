import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildBundledComponent} from '../../../scripts/component-catalog.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
async function render(api,properties){
 const descriptor=JSON.parse(read('../src/component-libraries/'+api+'/component.json'));
 const {compiledJs}=await buildBundledComponent(descriptor);
 const sandbox={React,module:{exports:{}},Date,Intl,URL,crypto:globalThis.crypto};
 vm.runInNewContext(compiledJs,sandbox);
 return renderToStaticMarkup(React.createElement(sandbox.module.exports.default,properties));
}

test('Smart Text displays Data formula values without requiring a displayMode property',async()=>{
 const plain=await render('smart_text',{label:'Customer',defaultValue:'Plain initial value'});
 assert.match(plain,/class="smart-input-box"/,'an unbound Smart Input remains editable');
 assert.doesNotMatch(plain,/class="smart-display-text"/);

 const formula=await render('smart_text',{textSource:'"Order Summary"',
  textSize:32,labelColor:'#161616',headerBold:true,wrapText:true,labelAlignment:'center'});
 assert.match(formula,/class="smart-display-text"/);
 assert.doesNotMatch(formula,/<input/);
 assert.match(formula,/Order Summary/);
 assert.match(formula,/font-size:32px/);
 assert.match(formula,/font-weight:700/);
 assert.match(formula,/color:#161616/);
 assert.match(formula,/white-space:pre-wrap/);
 assert.match(formula,/justify-content:center/);

 const bound=await render('smart_text',{textSource:'@Name',record:{Name:'Kiosk value'}});
 assert.match(bound,/class="smart-display-text"/);
 assert.match(bound,/>Kiosk value</);
 const oldDefaultInput=await render('smart_text',{displayMode:'input',textSource:'"Computed"'});
 assert.match(oldDefaultInput,/class="smart-display-text"/,
  'a persisted input mode must not override automatic formula display');
 assert.match(oldDefaultInput,/>Computed</);
 const defaultFormula=await render('smart_text',{defaultValue:'=1+2'});
 assert.match(defaultFormula,/class="smart-display-text"/);
 assert.match(defaultFormula,/>3</);
 const labelFormula=await render('smart_text',{label:'"Heading"'});
 assert.match(labelFormula,/>Heading</);
 const valueFormula=await render('smart_text',{value:'=5*2'});
 assert.match(valueFormula,/>10</);

 const changeAction=await render('smart_text',{textSource:'"Mary"',
  actionFlows:{change:{actionType:'PageState',stateKey:'name'}}});
 assert.match(changeAction,/class="smart-input-box"/,
  'a bound input with a change action must remain editable');
 assert.match(changeAction,/value="Mary"/);
 const editable=await render('smart_text',{textSource:'"Editing"',readonly:false});
 assert.match(editable,/class="smart-input-box"/);
 const legacyDisplay=await render('smart_text',{displayMode:'display',label:'Welcome',
  headerBold:false,wrapText:false});
 assert.match(legacyDisplay,/class="smart-display-text"/);
 assert.match(legacyDisplay,/font-weight:400/);
 assert.match(legacyDisplay,/white-space:nowrap/);
});

test('Text Mode has no active metadata property or Design 2 control',()=>{
 const migration=read('../../server/src/system-support/migrations/20271119-smart-formula-display-runtime.sql');
 for(const table of ['md_builder_shared_properties','md_builder_ribbon_component_rules',
  'md_builder_design2_slots','md_builder_design2_slot_rules']){
  assert.ok(migration.includes('DELETE FROM '+table+'\\n'),table+' must be retired');
 }
 assert.match(migration,/property_key='displayMode'/);
 assert.match(migration,/slot_key='textMode'/);
});

test('Card Grid uses existing textSize and gap with optional content padding',async()=>{
 const props={records:[{Id:'a',Name:'Burger',Description:'Fresh'}],
  textSource:'@Name',cardDescription:'@Description',imageHeight:0,
  cardsPerRow:1,cardsPerColumn:1, textSize:19,gap:7};
 const legacy=await render('smart_card_grid',props);
 assert.match(legacy,/gap:7px/);
 assert.match(legacy,/font-size:19px/);
 assert.match(legacy,/padding:4px 10px/);
 const padded=await render('smart_card_grid',{...props,cardPadding:16});
 assert.match(padded,/padding:16px/);
 assert.doesNotMatch(padded,/padding:4px 10px/);
 const zero=await render('smart_card_grid',{...props,cardPadding:0,gap:0});
 assert.match(zero,/padding:0px/);
 assert.match(zero,/gap:0(?:;|\")/);
});

test('Focused style applies to only the selected Card Grid record and preserves cell bounds',async()=>{
 const html=await render('smart_card_grid',{
  records:[{Id:'first',Name:'First',Description:'First detail',Price:4},
           {Id:'second',Name:'Second',Description:'Second detail',Price:8}],
  textSource:'@Name',cardDescription:'@Description',cardValue:'@Price',
  cardsPerRow:2,cardsPerColumn:1,imageHeight:0,textSize:15,
  selectedCardColor:'#dd0022',focusedCardWidth:180,focusedCardHeight:128,
  focusedTextColor:'#ffffff',focusedTextBold:true,focusedTextSize:23,
  pageState:{selected:'second'},
  actionFlows:{click:{actionType:'Formula',formula:'@state.selected := @Id'}}
 });
 assert.equal((html.match(/data-selected="true"/g)??[]).length,1);
 assert.match(html,/width:min\(100%, 180px\)/);
 assert.match(html,/height:min\(100%, 128px\)/);
 assert.match(html,/font-size:23px/);
 assert.match(html,/color:#ffffff/);
 assert.match(html,/font-weight:700/);
 assert.match(html,/background:#dd0022/);
 assert.match(html,/data-selected="true"/);
 assert.match(html,/font-size:15px/);
 assert.match(html,/First detail/);
 assert.match(html,/Second detail/);
});

test('Focused text properties still work without selectedCardColor',async()=>{
 const html=await render('smart_card_grid',{
  records:[{Id:'a',Name:'Alpha'},{Id:'b',Name:'Beta'}],
  textSource:'@Name',imageHeight:0,focusedTextColor:'#ff0000',
  focusedTextBold:false,focusedTextSize:28,
  pageState:{category:'b'},
  actionFlows:{click:{actionType:'Formula',formula:'@state.category := @Id'}}
 });
 assert.equal((html.match(/data-selected="true"/g)??[]).length,1);
 assert.match(html,/font-size:28px/);
 assert.match(html,/color:#ff0000/);
 assert.match(html,/font-weight:400/);
});

test('SQL is additive and Design2 exposes supported Smart Text and Grid controls',()=>{
 const sql=read('../../server/src/system-support/migrations/20270312-smart-text-display-card-focused-design2.sql');
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 for(const [api,key] of [
  ['smart_text','displayMode'],['smart_text','headerBold'],['smart_text','wrapText'],
  ['smart_card_grid','textSize'],['smart_card_grid','gap'],
  ['smart_card_grid','cardPadding'],['smart_card_grid','focusedCardWidth'],
  ['smart_card_grid','focusedCardHeight'],['smart_card_grid','focusedTextColor'],
  ['smart_card_grid','focusedTextBold'],['smart_card_grid','focusedTextSize']
 ])assert.ok(sql.includes("('"+api+"','"+key+"')"),api+'.'+key);
 for(const key of ['selectedCardColor','focusedCardWidth','focusedCardHeight',
                   'focusedTextColor','focusedTextBold','focusedTextSize'])
  assert.ok(sql.includes("'Focused',10")&&sql.includes("'"+key+"'"),key);
 assert.match(sql,/ON CONFLICT\(property_key\) DO NOTHING/);
 assert.match(sql,/ON CONFLICT\(area,slot_key\) DO NOTHING/);
 assert.doesNotMatch(sql,/DELETE FROM md_page_|UPDATE md_page_|DROP TABLE/i);
 assert.match(sql,/WHERE area='Body' AND slot_key='bold' AND property_key IS NULL/);
 assert.match(sql,/WHERE area='Body' AND slot_key='wrap' AND property_key IS NULL/);
 assert.match(runtime,/const minimumCardHeight=number\(p.cardMinHeight/);
 assert.match(ribbon,/focusedTextBold/);
 assert.match(ribbon,/focusedTextSize/);
});

test('New Design2 slots have unique positions and fit three-row shared ribbon',()=>{
 const sql=read('../../server/src/system-support/migrations/20270312-smart-text-display-card-focused-design2.sql');
 const matches=[...sql.matchAll(/\('([^']+)',(\d+),'([^']+)',([23]),(\d+),(\d+),26,'([^']+)','([^']+)'\)/g)];
 assert.equal(matches.length,10);
 const positions=new Set();
 for(const [,area,,key,row,col,width] of matches){
  const token=area+'/'+row+'/'+col;
  assert.ok(!positions.has(token),'slot collision: '+token);
  positions.add(token);
  assert.ok(Number(width)>=20&&Number(width)<=300);
  assert.ok(key.length);
 }
});


test('Design 2 exact Body Fill, Wrap and supporting alignment use their real component keys',async()=>{
 const sql=read('../../server/src/system-support/migrations/20271106-design2-functional-control-parity.sql');
 assert.ok(sql.includes("SET property_key='backgroundColor'"));
 assert.ok(sql.includes("('smart_textbox','Body','wrap','wrapText')"));
 assert.ok(sql.includes("('smart_textbox','Header Supporting','alignment','supportingAlignment')"));
 assert.ok(sql.includes("('smart_icon','Body','height','height')"));
 assert.ok(sql.includes("('smart_toggle','Body','width','width')"));
 const tabs=await render('smart_tabs',{
  backgroundColor:'#123456',tabColor:'#fedcba',items:['One','Two'],tabCount:2
 });
 assert.match(tabs,/background:#123456/,'Body Fill must style the tab shell');
 assert.match(tabs,/background:#fedcba/,'Tabs Fill must style individual tabs');
 const textbox=await render('smart_textbox',{
  label:'Caption',textSource:'"A longer value"',labelAlignment:'left',
  supportingAlignment:'right',wrapText:false
 });
 assert.match(textbox,/class="smart-textbox-value"/);
 assert.match(textbox,/text-align:right/,'Supporting Alignment must align the textbox value');
 assert.match(textbox,/white-space:nowrap/,'Body Wrap must affect textbox value wrapping');
});

test('Design 2 Badge and Card Grid primary button dimensions affect actual rendered surfaces',async()=>{
 const html=await render('smart_card_grid',{
  records:[{Id:'1',Name:'Burger',Price:12}],textSource:'@Name',badgeText:'"SALE"',
  badgeVisible:true,imageHeight:0,cardButtonText:'"Add"',
  cardButtonWidth:130,cardButtonHeight:42,cardButtonBold:true,
  badgeWidth:82,badgeHeight:29,badgeBorderColor:'#123abc',badgeRadius:8
 });
 assert.match(html,/class="smart-card-button"/);
 assert.match(html,/width:130px/);
 assert.match(html,/height:42px/);
 assert.match(html,/font-weight:700/);
 assert.match(html,/class="smart-badge /);
 assert.match(html,/width:82px/);
 assert.match(html,/height:29px/);
 assert.match(html,/border:1px solid #123abc/);
});

test('Design 2 Cart and Table table, row and footer size properties have renderer hooks',async()=>{
 const cart=await render('smart_cart',{
  records:[{Id:'1',Name:'Burger',Quantity:2}],textSource:'@Name',
  tableWidth:360,tableHeight:166,rowWidth:290,
  footerWidth:175,footerHeight:44,footerBackgroundColor:'#123abc'
 });
 assert.match(cart,/class="smart-cart-table"/);
 assert.match(cart,/width:360px/);
 assert.match(cart,/height:166px/);
 assert.match(cart,/width:290px/);
 assert.match(cart,/class="smart-cart-summary-line smart-cart-total"/);
 assert.match(cart,/width:175px/);
 assert.match(cart,/min-height:44px/);
 assert.match(cart,/background-color:#123abc/);
 const table=await render('smart_table',{
  records:[{Id:'1',Name:'Burger'}],rowWidth:290,footerWidth:178,
  footerHeight:45,footerBackgroundColor:'#abc123',footerTextColor:'#112233'
 });
 assert.match(table,/class="smart-table-native"/);
 assert.match(table,/width:290px/);
 assert.match(table,/class="smart-table-footer"/);
 assert.match(table,/height:45px/);
 assert.match(table,/width:178px/);
 assert.match(table,/background-color:#abc123/);
 assert.match(table,/color:#112233/);
});


test('Calendar Focus Color, Card Grid Body Wrap, Navigation Image Fit and Toggle Shape share renderer keys',async()=>{
 const sql=read('../../server/src/system-support/migrations/20271108-design2-four-control-parity.sql');
 for(const [api,area,slot,key] of [
  ['smart_calendar','Body','focused','defaultValueColor'],
  ['smart_card_grid','Body','wrap','wrapText'],
  ['smart_navigation','Image','imageFill','imageFill'],
  ['smart_toggle','Body','shape','shapeId']
 ])assert.ok(sql.includes("('"+api+"','"+area+"','"+slot+"','"+key+"')"),
   'Design 2 control has no exact renderer-key mapping: '+api+' '+area+' '+slot);
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 assert.ok(ribbon.includes("slotPlacement?.slotKey==='focused'"),
   'Calendar focused cell must reuse the existing Focus Color palette icon');
 assert.ok(ribbon.includes("property.id==='imageFill'?'imageFill'"),
   'Navigation image fill must reuse the existing Fill/Fit/Stretch icon dropdown');

 const calendar=await render('smart_calendar',{selectedDate:'2026-11-04',defaultValueColor:'#126abc'});
 assert.match(calendar,/smart-calendar-selected-day/);
 assert.match(calendar,/border-color:#126abc/);
 assert.match(calendar,/background:#126abc/);

 const card=await render('smart_card_grid',{
  records:[{Id:'c1',Name:'Two line card title'}],textSource:'@Name',imageHeight:0,wrapText:false
 });
 assert.match(card,/class="smart-card-content"[^>]*white-space:nowrap/);
 const wrapped=await render('smart_card_grid',{
  records:[{Id:'c1',Name:'Two line card title'}],textSource:'@Name',imageHeight:0,wrapText:true
 });
 assert.match(wrapped,/class="smart-card-content"[^>]*white-space:normal/);

 const nav=await render('smart_navigation',{
  items:[{id:'one',label:'Menu',imageSrc:'https://example.com/menu.png'}],imageFill:'fit'
 });
 assert.ok(nav.includes('src="https://example.com/menu.png"'),
   'Navigation item must render its HTTPS image');
 assert.match(nav,/object-fit:contain/);
 const stretch=await render('smart_navigation',{
  items:[{id:'one',label:'Menu',imageSrc:'https://example.com/menu.png'}],imageFill:'stretch'
 });
 assert.match(stretch,/object-fit:fill/);

 const oval=await render('smart_toggle',{shapeId:'shape:oval'});
 assert.match(oval,/smart-switch-track[^>]*border-radius:50%/);
 const rectangle=await render('smart_toggle',{shapeId:'shape:rectangle'});
 assert.match(rectangle,/smart-switch-track[^>]*border-radius:0/);
});
