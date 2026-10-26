import assert from 'node:assert/strict';
import {test} from 'node:test';
import {orderTriggeredFlows,validateTriggerDependencies}
 from '../../src/flow-engine/record-trigger-dependencies.js';

test('dependency ordering beats numeric order, preserves stable tie-breaks',()=>{
 const ordered=orderTriggeredFlows([
  {apiName:'SendReceipt',order:10,runAfterFlows:['ChargeCard']},
  {apiName:'LogChange',order:5,runAfterFlows:[]},
  {apiName:'ChargeCard',order:900,runAfterFlows:[]}
 ]);
 assert.deepEqual(ordered.map(flow=>flow.apiName),['LogChange','ChargeCard','SendReceipt']);
});
test('only matching Flows are sorted; absent upstream Flows do not run',()=>{
 const ordered=orderTriggeredFlows([
  {apiName:'FollowUp',order:100,runAfterFlows:['SkippedOnThisUpdate']}
 ]);
 assert.equal(ordered.length,1);
});
test('dependency cycle fails closed before Flow execution',()=>{
 assert.throws(()=>orderTriggeredFlows([
  {apiName:'A',order:1,runAfterFlows:['B']},
  {apiName:'B',order:2,runAfterFlows:['A']}
 ]),/cycle/);
});
test('reject duplicates, self-reference, oversized and unsafe names',()=>{
 for(const bad of [['Self'],['A','A'],['../../'],Array(21).fill('A')])
  assert.throws(()=>validateTriggerDependencies(bad,'Self'),/Run-after Flows/);
 assert.deepEqual(validateTriggerDependencies(undefined,'Self'),[]);
});
