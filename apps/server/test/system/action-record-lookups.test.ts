import assert from 'node:assert/strict';
import {test} from 'node:test';
import {compileActionPlan,executeActionPlan,isActionPlan,usesRecordCount,splitServerDataActionPlan} from '../../src/expression-engine/ActionFormulas.js';
import {compileRecordFilters,parseRecordFilters} from '../../src/object-engine/QueryBuilder.js';
import {validateFormulaFunctions} from '../../src/expression-engine/FormulaFunctionRegistry.js';
import {Parser,type Expression} from '../../src/expression-engine/FormulaParser.js';
import {tokenize} from '../../src/expression-engine/FormulaTokenizer.js';
import {executeServerDataAction,tenantServerFormulaEnabled} from '../../src/system-support/formula-data-action-runtime.js';
import type {RecordEngine} from '../../src/system-files/record-engine.js';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';

const cartId='11111111-1111-4111-8111-111111111111';
const lineId='22222222-2222-4222-8222-222222222222';

/** Minimal evaluator for the plan tests: literals, references, ISBLANK, comparisons and +. */
function evaluator(node:Expression,scope:Record<string,unknown>,_aliases?:readonly string[],
 state?:Readonly<Record<string,unknown>>):unknown{
 const read=(path:string):unknown=>{
  if(path==='$session.id')return 'session-1';
  if(path.startsWith('$state.'))return state?.[path.slice(7)]??'';
  return path.split('.').reduce<unknown>((value,key)=>
   value&&typeof value==='object'?(value as Record<string,unknown>)[key]:undefined,scope)??'';
 };
 if(node.kind==='literal')return node.value;
 if(node.kind==='reference')return read(node.value);
 if(node.kind==='call'&&node.name==='ISBLANK'){
  const value=evaluator(node.args[0],scope,_aliases,state);
  return value===''||value===null||value===undefined;
 }
 if(node.kind==='binary'){
  const left=evaluator(node.left,scope,_aliases,state),right=evaluator(node.right,scope,_aliases,state);
  if(node.operator==='+')return Number(left)+Number(right);
  if(node.operator==='>')return Number(left)>Number(right);
  if(node.operator==='=')return left===right;
 }
 throw Error('Unexpected expression '+JSON.stringify(node));
}

test('GETRECORD, STATE and COUNTIFS compile as action-plan formulas',()=>{
 assert.equal(isActionPlan('=GETRECORD(Cart, SessionKey, $session.id, AS(cart))'),true);
 assert.equal(isActionPlan('=STATE(paymentMethod, "Cash")'),true);
 const steps=compileActionPlan('=ACTIONS(GETRECORD(CartLine, Cart, @cartId, Product.AgeRestricted, TRUE, AS(line)), STATE(mode, "Cash"))');
 assert.deepEqual(steps.map(step=>step.name),['GETRECORD','STATE']);
 assert.equal(steps[0].alias,'line');
 assert.deepEqual([...steps[0].fields.keys()],['Cart','Product.AgeRestricted']);
 assert.equal(steps[1].object,'mode');
 assert.throws(()=>compileActionPlan('=GETRECORD(Cart, SessionKey, "x")'),/requires AS/);
 assert.throws(()=>compileActionPlan('=GETRECORD(Cart, SessionKey, AS(cart))'),/field and value pairs/);
 assert.throws(()=>compileActionPlan('=GETRECORD(Cart, A.B.C, 1, AS(cart))'),/Invalid GETRECORD field/);
 assert.throws(()=>compileActionPlan('=STATE(mode)'),/STATE requires/);
 const count=new Parser(tokenize('COUNTIFS(CartLine, Cart, "x", Product.AgeRestricted, TRUE)>0')).parse();
 validateFormulaFunctions(count,'ribbon_binding');
 assert.equal(usesRecordCount(count),true);
});

test('GETRECORD finds a record and IF chooses UPDATERECORD over CREATERECORD',async()=>{
 const calls:string[]=[];
 const formula='=ACTIONS(GETRECORD(CartLine, Cart, @cartId, Product, @productId, AS(line)),'+
  'IF(ISBLANK(line.Id), CREATERECORD(CartLine, Cart, @cartId, Quantity, 1), '+
  'UPDATERECORD(CartLine, line.Id, Quantity, line.Quantity+1)))';
 await executeActionPlan(formula,{cartId,productId:'p1'},evaluator,{request:async(path,init)=>{
  calls.push((init?.method??'GET')+' '+decodeURIComponent(path));
  if(!init)return {records:[{Id:lineId,Quantity:2}],total:1} as never;
  return {record:{Id:lineId,...JSON.parse(init.body??'{}')}} as never;
 }});
 assert.equal(calls.length,2);
 assert.match(calls[0],/^GET \/records\/CartLine\?limit=1&filters=/);
 assert.deepEqual(JSON.parse(calls[0].split('filters=')[1]),[
  {field:'Cart',operator:'eq',value:cartId},{field:'Product',operator:'eq',value:'p1'}]);
 assert.equal(calls[1],'PUT /records/CartLine/'+lineId);
});

test('GETRECORD without a match leaves a blank result so the create branch runs',async()=>{
 const methods:string[]=[];
 await executeActionPlan('=ACTIONS(GETRECORD(CartLine, Cart, @cartId, AS(line)),'+
  'IF(ISBLANK(line.Id), CREATERECORD(CartLine, Cart, @cartId, Quantity, 1), DELETERECORD(CartLine, line.Id)))',
 {cartId},evaluator,{request:async(path,init)=>{
  methods.push(init?.method??'GET');
  return (init?{record:{Id:lineId}}:{records:[],total:0}) as never;
 }});
 assert.deepEqual(methods,['GET','POST']);
});

test('COUNTIFS counts records on the server, including one-level lookup paths',async()=>{
 const seen:string[]=[];
 const screens:string[]=[];
 const formula='=IF(COUNTIFS(CartLine, Cart, @cartId, Product.AgeRestricted, TRUE)>0,'+
  'SCREEN(smart_till_age_check, popup), SCREEN(smart_till_payment, popup))';
 await executeActionPlan(formula,{cartId},evaluator,{
  request:async path=>{seen.push(decodeURIComponent(path));return {records:[],total:2} as never;},
  runPageAction:async(name,target)=>{screens.push(name+':'+target);}
 });
 assert.deepEqual(JSON.parse(seen[0].split('filters=')[1]),[
  {field:'Cart',operator:'eq',value:cartId},{field:'Product.AgeRestricted',operator:'eq',value:'true'}]);
 assert.deepEqual(screens,['SCREEN:smart_till_age_check']);
});

test('STATE returns Page State changes and later steps read the new value',async()=>{
 const sent:unknown[]=[];
 const result=await executeActionPlan('=ACTIONS(STATE(paymentMethod, "Cash"),'+
  'EMAIL(Brevo, "to@example.com", "Mode", $state.paymentMethod))',{},evaluator,{
  request:async(_path,init)=>{sent.push(JSON.parse(init!.body!).values);return {} as never;}
 });
 assert.deepEqual(result.changes,[{key:'paymentMethod',value:'Cash'}]);
 assert.deepEqual(sent,[['to@example.com','Mode','Cash']]);
});

test('record filters accept one-level lookup paths through the related record',()=>{
 assert.deepEqual(parseRecordFilters('[{"field":"Product.AgeRestricted","operator":"eq","value":"true"}]'),
  [{field:'Product.AgeRestricted',operator:'eq',value:'true'}]);
 assert.throws(()=>parseRecordFilters('[{"field":"A.B.C","operator":"eq","value":"x"}]'),/Invalid record filter/);
 const fields=new Map([
  ['Cart',{api_name:'Cart',data_type:'reference'}],
  ['Product.AgeRestricted',{api_name:'AgeRestricted',data_type:'checkbox',
   via:{lookupField:'Product',access:"md_record_access($1,$3,rel.id,'read')"}}],
 ]);
 const compiled=compileRecordFilters([
  {field:'Cart',operator:'eq',value:cartId},
  {field:'Product.AgeRestricted',operator:'eq',value:'true'},
 ],undefined,fields,4);
 assert.deepEqual(compiled.parameters,['Cart',cartId,'Product','AgeRestricted','true']);
 assert.match(compiled.predicate,/JOIN md_records rel/);
 assert.match(compiled.predicate,/lk\.field_api=\$6/);
 assert.match(compiled.predicate,/md_record_access\(\$1,\$3,rel\.id,'read'\)/);
 assert.match(compiled.predicate,/fv\.record_id=rel\.id AND fv\.object_api=rel\.object_api AND fv\.field_api=\$7/);
 assert.throws(()=>compileRecordFilters([{field:'Product.Name',operator:'eq',value:'x'}],undefined,
  new Map([['Cart',{api_name:'Cart',data_type:'reference'}]]),4),/Invalid list field/);
});


test('baseline: two data steps run as two distinct browser-network requests',async()=>{
 const calls:string[]=[];
 await executeActionPlan('=ACTIONS(GETRECORD(Cart, SessionKey, "s", AS(cart)), '+
  'UPDATERECORD(Cart, cart.Id, Total, 3), STATE(done, TRUE))',
  {},evaluator,{request:async(path,init)=>{
   calls.push((init?.method??'GET')+' '+path.split('?')[0]);
   return (init?{record:{Id:cartId}}:{records:[{Id:cartId}],total:1}) as never;
  }});
 assert.deepEqual(calls,['GET /records/Cart','PUT /records/Cart/'+cartId]);
 console.info('server-plan baseline: data step API requests=2, serialized GET>PUT');
});

test('server-only prefix is conservative and browser-only suffix preserves order',()=>{
 const split=splitServerDataActionPlan('=ACTIONS(GETRECORD(Cart, SessionKey, "s", AS(cart)), '+
  'UPDATERECORD(Cart, cart.Id, Total, 3), STATE(done, TRUE))');
 assert.deepEqual(split,{dataSteps:2,totalSteps:3});
 assert.equal(splitServerDataActionPlan('=ACTIONS(PRINT(Receipt, @cartId), UPDATERECORD(Cart, @cartId, Total, 1))'),null);
 assert.equal(splitServerDataActionPlan('=ACTIONS(CREATERECORD(Item, Name, "x"), '+
  'STATE(done, TRUE), UPDATERECORD(Cart, @cartId, Total, 1))'),null);
 assert.equal(splitServerDataActionPlan('=ACTIONS(STATE(done, TRUE), UPDATERECORD(Cart, @cartId, Total, 1))'),null);
 assert.equal(splitServerDataActionPlan('=ACTIONS(CREATERECORD(Item, Name, $component.Input.value), STATE(done, TRUE))'),null);
});

test('server transactional data prefix takes one browser call and retains alias values for ordered suffix',async()=>{
 const calls:string[]=[];
 const db={transaction:async<T>(run:()=>Promise<T>)=>run()} as unknown as Pick<SqlPersistence,'transaction'|'query'>;
 const records={
  list:async(_tenant:string,_user:string,object:string)=>{
   calls.push('GET '+object);
   return {records:[{Id:cartId}],total:1};
  },
  get:async(_tenant:string,_user:string,object:string,id:string)=>{
   calls.push('GETBYID '+object+' '+id);
   return {Id:id,Total:3};
  },
  update:async(_tenant:string,_user:string,object:string,id:string)=>{
   calls.push('PUT '+object+' '+id);
  },
  create:async()=>cartId,remove:async()=>undefined
 } as unknown as Pick<RecordEngine,'list'|'get'|'create'|'update'|'remove'>;
 const formula='=ACTIONS(GETRECORD(Cart, SessionKey, "s", AS(cart)), '+
  'UPDATERECORD(Cart, cart.Id, Total, 3), STATE(done, TRUE))';
 const actor={tenant_id:'tenant-a',user_id:'user-a'};
 let browserRequests=0;
 browserRequests++;
 const server=await executeServerDataAction(db,records,actor,formula,{},2);
 assert.equal(server.supported,true);
 assert.equal(server.error,undefined);
 assert.equal(server.completedActionCount,2);
 assert.deepEqual(server.mutatedObjectApiNames,['Cart']);
 assert.deepEqual(calls,['GET Cart','PUT Cart '+cartId]);
 const suffix=await executeActionPlan(formula,{},evaluator,{
  request:async()=>{throw Error('Browser suffix must not issue Record API calls');},
  planWindow:{start:2,end:3,variables:server.variables,completedBefore:server.completedActionCount}
 });
 assert.deepEqual(suffix.changes,[{key:'done',value:true}]);
 assert.equal(browserRequests,1);
});

test('server execution denies missing actor record permission without a second write',async()=>{
 const calls:string[]=[];
 const db={transaction:async<T>(run:()=>Promise<T>)=>run()} as unknown as Pick<SqlPersistence,'transaction'|'query'>;
 const records={
  list:async()=>({records:[],total:0}),
  get:async()=>({Id:cartId}),
  create:async(_t:string,_u:string,o:string)=>{calls.push('CREATE '+o);return cartId;},
  update:async(_t:string,_u:string,o:string)=>{calls.push('DENIED UPDATE '+o);throw Error('Permission denied');},
  remove:async()=>undefined
 } as unknown as Pick<RecordEngine,'list'|'get'|'create'|'update'|'remove'>;
 const formula='=ACTIONS(CREATERECORD(Item, Name, "x", AS(row)),UPDATERECORD(Item, row.Id, Name, "y"))';
 const output=await executeServerDataAction(db,records,{tenant_id:'t1',user_id:'u-without-update'},formula,{},2);
 assert.match(output.error??'',/UPDATERECORD failed after 1 confirmed action\(s\). Permission denied/);
 assert.deepEqual(calls,['CREATE Item','DENIED UPDATE Item']);
});

test('tenant server executor is default-off and tenant-isolated',async()=>{
 const tenants:string[]=[];
 const db={query:async(_sql:string,args:unknown[])=>{
  tenants.push(String(args[0]));
  return {rows:args[0]==='enabled-tenant'?[{enabled:true}]:[]};
 }} as unknown as Pick<SqlPersistence,'query'>;
 assert.equal(await tenantServerFormulaEnabled(db,'enabled-tenant'),true);
 assert.equal(await tenantServerFormulaEnabled(db,'disabled-tenant'),false);
 assert.deepEqual(tenants,['enabled-tenant','disabled-tenant']);
});

test('server data executor rejects unsupported split before any RecordEngine operation',async()=>{
 let operations=0;
 const db={transaction:async<T>(run:()=>Promise<T>)=>run()} as unknown as Pick<SqlPersistence,'transaction'|'query'>;
 const records={list:async()=>{operations++;return {records:[],total:0};},
  create:async()=>{operations++;return cartId;},
  get:async()=>{operations++;return {Id:cartId};},
  update:async()=>{operations++;},remove:async()=>{operations++;}
 } as unknown as Pick<RecordEngine,'list'|'get'|'create'|'update'|'remove'>;
 await assert.rejects(executeServerDataAction(db,records,{tenant_id:'t1',user_id:'u1'},
  '=ACTIONS(PRINT(Receipt, @cartId),UPDATERECORD(Cart, @cartId, Total, 1))',
  {cartId},1),/Invalid Formula data segment/);
 assert.equal(operations,0);
});
