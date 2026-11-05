import test from 'node:test';
import assert from 'node:assert/strict';
import {flowActionFormulaTarget,validateFlowActionFormula} from '../src/core/pages/PageRuntime/actionFlowFormula';
import {evaluateFieldExpressionDetailed} from '../src/component-libraries/shared/FieldExpression.js';
import {formulaDollarSuggestions} from '../src/core/builders/PageBuilder/formulaDollarSuggestions';

const flows=[
 {apiName:'ApplePay',label:'Apple Pay',status:'Active',flowType:'Autolaunched Flow'},
 {apiName:'CardMachine',label:'Card machine',status:'Active',flowType:'Screen Flow'},
 {apiName:'OldPay',label:'Old',status:'Inactive',flowType:'Screen Flow'}
];
const payment='IF(AND($state.Total > 500, $state.Mode = "kiosk"), $flow.ApplePay, $flow.CardMachine)';

test('$flow formula: text and AND/OR in conditions, every result must be a Flow or blank',()=>{
 assert.equal(validateFlowActionFormula(payment,flows),null);
 assert.equal(validateFlowActionFormula('=$flow.ApplePay',flows),null);
 assert.equal(validateFlowActionFormula('IF($state.Total > 5, $flow.ApplePay, "")',flows),null);
 assert.match(String(validateFlowActionFormula('IF($state.Total > 5, $flow.ApplePay, "card")',flows)),/Each result must be a \$flow/);
 assert.match(String(validateFlowActionFormula('$flow.OldPay',flows)),/Unknown or inactive Flow: OldPay/);
 assert.match(String(validateFlowActionFormula('$flow.Missing',flows)),/Unknown or inactive Flow/);
});

test('$flow formula picks the Flow at runtime; blank result does nothing',()=>{
 const binding={actionType:'Formula',formula:payment};
 assert.equal(flowActionFormulaTarget(binding,{},{Total:600,Mode:'kiosk'},'s1',flows),'ApplePay');
 assert.equal(flowActionFormulaTarget(binding,{},{Total:100,Mode:'kiosk'},'s1',flows),'CardMachine');
 assert.equal(flowActionFormulaTarget({actionType:'Formula',formula:'IF($state.Total > 5, $flow.ApplePay, "")'},
  {},{Total:1},'s1',flows),'');
 assert.equal(flowActionFormulaTarget({actionType:'Formula',formula:'@state.Total := 1'},{},{},'s1',flows),undefined);
 assert.equal(flowActionFormulaTarget({actionType:'Flow',flowApiName:'ApplePay'},{},{},'s1',flows),undefined);
});

test('$flow exists only in the Action formula bar',()=>{
 assert.match(String(evaluateFieldExpressionDetailed('=$flow.ApplePay',{},{}).error),/only available in the Action formula bar/);
 assert.ok(!formulaDollarSuggestions([],'').some(item=>item.reference.startsWith('$flow.')));
 assert.ok(formulaDollarSuggestions([],'flow',flows).some(item=>item.reference==='FLOW(ApplePay)'));
});

test('FLOW authoring and legacy branches select the same runnable flow',()=>{
 const formula='=IF($state.Total > 5, FLOW(ApplePay), $flow.CardMachine)';
 assert.equal(validateFlowActionFormula(formula,flows),null);
 assert.equal(flowActionFormulaTarget({actionType:'Formula',formula},{},{Total:7},'s',flows),'ApplePay');
 assert.match(String(validateFlowActionFormula('FLOW(OldPay)',flows)),/inactive/);
});
