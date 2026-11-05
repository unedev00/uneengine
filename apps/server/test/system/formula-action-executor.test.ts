import assert from 'node:assert/strict';
import {test} from 'node:test';
import {FormulaActionExecutor,actionExpressionText}
 from '../../src/system-files/formula-action-executor.js';
import {Parser} from '../../src/expression-engine/FormulaParser.js';
import {tokenize} from '../../src/expression-engine/FormulaTokenizer.js';

test('Formula AST serializes to a bounded canonical expression',()=>{
 const node=new Parser(tokenize('=ACTIONS(FLOW(SendReceipt),WAIT(600,0))')).parse();
 assert.equal(actionExpressionText(node),'ACTIONS(FLOW(SendReceipt),WAIT(600,0))');
});
test('ACTIONS waits durably after earlier side effects without browser timers',async()=>{
 const calls:string[]=[];
 const records={create:async()=>{calls.push('create');return 'record-123';},
  get:async()=>({Id:'record-123',InvoiceNumber:'INV-22'})};
 const flows={execute:async()=>{calls.push('flow');return {status:'completed'};}};
 const scheduled={schedule:async(input:any)=>{
  calls.push('schedule');
  assert.equal(input.minutes,600);
  assert.equal(input.remainingSteps[0],'FLOW(Notify)');
  assert.equal(input.variables['sale.Id'],'record-123');
  return {id:'scheduled-1'};
 }};
 const runtime=new FormulaActionExecutor(records as any,flows as any,scheduled as any);
 const result=await runtime.execute(
  '=ACTIONS(CREATERECORD(Sale,Amount,100,AS(sale)),WAIT(600,0),FLOW(Notify))',
  {tenantId:'tenant',userId:'user',sessionId:'session'});
 assert.deepEqual(calls,['create','schedule']);
 assert.equal(result.scheduledActionId,'scheduled-1');
 assert.equal(result.completed,1);
});
test('Action IF executes only the chosen result, not both branches',async()=>{
 const calls:string[]=[];
 const runtime=new FormulaActionExecutor({} as any,{
  execute:async(_t:string,name:string)=>{calls.push(name);}
 } as any,{} as any);
 await runtime.execute('IF(TRUE,FLOW(Yes),FLOW(No))',
  {tenantId:'tenant',userId:'user',sessionId:'session'});
 assert.deepEqual(calls,['Yes']);
});
test('CREATEPDF never fabricates an attachment when the Print Template renderer is absent',async()=>{
 const runtime=new FormulaActionExecutor({} as any,{} as any,{} as any);
 await assert.rejects(runtime.execute('CREATEPDF(DocumentTemplate, RecordId, AS(pdf))',
  {tenantId:'tenant',userId:'user',sessionId:'session'}),/renderer is not available/);
});
