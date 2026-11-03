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

test('Smart Text stays an editable input unless display mode is explicitly set',async()=>{
 const plain=await render('smart_text',{label:'Customer',textSource:'"Mary"',textSize:22});
 assert.match(plain,/class="smart-input-box"/);
 assert.doesNotMatch(plain,/class="smart-display-text"/);
 const display=await render('smart_text',{displayMode:'display',textSource:'"Order Summary"',
  textSize:32,labelColor:'#161616',headerBold:true,wrapText:true,labelAlignment:'center'});
 assert.match(display,/class="smart-display-text"/);
 assert.doesNotMatch(display,/<input/);
 assert.match(display,/Order Summary/);
 assert.match(display,/font-size:32px/);
 assert.match(display,/font-weight:700/);
 assert.match(display,/color:#161616/);
 assert.match(display,/white-space:pre-wrap/);
 assert.match(display,/justify-content:center/);
 const normal=await render('smart_text',{displayMode:'display',label:'Welcome',
  headerBold:false,wrapText:false});
 assert.match(normal,/font-weight:400/);
 assert.match(normal,/white-space:nowrap/);
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
