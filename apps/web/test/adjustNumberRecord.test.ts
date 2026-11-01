import test from 'node:test';
import assert from 'node:assert/strict';
import {adjustNumberRecord,type AdjustNumberBinding} from '../src/core/pages/PageRuntime/adjustNumberRecord';
const fields=['Quantity','UnitPrice','LineTotal'].map(apiName=>({
 apiName,label:apiName,dataType:'Number'
})).concat([{apiName:'CartSession',label:'Cart Session',dataType:'Lookup(CartSession)'}]) as any;
const objects=[{apiName:'CartLine',fields}];
const id='11111111-1111-4111-8111-111111111111';
const session='22222222-2222-4222-8222-222222222222';
const row={Id:id,Quantity:2,UnitPrice:1.25,LineTotal:2.5,CartSession:session,
 LastModifiedDate:'2026-11-01T10:00:00.000Z'};
const binding:AdjustNumberBinding={
 actionType:'AdjustNumber',deltaSource:'$event.delta',fieldApiName:'Quantity',
 deleteOnZero:true,minValue:0,totalFieldApiName:'LineTotal',
 unitPriceFieldApiName:'UnitPrice',relatedFieldApiName:'CartSession',
 relatedStateKey:'cartSessionId',stateCollectionKey:'cartItems',
 totalStateKey:'total',subtotalStateKey:'subtotal'
};
test('generic +/- action updates authorised record and page collection without a Flow',async()=>{
 const writes:Array<{path:string;method?:string;body?:string;headers?:any}>=[];
 const request=async<T>(path:string,init?:RequestInit):Promise<T>=>{
  writes.push({path,method:init?.method,body:init?.body as string|undefined,headers:init?.headers});
  return {record:row} as T;
 };
 const state={cartSessionId:session,cartItems:[row],total:2.5,subtotal:2.5};
 const changed=await adjustNumberRecord(request,binding,{recordId:id,delta:1},state,objects,'CartLine');
 assert.equal(writes.length,2);
 assert.equal(writes[1].method,'PATCH');
 assert.deepEqual(JSON.parse(writes[1].body!),{Quantity:3,LineTotal:3.75});
 assert.equal(writes[1].headers?.['If-Unmodified-Since'],row.LastModifiedDate);
 assert.equal(changed.find(x=>x.key==='total')?.value,3.75);
 assert.equal((changed.find(x=>x.key==='cartItems')?.value as any[])[0].Quantity,3);
});
test('decrement at zero deletes one record with an optimistic concurrency precondition',async()=>{
 const calls:Array<{method?:string;headers?:any}>=[];
 const request=async<T>(_path:string,init?:RequestInit):Promise<T>=>{
  calls.push({method:init?.method,headers:init?.headers});
  return {record:{...row,Quantity:1,LineTotal:1.25}} as T;
 };
 const state={cartSessionId:session,cartItems:[{...row,Quantity:1,LineTotal:1.25}]};
 const changed=await adjustNumberRecord(request,binding,{recordId:id,delta:-1},state,objects,'CartLine');
 assert.equal(calls[1].method,'DELETE');
 assert.equal(calls[1].headers?.['If-Unmodified-Since'],row.LastModifiedDate);
 assert.deepEqual(changed.find(x=>x.key==='cartItems')?.value,[]);
});
test('wrong session and unrecognised delta are rejected before any write',async()=>{
 const calls:string[]=[];
 const req=async<T>(path:string):Promise<T>=>{calls.push(path);return {record:row} as T;};
 await assert.rejects(
  adjustNumberRecord(req,binding,{recordId:id,delta:1},{cartSessionId:id,cartItems:[row]},objects,'CartLine'),
  /another session/);
 assert.equal(calls.length,1);
 calls.length=0;
 await assert.rejects(
  adjustNumberRecord(req,binding,{recordId:id,delta:9},{cartSessionId:session,cartItems:[row]},objects,'CartLine'),
  /Only \+1 or -1/);
 assert.equal(calls.length,0);
});
