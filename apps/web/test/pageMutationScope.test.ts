import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldInvalidatePageComponent} from '../src/core/pages/PageRuntime/pageMutationScope';

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
