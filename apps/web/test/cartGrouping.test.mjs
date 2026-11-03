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
test('keeps zero, missing, false, null and empty choices distinct',()=>{
 const result=groupCartRows([line({Choice:0}),line({}),line({Choice:false}),
  line({Choice:null}),line({Choice:''})]);
 assert.equal(result.length,5);
});
test('honours pre-existing quantities and never changes the input array',()=>{
 const records=[line({Quantity:2,LineTotal:10.98}),line({Quantity:3,LineTotal:16.47})];
 const result=groupCartRows(records);
 assert.equal(result[0].Quantity,5);
 assert.equal(records.length,2);
});
test('Smart Cart renders grouped records before limiting, retaining backing record IDs',()=>{
 const source=readFileSync(new URL('../src/component-libraries/smart_cart/SmartCart.jsx',import.meta.url),'utf8');
 assert.match(source,/groupCartRows\(records\)\.slice\(0,200\)/);
 assert.match(source,/record\.__cartSourceRows\?\.\[0\]/);
 assert.match(source,/groupedQuantity:record\.Quantity/);
});
test('both authored add-product Flows increment identical existing CartLine records',()=>{
 for(const path of [
  '../../../scripts/codextill/ensure-smart-till-cart-flows.mjs',
  '../../server/src/app-seeders/acetill-copilot-pos-flows.ts'
 ]){
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.match(source,/recordId:'\{!existingLine.Id\}'/);
  assert.match(source,/value:'\{!mergedQuantity\}'/);
  for(const field of ['CartSession','Product','UnitPrice','OriginalUnitPrice'])
    assert.match(source,new RegExp("field:'"+field+"'"));
 }
});
