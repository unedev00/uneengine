import assert from 'node:assert/strict';
import {test} from 'node:test';
import {compileActionPlan,executeActionPlan,isActionPlan,usesRecordCount} from '../../src/expression-engine/ActionFormulas.js';
import {validateFormulaFunctions} from '../../src/expression-engine/FormulaFunctionRegistry.js';
import {Parser,type Expression} from '../../src/expression-engine/FormulaParser.js';
import {tokenize} from '../../src/expression-engine/FormulaTokenizer.js';
import {executeActionFormula} from '../../../web/src/component-libraries/shared/FieldExpression.js';
import {computeFilteredNumericAggregate} from '../../src/system-files/filtered-numeric-aggregate.js';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import type {RbacEngine} from '../../src/system-files/rbac-engine.js';

const cartId='11111111-1111-4111-8111-111111111111';
const id=(n:number)=>'22222222-2222-4222-8222-'+String(n).padStart(12,'0');
type Call={path:string;method:string;body?:unknown};

/** Record API double: filters CartLine rows by eq on Cart and pages 100 at a time. */
function recordApi(lines:Record<string,unknown>[],calls:Call[]){
 return async<T>(path:string,init?:{method:string;body?:string}):Promise<T>=>{
  calls.push({path,method:init?.method??'GET',body:init?.body?JSON.parse(init.body):undefined});
  if(path==='/action-formulas/verify-pin'){
   const body=JSON.parse(init!.body!);
   return {valid:body.pin==='2468'} as T;
  }
  const url=new URL('http://x'+path);
  if(init?.method==='DELETE'){
   const target=decodeURIComponent(url.pathname.split('/').at(-1)!);
   lines.splice(lines.findIndex(row=>row.Id===target),1);
   return {record:{}} as T;
  }
  if(init?.method==='PUT'||init?.method==='POST')return {record:{Id:id(999)}} as T;
  const filters=JSON.parse(url.searchParams.get('filters')??'[]') as {field:string;operator:string;value:string}[];
  const rows=lines.filter(row=>filters.every(filter=>filter.operator==='eq'&&String(row[filter.field])===filter.value));
  const limit=Number(url.searchParams.get('limit')),start=Number(url.searchParams.get('cursor')??0);
  const page=rows.slice(start,start+limit);
  return {records:page,total:rows.length,...(page.length?{nextCursor:String(start+limit)}:{})} as T;
 };
}
const lines=(count:number)=>Array.from({length:count},(_,i)=>
 ({Id:id(i+1),Cart:cartId,Quantity:i%3+1,LineTotal:String((i+1)*1.5),Product:'p'+i}));
const run=(formula:string,api:ReturnType<typeof recordApi>,extra:Record<string,unknown>={},
 services:Record<string,unknown>={})=>
 executeActionFormula(formula,{cartId,...extra},{sessionId:'s1',timeZone:'UTC',now:new Date('2026-11-06T10:00:00Z')},
  {request:api,...services} as never);

test('record aggregates and VERIFYPIN are action-only server functions',()=>{
 for(const source of ['SUMIFS(CartLine, LineTotal, Cart, @cartId)','AVERAGEIFS(CartLine, Quantity)',
  'MINIFS(CartLine, Quantity, Cart, @cartId)','MAXIFS(CartLine, Quantity, Cart, @cartId)','VERIFYPIN($state.manager, "1234")'])
  validateFormulaFunctions(new Parser(tokenize(source)).parse(),'ribbon_binding');
 assert.throws(()=>validateFormulaFunctions(new Parser(tokenize('SUMIFS(CartLine, LineTotal)')).parse(),'formula_field'),/not available/);
 assert.equal(usesRecordCount(new Parser(tokenize('IF(VERIFYPIN("1"), 1, 0)')).parse()),true);
 assert.equal(usesRecordCount(new Parser(tokenize('MAXIFS(CartLine, Quantity) > 2')).parse()),true);
 assert.equal(isActionPlan('=FOREACH(CartLine, Cart, @cartId, AS(line), DELETERECORD(CartLine, line.Id))'),true);
 assert.equal(isActionPlan('=CLOSESCREEN()'),true);
});

test('SUMIFS pages through every matching record and works inside AND/OR/ROUND logic',async()=>{
 const calls:Call[]=[];
 const data=lines(250);
 const api=recordApi(data,calls);
 const result=await run('=ACTIONS(STATE(total, ROUND(SUMIFS(CartLine, LineTotal, Cart, @cartId), 2)),'+
  'STATE(avg, AVERAGEIFS(CartLine, Quantity, Cart, @cartId)),STATE(low, MINIFS(CartLine, Quantity, Cart, @cartId)),'+
  'STATE(high, MAXIFS(CartLine, Quantity, Cart, @cartId)),'+
  'STATE(big, IF(AND(SUMIFS(CartLine, Quantity, Cart, @cartId) > 400, OR(FALSE, COUNTIFS(CartLine, Cart, @cartId) = 250)), "yes", "no")))',api);
 const state=Object.fromEntries(result.changes.map(change=>[change.key,change.value]));
 assert.equal(state.total,Math.round(data.reduce((sum,row)=>sum+Number(row.LineTotal),0)*100)/100);
 assert.equal(state.low,1);
 assert.equal(state.high,3);
 assert.ok(Math.abs(Number(state.avg)-data.reduce((s,r)=>s+Number(r.Quantity),0)/250)<1e-9);
 assert.equal(state.big,'yes');
 assert.ok(calls.some(call=>call.path.includes('cursor=200')),'third page requested');
 const empty=await run('=STATE(none, SUMIFS(CartLine, LineTotal, Cart, "missing"))',recordApi([],[]));
 assert.deepEqual(empty.changes,[{key:'none',value:0}]);
});

test('FOREACH snapshots matching records and runs the body for each one',async()=>{
 const calls:Call[]=[];
 const data=[...lines(3),{Id:id(50),Cart:'other',Quantity:1,LineTotal:'1'}];
 const result=await run('=ACTIONS(FOREACH(CartLine, Cart, @cartId, AS(line), '+
  'IF(line.Quantity > 1, UPDATERECORD(CartLine, line.Id, Note, "multi"), DELETERECORD(CartLine, line.Id))), '+
  'STATE(left, COUNTIFS(CartLine, Cart, @cartId)))',recordApi(data,calls));
 const writes=calls.filter(call=>call.method!=='GET');
 assert.deepEqual(writes.map(call=>call.method),['DELETE','PUT','PUT']);
 assert.deepEqual(writes[1].body,{Note:'multi'});
 assert.equal(data.find(row=>row.Id===id(50))?.Cart,'other','non-matching row untouched');
 assert.deepEqual(result.changes,[{key:'left',value:2}]);
 assert.equal(result.recordChanged,true);
 assert.deepEqual(result.mutatedObjectApiNames,['CartLine']);
});

test('FOREACH validates its shape and rejects WAIT, nesting and oversized loops',async()=>{
 assert.throws(()=>compileActionPlan('=FOREACH(CartLine, Cart, @cartId, DELETERECORD(CartLine, @x))'),/AS\(item\)/);
 assert.throws(()=>compileActionPlan('=FOREACH(CartLine, AS(l), WAIT(1, 0))'),/WAIT cannot run inside FOREACH/);
 assert.throws(()=>compileActionPlan('=FOREACH(CartLine, AS(a), FOREACH(CartLine, AS(b), DELETERECORD(CartLine, b.Id)))'),/cannot be nested/);
 assert.throws(()=>compileActionPlan('=ACTIONS(GETRECORD(Cart, Id, @cartId, AS(line)), FOREACH(CartLine, AS(line), DELETERECORD(CartLine, line.Id)))'),/Duplicate result variable/);
 await assert.rejects(run('=FOREACH(CartLine, Cart, @cartId, AS(line), DELETERECORD(CartLine, line.Id))',recordApi(lines(501),[])),
  /more than 500 records/);
});

test('FOREACH over a TABLE()/COLLECTION() source binds each item',async()=>{
 const seen:unknown[]=[];
 const evaluate=(node:Expression,scope:Record<string,unknown>):unknown=>{
  if(node.kind==='call'&&node.name==='COLLECTION')return {name:'ids',items:[id(1),id(2)]};
  if(node.kind==='reference')return node.value.split('.').reduce<unknown>((v,k)=>(v as Record<string,unknown>)?.[k],scope);
  if(node.kind==='literal')return node.value;
  throw Error('unexpected');
 };
 await executeActionPlan('=FOREACH(COLLECTION("ids", @ids), AS(item), DELETERECORD(CartLine, item.Id))',{},evaluate,{
  request:async<T>(path:string)=>{seen.push(path);return {record:{}} as T;}
 });
 assert.deepEqual(seen,['/records/CartLine/'+id(1),'/records/CartLine/'+id(2)]);
});

test('IF conditions are decided once so a branch cannot flip its own condition',async()=>{
 const calls:Call[]=[];
 const data:Record<string,unknown>[]=[];
 const api=async<T>(path:string,init?:{method:string;body?:string}):Promise<T>=>{
  calls.push({path,method:init?.method??'GET'});
  if(init?.method==='POST'){data.push({Id:id(data.length+1),Cart:cartId});return {record:{Id:id(data.length)}} as T;}
  return {records:data,total:data.length} as T;
 };
 await run('=IF(COUNTIFS(CartLine, Cart, @cartId) = 0, ACTIONS(CREATERECORD(CartLine, Cart, @cartId), CREATERECORD(CartLine, Cart, @cartId)), "")',api as never);
 assert.equal(calls.filter(call=>call.method==='POST').length,2);
 assert.equal(calls.filter(call=>call.method==='GET').length,1);
});

test('VERIFYPIN checks the hash server-side once per user and PIN',async()=>{
 const calls:Call[]=[];
 const api=recordApi([],calls);
 const ok=await run('=IF(VERIFYPIN(@manager, @pin), ACTIONS(STATE(approved, TRUE), STATE(by, @manager)), STATE(approved, FALSE))',
  api,{manager:'33333333-3333-4333-8333-333333333333',pin:'2468'});
 assert.deepEqual(ok.changes,[{key:'approved',value:true},{key:'by',value:'33333333-3333-4333-8333-333333333333'}]);
 const pinCalls=calls.filter(call=>call.path==='/action-formulas/verify-pin');
 assert.equal(pinCalls.length,1);
 assert.deepEqual(pinCalls[0].body,{userId:'33333333-3333-4333-8333-333333333333',pin:'2468'});
 const bad=await run('=IF(VERIFYPIN(@pin), STATE(approved, TRUE), STATE(approved, FALSE))',api,{pin:'0000'});
 assert.deepEqual(bad.changes,[{key:'approved',value:false}]);
 assert.equal(calls.at(-1)?.body&&(calls.at(-1)!.body as {userId?:string}).userId,undefined,'one argument verifies the current user');
});

test('actions read live $component values and CLOSESCREEN reaches the page runtime',async()=>{
 const reads:string[]=[];
 const actions:string[]=[];
 const result=await executeActionFormula('=ACTIONS(STATE(cash, VALUE($component.CashInput.value) * 2), CLOSESCREEN())',{},
  {sessionId:'s1',timeZone:'UTC',now:new Date(),readComponent:(name:string,key:string)=>{reads.push(name+'.'+key);return '12.50';}},
  {request:async()=>({}) as never,runPageAction:async(name:string)=>{actions.push(name);}});
 assert.deepEqual(result.changes,[{key:'cash',value:25}]);
 assert.deepEqual(reads,['CashInput.value']);
 assert.deepEqual(actions,['CLOSESCREEN']);
 assert.throws(()=>compileActionPlan('=CLOSESCREEN(now)'),/no arguments/);
});

test('baseline: 250 matched SUMIFS rows require three serial list calls',async()=>{
 const requests:Call[]=[];
 const result=await run('=STATE(total, SUMIFS(CartLine, LineTotal, Cart, @cartId))',
  recordApi(lines(250),requests));
 assert.equal(result.changes[0].value,47062.5);
 assert.equal(requests.length,3);
 assert.deepEqual(requests.map(call=>Number(new URL('http://x'+call.path).searchParams.get('limit'))),[100,100,100]);
 console.info('SUMIFS baseline: matched=250 requests=3 sequence=GET>GET>GET');
});

test('opted-in SQL SUMIFS returns same number as three legacy list pages in one request',async()=>{
 const data=lines(250);
 const legacy=await run('=STATE(total, SUMIFS(CartLine, LineTotal, Cart, @cartId))',
  recordApi(data,[]));
 const calls:Call[]=[];
 const sql=await run('=STATE(total, SUMIFS(CartLine, LineTotal, Cart, @cartId))',
  async(path,init)=>{
   calls.push({path,method:init?.method??'GET'});
   if(path.includes('/aggregate?'))return {eligible:true,total:250,numericCount:250,
    sum:47062.5,min:1.5,max:375} as never;
   throw Error('SQL mode unexpectedly downloaded records');
  },{},{useSqlAggregates:true});
 assert.deepEqual(sql.changes,legacy.changes);
 assert.equal(calls.length,1,'SQL aggregate must issue one request, no 100-row paging');
 assert.match(calls[0].path,/\/aggregate\?/);
 console.info('SQL SUMIFS: matched=250 requests=3->1 value='+sql.changes[0].value);
});

test('SQL aggregate empty and overflow retain old Formula results and 5000-row error',async()=>{
 const empty=await run('=STATE(total, AVERAGEIFS(CartLine, Quantity))',
  async()=>({eligible:true,total:0,numericCount:0,sum:0,min:0,max:0}) as never,
  {},{useSqlAggregates:true});
 assert.deepEqual(empty.changes,[{key:'total',value:0}]);
 await assert.rejects(run('=STATE(total, SUMIFS(CartLine, Quantity))',
  async()=>({eligible:true,total:5001,numericCount:5001,sum:5001,min:1,max:1}) as never,
  {},{useSqlAggregates:true}),/SUMIFS matches more than 5000 records/);
});

test('SQL aggregate falls back to existing protected row query for ineligible fields',async()=>{
 const calls:string[]=[];
 const api=async<T>(path:string):Promise<T>=>{
  calls.push(path);
  if(path.includes('/aggregate?'))return {eligible:false} as T;
  return {records:[{LineTotal:2.25}],total:1} as T;
 };
 const result=await run('=STATE(total, SUMIFS(CartLine, LineTotal, Cart, @cartId))',
  api,{},{useSqlAggregates:true});
 assert.deepEqual(result.changes,[{key:'total',value:2.25}]);
 assert.equal(calls.length,2);
});

test('filtered SQL aggregate applies object, field and related-lookup RBAC before querying',async()=>{
 const queries:Array<{sql:string;args:unknown[]}>= [];
 const db={query:async(sql:string,args:unknown[])=>{
  queries.push({sql,args});
  return {rows:[{total:'2',numeric_count:'2',numeric_sum:'7.5',
   numeric_min:'2.5',numeric_max:'5.0'}]};
 }} as unknown as Pick<SqlPersistence,'query'>;
 const allowed:string[]=[];
 const rbac={
  require:async(t:string,u:string,res:string,act:string)=>{allowed.push('require '+t+' '+u+' '+res+' '+act);},
  allowed:async(t:string,u:string,res:string,act:string)=>{
   allowed.push('allowed '+t+' '+u+' '+res+' '+act);return true;
  }
 } as unknown as Pick<RbacEngine,'require'|'allowed'>;
 const meta=async(name:string)=>name==='CartLine'?
  [{api_name:'LineTotal',data_type:'number',related_object:null},
   {api_name:'Product',data_type:'reference',related_object:'Product'}]:
  [{api_name:'Category',data_type:'text',related_object:null}];
 const output=await computeFilteredNumericAggregate(db,rbac,meta,
  'tenant-1','user-2','CartLine','LineTotal',
  [{field:'Product.Category',operator:'eq',value:'Drinks'}]);
 assert.deepEqual(output,{eligible:true,total:2,numericCount:2,sum:7.5,min:2.5,max:5});
 assert.equal(queries.length,1);
 assert.match(queries[0].sql,/md_record_access\(\$1,\$3,r\.id,'read'\)/);
 assert.match(queries[0].sql,/md_record_access\(\$1,\$3,rel\.id,'read'\)/);
 assert.ok(allowed.some(s=>s.includes('CartLine.LineTotal read')));
 assert.ok(allowed.some(s=>s.includes('Product.Category read')));
});

test('filtered SQL aggregate with denied object read executes zero SQL requests',async()=>{
 let queryCount=0;
 const db={query:async()=>{queryCount++;return {rows:[]};}} as unknown as Pick<SqlPersistence,'query'>;
 const rbac={require:async()=>{throw Error('Permission denied');},
  allowed:async()=>false} as unknown as Pick<RbacEngine,'require'|'allowed'>;
 await assert.rejects(computeFilteredNumericAggregate(db,rbac,
  async()=>[{api_name:'Total',data_type:'number',related_object:null}],
  'tenant-1','user-no-read','Cart','Total',[]),/Permission denied/);
 assert.equal(queryCount,0);
});
