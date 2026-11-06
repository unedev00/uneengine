import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildBundledComponent} from '../../../scripts/component-catalog.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
async function renderSmart(api,properties){
 const descriptor=JSON.parse(read('../src/component-libraries/'+api+'/component.json'));
 const {compiledJs}=await buildBundledComponent(descriptor);
 const sandbox={React,module:{exports:{}},Date,Intl,URL,crypto:globalThis.crypto};
 vm.runInNewContext(compiledJs,sandbox);
 return renderToStaticMarkup(React.createElement(sandbox.module.exports.default,properties));
}

test('Shared SQL owns selection, row supporting and both buttons without page changes',()=>{
 const sql=read('../../server/src/system-support/migrations/20271104-kiosk-smart-global-ribbon.sql');
 for(const key of ['selectionMode','focusedCardBorderColor','focusedCardShadow',
  'rowSupportingSource','rowSupportingBackgroundColor','rowSupportingTextColor',
  'rowSupportingTextSize','rowSupportingAlignment','rowSupportingBold',
  'customButton1Shape','customButton2Shape','customButton1Label','customButton2Label'])
  assert.ok(sql.includes("'"+key+"'"),'missing global key: '+key);
 for(const area of ['Row Supporting','Custom Button 1','Custom Button 2'])
  assert.match(sql,new RegExp("'"+area.replaceAll(' ',' ')+"',\\d+,'fill'"),'missing area '+area);
 assert.match(sql,/ON CONFLICT\(property_key\) DO NOTHING/);
 assert.match(sql,/ON CONFLICT\(component_api,property_key\) DO UPDATE SET enabled=true/);
 assert.match(sql,/ON CONFLICT\(area,slot_key\) DO NOTHING/);
 assert.doesNotMatch(sql,/UPDATE md_page_|DELETE FROM md_page_|DROP TABLE/i);
 const slots=[...sql.matchAll(/\('([^']+)',(\d+),'([^']+)',([23]),(\d+),(\d+),26,'([^']+)','([^']+)'\)/g)];
 const positions=new Set();
 for(const [,area,,key,row,col,width] of slots){
  const position=area+'/'+row+'/'+col;
  assert.ok(!positions.has(position),'duplicate slot '+position);
  positions.add(position);
  assert.ok(Number(width)>=20&&Number(width)<=300,key+' width');
 }
 assert.equal(slots.length,29);
});

test('Cart description appears below item name, not Header Supporting',async()=>{
 const html=await renderSmart('smart_cart',{
  records:[{Id:'line-1',Name:'Burger',Notes:'No onions, extra sauce',Quantity:2}],
  textSource:'@Name',rowSupportingSource:'@Notes',
  rowSupportingTextColor:'#123abc',rowSupportingTextSize:12,
  rowSupportingAlignment:'center',rowSupportingBold:true,
  columnVisibility:['Column 1'],cardsPerRow:1
 });
 assert.match(html,/class="smart-cart-product-text"/);
 assert.match(html,/class="smart-cart-row-supporting"/);
 assert.match(html,/No onions, extra sauce/);
 assert.match(html,/color:#123abc/);
 assert.match(html,/font-size:12px/);
 assert.match(html,/text-align:center/);
});

test('Cart custom buttons stay on selected row and reuse shared style keys',async()=>{
 const html=await renderSmart('smart_cart',{
  records:[{Id:'a',Name:'A',Quantity:1},{Id:'b',Name:'B',Quantity:1}],
  textSource:'@Name',cardsPerRow:2,
  customButton1Label:'Delete',customButton1Shape:'shape:oval',
  customButton1Fill:'#df2211',customButton1Width:45,
  customButton2Visible:false,
  actionFlows:{customButton1:{actionType:'Formula',formula:'@state.remove := @Id'}}
 });
 assert.equal((html.match(/class="smart-cart-expanded-actions"/g)??[]).length,1);
 assert.equal((html.match(/class="smart-cart-custom-action"/g)??[]).length,1);
 assert.match(html,/background-color:#df2211/);
 assert.match(html,/border-radius:50%/);
 assert.match(html,/width:45px/);
 assert.doesNotMatch(html,/Custom Button 2/);
});

test('Grid can render two separately styled, independently visible actions',async()=>{
 const props={
  records:[{Id:'x',Name:'Tomato'}],textSource:'@Name',imageHeight:0,cardsPerRow:1,
  customButton1Label:'"+"',customButton2Label:'"−"',
  customButton1Fill:'#33bb44',customButton2Fill:'#dd3322',
  customButton1Shape:'shape:oval',customButton2Shape:'shape:rectangle',
  actionFlows:{
   customButton1:{actionType:'Formula',formula:'@state.plus := @Id'},
   customButton2:{actionType:'Formula',formula:'@state.minus := @Id'}
  }
 };
 const html=await renderSmart('smart_card_grid',props);
 assert.equal((html.match(/class="smart-card-button smart-card-custom-action"/g)??[]).length,2);
 assert.match(html,/background-color:#33bb44/);
 assert.match(html,/background-color:#dd3322/);
 assert.doesNotMatch(html,/class="smart-grid-action"/,'do not nest action buttons');
 const hidden=await renderSmart('smart_card_grid',{...props,customButton2Visible:false});
 assert.equal((hidden.match(/class="smart-card-button smart-card-custom-action"/g)??[]).length,1);
});

test('Focused Card Grid border/shadow retain existing single-record highlight',async()=>{
 const html=await renderSmart('smart_card_grid',{
  records:[{Id:'one',Name:'One'},{Id:'two',Name:'Two'}],
  textSource:'@Name',imageHeight:0,cardsPerRow:2,
  focusedCardBorderColor:'#ff0044',focusedCardShadow:'large',
  pageState:{chosen:'two'},
  actionFlows:{click:{actionType:'Formula',formula:'@state.chosen := @Id'}}
 });
 assert.equal((html.match(/data-selected="true"/g)??[]).length,1);
 assert.match(html,/border:1px solid #ff0044/);
 assert.match(html,/box-shadow:0 8px 20px/);
});

test('Actions and ribbon reuse the Cart slots for Grid without enabling Cart quantity on Grid',()=>{
 const actions=read('../src/core/builders/PageBuilder/SmartEventActionsRibbon.tsx');
 const unified=read('../src/core/builders/PageBuilder/PageBuilderActionRibbon.tsx');
 const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 assert.match(actions,/\['smart_cart','smart_card_grid'\]\.includes\(api\)/);
 assert.match(actions,/\['qtyIcon','qtyIncrease','qtyDecrease'\]\.includes\(event\)\?api==='smart_cart'/);
 assert.match(unified,/slot\.key\.startsWith\('customButton'\)/);
 assert.match(view,/actionMembers\.some\(member=>!supportsSmartActionEvent\(/);
  assert.match(view,/customButton3:selected\?\.properties\.customButton3Visible/);
 assert.match(ribbon,/customButton1Shape/);
 assert.match(ribbon,/customButton2Shape/);
});
