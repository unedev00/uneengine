import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldInvalidatePageComponent,pageComponentReadObjectNames,applyCompleteRecordMutation} from '../src/core/pages/PageRuntime/pageMutationScope';
import {visibleSessionRelatedQuery} from '../src/core/pages/PageRuntime/usePageSessionRelatedQuery';
import {createRecordPageCoalescer} from '../src/core/authentication/Client/recordPageCoalescer';

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

test('coalesced same-auth concurrent limits 2 and 100 issue one 100-row request',async()=>{
 const batch=createRecordPageCoalescer<{Id:string}>();
 const calls:number[]=[];
 const reader=async(limit:number)=>{calls.push(limit);
  return {records:Array.from({length:limit},(_,i)=>({Id:String(i)})),total:150};};
 const [first,second]=await Promise.all([
  batch('tenant:a:Cart:filter=x:offset=0',2,reader),
  batch('tenant:a:Cart:filter=x:offset=0',100,reader)
 ]);
 assert.deepEqual(calls,[100]);
 assert.equal(first.records.length,2);
 assert.equal(second.records.length,100);
 assert.equal(first.total,150);
 assert.equal(second.total,150);
 console.info('record page coalesce after: 2 requests->1, full page=100, child page=2');
});

test('coalescer keeps tenant/actor and filters separate, with no stale settled cache',async()=>{
 const batch=createRecordPageCoalescer<{Id:string}>();
 let requests=0;
 const get=async(limit:number)=>{requests++;return {records:[{Id:'row'}].slice(0,limit),total:1};};
 await Promise.all([
  batch('tenant:a:filter=x',2,get),
  batch('tenant:b:filter=x',100,get),
  batch('tenant:a:filter=y',100,get)
 ]);
 assert.equal(requests,3);
 await batch('tenant:a:filter=x',2,get);
 assert.equal(requests,4,'next action must reauthorize');
});

test('coalescer rejected read is retryable and cannot leak partial success',async()=>{
 const batch=createRecordPageCoalescer<{Id:string}>();
 let calls=0;
 const bad=async()=>{calls++;throw Error('Permission denied');};
 const pending=[batch('actor:1',2,bad),batch('actor:1',100,bad)];
 const denied=await Promise.allSettled(pending);
 assert.equal(calls,1);
 assert.ok(denied.every(result=>result.status==='rejected'));
 await batch('actor:1',2,async()=>{calls++;return {records:[{Id:'safe'}],total:1};});
 assert.equal(calls,2);
});

test('complete authorized row changes update in place without invalidation',()=>{
 const original=[{Id:'row-1',Name:'Old',Quantity:1},{Id:'row-2',Name:'Other',Quantity:4}];
 const mutation={pageSessionKey:page,sessionId:session,objectApiNames:['CartLine'],
  recordChanges:[{objectApiName:'CartLine',operation:'update' as const,
   record:{Id:'row-1',Name:'New',Quantity:2}}]};
 const result=applyCompleteRecordMutation(original,'CartLine',mutation);
 assert.deepEqual(result,[{Id:'row-1',Name:'New',Quantity:2},original[1]]);
 assert.equal(original[0].Name,'Old','state remains immutable');
 assert.equal(shouldInvalidatePageComponent(mutation,page,session,['Product']),false);
});

test('unknown write projection, deletes and creates must use the existing safe refetch',()=>{
 const rows=[{Id:'row-1',Name:'Original',Quantity:1}];
 const base={pageSessionKey:page,sessionId:session,objectApiNames:['CartLine']};
 for(const recordChanges of [
  [{objectApiName:'CartLine',operation:'update' as const,record:{Id:'row-1'}}],
  [{objectApiName:'CartLine',operation:'create' as const,record:{Id:'row-2',Name:'New',Quantity:1}}],
  [{objectApiName:'CartLine',operation:'delete' as const,record:{Id:'row-1'}}],
  [{objectApiName:'CartLine',operation:'update' as const,record:{Id:'not-visible',Name:'N',Quantity:1}}]
 ])assert.equal(applyCompleteRecordMutation(rows,'CartLine',{...base,recordChanges}),null);
});

test('selected secondary COLLECTION and TABLE dependencies invalidate their consumers',()=>{
 const objs=[{apiName:'Primary',fields:[]},
  {apiName:'Secondary',fields:[{apiName:'Amount',dataType:'Number'}]},
  {apiName:'Category',fields:[{apiName:'Name',dataType:'Text'}]},
  {apiName:'Unrelated',fields:[]}];
 const reads=pageComponentReadObjectNames('Primary',{
  objectApiName:'Primary',objectApiName2:'Secondary',objectApiName3:'Category',
  text:'=SUM(COLLECTION(Secondary.Amount))',caption:'=TABLE(Category)'
 },objs);
 assert.deepEqual(reads,['Primary','Secondary','Category']);
 const mutation=(name:string)=>({pageSessionKey:page,sessionId:session,objectApiNames:[name]});
 assert.equal(shouldInvalidatePageComponent(mutation('Secondary'),page,session,reads),true);
 assert.equal(shouldInvalidatePageComponent(mutation('Category'),page,session,reads),true);
 assert.equal(shouldInvalidatePageComponent(mutation('Unrelated'),page,session,reads),false);
});
test('unreferenced selected sources remain idle; unknown dependencies use safe broad refresh',()=>{
 const objs=[{apiName:'Primary',fields:[]},{apiName:'Secondary',fields:[]}];
 assert.deepEqual(pageComponentReadObjectNames('Primary',
  {objectApiName2:'Secondary',title:'Static text'},objs),['Primary']);
 const unknown=pageComponentReadObjectNames('Primary',
  {text:'=COLLECTION(Secondary.Amount'},objs);
 assert.equal(unknown,null);
 assert.equal(shouldInvalidatePageComponent({
  pageSessionKey:page,sessionId:session,objectApiNames:['Secondary']
 },page,session,unknown),true);
});
