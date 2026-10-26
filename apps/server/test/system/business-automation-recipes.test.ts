import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildAutomationFlow} from '../../../web/src/core/builders/ObjectManager/businessAutomationRecipes.js';
import {describeRecordTrigger,orderRecordTriggers} from '../../../web/src/core/builders/ObjectManager/flowTriggerExplorer.js';
import {validateFlowDraft} from '../../src/system-files/flow-validation.js';
import {withFlowCapabilities} from './flow-capability-test-helper.js';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import type {RbacEngine} from '../../src/system-files/rbac-engine.js';
const user='00000000-0000-4000-8000-000000000001';
const common={
 objectApi:'Ticket__c',apiName:'TicketAutomation',label:'Ticket Automation',
 trigger:'created' as const,conditions:[]};
test('assignment recipe uses shared record update engine and remains a draft',()=>{
 const flow=buildAutomationFlow({...common,kind:'Assignment',assigneeId:user});
 assert.equal(flow.status,'Draft');
 assert.equal(flow.flowType,'Record-Triggered Flow');
 assert.equal(flow.elements[1].type,'Update Records');
 assert.equal((flow.elements[1].config.fieldValues as Array<{field:string}>)[0].field,'OwnerId');
 assert.equal(flow.elements[1].config.recordId,'{!$Record.Id}');
 assert.throws(()=>buildAutomationFlow({...common,kind:'Assignment',
  trigger:'created-or-updated',assigneeId:user}),/record creation/);
});
test('escalation recipe has an immediate path and a durable scheduled task',()=>{
 const flow=buildAutomationFlow({...common,kind:'Escalation',dueField:'DueDate__c',
  offsetAmount:1,offsetUnit:'Days',taskSubject:'Follow up'});
 assert.equal(flow.elements[1].config.actionType,'Create Task');
 assert.equal(flow.connectors.filter(e=>e.kind==='scheduled').length,1);
 assert.equal(flow.connectors.filter(e=>e.kind==='normal'&&e.from===1).length,1);
 assert.deepEqual(flow.connectors.find(e=>e.kind==='scheduled')?.scheduledPath,{
  timeSourceFieldApiName:'DueDate__c',offsetAmount:1,offsetUnit:'Days'});
 assert.throws(()=>buildAutomationFlow({...common,kind:'Escalation',
  dueField:'DueDate__c',offsetAmount:4000,offsetUnit:'Days',taskSubject:'Follow up'}),/offset/);
});

test('generated assignment and escalation graphs satisfy shared Flow schema',async()=>{
 const db=withFlowCapabilities({query:async(sql:string)=>{
  if(sql.includes('FROM md_object_definitions'))return {rows:[{api_name:'Ticket__c'}]};
  if(sql.includes('FROM md_field_definitions'))return {rows:[{object_api:'Ticket__c',api_name:'DueDate__c',data_type:'date'}]};
  if(sql.includes('FROM md_named_credentials'))return {rows:[{id:user}]};
  return {rows:[]};
 }} as unknown as SqlPersistence);
 const rbac={require:async()=>undefined} as unknown as RbacEngine;
 const recipes=[
  buildAutomationFlow({...common,kind:'Assignment',assigneeId:user}),
  buildAutomationFlow({...common,kind:'Escalation',dueField:'DueDate__c',
   offsetAmount:1,offsetUnit:'Days',taskSubject:'Follow up'})
 ];
 for(const recipe of recipes){
  const checked=await validateFlowDraft(rbac,'tenant',user,recipe.apiName,recipe,db);
  assert.equal(checked.valid,true,checked.errors.join('; '));
 }
});

test('Flow Trigger Explorer reads Start-node phase and execution order',()=>{
 const earlier=buildAutomationFlow({...common,kind:'Assignment',assigneeId:user});
 earlier.status='Active';
 earlier.elements[0].config={...earlier.elements[0].config,
  trigger:'updated',runWhen:'before-save',triggerOrder:25};
 const later=buildAutomationFlow({...common,kind:'Assignment',assigneeId:user});
 later.apiName='LaterFlow';
 later.elements[0].config={...later.elements[0].config,
  trigger:'deleted',runWhen:'after-save',triggerOrder:150};
 const rows=orderRecordTriggers([describeRecordTrigger(later),describeRecordTrigger(earlier)]);
 assert.deepEqual(rows.map(value=>[value.apiName,value.phase,value.order]),[
  ['TicketAutomation','Before save',25],['LaterFlow','After delete',150]
 ]);
 assert.equal(rows[0].status,'Active');
 assert.throws(()=>describeRecordTrigger({...later,
  elements:[{...later.elements[0],config:{trigger:'deleted',runWhen:'before-save'}}]}),
  /Before-delete/);
});
