import assert from 'node:assert/strict';
import {test} from 'node:test';
import {compileActionPlan,executeActionPlan,isActionPlan} from '../../src/expression-engine/ActionFormulas.js';
import {formulaAllowedInContext,formulaCategory} from '../../src/expression-engine/FormulaCategories.js';
import {ScheduledActionService} from '../../src/system-support/scheduled-action-service.js';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import type {Expression} from '../../src/expression-engine/FormulaParser.js';

test('action-only, data-only and universal formula categories are segregated',()=>{
 assert.equal(formulaCategory('CREATEPDF'),'action');
 assert.equal(formulaCategory('WAIT'),'action');
 assert.equal(formulaCategory('TABLE'),'data');
 assert.equal(formulaCategory('SUM'),'universal');
 assert.equal(formulaAllowedInContext('CREATERECORD','data'),false);
 assert.equal(formulaAllowedInContext('WAIT','universal'),false);
 assert.equal(formulaAllowedInContext('TABLE','data'),true);
 assert.equal(formulaAllowedInContext('IF','action'),true);
});
test('CREATEPDF captures a result for later actions and WAIT uses minute/second arguments',()=>{
 const parsed=compileActionPlan('=ACTIONS(CREATEPDF(AnyPrintTemplate, @sale.Id, AS(pdf)), WAIT(600,0), WHATSAPP(MyCredential,"+441234", "Ready", pdf.FileId))');
 assert.deepEqual(parsed.map(step=>step.name),['CREATEPDF','WAIT','WHATSAPP']);
 assert.equal(parsed[0].object,'AnyPrintTemplate');
 assert.equal(parsed[0].alias,'pdf');
 assert.equal(parsed[1].values?.length,2);
 assert.throws(()=>compileActionPlan('=CREATEPDF(TemplateA, @sale.Id, AS(pdf), "extra")'),/extra arguments|requires/);
 assert.throws(()=>compileActionPlan('=WAIT(2)'),/requires minutes and seconds/);
});
test('IF action branches execute only the selected action',async()=>{
 const actions:string[]=[];
 const formula='=IF(FALSE,DELETERECORD(Customer,"11111111-1111-4111-8111-111111111111"),EMAIL(Brevo,"to@example.com","subject","body"))';
 assert.equal(isActionPlan(formula),true);
 const result=await executeActionPlan(formula,{},node=>{
  if(node.kind==='literal')return node.value;
  throw Error('Unexpected action input');
 },{request:async(path,init)=>{actions.push(path+':'+init?.method);return {} as never;}});
 assert.equal(result.recordChanged,false);
 assert.deepEqual(actions,['/action-formulas/communication:POST']);
 assert.equal(isActionPlan('=IF(TRUE,1,2)'),false);
});
test('WAIT persists only remaining actions after confirming previous actions',async()=>{
 const writes:string[]=[];
 const recordId='11111111-1111-4111-8111-111111111111';
 const expression='=ACTIONS(CREATERECORD(Sale, Amount, 25, AS(sale)),WAIT(0,2),EMAIL(Brevo,"to@example.com","subject",sale.Id))';
 const input=(node:Expression,scope:Record<string,unknown>):unknown=>{
  if(node.kind==='literal')return node.value;
  if(node.kind==='reference'&&node.value==='sale.Id')return (scope.sale as {Id:string}).Id;
  throw Error('Unexpected expression');
 };
 let payload:Record<string,unknown>|undefined;
 await executeActionPlan(expression,{state:{total:25}},input,{
  request:async(path,init)=>{
   writes.push(path);
   if(path.startsWith('/records/')&&init?.method==='POST')return {record:{Id:recordId}} as never;
   if(path==='/action-formulas/schedule'){
    payload=JSON.parse(init!.body!) as Record<string,unknown>;
    return {scheduledAction:{id:'job'}} as never;
   }
   throw Error('Unexpected request '+path);
  }
 });
 assert.deepEqual(writes,['/records/Sale','/action-formulas/schedule']);
 assert.equal(payload?.nextStep,2);
 assert.equal(payload?.seconds,2);
 assert.equal((payload?.variables as {sale:{Id:string}}).sale.Id,recordId);
});
test('ScheduledAction schedules through the existing durable SQL worker and records history',async()=>{
 const queries:string[]=[];
 const fake={
  transaction:async<T>(cb:(client:{query:(sql:string,values:unknown[])=>Promise<{rows:unknown[]}>})=>Promise<T>):Promise<T>=>{
   const client={query:async(sql:string,_values:unknown[])=>{
    queries.push(sql);
    if(sql.includes('FROM md_users'))return {rows:[{ok:true}]};
    return {rows:[{id:'11111111-1111-4111-8111-111111111111'}]};
   }};
   return cb(client);
  }
 } as unknown as SqlPersistence;
 const service=new ScheduledActionService(fake);
 const result=await service.schedule('tenant','user',{
  formula:'=ACTIONS(WAIT(600,0),DELETERECORD(Customer,"11111111-1111-4111-8111-111111111111"))',
  nextStep:1,seconds:36000,scope:{state:{key:5}},variables:{},sessionId:'original-session'
 });
 assert.equal(result.status,'Pending');
 assert(queries.some(sql=>sql.includes('INSERT INTO md_durable_jobs')));
 assert(queries.some(sql=>sql.includes('INSERT INTO md_scheduled_actions')));
 assert(queries.some(sql=>sql.includes('INSERT INTO md_scheduled_action_history')));
});
