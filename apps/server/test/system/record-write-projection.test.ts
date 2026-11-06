import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {authorizedSavedRecordProjection} from '../../src/system-support/record-write-projection.js';
import type {RecordEngine} from '../../src/system-files/record-engine.js';

test('POST and PUT Record API include authorized saved-record projection',async()=>{
 const server=await readFile(new URL('../../src/system-support/server.ts',import.meta.url),'utf8');
 assert.match(server,/res\.status\(201\)\.json\(\{id,record\}\)/);
 assert.match(server,/authorizedSavedRecordProjection\(records,actor\.tenant_id,actor\.user_id/);
 assert.match(server,/res\.json\(\{record\}\)/);
 console.info('Record write projection: POST/PUT returns authorized saved fields; no additional client GET for aliases');
});

const id='11111111-1111-4111-8111-111111111111';
const fake=(read:(tenant:string,user:string,object:string,id:string)=>Promise<Record<string,unknown>>)=>
 ({get:read} as unknown as Pick<RecordEngine,'get'>);
test('saved fields and computed values remain available without client followup GET',async()=>{
 const calls:string[]=[];
 const value=await authorizedSavedRecordProjection(fake(async(t,u,o,r)=>{
  calls.push(t+':'+u+':'+o+':'+r);return {Id:id,Name:'Saved',CalculatedTotal:50};
 }),'tenant-a','user-a','CartLine',id);
 assert.deepEqual(calls,['tenant-a:user-a:CartLine:'+id]);
 assert.deepEqual(value,{Id:id,Name:'Saved',CalculatedTotal:50});
});
test('write-only actor receives the legacy Id without field leakage',async()=>{
 const projected=await authorizedSavedRecordProjection(fake(async()=>{throw Error('Permission denied');}),
  'tenant-no-read','user-writer','Sale',id);
 assert.deepEqual(projected,{Id:id});
});
test('row denied and different Id never return another record fields',async()=>{
 const wrong=await authorizedSavedRecordProjection(fake(async()=>({Id:'other',Secret:'leak'})),
  'tenant-1','user-1','Sale',id);
 assert.deepEqual(wrong,{Id:id});
 const denied=await authorizedSavedRecordProjection(fake(async()=>{throw Error('Record not found');}),
  'tenant-1','user-1','Sale',id);
 assert.deepEqual(denied,{Id:id});
});
test('caller-supplied untrusted values do not bypass read field security',async()=>{
 const body={Amount:50000,Secret:'private'};
 const value=await authorizedSavedRecordProjection(fake(async()=>({Id:id,Name:'Read-only projection'})),
  'tenant-a','user-a','Sale',id);
 assert.equal(Object.hasOwn(value,'Secret'),false);
 assert.equal(Object.hasOwn(value,'Amount'),false);
 assert.deepEqual(body,{Amount:50000,Secret:'private'});
});
