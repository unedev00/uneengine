import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldInvalidatePageComponent,pageComponentReadObjectNames,applyCompleteRecordMutation} from '../src/core/pages/PageRuntime/pageMutationScope';
import {shouldRevalidateSessionParent,visibleSessionRelatedQuery} from '../src/core/pages/PageRuntime/usePageSessionRelatedQuery';
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


test('late small-page subscriber joins a larger in-flight read',async()=>{
 const batch=createRecordPageCoalescer<{Id:string}>();
 let calls=0;
 let finish!:(value:{records:{Id:string}[];total:number})=>void;
 const network=new Promise<{records:{Id:string}[];total:number}>(resolve=>{finish=resolve;});
 const first=batch('tenant:a:epoch:0:CartLine',100,async()=>{calls++;return network;});
 await new Promise<void>(resolve=>setImmediate(resolve));
 const second=batch('tenant:a:epoch:0:CartLine',2,async()=>{
  throw Error('A compatible in-flight query should have been shared');
 });
 assert.equal(calls,1);
 finish({records:Array.from({length:100},(_,i)=>({Id:String(i)})),total:150});
 const [large,small]=await Promise.all([first,second]);
 assert.equal(large.records.length,100);
 assert.deepEqual(small.records.map(row=>row.Id),['0','1']);
});

test('a larger page and a post-write generation never reuse an incomplete or stale request',async()=>{
 const batch=createRecordPageCoalescer<{Id:string}>();
 let small!: (page:{records:{Id:string}[];total:number})=>void;
 let large!: (page:{records:{Id:string}[];total:number})=>void;
 const calls:number[]=[];
 const first=batch('tenant:a:epoch:0',2,async(limit)=>{
  calls.push(limit);return new Promise(resolve=>{small=resolve;});
 });
 await new Promise<void>(resolve=>setImmediate(resolve));
 const second=batch('tenant:a:epoch:0',100,async(limit)=>{
  calls.push(limit);return new Promise(resolve=>{large=resolve;});
 });
 await new Promise<void>(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,[2,100]);
 const afterWrite=batch('tenant:a:epoch:1',2,async()=>{
  calls.push(2);return {records:[{Id:'fresh'}],total:1};
 });
 small({records:[{Id:'old-1'},{Id:'old-2'}],total:2});
 large({records:Array.from({length:100},(_,i)=>({Id:String(i)})),total:101});
 const [before,bigger,fresh]=await Promise.all([first,second,afterWrite]);
 assert.equal(before.records[0].Id,'old-1');
 assert.equal(bigger.records.length,100);
 assert.equal(fresh.records[0].Id,'fresh');
 assert.equal(calls.length,3);
});


test('COUNTIFS and SUMIFS Object reads are invalidated even without secondary source selector',()=>{
 const known=[{apiName:'Cart',fields:[]},
  {apiName:'CartLine',fields:[{apiName:'Quantity',dataType:'Number'}]},
  {apiName:'Product',fields:[]}];
 const reads=pageComponentReadObjectNames('Cart',{
  textSource:'=COUNTIFS(CartLine, Quantity, 2)',
  subtitle:'=SUMIFS(CartLine, Quantity, Quantity, 2)'
 },known);
 assert.deepEqual(reads,['Cart','CartLine']);
 assert.equal(shouldInvalidatePageComponent({
  pageSessionKey:page,sessionId:session,objectApiNames:['CartLine']
 },page,session,reads),true);
 assert.equal(shouldInvalidatePageComponent({
  pageSessionKey:page,sessionId:session,objectApiNames:['Product']
 },page,session,reads),false);
});

test('unknown aggregate Object never creates a data permission or false source',()=>{
 const known=[{apiName:'Cart',fields:[]}];
 assert.deepEqual(pageComponentReadObjectNames('Cart',{
  textSource:'=COUNTIFS(SecretData, Status, "Open")'
 },known),['Cart']);
});


test('CartLine mutations do not refetch Cart parent SessionKey, but Cart and unknown Flow writes do',()=>{
 const parents=['Cart'];
 const mutation=(objectApiNames?:string[])=>({pageSessionKey:page,sessionId:session,objectApiNames});
 assert.equal(shouldRevalidateSessionParent(mutation(['CartLine']),page,session,parents),false);
 assert.equal(shouldRevalidateSessionParent(mutation(['Cart']),page,session,parents),true);
 assert.equal(shouldRevalidateSessionParent(mutation(),page,session,parents),true);
 assert.equal(shouldRevalidateSessionParent(mutation([]),page,session,parents),true);
 assert.equal(shouldRevalidateSessionParent({pageSessionKey:'Other',objectApiNames:['Cart']},page,session,parents),false);
 assert.equal(shouldRevalidateSessionParent({...mutation(['Cart']),sessionId:'other'},page,session,parents),false);
});


test('complete authorized filtered row updates reuse the page when every filter field is stable',()=>{
 const rows=[{Id:'a',Cart:'cart1',Status:'Open',Quantity:1},
  {Id:'b',Cart:'cart1',Status:'Open',Quantity:4}];
 const mutation={pageSessionKey:page,sessionId:session,objectApiNames:['CartLine'],
  recordChanges:[{objectApiName:'CartLine',operation:'update' as const,
    record:{Id:'a',Cart:'cart1',Status:'Open',Quantity:2}}]};
 const updated=applyCompleteRecordMutation(rows,'CartLine',mutation,['Cart','Status']);
 assert.equal(updated?.[0].Quantity,2);
 assert.equal(rows[0].Quantity,1);
 const changedFilter={...mutation,recordChanges:[{objectApiName:'CartLine',operation:'update' as const,
    record:{Id:'a',Cart:'cart2',Status:'Open',Quantity:2}}]};
 assert.equal(applyCompleteRecordMutation(rows,'CartLine',changedFilter,['Cart','Status']),null);
 const absentField={...mutation,recordChanges:[{objectApiName:'CartLine',operation:'update' as const,
    record:{Id:'a',Cart:'cart1',Quantity:2}}]};
 assert.equal(applyCompleteRecordMutation(rows,'CartLine',absentField,['Cart','Status']),null);
 const extraRow={...mutation,recordChanges:[{objectApiName:'CartLine',operation:'create' as const,
    record:{Id:'c',Cart:'cart1',Status:'Open',Quantity:2}}]};
 assert.equal(applyCompleteRecordMutation(rows,'CartLine',extraRow,['Cart','Status']),null);
});
