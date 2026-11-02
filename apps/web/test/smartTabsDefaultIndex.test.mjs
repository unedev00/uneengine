import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {buildBundledComponent} from '../../../scripts/component-catalog.mjs';

async function renderSmart(apiName, props) {
 const descriptor=JSON.parse(readFileSync(new URL('../src/component-libraries/'+apiName+'/component.json',import.meta.url),'utf8'));
 const built=await buildBundledComponent(descriptor);
 const sandbox={React,module:{exports:{}},Date,Intl,URL,crypto:globalThis.crypto};
 vm.runInNewContext(built.compiledJs,sandbox);
 return renderToStaticMarkup(React.createElement(sandbox.module.exports.default,props));
}

test('Smart Tabs use a zero-based configurable default for static, custom and collection tabs',async()=>{
 const selected=async props=>{
  const markup=await renderSmart('smart_tabs',props);
  const match=markup.match(/<button\\b[^>]*aria-selected="true"[^>]*>([^<]*)<\\/button>/);
  assert.ok(match,'A tab must be visibly selected');
  return match[1];
 };
 const plain={tabs:['All','Food','Drinks'],tabCount:3};
 assert.equal(await selected(plain),'All','legacy default is zero');
 assert.equal(await selected({...plain,tabIndex:0}),'All');
 assert.equal(await selected({...plain,tabIndex:2}),'Drinks');
 assert.equal(await selected({...plain,tabIndex:9}),'Drinks','out-of-bounds defaults clamp to final tab');
 assert.equal(await selected({...plain,tabIndex:-1}),'All','invalid index falls back to zero');
 assert.equal(await selected({...plain,tabIndex:1.5}),'All','fractional index is invalid');
 const custom={...plain,firstTabCustom:true,firstTabCaption:'ALL'};
 assert.equal(await selected({...custom,tabIndex:0}),'ALL','custom first tab occupies index zero');
 assert.equal(await selected({...custom,tabIndex:1}),'All','first record moves to index one');
 const records=[{Id:'food',Name:'Food'},{Id:'drinks',Name:'Drinks'}];
 const bound={records,tabCount:2,tabIndex:1,
  dataCollection:{name:'Categories',items:records}};
 assert.equal(await selected(bound),'Drinks','collection defaults to configured record');
 assert.equal(await selected({...bound,pageState:{collectionSelections:{
  Categories:{Id:'food'}}}}),'Food','existing selected record stays authoritative');
});
