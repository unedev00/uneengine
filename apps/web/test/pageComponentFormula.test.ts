import assert from 'node:assert/strict';
import test from 'node:test';
import {componentReaderKey,evaluateFieldExpressionDetailed} from '../src/component-libraries/shared/FieldExpression.js';
import {resolveActionFormulaValue} from '../src/core/pages/PageRuntime/formulaAction';
import {compileRecordFilterFormula} from '../src/core/pages/PageRuntime/recordFilterFormula';
import {formulaSignatureAt} from '../src/core/builders/PageBuilder/formulaSignatureHelp';

test('a product image reads a separate component, leaving record field names available',()=>{
 const formula='=IF($component.userCard.text = "Andy", "", @Image)';
 let user='Andy';
 const readComponent=(name:string,key:string)=>{
  assert.equal(name,'userCard');assert.equal(key,'text');return user;
 };
 const record={Image:'product.png',component:'field value'};
 const run=()=>evaluateFieldExpressionDetailed(formula,record,{readComponent});
 assert.deepEqual(run(),{value:''});
 user='Sarah';
 assert.deepEqual(run(),{value:'product.png'});
 assert.deepEqual(evaluateFieldExpressionDetailed('@component',record,{readComponent}),{value:'field value'});
 assert.deepEqual(evaluateFieldExpressionDetailed('"$component.userCard.text"',record),{value:'$component.userCard.text'});
 assert.equal(formulaSignatureAt(formula,formula.indexOf('@Image'))?.argument,2);
});

test('page actions and bounded record queries consume the same page-local value',()=>{
 const state={[componentReaderKey]:()=> 'Andy'};
 assert.equal(resolveActionFormulaValue('$component.userCard.text',{},state),'Andy');
 const result=compileRecordFilterFormula('@Name = $component.userCard.text',
  [{apiName:'Name',dataType:'Text'}] as never,state);
 assert.deepEqual(result.filters,[{field:'Name',operator:'eq',value:'Andy'}]);
 assert.ok(evaluateFieldExpressionDetailed('$component.userCard.text',{}).error);
});
