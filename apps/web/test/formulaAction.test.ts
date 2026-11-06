import test from 'node:test';
import assert from 'node:assert/strict';
import {executePageFormulaAction,parseActionFormulaAssignment,resolveActionFormulaValue} from '../src/core/pages/PageRuntime/formulaAction';
import {executeActionPlan,type ActionPlanTiming} from '../../server/src/expression-engine/ActionFormulas.js';
import type {Expression} from '../../server/src/expression-engine/FormulaParser.js';

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
 assert.deepEqual(result.mutatedObjectApiNames,['CartLine']);
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
test('record formula reports only objects actually written, not an unselected branch',async()=>{
 const writes:string[]=[];
 const request=async<T>(path:string,init?:RequestInit):Promise<T>=>{
  if(init?.method)writes.push(path);
  return {record:{Id:rowId}} as T;
 };
 const result=await executePageFormulaAction(request,{actionType:'Formula',
  formula:'=ACTIONS(IF(FALSE, CREATERECORD(Product, Name, "skip"), CREATERECORD(CartLine, Quantity, 1)), UPDATERECORD(Cart, @cartId, Total, 3))'
 },{cartId:rowId},{},objects,'Product');
 assert.equal(result.recordChanged,true);
 assert.deepEqual(result.mutatedObjectApiNames,['CartLine','Cart']);
 assert.deepEqual(writes,['/records/CartLine','/records/Cart/'+rowId]);
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

test('numeric field target is inferred when an action only contains a formula',async()=>{
 const writes:Array<{method?:string;body?:BodyInit|null}>=[];
 const request=async<T>(_path:string,opts?:RequestInit):Promise<T>=>{
  writes.push({method:opts?.method,body:opts?.body});
  return {record:row} as T;
 };
 const output=await executePageFormulaAction(request,{actionType:'Formula',
  formula:'@Quantity + 2',minValue:0,deleteOnZero:false},
  {recordId:rowId,delta:1},{},objects,'CartLine');
 assert.equal(output.recordChanged,true);
 assert.deepEqual(JSON.parse(String(writes[1].body)),{Quantity:4});
});
test('declarative Formula targets parse without JavaScript execution',()=>{
 assert.deepEqual(parseActionFormulaAssignment('@state.categoryId := @event.value'),{
  kind:'state',key:'categoryId',value:'@event.value'
 });
 assert.deepEqual(parseActionFormulaAssignment('@filter.category := @event.value'),{
  kind:'filter',key:'category',value:'@event.value'
 });
 assert.deepEqual(parseActionFormulaAssignment('@navigate.page := "Sales/Home"'),{
  kind:'navigate',key:'page',value:'"Sales/Home"'
 });
 assert.throws(()=>parseActionFormulaAssignment('@navigate.destroy := "Records"'),/Navigation/);
 assert.equal(parseActionFormulaAssignment('@Quantity + 1'),null);
 assert.equal(resolveActionFormulaValue('@event.value',{value:'Desserts'},{}),'Desserts');
 assert.equal(resolveActionFormulaValue('@state.counter + 2',{}, {counter:3}),'5');
 assert.equal(resolveActionFormulaValue('@session.id',{}, {},sessionId),sessionId);
});
test('Page State formula assignment updates its chosen target without a Record API call',async()=>{
 const request=async<T>():Promise<T>=>{throw Error('must not call Record API');};
 const result=await executePageFormulaAction(request,{
  actionType:'Formula',formula:'@state.categoryId := @event.value'
 },{value:'Food'},{},[],'' );
 assert.deepEqual(result,{changes:[{key:'categoryId',value:'Food'}],recordChanged:false});
});

test('record actions await results, preserve value types and stop after a failure',async()=>{
 const calls:Array<{path:string;init?:RequestInit}>=[];
 const request=async<T>(path:string,init?:RequestInit):Promise<T>=>{
  calls.push({path,init});
  if(calls.length===2)throw Error('Access denied');
  return {record:{Id:rowId}} as T;
 };
 const formula='=ACTIONS(CREATERECORD(Item, Amount, $state.total, AS(item)), UPDATERECORD(Item, item.Id, Amount, 2), DELETERECORD(Item, item.Id))';
 await assert.rejects(executePageFormulaAction(request,{formula},{},{total:12},[],'Item'),/after 1 confirmed.*Access denied/);
 assert.deepEqual(calls.map(call=>call.path),['/records/Item','/records/Item/'+rowId]);
 assert.deepEqual(JSON.parse(String(calls[0].init?.body)),{Amount:12});
});

test('create, print and communication share sequential results',async()=>{
 const events:string[]=[];
 const request=async<T>(path:string,options?:RequestInit):Promise<T>=>{
  if(path==='/records/Booking'){events.push('create');return {record:{Id:'booking-1'}} as T;}
  const body=JSON.parse(String(options?.body));
  assert.deepEqual(body,{channel:'SMS',credential:'MyProvider',values:['447000','booking-1']});
  events.push('sms');return {} as T;
 };
 const formula='=ACTIONS(CREATERECORD(Booking, Name, "Test", AS(row)),PRINT(BookingForm, row.Id),SMS(MyProvider,"447000",row.Id))';
 await executePageFormulaAction(request,{formula},{},{},[],'','',async(template,id)=>{
  assert.deepEqual([template,id],['BookingForm','booking-1']);events.push('print');
 });
 assert.deepEqual(events,['create','print','sms']);
});

test('invalid final action fails before the first mutation',async()=>{
 let requests=0;
 const request=async<T>():Promise<T>=>{requests++;return {} as T;};
 await assert.rejects(executePageFormulaAction(request,{formula:'ACTIONS(CREATERECORD(Item),SMS(Provider,"recipient"))'},{},{},[],''),/Invalid SMS/);
 assert.equal(requests,0);
});

test('AS fields beyond Id use the authorised record response including generated defaults',async()=>{
 const paths:string[]=[];
 const request=async<T>(path:string,init?:RequestInit):Promise<T>=>{
  paths.push(path);
  if(!init)return {record:{Id:rowId,Name:'Generated'}} as T;
  if(path==='/records/Child')assert.equal(JSON.parse(String(init.body)).Name,'Generated');
  return {record:{Id:rowId}} as T;
 };
 await executePageFormulaAction(request,{formula:'ACTIONS(CREATERECORD(Parent,AS(parent)),CREATERECORD(Child,Name,parent.Name))'},{},{},[],'');
 assert.deepEqual(paths,['/records/Parent','/records/Parent/'+rowId,'/records/Child']);
});

test('print templates fetch all bounded pages and reject a shifting dataset',async()=>{
 const {printRecordPages}=await import('../src/core/pages/PageRuntime/printRecordPages');
 const first={records:[{Id:'a'}],total:2};
 assert.equal((await printRecordPages(first,async offset=>{
  assert.equal(offset,1);return {records:[{Id:'b'}],total:2};
 },()=>true)).records.length,2);
 await assert.rejects(printRecordPages(first,async()=>first,()=>true),/changed/);
});


test('baseline: a dependent cart-style plan keeps four ordered mock requests',async()=>{
 const calls:string[]=[];
 const durations:number[]=[];
 const started=performance.now();
 const id='11111111-1111-4111-8111-111111111111';
 const line='22222222-2222-4222-8222-222222222222';
 const request=async<T>(path:string,options?:RequestInit):Promise<T>=>{
  const requestStart=performance.now();
  const method=options?.method??'GET';
  calls.push(method+' '+path.split('?')[0]);
  // Fixed mock transport cost; no production data or HTTP.
  await new Promise<void>(resolve=>setTimeout(resolve,3));
  durations.push(performance.now()-requestStart);
  if(method==='GET'&&path.startsWith('/records/Cart?'))
   return {records:[{Id:id}],total:1} as T;
  if(method==='GET'&&path==='/records/CartLine/'+line)
   return {record:{Id:line,Name:'Generated'}} as T;
  return {record:{Id:line}} as T;
 };
 const result=await executePageFormulaAction(request,{actionType:'Formula',
  formula:'=ACTIONS(GETRECORD(Cart, SessionKey, @sessionKey, AS(cart)), CREATERECORD(CartLine, Cart, cart.Id, AS(line)), UPDATERECORD(CartLine, line.Id, Name, line.Name), STATE(done, TRUE))'
 },{sessionKey:'test-session'},{},[], 'CartLine');
 const elapsed=performance.now()-started;
 assert.equal(result.recordChanged,true);
 assert.deepEqual(result.changes,[{key:'done',value:true}]);
 assert.deepEqual(calls,['GET /records/Cart','POST /records/CartLine',
  'GET /records/CartLine/'+line,'PUT /records/CartLine/'+line]);
 assert.equal(durations.length,4);
 assert.ok(durations.every(ms=>Number.isFinite(ms)&&ms>=0));
 assert.ok(elapsed>=Math.max(...durations));
 // This is a mock baseline, not the production HAR measurement.
 console.info('formula mock baseline: requests='+calls.length+
  ' order='+calls.map(s=>s.split(' ')[0]).join('>')+
  ' requestMs='+durations.map(ms=>ms.toFixed(1)).join(',')+
  ' planMs='+elapsed.toFixed(1));
});

const timingEvaluator=(node:Expression,scope:Record<string,unknown>):unknown=>{
 if(node.kind==='literal')return node.value;
 if(node.kind==='reference')return node.value.split('.').reduce<unknown>((value,key)=>
  value&&typeof value==='object'?(value as Record<string,unknown>)[key]:undefined,scope);
 throw Error('Unexpected timing test expression');
};

test('opt-in Formula timings report exact request counts, step order and no sensitive values',async()=>{
 const traces:ActionPlanTiming[]=[];
 const events:string[]=[];
 const id='11111111-1111-4111-8111-111111111111';
 const formula='=ACTIONS(CREATERECORD(Item, Email, "private@example.com", AS(saved)), UPDATERECORD(Item, saved.Id, Quantity, 2))';
 const result=await executeActionPlan(formula,{},timingEvaluator,{
  formulaName:'POS.AddItem',
  onTiming:timing=>traces.push(timing),
  request:async(path,init)=>{
   events.push((init?.method??'GET')+' '+path);
   return {record:{Id:id}} as never;
  }
 });
 assert.equal(result.recordChanged,true);
 assert.deepEqual(events,['POST /records/Item','PUT /records/Item/'+id]);
 assert.equal(traces.length,1);
 const sample=traces[0];
 assert.equal(sample.formulaName,'POS.AddItem');
 assert.equal(sample.status,'completed');
 assert.equal(sample.stepCount,2);
 assert.equal(sample.executedStepCount,2);
 assert.equal(sample.completedActionCount,2);
 assert.equal(sample.requestCount,2);
 assert.deepEqual(sample.steps.map(s=>s.name),['CREATERECORD','UPDATERECORD']);
 assert.deepEqual(sample.steps.map(s=>s.requestCount),[1,1]);
 assert.ok(sample.durationMs>=0&&sample.steps.every(s=>s.durationMs>=0));
 const printable=JSON.stringify(sample);
 assert.ok(!printable.includes('private@example.com'));
 assert.ok(!printable.includes(id));
 assert.ok(!printable.includes('/records/'));
 assert.ok(!printable.includes(formula));
});

test('Formula timing is off by default and cannot change request results or permission errors',async()=>{
 const calls:string[]=[];
 const id='11111111-1111-4111-8111-111111111111';
 const formula='=ACTIONS(CREATERECORD(Item, Amount, 1), DELETERECORD(Item, "'+id+'"))';
 const request=async<T>(path:string,init?:{method:string}):Promise<T>=>{
  calls.push((init?.method??'GET')+' '+path);
  if(init?.method==='DELETE')throw Error('Permission denied');
  return {record:{Id:id}} as T;
 };
 await assert.rejects(executeActionPlan(formula,{},timingEvaluator,{request}),
  /DELETERECORD failed after 1 confirmed action\(s\). Permission denied/);
 assert.deepEqual(calls,['POST /records/Item','DELETE /records/Item/'+id]);
 calls.length=0;
 const traces:ActionPlanTiming[]=[];
 await assert.rejects(executeActionPlan(formula,{},timingEvaluator,{
  request,onTiming:sample=>{traces.push(sample);},formulaName:'Unsafe name with secrets'
 }),/DELETERECORD failed after 1 confirmed action\(s\). Permission denied/);
 assert.deepEqual(calls,['POST /records/Item','DELETE /records/Item/'+id]);
 assert.equal(traces.length,1);
 assert.equal(traces[0].status,'failed');
 assert.equal(traces[0].formulaName,'unnamed');
 assert.equal(traces[0].completedActionCount,1);
 assert.equal(traces[0].requestCount,2);
 assert.deepEqual(traces[0].steps.map(step=>step.status),['completed','failed']);
 // A broken telemetry sink is never allowed to break a successful action.
 const ok=await executeActionPlan('=CREATERECORD(Item, Amount, 1)',{},timingEvaluator,{
  request:async()=>({record:{Id:id}}) as never,
  onTiming:()=>{throw Error('monitor unavailable');},formulaName:'POS.Add'
 });
 assert.equal(ok.recordChanged,true);
});


test('mock transport: enabling tracing preserves two ordered requests after complete write projection',async()=>{
 const formula='=ACTIONS(CREATERECORD(Item, Name, "start", AS(item)), UPDATERECORD(Item, item.Id, Name, item.Name))';
 const id='11111111-1111-4111-8111-111111111111';
 const run=async(enabled:boolean)=>{
  const calls:string[]=[];
  const samples:ActionPlanTiming[]=[];
  const start=performance.now();
  await executeActionPlan(formula,{},timingEvaluator,{
   request:async(path,init)=>{
    calls.push((init?.method??'GET')+' '+path);
    await new Promise<void>(resolve=>setTimeout(resolve,3));
    return {record:{Id:id,Name:'Generated'}} as never;
   },
   ...(enabled?{formulaName:'POS.CartUpdate',onTiming:(timing:ActionPlanTiming)=>samples.push(timing)}:{})
  });
  return {calls,ms:performance.now()-start,samples};
 };
 const before=await run(false),after=await run(true);
 assert.deepEqual(before.calls,['POST /records/Item','PUT /records/Item/'+id]);
 assert.deepEqual(after.calls,before.calls);
 assert.equal(before.samples.length,0);
 assert.equal(after.samples.length,1);
 assert.equal(after.samples[0].requestCount,2);
 assert.deepEqual(after.samples[0].steps.map(step=>step.requestCount),[1,1]);
 // These are mock transport timings (not production latency); noisy CI wall times
 // are reported but never used for a flaky speed threshold.
 console.info('formula mock comparison: requests='+before.calls.length+'->'+after.calls.length+
  ' ordering=POST>PUT'+' timingOffMs='+before.ms.toFixed(1)+
  ' timingOnMs='+after.ms.toFixed(1));
});

test('per-step telemetry accounts for sequential FOREACH iteration without counting payloads',async()=>{
 const first='11111111-1111-4111-8111-111111111111';
 const second='22222222-2222-4222-8222-222222222222';
 const calls:string[]=[];
 const timings:ActionPlanTiming[]=[];
 await executeActionPlan('=FOREACH(CartLine, Cart, "c", AS(line), DELETERECORD(CartLine, line.Id))',
  {},timingEvaluator,{
  onTiming:timing=>timings.push(timing),formulaName:'POS.RemoveLines',
  request:async(path,init)=>{
   calls.push((init?.method??'GET')+' '+path.split('?')[0]);
   if(!init)return {records:[{Id:first},{Id:second}],total:2} as never;
   return {record:{}} as never;
  }
 });
 assert.deepEqual(calls,['GET /records/CartLine','DELETE /records/CartLine/'+first,
  'DELETE /records/CartLine/'+second]);
 assert.equal(timings[0].stepCount,2);
 assert.equal(timings[0].executedStepCount,3);
 assert.equal(timings[0].completedActionCount,3);
 assert.equal(timings[0].requestCount,3);
 assert.deepEqual(timings[0].steps.map(step=>step.name),['FOREACH','DELETERECORD','DELETERECORD']);
 assert.deepEqual(timings[0].steps.map(step=>step.requestCount),[1,1,1]);
});

test('baseline: guarded numeric cart adjustment performs GET then PATCH before publishing changes',async()=>{
 const {adjustNumberRecord}=await import('../src/core/pages/PageRuntime/adjustNumberRecord');
 const events:string[]=[];
 const request=async<T>(path:string,options?:RequestInit):Promise<T>=>{
  events.push((options?.method??'GET')+' '+path);
  return {record:row} as T;
 };
 const start=performance.now();
 const changes=await adjustNumberRecord(request,{
  actionType:'AdjustNumber',fieldApiName:'Quantity',deltaSource:'$event.delta',
  incrementFormula:'@Quantity + 1',relatedFieldApiName:'CartSession',
  relatedStateKey:'cartSessionId',stateCollectionKey:'cartItems',
  totalFieldApiName:'LineTotal',unitPriceFieldApiName:'UnitPrice',totalStateKey:'total'
 },{recordId:rowId,delta:1},{cartSessionId:sessionId,cartItems:[row]},objects,'CartLine');
 assert.deepEqual(events,['GET /records/CartLine/'+rowId,'PATCH /records/CartLine/'+rowId]);
 assert.deepEqual(changes.find(change=>change.key==='total')?.value,3.75);
 console.info('optimistic numeric baseline: requests=2 order=GET>PATCH elapsedMockMs='+
  (performance.now()-start).toFixed(2));
});

test('opt-in guarded numeric update publishes before write, then commits without extra requests',async()=>{
 const {adjustNumberRecord}=await import('../src/core/pages/PageRuntime/adjustNumberRecord');
 const {beginOptimisticNumberChange}=await import('../src/core/pages/PageRuntime/optimisticPageNumbers');
 const calls:string[]=[];const updates:Array<{key:string;value:unknown}>=[];
 let release!:()=>void;
 const writePending=new Promise<void>(resolve=>{release=resolve;});
 const state={cartSessionId:sessionId,cartItems:[row],total:2.5};
 const binding={
  actionType:'AdjustNumber' as const,fieldApiName:'Quantity',deltaSource:'$event.delta' as const,
  incrementFormula:'@Quantity + 1',relatedFieldApiName:'CartSession',
  relatedStateKey:'cartSessionId',stateCollectionKey:'cartItems',
  totalFieldApiName:'LineTotal',unitPriceFieldApiName:'UnitPrice',totalStateKey:'total'
 };
 const task=adjustNumberRecord(async<T>(path,init)=>{
  calls.push((init?.method??'GET')+' '+path);
  if(init?.method==='PATCH')await writePending;
  return {record:row} as T;
 },binding,{recordId:rowId,delta:1},state,objects,'CartLine',
  changes=>beginOptimisticNumberChange('page-opt','session-opt','cartItems',state,changes,
   (key,value)=>updates.push({key,value})));
 await new Promise<void>(resolve=>setTimeout(resolve,0));
 assert.deepEqual(calls,['GET /records/CartLine/'+rowId,'PATCH /records/CartLine/'+rowId]);
 assert.equal(updates.find(item=>item.key==='total')?.value,3.75);
 release();
 const result=await task;
 assert.deepEqual(result.map(x=>x.key),['cartItems','total']);
 assert.equal(updates.length,2);
});

test('opt-in numeric adjustment rolls back rejected write and preserves security error and ordering',async()=>{
 const {adjustNumberRecord}=await import('../src/core/pages/PageRuntime/adjustNumberRecord');
 const {beginOptimisticNumberChange}=await import('../src/core/pages/PageRuntime/optimisticPageNumbers');
 const state={cartSessionId:sessionId,cartItems:[row],total:2.5};
 const calls:string[]=[];const updates:Array<{key:string;value:unknown}>=[];
 const config={
  actionType:'AdjustNumber' as const,fieldApiName:'Quantity',deltaSource:'$event.delta' as const,
  incrementFormula:'@Quantity + 1',relatedFieldApiName:'CartSession',
  relatedStateKey:'cartSessionId',stateCollectionKey:'cartItems',
  totalFieldApiName:'LineTotal',unitPriceFieldApiName:'UnitPrice',totalStateKey:'total'
 };
 const req=async<T>(path:string,init?:RequestInit):Promise<T>=>{
  calls.push((init?.method??'GET')+' '+path);
  if(init?.method==='PATCH')throw Error('Permission denied');
  return {record:row} as T;
 };
 const callback=(changes:ReadonlyArray<{key:string;value:unknown}>)=>
  beginOptimisticNumberChange('page-rollback','session-rollback','cartItems',state,changes,
    (key,value)=>updates.push({key,value}));
 await assert.rejects(adjustNumberRecord(req,config,{recordId:rowId,delta:1},state,objects,'CartLine',callback),
  /Permission denied/);
 assert.deepEqual(calls,['GET /records/CartLine/'+rowId,'PATCH /records/CartLine/'+rowId]);
 assert.equal(updates.length,4);
 assert.equal(updates[1].value,3.75);
 assert.equal(updates[3].value,2.5);
 assert.deepEqual(updates[2].value,state.cartItems);
 // Lock is released after rollback.
 const ok=await adjustNumberRecord(async<T>()=>({record:row}) as T,
  config,{recordId:rowId,delta:1},state,objects,'CartLine',callback);
 assert.equal(ok.length,2);
});

test('optimistic state guard rejects concurrent provisional changes to avoid stale rollback',async()=>{
 const {beginOptimisticNumberChange}=await import('../src/core/pages/PageRuntime/optimisticPageNumbers');
 const first=beginOptimisticNumberChange('same','session','cartItems',{total:5},
  [{key:'total',value:6}],()=>{});
 assert.throws(()=>beginOptimisticNumberChange('same','session','cartItems',{total:5},
  [{key:'total',value:7}],()=>{}),/still pending/);
 first.rollback();
 const later=beginOptimisticNumberChange('same','session','cartItems',{total:5},
  [{key:'total',value:7}],()=>{});
 later.commit();
});

test('lazy server expressions do not read unselected IF, CASE and short-circuit branches',async()=>{
 const urls:string[]=[];
 const req=async<T>(path:string):Promise<T>=>{
  urls.push(path);
  if(path.startsWith('/records/Blocked'))throw Error('Denied unused aggregate');
  return {total:5} as T;
 };
 const formulas=[
  '=STATE(result, IF(TRUE, 7, COUNTIFS(Blocked, Status, "New")))',
  '=STATE(result, IF(FALSE, COUNTIFS(Blocked, Status, "New"), 7))',
  '=STATE(result, CASE("yes", "yes", 7, "no", COUNTIFS(Blocked, Status, "New"), 9))',
  '=STATE(result, IFERROR(7, COUNTIFS(Blocked, Status, "New")))',
  '=STATE(result, AND(FALSE, COUNTIFS(Blocked, Status, "New")))',
  '=STATE(result, OR(TRUE, COUNTIFS(Blocked, Status, "New")))',
  '=STATE(result, FALSE AND COUNTIFS(Blocked, Status, "New"))',
  '=STATE(result, TRUE OR COUNTIFS(Blocked, Status, "New"))'
 ];
 for(const formula of formulas){
  urls.length=0;
  const result=await executePageFormulaAction(req,{formula},{},{},[],'');
  assert.equal(result.recordChanged,false);
  assert.deepEqual(urls,[],'unused server call: '+formula);
 }
});
test('IFERROR handles rejected selected server aggregate and evaluates fallback',async()=>{
 const calls:string[]=[];
 const result=await executePageFormulaAction(async<T>(path:string):Promise<T>=>{
  calls.push(path);throw Error('Permission denied');
 },{formula:'=STATE(result, IFERROR(COUNTIFS(Blocked, Status, "New"), 11))'},
 {},{},[],'');
 assert.deepEqual(result.changes,[{key:'result',value:11}]);
 assert.equal(calls.length,1);
});
