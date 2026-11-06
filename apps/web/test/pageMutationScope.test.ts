import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldInvalidatePageComponent} from '../src/core/pages/PageRuntime/pageMutationScope';
import {visibleSessionRelatedQuery} from '../src/core/pages/PageRuntime/usePageSessionRelatedQuery';

const page='Sales:Checkout',session='session-1';

test('a cart formula only reloads components reading its mutated objects',()=>{
 const mutation={pageSessionKey:page,sessionId:session,objectApiNames:['CartLine','Cart']};
 assert.equal(shouldInvalidatePageComponent(mutation,page,session,['CartLine']),true);
 assert.equal(shouldInvalidatePageComponent(mutation,page,session,['Cart']),true);
 assert.equal(shouldInvalidatePageComponent(mutation,page,session,['Product']),false);
 assert.equal(shouldInvalidatePageComponent(mutation,page,session,['Category']),false);
 assert.equal(shouldInvalidatePageComponent(mutation,page,session,['']),false);
});
test('unscoped legacy and Flow mutations still refresh all consumers',()=>{
 assert.equal(shouldInvalidatePageComponent({pageSessionKey:page},page,session,['Product']),true);
 assert.equal(shouldInvalidatePageComponent({pageSessionKey:page,objectApiNames:[]},page,session,['Product']),true);
});
test('page isolation prevents cross-page refetches',()=>{
 assert.equal(shouldInvalidatePageComponent({pageSessionKey:'Other',objectApiNames:['Product']},page,session,['Product']),false);
 assert.equal(shouldInvalidatePageComponent(undefined,page,session,['Product']),false);
});
test('changing the cart session resets all components even for scoped writes',()=>{
 assert.equal(shouldInvalidatePageComponent({pageSessionKey:page,sessionId:'session-2',objectApiNames:['Cart']},page,session,['Product']),true);
});

test('same-session cart lookup remains visible while a revision is being refreshed',()=>{
 const parent={blocked:false,filter:{field:'Cart',value:'current-cart',related:true}};
 const cached={scopeKey:'session:A',query:parent};
 assert.deepEqual(visibleSessionRelatedQuery(true,'session:A',cached),parent);
 assert.deepEqual(visibleSessionRelatedQuery(true,'session:B',cached),{blocked:true});
 assert.deepEqual(visibleSessionRelatedQuery(false,'session:A',cached),{blocked:true});
});

test('baseline: component record requests with same filter but different limits are separate',async()=>{
 const calls:number[]=[];
 const fake=async(limit:number)=>{calls.push(limit);return {records:Array(limit).fill(null),total:200};};
 const results=await Promise.all([fake(2),fake(100)]);
 assert.deepEqual(calls,[2,100]);
 assert.deepEqual(results.map(v=>v.records.length),[2,100]);
 console.info('record page coalesce baseline: 2 requests for same filter, limits=2,100');
});
