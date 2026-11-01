import test from 'node:test';
import assert from 'node:assert/strict';
import {executePageFormulaAction} from '../src/core/pages/PageRuntime/formulaAction';

const rowId='11111111-1111-4111-8111-111111111111';
const sessionId='22222222-2222-4222-8222-222222222222';
const row={Id:rowId,Quantity:2,UnitPrice:1.25,LineTotal:2.5,
 CartSession:sessionId,LastModifiedDate:'2026-11-01T10:00:00.000Z'};
const fields=['Quantity','UnitPrice','LineTotal'].map(apiName=>({
 apiName,label:apiName,dataType:'Number',required:false,unique:false
})).concat([{apiName:'CartSession',label:'CartSession',dataType:'Lookup(CartSession)',
 required:false,unique:false}]);
const objects=[{apiName:'CartLine',fields}];
const base={actionType:'Formula',fieldApiName:'Quantity',
 deltaSource:'$event.delta',relatedFieldApiName:'CartSession',
 relatedStateKey:'cartSessionId',stateCollectionKey:'cartItems',
 unitPriceFieldApiName:'UnitPrice',totalFieldApiName:'LineTotal',
 totalStateKey:'total',minValue:0,deleteOnZero:true};

test('independent + formula performs a guarded numeric Record API update',async()=>{
 const calls:Array<{method?:string;body?:string;headers?:any}>=[];
 const request=async<T>(_url:string,options?:RequestInit):Promise<T>=>{
  calls.push({method:options?.method,body:options?.body as string|undefined,headers:options?.headers});
  return {record:row} as T;
 };
 const result=await executePageFormulaAction(request,{...base,formula:'@Quantity + 2'},
  {recordId:rowId,delta:1},{cartItems:[row],cartSessionId:sessionId},objects,'CartLine');
 assert.equal(result.recordChanged,true);
 assert.equal(calls[1].method,'PATCH');
 assert.deepEqual(JSON.parse(calls[1].body!),{Quantity:4,LineTotal:5});
 assert.equal(calls[1].headers?.['If-Unmodified-Since'],row.LastModifiedDate);
 assert.equal(result.changes.find(x=>x.key==='total')?.value,5);
});
test('independent − formula removes a quantity-one row at zero',async()=>{
 const existing={...row,Quantity:1,LineTotal:1.25};
 const calls:Array<{method?:string}>=[];
 const request=async<T>(_url:string,options?:RequestInit):Promise<T>=>{
  calls.push({method:options?.method});return {record:existing} as T;
 };
 const result=await executePageFormulaAction(request,{...base,formula:'@Quantity - 2'},
  {recordId:rowId,delta:-1},{cartItems:[existing],cartSessionId:sessionId},objects,'CartLine');
 assert.equal(calls[1].method,'DELETE');
 assert.deepEqual(result.changes.find(x=>x.key==='cartItems')?.value,[]);
});
test('numeric Page State formula works without a record or a Flow',async()=>{
 const request=async<T>():Promise<T>=>{throw Error('must not call Record API');};
 const result=await executePageFormulaAction(request,{actionType:'Formula',
  stateKey:'counter',formula:'@counter + 2'}, {},
  {counter:1},[],'' );
 assert.deepEqual(result,{changes:[{key:'counter',value:3}],recordChanged:false});
});
test('formula cannot access missing state, arbitrary JS or nonnumeric state',async()=>{
 const request=async<T>():Promise<T>=>{throw Error('no Record API');};
 for(const [formula,state] of [
  ['@counter + @secret',{counter:1,secret:'abc'}],
  ['@counter + @another',{counter:1}],
  ['@counter + 1; DELETE',{counter:1}]
 ] as Array<[string,Record<string,unknown>]>){
  await assert.rejects(executePageFormulaAction(request,{actionType:'Formula',
   stateKey:'counter',formula},{},state,[],''),/Formula/);
 }
});
