import assert from 'node:assert/strict';
import test from 'node:test';
import {evaluateFieldExpression} from '../src/component-libraries/shared/OneFieldExpression.js';

test('record expressions combine fields and quoted text without JavaScript evaluation',()=>{
  const record={CurrencySymbol:'£',Price:1.25,Name:'Tea',Description:null};
  assert.equal(evaluateFieldExpression('@CurrencySymbol & " " & @Price',record),'£ 1.25');
  assert.equal(evaluateFieldExpression('@Name',record),'Tea');
  assert.equal(evaluateFieldExpression('@Description & "!"',record),'!');
  assert.equal(evaluateFieldExpression('"He said ""yes"""',record),'He said "yes"');
});
test('record expressions reject code, unsafe keys and malformed syntax',()=>{
  const row={Name:'Tea',constructor:'should-not-resolve'};
  assert.equal(evaluateFieldExpression('@Name + "!"',row),'');
  assert.equal(evaluateFieldExpression('process.exit(1)',row),'');
  assert.equal(evaluateFieldExpression('@__proto__',row),'');
  assert.equal(evaluateFieldExpression('@Name & ',row),'');
  assert.equal(evaluateFieldExpression('@Name',{}),'');
  assert.equal(evaluateFieldExpression('@Name & @Name & @Name',row),'TeaTeaTea');
});
