import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const migration=read('../../server/src/system-support/migrations/20270309-design-body-ribbon-eight-property-trial.sql');
const css=read('../src/core/builders/PageBuilder/SmartRibbonApprovedThreeRow.css');
const ui=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');

const trial=migration.match(/WITH trial\([\s\S]*?\bVALUES([\s\S]*?)\)\s*UPDATE md_builder_shared_properties/);
assert.ok(trial,'trial property list must be present');
const slots=[...trial[1].matchAll(/\('([^']+)','([^']+)',(\d+),(\d+),(\d+)\)/g)]
 .map(([,key,group,row,col,width])=>({key,group,row:Number(row),col:Number(col),width:Number(width)}));

test('eight existing Design property keys alone are moved by a metadata-only trial',()=>{
 assert.equal(slots.length,8);
 assert.deepEqual(new Set(slots.map(x=>x.key)),new Set([
  'backgroundColor','borderColor','radius','labelColor','labelAlignment',
  'textSize','shadow','defaultValueColor'
 ]));
 assert.match(migration,/WHERE p\.tab='Design' AND p\.property_key=t\.property_key/);
 assert.doesNotMatch(migration,/\b(?:DELETE|TRUNCATE|DROP|ALTER TABLE|INSERT|UPDATE md_page_components)\b/i);
});

test('trial sections have unique row-column slots and exactly 26px editors',()=>{
 const expected={
  backgroundColor:['Body',1,1,40],borderColor:['Body',1,2,40],
  radius:['Body',1,3,58],labelColor:['Body',2,1,40],
  labelAlignment:['Body',2,2,40],textSize:['Body',2,3,58],
  shadow:['Body',3,1,40],defaultValueColor:['Typography',1,1,40]
 };
 for(const item of slots)assert.deepEqual([item.group,item.row,item.col,item.width],expected[item.key]);
 assert.equal(new Set(slots.map(x=>[x.group,x.row,x.col].join(':'))).size,8);
 assert.match(migration,/design_height=26/);
 assert.match(migration,/design_caption_width=0/);
});

test('40px shadow and alignment dropdowns reuse shared property controls',()=>{
 assert.match(migration,/t\.property_key='shadow' THEN 'dropdown'/);
 assert.match(migration,/t\.property_key='labelAlignment' THEN 'dropdown'/);
 assert.match(ui,/property\.designDisplay==='dropdown'/);
 assert.match(css,/Eight-property Design Body ribbon trial/);
 assert.match(css,/\[data-property="shadow"\],\[data-property="labelAlignment"\]/);
 assert.match(css,/width:var\(--smart-control-width\)!important/);
});
