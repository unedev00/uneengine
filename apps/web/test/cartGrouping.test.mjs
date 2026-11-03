import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {groupCartRows} from '../src/component-libraries/smart_cart/cartGrouping.js';

const line=(fields={})=>({
 Id:crypto.randomUUID(),Product:'burger-1',Name:'Classic Chicken Burger',
 UnitPrice:5.49,OriginalUnitPrice:5.49,Quantity:1,LineTotal:5.49,...fields
});

test('identical products form one row with summed quantity and monetary line total',()=>{
 const records=[line(),line(),line()];
 const result=groupCartRows(records);
 assert.equal(result.length,1);
 assert.equal(result[0].Quantity,3);
 assert.ok(Math.abs(result[0].LineTotal-16.47)<0.001);
 assert.equal(result[0].__cartSourceRows.length,3);
 assert.deepEqual(records.map(r=>r.Quantity),[1,1,1],'do not mutate backing lines');
});
test('compares effective per-unit line amount, not only nominal unit price',()=>{
 const rows=[
  line({Quantity:2,LineTotal:10.98}),
  line({Quantity:1,LineTotal:5.49}),
  line({Quantity:1,LineTotal:4.99})
 ];
 const grouped=groupCartRows(rows);
 assert.deepEqual(grouped.map(row=>row.Quantity),[3,1]);
 assert.ok(Math.abs(grouped[0].LineTotal-16.47)<0.001);
 assert.equal(grouped[1].LineTotal,4.99);
 assert.equal(groupCartRows([line({LineTotal:5.49}),line({LineTotal:null})]).length,2);
});
test('aggregates the alternate LineAmount total for metadata-driven data sources',()=>{
 const rows=[
  {id:'a',SKU:'sku1',Price:5,Quantity:2,LineAmount:10},
  {id:'b',SKU:'sku1',Price:5,Quantity:1,LineAmount:5},
  {id:'c',SKU:'sku1',Price:5,Quantity:1,LineAmount:4}
 ];
 const grouped=groupCartRows(rows);
 assert.deepEqual(grouped.map(row=>row.Quantity),[3,1]);
 assert.equal(grouped[0].LineAmount,15);
});
test('distinguishes selections, inventory batches and prices across any data source',()=>{
 const records=[
  line({Selection:'Yes'}),line({Selection:'Yes'}),
  line({Selection:'No'}),line({Selection:'Yes',Batch:'batch-A'}),
  line({Selection:'Yes',Batch:'batch-B'}),
  line({Selection:'Yes',UnitPrice:6.49}),
 ];
 const result=groupCartRows(records);
 assert.equal(result.length,5);
 assert.equal(result[0].Quantity,2);
});
test('ignores audit identifiers and order of nested custom fields, not actual differences',()=>{
 const first=line({Options:{Extra:'cheese',Spicy:false},CreatedDate:'2026-01-01'});
 const second=line({Options:{Spicy:false,Extra:'cheese'},CreatedDate:'2026-02-01'});
 const third=line({Options:{Spicy:true,Extra:'cheese'}});
 const result=groupCartRows([first,second,third]);
 assert.deepEqual(result.map(r=>r.Quantity),[2,1]);
});
test('custom quantity fields group without relying on the CartLine source schema',()=>{
 const records=[
  {id:'1',SKU:'banana',Batch:'A',Pieces:2,Price:1.75},
  {id:'2',SKU:'banana',Batch:'A',Pieces:3,Price:1.75},
  {id:'3',SKU:'banana',Batch:'B',Pieces:1,Price:1.75},
 ];
 const groups=groupCartRows(records,{quantityField:'Pieces'});
 assert.deepEqual(groups.map(row=>row.Pieces),[5,1]);
 assert.deepEqual(groups.map(row=>row.Quantity),[5,1]);
 assert.deepEqual(records.map(row=>row.Pieces),[2,3,1]);
});
test('keeps zero, missing, false, null and empty choices distinct',()=>{
 const result=groupCartRows([line({Choice:0}),line({}),line({Choice:false}),
  line({Choice:null}),line({Choice:''})]);
 assert.equal(result.length,5);
});
test('zero and negative quantity items do not leave empty cart rows',()=>{
 const result=groupCartRows([
  line({Quantity:0,LineTotal:0}),
  line({Quantity:-1,LineTotal:-5.49}),
  line({Quantity:1}),
 ]);
 assert.equal(result.length,1);
 assert.equal(result[0].Quantity,1);
});
test('honours pre-existing quantities and never changes the input array',()=>{
 const records=[line({Quantity:2,LineTotal:10.98}),line({Quantity:3,LineTotal:16.47})];
 const result=groupCartRows(records);
 assert.equal(result[0].Quantity,5);
 assert.equal(records.length,2);
});
test('Smart Cart renders grouped records before limiting, retaining backing record IDs',()=>{
 const source=readFileSync(new URL('../src/component-libraries/smart_cart/SmartCart.jsx',import.meta.url),'utf8');
 assert.match(source,/groupCartRows\(records,\{quantityField:directField\(p\.column3Source\)\|\|'Quantity'\}\)\.slice\(0,200\)/);
 assert.match(source,/record\.__cartSourceRows\?\.\[0\]/);
 assert.match(source,/groupedQuantity:record\.Quantity/);
});
test('quantity actions use the persisted source-line quantity, not aggregate display quantity',()=>{
 const source=readFileSync(new URL('../src/component-libraries/smart_cart/SmartCart.jsx',import.meta.url),'utf8');
 assert.match(source,/quantity:Number\(payload\.record\?\.\[fieldName\]\?\?quantity\)/);
});
