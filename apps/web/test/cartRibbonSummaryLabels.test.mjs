import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadComponentCatalog,buildBundledComponent} from '../../../scripts/component-catalog.mjs';

const read=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');

async function cartMarkup(props){
 const catalog=await loadComponentCatalog();
 const descriptor=catalog.components.find(entry=>entry.apiName==='smart_cart');
 assert.ok(descriptor,'Smart Cart must be installed');
 const built=await buildBundledComponent(descriptor);
 const sandbox={React,module:{exports:{}},Date,Intl,URL,crypto:globalThis.crypto};
 vm.runInNewContext(built.compiledJs,sandbox);
 return renderToStaticMarkup(React.createElement(sandbox.module.exports.default,props));
}

test('Data ribbon merges cart expressions and columns, with numbered editable summary labels',()=>{
 const sql=read('../../server/src/system-support/migrations/20270214-smart-cart-data-ribbon-summary-labels.sql');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const css=read('../src/core/builders/PageBuilder/SmartRibbonApprovedThreeRow.css');
 assert.match(sql,/SET section_group='Cart'/);
 for(const [field,slot] of [['subtotalValue',1],['totalValue',2],['taxValue',3],['discountValue',4]]){
  assert.ok(sql.includes("'"+field+"'"),field+' missing');
  assert.ok(sql.includes("'Summary "+slot+"'"),'Summary '+slot+' missing');
 }
 for(const source of ['column2Source','column3Source','column4Source','column5Source','columnVisibility'])
  assert.ok(sql.includes("'"+source+"'"),source+' missing');
 assert.equal((sql.match(/,227,'Summary [1-4]'/g)||[]).length,4,
  'summary formula widths must be 10% smaller than 252px');
 assert.match(ribbon,/\['Source','Values','Cart'/);
 assert.match(ribbon,/className="smart-summary-label"/);
 assert.match(ribbon,/maxLength=\{64\}/);
 assert.match(ribbon,/update\(summaryLabel\.key,event\.target\.value\)/);
 assert.match(css,/font:400 9px\/1 "Segoe UI"/);
 assert.match(css,/width:67px;min-width:67px;max-width:67px/);
 assert.match(css,/padding-left:75px!important/);
 assert.match(css,/input\.smart-summary-label:focus-visible/);
});

test('Cart renders saved summary labels and sums loaded item expressions without changing payments',async()=>{
 const html=await cartMarkup({
  records:[{Id:'a',Price:10,Quantity:2},{Id:'b',Price:4.5,Quantity:3}],
  subtotalLabel:'Goods subtotal',subtotalValue:'SUM(@Price * @Quantity)',
  discountLabel:'Promotions',discountValue:1,
  taxLabel:'VAT',taxValue:2,
  totalLabel:'Amount due',totalValue:34.5,
  currencyCode:'GBP'
 });
 assert.match(html,/>Goods subtotal<\/span><span>£33\.50<\/span>/);
 assert.match(html,/>Promotions<\/span><span>£1\.00<\/span>/);
 assert.match(html,/>VAT<\/span><span>£2\.00<\/span>/);
 assert.match(html,/>Amount due<\/span><span>£34\.50<\/span>/);
 assert.doesNotMatch(html,/onClick=|payment-confirmation/i);
});

test('Cart keeps historical labels and does not render partial or invalid sums',async()=>{
 const old=await cartMarkup({records:[],subtotalValue:15,discountValue:1,taxValue:2,totalValue:16});
 for(const label of ['Subtotal','Discount','Tax','Total'])assert.ok(old.includes('>'+label+'</span>'));
 const partial=await cartMarkup({
  records:Array.from({length:201},(_,i)=>({Id:String(i),Price:1})),
  subtotalValue:'SUM(@Price)'
 });
 assert.match(partial,/>Subtotal<\/span><span aria-label="Subtotal not bound">—<\/span>/);
 const bad=await cartMarkup({records:[{Id:'a',Price:10},{Id:'b',Price:'unknown'}],
  subtotalValue:'SUM(@Price)'});
 assert.match(bad,/>Subtotal<\/span><span aria-label="Subtotal not bound">—<\/span>/);
});
