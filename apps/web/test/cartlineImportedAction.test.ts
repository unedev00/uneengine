import test from 'node:test';
import assert from 'node:assert/strict';
import {executePageFormulaAction} from '../src/core/pages/PageRuntime/formulaAction';
import {planReadWriteObjects,runSerializedPageAction} from '../src/core/pages/PageRuntime/pageActionCoordinator';

// Exact Formula action from the owner's 56-component CSV import, not an Excel
// approximation. Test both create and update paths without live tenant access.
const formula='=ACTIONS(IF(COUNTIFS(Cart, SessionKey, $session, Status, "Open") = 0, CREATERECORD(Cart, SessionKey, $session, Status, "Open", Name, "Till sale"), ""), GETRECORD(Cart, SessionKey, $session, Status, "Open", AS(cart)), GETRECORD(CartLine, session_key__c, $session, Product, @recordId, Status, "Open", AS(line)), IF(ISBLANK(line.Id), CREATERECORD(CartLine, Cart, cart.Id, Product, @recordId, Name, @record.Name, Quantity, 1, UnitPrice, @record.Price, LineTotal, @record.Price, DiscountAmount, 0, session_key__c, $session, Status, "Open"), UPDATERECORD(CartLine, line.Id, Quantity, line.Quantity + 1, LineTotal, (line.Quantity + 1) * line.UnitPrice, DiscountAmount, IF(line.Quantity + 1 >= 3, ROUND((line.Quantity + 1) * line.UnitPrice * 0.05, 2), 0))), IF(ISBLANK(cart.Id), "", UPDATERECORD(Cart, cart.Id, Subtotal, SUMIFS(CartLine, LineTotal, session_key__c, $session, Status, "Open"), Tax, ROUND(MAX(0, SUMIFS(CartLine, LineTotal, session_key__c, $session, Status, "Open") - SUMIFS(CartLine, DiscountAmount, session_key__c, $session, Status, "Open")) * 0.2, 2), Total, ROUND(MAX(0, SUMIFS(CartLine, LineTotal, session_key__c, $session, Status, "Open") - SUMIFS(CartLine, DiscountAmount, session_key__c, $session, Status, "Open")) * 1.2, 2))))';
const cartId='11111111-1111-4111-8111-111111111111';
const lineId='22222222-2222-4222-8222-222222222222';
const productId='33333333-3333-4333-8333-333333333333';
const objects=[{apiName:'Cart',fields:[]},{apiName:'CartLine',fields:[]}];
test('imported CartLine action must create then update and refresh numeric totals',async()=>{
 const rows:Record<string,Record<string,unknown>[]>={
  Cart:[],CartLine:[]};
 let writes=0,reads=0;
 const request=async<T>(path:string,init?:RequestInit):Promise<T>=>{
  const url=new URL(path,'https://isolated.fixture');
  const match=/^\/records\/(Cart|CartLine)(?:\/([0-9a-f-]+))?$/.exec(url.pathname);
  if(!match)throw Error('Unexpected API request: '+url.pathname);
  const object=match[1],id=match[2],method=(init?.method??'GET').toUpperCase();
  const collection=rows[object];
  if(method==='GET'){
   reads++;
   const filters=JSON.parse(url.searchParams.get('filters')??'[]') as
    Array<{field:string;value:unknown}>;
   const matched=collection.filter(row=>filters.every(filter=>String(row[filter.field]??'')===String(filter.value??'')));
   if(id){
    const found=collection.find(row=>row.Id===id);
    if(!found)throw Error('Record not found: '+id);
    return {record:found} as T;
   }
   const limit=Number(url.searchParams.get('limit')??100);
   return {records:matched.slice(0,limit),total:matched.length} as T;
  }
  const updates=method==='DELETE'?{}:JSON.parse(String(init?.body??'{}')) as Record<string,unknown>;
  if(method==='POST'){
   writes++;
   const record={Id:object==='Cart'?cartId:lineId,...updates};
   collection.push(record);
   return {record:{...record}} as T;
  }
  if(method==='PUT'&&id){
   const record=collection.find(row=>row.Id===id);
   if(!record)throw Error('Cannot update missing '+object);
   writes++;
   Object.assign(record,updates);
   return {record:{...record}} as T;
  }
  throw Error('Unexpected method: '+method);
 };
 const binding={actionType:'Formula',formula};
 const keys=planReadWriteObjects(binding,'Product',objects);
 assert.deepEqual([...new Set(keys)].sort(),['Cart','CartLine']);
 const click=()=>runSerializedPageAction('imported-formula-session',keys,
  ()=>executePageFormulaAction(request,binding,{
   recordId:productId,record:{Id:productId,Name:'Demo product',Price:4.5}
  },{},objects,'Product','session-1'));
 const first=await click();
 assert.equal(first.recordChanged,true,'First click must create Cart and CartLine');
 assert.equal(rows.CartLine.length,1);
 assert.equal(rows.CartLine[0].Quantity,1);
 assert.equal(writes,3,'create Cart, create CartLine, update Cart totals');
 assert.equal(rows.Cart[0].Subtotal,4.5);
 assert.equal(rows.Cart[0].Total,5.4);
 const second=await click();
 assert.equal(second.recordChanged,true,'Second click must update the existing CartLine');
 assert.equal(rows.CartLine[0].Quantity,2);
 assert.equal(writes,5,'second click updates CartLine and Cart');
 assert.equal(rows.Cart[0].Subtotal,9);
 assert.equal(rows.Cart[0].Total,10.8);
 assert.ok(reads>0);
});
