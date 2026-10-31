import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {PoolClient} from 'pg';
import {copilotPosGraphs,seedAcetillCopilotPosFlows} from '../../src/app-seeders/acetill-copilot-pos-flows.js';
import {copilotTillLayout} from '../../src/app-seeders/acetill-copilot-pos-page.js';

const required=['AcetillCopilotAddProduct','AcetillCopilotReadCart','AcetillCopilotChangeQuantity'];
test('Copilot POS installs only metadata-driven reuse of existing shared runtimes',()=>{
 assert.deepEqual(copilotPosGraphs.map(g=>g.apiName),required);
 for(const g of copilotPosGraphs){
  assert.equal(g.flowType,'Autolaunched Flow');
  assert.equal(g.appApiName,'Acetill');
  assert.equal(g.startConfig.executionContext,'User');
  const ids=new Set(g.elements.map(n=>n.id));
  assert.equal(ids.size,g.elements.length);
  assert.ok(g.elements.some(n=>n.type==='Start'));
  assert.ok(g.elements.some(n=>n.type==='End'));
  assert.ok(g.elements.every(n=>!['HTTP Callout','Apex'].includes(n.type)));
  for(const edge of g.connectors){
   assert.ok(ids.has(edge.from),g.apiName+' missing source '+edge.from);
   assert.ok(ids.has(edge.to),g.apiName+' missing destination '+edge.to);
  }
 }
 const add=copilotPosGraphs[0];
 assert.ok(add.elements.some(n=>n.type==='Get Records'&&n.config.object==='Product'));
 assert.ok(add.elements.some(n=>n.type==='Create Records'&&n.config.object==='CartLine'));
 const change=copilotPosGraphs[2];
 assert.ok(change.elements.some(n=>n.type==='Get Records'&&n.config.object==='CartLine'));
 assert.ok(change.elements.some(n=>n.type==='Delete Records'));
 assert.ok(change.elements.some(n=>n.type==='Update Records'));
});
test('Page Blueprint uses only shared Smart Components and Flow actions, not hardcoded checkout',()=>{
 assert.equal(new Set(copilotTillLayout.map(x=>x.id)).size,copilotTillLayout.length);
 for(const block of copilotTillLayout){
  assert.ok(block.type.startsWith('Custom:smart_'));
  assert.ok(block.position.width>0);
  for(const action of Object.values(block.properties.actionFlows??{})){
   if(!action||typeof action!=='object')continue;
   const rule=action as Record<string,unknown>;
   assert.ok(['Flow','PageState','Navigate','SetFilter'].includes(String(rule.actionType)));
   if(rule.actionType==='Flow')assert.match(String(rule.flowApiName),/^Acetill[A-Za-z0-9]+$/);
  }
 }
 const products=copilotTillLayout.find(x=>x.id==='copilot-pos-products');
 const cart=copilotTillLayout.find(x=>x.id==='copilot-pos-cart');
 assert.equal(products?.properties.objectApiName,'Product');
 assert.equal(cart?.properties.objectApiName,'CartLine');
 assert.equal(cart?.properties.relatedFilterKey,'cartSessionId');
 assert.equal(cart?.properties.relatedFieldApiName,'CartSession');
 assert.equal(cart?.properties.totalValue,'$state.total');
});
test('Copilot till Flow seeder is idempotent and never replaces authored metadata',async()=>{
 const saved=new Set<string>(),queries:string[]=[];
 const fields=[
  ['Product','Name'],['Product','Price'],['Product','Active'],
  ['CartSession','SessionKey'],['CartSession','Name'],['CartSession','Status'],
  ['CartLine','CartSession'],['CartLine','Product'],['CartLine','Name'],
  ['CartLine','Quantity'],['CartLine','UnitPrice'],
  ['CartLine','OriginalUnitPrice'],['CartLine','LineTotal']
 ];
 const client={query:async(sql:string,args:unknown[]=[])=>{
  queries.push(sql);
  if(sql.includes('FROM md_field_definitions'))
   return {rows:fields.map(([object_api,api_name])=>({object_api,api_name})),rowCount:fields.length};
  if(sql.includes('SELECT 1 FROM md_flow_definitions')){
   const present=saved.has(String(args[1]));
   return {rows:present?[{}]:[],rowCount:present?1:0};
  }
  if(sql.includes('INSERT INTO md_flow_definitions')){
   saved.add(String(args[1]));
   return {rows:[{id:'00000000-0000-4000-8000-'+String(saved.size).padStart(12,'0')}],rowCount:1};
  }
  return {rows:[],rowCount:1};
 }} as unknown as PoolClient;
 assert.equal(await seedAcetillCopilotPosFlows(client,'tenant-1'),3);
 assert.equal(await seedAcetillCopilotPosFlows(client,'tenant-1'),0);
 assert.equal(queries.filter(q=>q.includes('INSERT INTO md_flow_definitions')).length,3);
 assert.equal(queries.some(q=>q.includes('DELETE FROM md_flow')||q.includes('UPDATE md_flow')),false);
});
