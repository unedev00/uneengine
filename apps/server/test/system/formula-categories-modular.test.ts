import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ACTION_FORMULA_DECLARATIONS,ACTION_FORMULA_FUNCTIONS} from '../../src/expression-engine/FormulaActions.js';
import {DATA_FORMULA_FUNCTIONS} from '../../src/expression-engine/FormulaData.js';
import {UNIVERSAL_FORMULA_FUNCTIONS} from '../../src/expression-engine/FormulaUniversal.js';
import {actionFormulaFunctions,dataFormulaFunctions,formulaCategory,formulaAllowedInContext}
 from '../../src/expression-engine/FormulaCategories.js';
import {getFormulaNamesForEditor} from '../../src/expression-engine/FormulaFunctionRegistry.js';
test('formula families are defined independently without duplicate execution engines',()=>{
 assert.equal(ACTION_FORMULA_DECLARATIONS.length,ACTION_FORMULA_FUNCTIONS.size);
 assert.equal(actionFormulaFunctions.length,ACTION_FORMULA_FUNCTIONS.size);
 assert.equal(dataFormulaFunctions.length,DATA_FORMULA_FUNCTIONS.size);
 for(const name of ACTION_FORMULA_FUNCTIONS){
  assert.equal(formulaCategory(name),'action');
  assert.equal(formulaAllowedInContext(name,'data'),false);
  assert.equal(formulaAllowedInContext(name,'universal'),false);
 }
 for(const name of DATA_FORMULA_FUNCTIONS){
  assert.equal(formulaCategory(name),'data');
  assert.equal(formulaAllowedInContext(name,'data'),true);
  assert.equal(formulaAllowedInContext(name,'universal'),false);
 }
 for(const name of UNIVERSAL_FORMULA_FUNCTIONS){
  assert.equal(formulaCategory(name),'universal');
  assert.equal(formulaAllowedInContext(name,'universal'),true);
 }
 assert(getFormulaNamesForEditor('action').includes('WAIT'));
 assert(getFormulaNamesForEditor('action').includes('CREATEPDF'));
 assert(!getFormulaNamesForEditor('data').includes('WAIT'));
 assert(getFormulaNamesForEditor('universal').includes('IF'));
 assert(getFormulaNamesForEditor('data').includes('TABLE'));
});
