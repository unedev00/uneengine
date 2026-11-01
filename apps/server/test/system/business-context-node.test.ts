import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {FlowNodeContext} from '../../src/system-files/nodes/NodeContext.js';
import {executeBusinessContextNode} from '../../src/system-files/nodes/BusinessContextNode.js';

const tenant='11111111-1111-4111-8111-111111111111';
const actor='22222222-2222-4222-8222-222222222222';
const order='33333333-3333-4333-8333-333333333333';
function fixture(kind:'Get Context'|'Set Context'|'Clear Context',
 opts:{recordFound?:boolean;authorization?:boolean}={}){
 const statements:Array<{query:string;params:unknown[]}>=[],recordGets:Array<unknown[]>=[];
 const client={query:async(query:string,params:unknown[]=[])=>{
  statements.push({query,params});
  if(query.includes('FROM md_context_definitions'))return {rows:[{object_api:'Order'}]};
  if(query.includes('FROM md_user_context_selections')&&query.trim().startsWith('SELECT'))
   return {rows:opts.recordFound===false?[]:[{record_id:order}]};
  return {rows:[]};
 }};
 const records={get:async(...args:unknown[])=>{
  recordGets.push(args);
  if(opts.authorization===false)throw Error('Permission denied');
  return {Id:order};
 }};
 const vars:Record<string,unknown>={CurrentOrderId:null,OrderId:order};
 const ctx={tenantId:tenant,userId:actor,client,records,vars,
  node:{id:7,type:kind,config:{contextApiName:'CurrentOrder',outputVariable:'CurrentOrderId',recordId:'@OrderId'}},
  evaluate:(source:unknown)=>source==='@OrderId'?order:source
 } as unknown as FlowNodeContext;
 return {ctx,statements,recordGets,vars};
}
test('Context Get resolves tenant and actor-scoped selection and checks record read rights',async()=>{
 const f=fixture('Get Context');
 const result=await executeBusinessContextNode(f.ctx);
 assert.equal(result.handled,true);
 assert.equal(f.vars.CurrentOrderId,order);
 assert.equal(f.recordGets.length,1);
 assert.deepEqual(f.recordGets[0].slice(0,4),[tenant,actor,'Order',order]);
 assert.ok(f.statements.every(q=>q.params[0]===tenant));
 const select=f.statements.find(q=>q.query.includes('FROM md_user_context_selections'));
 assert.deepEqual(select?.params,[tenant,actor,'CurrentOrder']);
});
test('Get Context with no current record returns null',async()=>{
 const f=fixture('Get Context',{recordFound:false});
 await executeBusinessContextNode(f.ctx);
 assert.equal(f.vars.CurrentOrderId,null);
 assert.equal(f.recordGets.length,0);
});
test('Set Context rejects inaccessible records before any SQL mutation',async()=>{
 const f=fixture('Set Context',{authorization:false});
 await assert.rejects(()=>executeBusinessContextNode(f.ctx),/Permission denied/);
 assert.ok(!f.statements.some(q=>q.query.includes('INSERT INTO md_user_context_selections')));
});
test('Set Context records authorized actor selection and Clear only affects same actor',async()=>{
 const f=fixture('Set Context');
 await executeBusinessContextNode(f.ctx);
 const insert=f.statements.find(q=>q.query.includes('INSERT INTO md_user_context_selections'));
 assert.deepEqual(insert?.params,[tenant,actor,'CurrentOrder',order]);
 const g=fixture('Clear Context');
 await executeBusinessContextNode(g.ctx);
 const del=g.statements.find(q=>q.query.includes('DELETE FROM md_user_context_selections'));
 assert.deepEqual(del?.params,[tenant,actor,'CurrentOrder']);
});
test('Context nodes fail closed on invalid definition and record IDs',async()=>{
 const f=fixture('Set Context');
 f.ctx.node.config.contextApiName='!invalid';
 await assert.rejects(()=>executeBusinessContextNode(f.ctx),/Context definition/);
 f.ctx.node.config.contextApiName='CurrentOrder';
 f.ctx.evaluate=()=>'not-a-uuid';
 await assert.rejects(()=>executeBusinessContextNode(f.ctx),/Record Id/);
});
