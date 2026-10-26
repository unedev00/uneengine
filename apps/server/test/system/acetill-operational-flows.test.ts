import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import type {FlowRecordQuery} from '../../src/system-files/flow-record-query.js';
import type {RecordEngine} from '../../src/system-files/record-engine.js';
import {createLinkedReturnDocument,loadLinkedReturnDocument} from '../../src/flow-engine/FlowLinkedReturnDocument.js';
import {enforceFlowRecordAttestation} from '../../src/flow-engine/FlowRecordAttestationGuard.js';

const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const original={Id:id(1),InvoiceNumber:'INV-001',InvoiceType:'SALE',Status:'Paid',Customer:id(9)};
const originalLine={Id:id(2),Invoice:id(1),Product:id(3),Name:'Product A',Quantity:3,UnitPrice:5,LineTotal:15};
const config={
 sourceNumber:'InvoiceNumber',sourceType:'InvoiceType',sourceStatus:'Status',
 sourceReference:'ReferenceInvoice',lineParent:'Invoice',lineSource:'OriginalInvoiceLine',
 lineProduct:'Product',quantity:'Quantity',sourceQuantity:'Quantity',unitPrice:'UnitPrice',
 lineTotal:'LineTotal',lineName:'Name',reason:'ReturnReason',cashier:'Cashier',
 total:'Total',typeValue:'SRN',returnStatuses:['Paid']
};
const request={originalInvoiceNumber:'INV-001',reason:'Faulty',requestId:id(7),
 lines:[{originalInvoiceLineId:id(2),quantity:2}]};
function harness(previous:Record<string,unknown>[]=[]){
 const inserts:Array<{object:string;values:Record<string,unknown>}>=[];
 const client={query:async()=>({rows:[],rowCount:1})};
 const db={transaction:async<T>(fn:(client:typeof client)=>Promise<T>)=>fn(client)} as unknown as SqlPersistence;
 const query={find:async(_tenant:string,_user:string,object:string,
  filters:Array<{field:string;value:unknown}>)=>{
  const filter=filters[0];
  if(object==='Invoice'&&filter.field==='InvoiceNumber')return filter.value==='INV-001'?[original]:[];
  if(object==='Invoice'&&filter.field==='Id')return [original];
  if(object==='InvoiceLine'&&filter.field==='Invoice')return [originalLine];
  if(object==='InvoiceLine'&&filter.field==='OriginalInvoiceLine')return previous;
  return [];
 }} as unknown as FlowRecordQuery;
 const records={createInTransaction:async(_c:unknown,_t:string,_u:string,object:string,
  values:Record<string,unknown>)=>{
  inserts.push({object,values:{...values}});
  return object==='Invoice'?id(4):id(5);
 }} as unknown as RecordEngine;
 return {db,query,records,inserts};
}
test('atomic sales return generates negative linked invoice and lines',async()=>{
 const h=harness();
 const result=await createLinkedReturnDocument(h.db,h.records,h.query,id(10),id(11),config,request);
 assert.equal(result.outputs.status,'completed');
 assert.equal(result.outputs.srnInvoiceId,id(4));
 assert.equal(h.inserts.length,2);
 assert.equal(h.inserts[0].values.ReferenceInvoice,id(1));
 assert.equal(h.inserts[0].values.InvoiceType,'SRN');
 assert.equal(h.inserts[0].values.Total,-10);
 assert.equal(h.inserts[1].values.OriginalInvoiceLine,id(2));
 assert.equal(h.inserts[1].values.Quantity,-2);
 assert.equal(h.inserts[1].values.LineTotal,-10);
});
test('return cannot exceed remaining quantity from previous SRNs',async()=>{
 const h=harness([{Id:id(12),Invoice:id(13),OriginalInvoiceLine:id(2),Quantity:-2}]);
 const query={find:async(_t:string,_u:string,object:string,filters:Array<{field:string;value:unknown}>)=>{
  if(object==='Invoice'&&filters[0].field==='Id')return [{Id:id(13),InvoiceType:'SRN',Status:'Issued'}];
  return (h.query.find as (...args:unknown[])=>Promise<unknown[]>)(_t,_u,object,filters);
 }} as unknown as FlowRecordQuery;
 await assert.rejects(createLinkedReturnDocument(h.db,h.records,query,id(10),id(11),config,request),
  /exceeds remaining/);
 assert.equal(h.inserts.length,0);
});
test('lookup returns only the eligible quantity',async()=>{
 const h=harness();
 const result=await loadLinkedReturnDocument(h.query,id(10),id(11),config,{invoiceNumber:'INV-001'});
 assert.equal(result.outputs.records.length,1);
 assert.equal(result.outputs.records[0].ReturnableQuantity,3);
});
test('restricted products require a cashier attestation before Flow proceeds',async()=>{
 const events:string[]=[];
 const db={query:async(sql:string)=>{
  events.push(sql);
  return sql.includes('FROM md_records')?{rows:[{id:id(3),restricted:true}]}:{rows:[]};
 }} as unknown as SqlPersistence;
 const guard={collectionInput:'cartItems',recordObject:'Product',idInputField:'Product',
  restrictedField:'AgeRestricted',attestedInput:'ageVerified',eventName:'AcetillAgeCheckConfirmed'};
 await assert.rejects(enforceFlowRecordAttestation(db,id(10),id(11),guard,
  {cartItems:[{Product:id(3),Quantity:1}],ageVerified:false}),/Check customer ID/);
 await enforceFlowRecordAttestation(db,id(10),id(11),guard,
  {cartItems:[{Product:id(3),Quantity:1}],ageVerified:true});
 assert.equal(events.filter(sql=>sql.includes('INSERT INTO md_security_events')).length,1);
});

test('hold/list/resume Flows seed once, require tenant Objects and preserve existing tenant Flows',async()=>{
 const {seedAcetillCartFlows}=await import('../../src/app-seeders/acetill-cart-flows.js');
 const stored=new Set<string>();
 const writes:Array<{sql:string;params:unknown[]}>=[];
 const client={query:async(sql:string,params:unknown[]=[])=>{
  writes.push({sql,params});
  if(sql.includes('FROM md_object_definitions'))
   return {rows:[{api_name:'Cart'},{api_name:'CartLine'}],rowCount:2};
  if(sql.includes('SELECT 1 FROM md_flow_definitions'))
   return {rows:stored.has(String(params[1]))?[{}]:[],rowCount:stored.has(String(params[1]))?1:0};
  if(sql.includes('INSERT INTO md_flow_definitions')){
   stored.add(String(params[1]));
   return {rows:[{id:id(stored.size+20)}],rowCount:1};
  }
  return {rows:[],rowCount:1};
 }} as unknown as import('pg').PoolClient;
 assert.equal(await seedAcetillCartFlows(client,id(10)),3);
 assert.deepEqual([...stored],['AcetillHoldCart','AcetillListHeldCarts','AcetillResumeHeldCart']);
 assert.equal(await seedAcetillCartFlows(client,id(10)),0);
 assert.equal(writes.filter(x=>x.sql.includes('INSERT INTO md_flow_definitions')).length,3);
});
