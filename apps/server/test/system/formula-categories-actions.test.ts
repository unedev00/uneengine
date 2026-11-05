import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Parser} from '../../src/expression-engine/FormulaParser.js';
import {tokenize} from '../../src/expression-engine/FormulaTokenizer.js';
import {formulaFunctionCategory,getFormulaFunctionNames,validateFormulaFunctions}
 from '../../src/expression-engine/FormulaFunctionRegistry.js';
import {waitDelaySeconds} from '../../src/expression-engine/FormulaActions.js';
const check=(source:string,context:'action_formula'|'ribbon_binding'|'flow_formula')=>
  validateFormulaFunctions(new Parser(tokenize(source)).parse(),context);
test('action, data and universal functions have distinct, shared contexts',()=>{
 assert.equal(formulaFunctionCategory('WAIT'),'action');
 assert.equal(formulaFunctionCategory('TABLE'),'data');
 assert.equal(formulaFunctionCategory('SUM'),'universal');
 assert.ok(getFormulaFunctionNames('action_formula').includes('CREATEPDF'));
 assert.ok(getFormulaFunctionNames('action_formula').includes('SUM'));
 assert.ok(!getFormulaFunctionNames('ribbon_binding').includes('EMAIL'));
 assert.ok(!getFormulaFunctionNames('flow_formula').includes('WAIT'));
 check('=SUM(@Amounts)','ribbon_binding');
 check('=IF(TRUE,WAIT(2,0),"")','action_formula');
 check('=ACTIONS(CREATEPDF(Invoice, @Id, AS(pdf)), WAIT(600,0))','action_formula');
 assert.throws(()=>check('=WAIT(1,0)','ribbon_binding'),/not available/);
 assert.throws(()=>check('=EMAIL(Cred, To, Subject, Body)','flow_formula'),/not available/);
});
test('AS is restricted to last argument of capturing actions',()=>{
 check('=CREATERECORD(Contact,Name,"A",AS(contact))','action_formula');
 assert.throws(()=>check('=AS(result)','action_formula'),/AS\(variable\)/);
 assert.throws(()=>check('=ACTIONS(AS(result))','action_formula'),/AS\(variable\)/);
 assert.throws(()=>check('=CREATEPDF(Template,Id,SomeOther)','action_formula'),/third argument/);
 assert.throws(()=>check('=UPDATERECORD(Contact,Id,Name)','action_formula'),/Field, Value pairs|argument count/);
});
test('WAIT duration is bounded and cannot tie up an interactive session',()=>{
 assert.equal(waitDelaySeconds(600,0),36000);
 assert.equal(waitDelaySeconds(0,45),45);
 assert.throws(()=>waitDelaySeconds(0,0),/longer than zero/);
 assert.throws(()=>waitDelaySeconds(-1,5),/whole minutes/);
 assert.throws(()=>waitDelaySeconds(1,60),/whole minutes/);
});
