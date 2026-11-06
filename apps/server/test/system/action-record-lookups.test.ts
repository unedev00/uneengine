import assert from 'node:assert/strict';
import {test} from 'node:test';
import {compileActionPlan,executeActionPlan,isActionPlan,usesRecordCount} from '../../src/expression-engine/ActionFormulas.js';
import {compileRecordFilters,parseRecordFilters} from '../../src/object-engine/QueryBuilder.js';
import {validateFormulaFunctions} from '../../src/expression-engine/FormulaFunctionRegistry.js';
import {Parser,type Expression} from '../../src/expression-engine/FormulaParser.js';
import {tokenize} from '../../src/expression-engine/FormulaTokenizer.js';

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


test('memoization: identical cart lookups make one awaited GET',async()=>{
 const paths:string[]=[];
 const source='=ACTIONS(GETRECORD(Cart, SessionKey, "pos", AS(cartA)), GETRECORD(Cart, SessionKey, "pos", AS(cartB)), STATE(done, TRUE))';
 await executeActionPlan(source,{},evaluator,{request:async(path,init)=>{
  paths.push((init?.method??'GET')+' '+path);
  return {records:[{Id:cartId}],total:1} as never;
 }});
 assert.equal(paths.length,1,'identical cart reads must be coalesced inside one plan');
 console.info('Formula memo after: GETs=1 uniquePaths=1');
});

test('GET memoization invalidates only the object written, retaining unrelated cached reads',async()=>{
 const calls:string[]=[];
 const formula='=ACTIONS(GETRECORD(Cart, SessionKey, "s", AS(c1)), GETRECORD(Product, Name, "x", AS(p1)), '+
 'UPDATERECORD(Cart, @cartId, Total, 2), GETRECORD(Cart, SessionKey, "s", AS(c2)), '+
 'GETRECORD(Product, Name, "x", AS(p2)))';
 await executeActionPlan(formula,{cartId},evaluator,{request:async(path,init)=>{
  calls.push((init?.method??'GET')+' '+path.split('?')[0]);
  return (!init?{records:[{Id:cartId}],total:1}:{record:{Id:cartId}}) as never;
 }});
 assert.deepEqual(calls,['GET /records/Cart','GET /records/Product','PUT /records/Cart/'+cartId,
  'GET /records/Cart']);
});

test('independent aggregate field inputs begin their requests before either finishes',async()=>{
 const calls:string[]=[];
 const waiting:Array<(value:unknown)=>void>=[];
 const formula='=CREATERECORD(Summary, Amount, SUMIFS(CartLine, LineTotal, Cart, @cartId), '+
  'Lines, COUNTIFS(CartLine, Cart, @cartId))';
 const run=executeActionPlan(formula,{cartId},evaluator,{request:async(path,init)=>{
  if(init){calls.push('POST /records/Summary');return {record:{Id:lineId}} as never;}
  calls.push('GET '+path.split('?')[0]+'?'+new URLSearchParams(path.split('?')[1]).get('limit'));
  return await new Promise(resolve=>waiting.push(resolve as (value:unknown)=>void)) as never;
 }});
 for(let n=0;n<16&&waiting.length<2;n++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(waiting.length,2,'independent aggregate queries must start concurrently');
 waiting[0]({records:[{LineTotal:5}],total:1});
 waiting[1]({records:[{LineTotal:5}],total:1});
 await run;
 assert.equal(calls.length,3);
 assert.deepEqual(calls.slice(0,2),['GET /records/CartLine?100','GET /records/CartLine?1']);
 assert.equal(calls[2],'POST /records/Summary');
});

test('write response with all future alias fields avoids unnecessary GET',async()=>{
 const calls:string[]=[];
 await executeActionPlan('=ACTIONS(CREATERECORD(Item, Name, "New", AS(item)), '+
  'UPDATERECORD(Item, item.Id, Name, item.Name))',{},evaluator,{request:async(path,init)=>{
  calls.push((init?.method??'GET')+' '+path.split('?')[0]);
  return {record:{Id:cartId,Name:'Final'}} as never;
 }});
 assert.deepEqual(calls,['POST /records/Item','PUT /records/Item/'+cartId]);
});

test('missing future alias field retains guarded GET fallback and permission errors',async()=>{
 const calls:string[]=[];
 await assert.rejects(executeActionPlan('=ACTIONS(CREATERECORD(Item, Name, "New", AS(item)), '+
  'UPDATERECORD(Item, item.Id, Name, item.Name))',{},evaluator,{request:async(path,init)=>{
  calls.push((init?.method??'GET')+' '+path.split('?')[0]);
  if(!init)throw Error('Permission denied');
  return {record:{Id:cartId}} as never;
 }}),/UPDATERECORD failed after 1 confirmed action\(s\). Permission denied/);
 assert.deepEqual(calls,['POST /records/Item','GET /records/Item/'+cartId]);
});
