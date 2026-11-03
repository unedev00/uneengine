import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildBundledComponent} from '../../../scripts/component-catalog.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
async function renderSmart(apiName,properties){
 const descriptor=JSON.parse(read('../src/component-libraries/'+apiName+'/component.json'));
 const {compiledJs}=await buildBundledComponent(descriptor);
 const sandbox={React,module:{exports:{}},Date,Intl,URL,crypto:globalThis.crypto};
 vm.runInNewContext(compiledJs,sandbox);
 return renderToStaticMarkup(React.createElement(sandbox.module.exports.default,properties));
}

test('Card Grid uses record-scoped formula text and native, independently styled button',async()=>{
 const html=await renderSmart('smart_card_grid',{
  records:[{Id:'product-1',Name:'Burger',Description:'Freshly made',Price:4.5}],
  textSource:'@Name',cardsPerRow:1,cardsPerColumn:1,imageHeight:100,
  imageBackgroundColor:'#eeeeee',cardDescription:'@Description',
  cardValue:'"£" & @Price',cardButtonText:'"Choose +"',
  cardButtonFill:'#123456',cardButtonBorderColor:'#654321',
  cardButtonShape:'pill',cardButtonTextSize:18,cardButtonTextColor:'#ffffff',
  actionFlows:{click:{actionType:'Formula',formula:'@state.selected := @Id'}}
 });
 assert.match(html,/Freshly made/);
 assert.ok(html.includes('£4.5'));
 assert.ok(html.includes('Choose +'));
 assert.match(html,/class="smart-card-button"/);
 assert.match(html,/background-color:#123456/);
 assert.match(html,/border-color:#654321/);
 assert.match(html,/border-radius:999px/);
 assert.match(html,/font-size:18px/);
 assert.match(html,/color:#ffffff/);
 assert.match(html,/background-color:#eeeeee/);
 assert.doesNotMatch(html,/class="smart-grid-action"/,'no nested interactive buttons');
});

test('Unconfigured Card Grid retains the legacy whole-card click action',async()=>{
 const html=await renderSmart('smart_card_grid',{
  records:[{Id:'product-1',Name:'Burger'}],textSource:'@Name',
  actionFlows:{click:{actionType:'Formula',formula:'@state.selected := @Id'}}
 });
 assert.match(html,/class="smart-grid-action"/);
 assert.doesNotMatch(html,/class="smart-card-button"/);
});

test('Smart Tabs supports vertical list and retains horizontal default',async()=>{
 const props={tabs:['ALL','BURGERS','DRINKS'],tabCount:3,tabHeight:54,
  selectedTabColor:'#13579b'};
 const vertical=await renderSmart('smart_tabs',{...props,tabOrientation:'vertical'});
 assert.match(vertical,/aria-orientation="vertical"/);
 assert.match(vertical,/flex-direction:column/);
 assert.match(vertical,/flex-wrap:nowrap/);
 assert.match(vertical,/border-left:4px solid #13579b/);
 assert.match(vertical,/BURGERS/);
 const horizontal=await renderSmart('smart_tabs',props);
 assert.match(horizontal,/aria-orientation="horizontal"/);
 assert.match(horizontal,/flex-direction:row/);
 assert.match(horizontal,/flex-wrap:wrap/);
 assert.doesNotMatch(horizontal,/border-left:4px solid/);
});

test('one SQL ribbon inventory owns new Data fx, Button Design and orientation controls',()=>{
 const sql=read('../../server/src/system-support/migrations/20270306-smart-card-button-tabs-orientation.sql');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 for(const id of ['cardDescription','cardValue','cardButtonText']){
  assert.ok(sql.includes("'"+id+"','")&&sql.includes("'Data','Card Grid','expression'"));
 }
 for(const id of ['cardButtonFill','cardButtonBorderColor','cardButtonShape',
                  'cardButtonTextSize','cardButtonTextColor']){
  assert.ok(sql.includes("'"+id+"','")&&sql.includes("'Design','Button'"));
 }
 assert.match(sql,/'tabOrientation','Orientation','Layout','Tabs','choice'/);
 assert.match(sql,/'smart_card_grid','imageBackgroundColor'/);
 assert.ok(sql.includes('ON CONFLICT(property_key) DO NOTHING'));
 assert.ok(sql.includes('ON CONFLICT(component_api,property_key) DO NOTHING'));
 assert.doesNotMatch(sql,/UPDATE md_page_|DELETE FROM md_page_|DROP TABLE/i);
 assert.ok(ribbon.includes("['Source','Values','Card Grid','Cart'"));
 assert.match(ribbon,/'Header Supporting','Button'/);
 assert.match(ribbon,/isDataFormula/);
 assert.ok(runtime.includes('scopedExpression(p,key,p[key]'));
 assert.ok(runtime.includes('selectRecord=()=>fire("click"'));
});
