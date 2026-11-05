import test from 'node:test';
import assert from 'node:assert/strict';
import {executePageFormulaAction,parseActionFormulaAssignment,resolveActionFormulaValue} from '../src/core/pages/PageRuntime/formulaAction';

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
