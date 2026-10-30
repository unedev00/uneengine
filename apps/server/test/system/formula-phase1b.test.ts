import assert from 'node:assert/strict';
import {test} from 'node:test';
import {evaluateFlowFormula,inferFlowFormulaType} from '../../src/system-files/flow-formula-runtime.js';
import type {FormulaExpressionContext} from '../../src/expression-engine/FormulaFunctionRegistry.js';
import {evaluateFieldExpressionDetailed} from '../../../web/src/component-libraries/shared/FieldExpression.js';

type Fixture={
  name:string;
  expression:string;
  expected:unknown;
  nullExpression:string;
  nullExpected?:unknown;
  nullError?:boolean;
};

const fixtures:Fixture[]=[
  {name:'IF',expression:'IF(TRUE, "yes", 1 / 0)',expected:'yes',nullExpression:'IF(NULL, "yes", "no")',nullExpected:'no'},
  {name:'IFERROR',expression:'IFERROR(1 / 0, "fallback")',expected:'fallback',nullExpression:'IFERROR(NULL, "fallback")',nullExpected:null},
  {name:'CASE',expression:'CASE(1, 1, "match", 1 / 0)',expected:'match',nullExpression:'CASE(NULL, NULL, "match", "default")',nullExpected:'match'},
  {name:'AND',expression:'AND(TRUE, NOT(FALSE))',expected:true,nullExpression:'AND(NULL)',nullExpected:false},
  {name:'OR',expression:'OR(TRUE, 1 / 0)',expected:true,nullExpression:'OR(NULL)',nullExpected:false},
  {name:'NOT',expression:'NOT(FALSE)',expected:true,nullExpression:'NOT(NULL)',nullExpected:true},
  {name:'XOR',expression:'XOR(TRUE, FALSE)',expected:true,nullExpression:'XOR(NULL, FALSE)',nullExpected:false},
  {name:'ISBLANK',expression:'ISBLANK("")',expected:true,nullExpression:'ISBLANK(NULL)',nullExpected:true},
  {name:'ISNULL',expression:'ISNULL(NULL)',expected:true,nullExpression:'ISNULL("")',nullExpected:false},
  {name:'ISNUMBER',expression:'ISNUMBER("12.5")',expected:true,nullExpression:'ISNUMBER(TRUE)',nullExpected:false},
  {name:'BLANKVALUE',expression:'BLANKVALUE("value", 1 / 0)',expected:'value',nullExpression:'BLANKVALUE(NULL, "fallback")',nullExpected:'fallback'},
  {name:'NULLVALUE',expression:'NULLVALUE("value", 1 / 0)',expected:'value',nullExpression:'NULLVALUE(NULL, "fallback")',nullExpected:'fallback'},
  {name:'TEXT',expression:'TEXT(TRUE)',expected:'TRUE',nullExpression:'TEXT(NULL)',nullExpected:''},
  {name:'VALUE',expression:'VALUE("12.5")',expected:12.5,nullExpression:'VALUE(NULL)',nullError:true},
  {name:'T',expression:'T(12)',expected:'',nullExpression:'T(NULL)',nullExpected:''},
  {name:'LEN',expression:'LEN("Café 😀")',expected:6,nullExpression:'LEN(NULL)',nullExpected:0},
  {name:'LEFT',expression:'LEFT("café", 2)',expected:'ca',nullExpression:'LEFT(NULL, 2)',nullExpected:''},
  {name:'RIGHT',expression:'RIGHT("café", 2)',expected:'fé',nullExpression:'RIGHT(NULL, 2)',nullExpected:''},
  {name:'MID',expression:'MID("café", 2, 2)',expected:'af',nullExpression:'MID(NULL, 1, 2)',nullExpected:''},
  {name:'FIND',expression:'FIND("é", "café")',expected:4,nullExpression:'FIND(NULL, NULL)',nullExpected:1},
  {name:'BEGINS',expression:'BEGINS("Café", "Ca")',expected:true,nullExpression:'BEGINS(NULL, NULL)',nullExpected:true},
  {name:'CONTAINS',expression:'CONTAINS("Café", "fé")',expected:true,nullExpression:'CONTAINS(NULL, NULL)',nullExpected:true},
  {name:'EXACT',expression:'EXACT("Tea", "tea")',expected:false,nullExpression:'EXACT(NULL, NULL)',nullExpected:true},
  {name:'UPPER',expression:'UPPER("café")',expected:'CAFÉ',nullExpression:'UPPER(NULL)',nullExpected:''},
  {name:'LOWER',expression:'LOWER("CAFÉ")',expected:'café',nullExpression:'LOWER(NULL)',nullExpected:''},
  {name:'PROPER',expression:'PROPER("éclair déjà vu")',expected:'Éclair Déjà Vu',nullExpression:'PROPER(NULL)',nullExpected:''},
  {name:'TRIM',expression:'TRIM("  café  ")',expected:'café',nullExpression:'TRIM(NULL)',nullExpected:''},
  {name:'CONCATENATE',expression:'CONCATENATE("A", NULL, "B")',expected:'AB',nullExpression:'CONCATENATE(NULL, NULL)',nullExpected:''},
  {name:'SUBSTITUTE',expression:'SUBSTITUTE("aaa", "a", "b", 2)',expected:'aba',nullExpression:'SUBSTITUTE(NULL, NULL, NULL)',nullExpected:''},
  {name:'REPLACE',expression:'REPLACE("abcdef", 2, 3, "x")',expected:'axef',nullExpression:'REPLACE(NULL, 1, 0, NULL)',nullExpected:''},
  {name:'REPT',expression:'REPT("é", 3)',expected:'ééé',nullExpression:'REPT(NULL, 2)',nullExpected:''},
  {name:'LPAD',expression:'LPAD("A", 3, "0")',expected:'00A',nullExpression:'LPAD(NULL, 2)',nullExpected:'  '},
  {name:'RPAD',expression:'RPAD("A", 3, "0")',expected:'A00',nullExpression:'RPAD(NULL, 2)',nullExpected:'  '},
  {name:'REVERSE',expression:'REVERSE("A🙂")',expected:'🙂A',nullExpression:'REVERSE(NULL)',nullExpected:''},
  {name:'ASCII',expression:'ASCII("A")',expected:65,nullExpression:'ASCII(NULL)',nullExpected:0},
  {name:'CHAR',expression:'CHAR(65)',expected:'A',nullExpression:'CHAR(NULL)',nullError:true},
  {name:'ENCODEURL',expression:'ENCODEURL("a b&c")',expected:'a%20b%26c',nullExpression:'ENCODEURL(NULL)',nullExpected:''},
  {name:'URLENCODE',expression:'URLENCODE("a b&c")',expected:'a%20b%26c',nullExpression:'URLENCODE(NULL)',nullExpected:''},
  {name:'URLDECODE',expression:'URLDECODE("a%20b%26c")',expected:'a b&c',nullExpression:'URLDECODE(NULL)',nullExpected:''}
];

const contexts:FormulaExpressionContext[]=['formula_field','validation_rule','flow_formula'];
const resolve=()=>null;
const browser=(expression:string)=>evaluateFieldExpressionDetailed(expression,{});
const display=(value:unknown)=>value===null||value===undefined?'':String(value);
const edgeCases:Array<[string,string,unknown]>=[
  ['IF','IF(FALSE, 1 / 0, 7)',7],
  ['IFERROR','IFERROR("ok", 1 / 0)','ok'],
  ['CASE','CASE("z", "a", 1, "b", 2, 3)',3],
  ['AND','AND(TRUE, TRUE, TRUE)',true],
  ['OR','OR(FALSE, FALSE)',false],
  ['NOT','NOT(TRUE)',false],
  ['XOR','XOR(TRUE, TRUE)',false],
  ['ISBLANK','ISBLANK(" ")',false],
  ['ISNULL','ISNULL("")',false],
  ['ISNUMBER','ISNUMBER("1e3")',true],
  ['BLANKVALUE','BLANKVALUE(0, 9)',0],
  ['BLANKVALUE','BLANKVALUE("", "fallback")','fallback'],
  ['NULLVALUE','NULLVALUE(FALSE, 9)',false],
  ['NULLVALUE','NULLVALUE("", "fallback")',''],
  ['TEXT','TEXT(0)','0'],
  ['VALUE','VALUE("-1.25")',-1.25],
  ['T','T("text")','text'],
  ['LEN','LEN("")',0],
  ['LEFT','LEFT("🙂x", 1)','🙂'],
  ['LEFT','LEFT("abc", 0)',''],
  ['RIGHT','RIGHT("abc", 0)',''],
  ['RIGHT','RIGHT("x🙂", 1)','🙂'],
  ['MID','MID("abc", 4, 2)',''],
  ['MID','MID("x🙂y", 2, 1)','🙂'],
  ['FIND','FIND("🙂", "x🙂y")',2],
  ['BEGINS','BEGINS("abc", "")',true],
  ['CONTAINS','CONTAINS("abc", "")',true],
  ['EXACT','EXACT("A", "a")',false],
  ['UPPER','UPPER("ß")','SS'],
  ['LOWER','LOWER("CAFÉ")','café'],
  ['PROPER','PROPER("(éCLAIR)-déjà")','(Éclair)-Déjà'],
  ['TRIM','TRIM(" a  b ")','a  b'],
  ['CONCATENATE','CONCATENATE("A", UPPER("b"))','AB'],
  ['SUBSTITUTE','SUBSTITUTE("abc", "z", "x")','abc'],
  ['REPLACE','REPLACE("abc", 1, 0, "x")','xabc'],
  ['REPLACE','REPLACE("a🙂b", 2, 1, "x")','axb'],
  ['REPT','REPT("x", 0)',''],
  ['REPT','REPT("🙂", 2)','🙂🙂'],
  ['LPAD','LPAD("long", 2, "0")','lo'],
  ['LPAD','LPAD("🙂", 2, "x")','x🙂'],
  ['RPAD','RPAD("long", 2, "0")','lo'],
  ['RPAD','RPAD("🙂", 2, "x")','🙂x'],
  ['REVERSE','REVERSE("A🙂")','🙂A'],
  ['ASCII','ASCII("A")',65],
  ['ASCII','ASCII("🙂")',128578],
  ['CHAR','CHAR(65.5)','A'],
  ['ENCODEURL','ENCODEURL("a+b")','a%2Bb'],
  ['URLENCODE','URLENCODE("a+b")','a%2Bb'],
  ['URLDECODE','URLDECODE("a%2Bb")','a+b']
];

test('logical and text function fixtures agree across formula, validation, Flow, and browser contexts',()=>{
  for(const fixture of fixtures){
    for(const context of contexts){
      const actual=evaluateFlowFormula(fixture.expression,resolve,{},context);
      assert.equal(actual,fixture.expected,`${fixture.name} in ${context}`);
      assert.equal(browser(fixture.expression).value,display(actual),`${fixture.name} in ribbon_binding`);
    }
  }
});

test('logical and text functions handle null inputs consistently',()=>{
  for(const fixture of fixtures){
    for(const context of contexts){
      if(fixture.nullError){
        assert.throws(()=>evaluateFlowFormula(fixture.nullExpression,resolve,{},context),
          undefined,`${fixture.name} null in ${context}`);
        assert.ok(browser(fixture.nullExpression).error,`${fixture.name} null in ribbon_binding`);
      }else{
        const expected=fixture.nullExpected;
        const actual=evaluateFlowFormula(fixture.nullExpression,resolve,{},context);
        assert.equal(actual,expected,`${fixture.name} null in ${context}`);
        assert.equal(browser(fixture.nullExpression).value,display(expected),
          `${fixture.name} null in ribbon_binding`);
      }
    }
  }
});

test('every logical and text function rejects invalid arity before evaluation',()=>{
  for(const fixture of fixtures){
    const expression=`${fixture.name}()`;
    for(const context of contexts){
      assert.throws(()=>evaluateFlowFormula(expression,resolve,{},context),
        /Invalid argument count/,`${fixture.name} in ${context}`);
    }
    assert.match(browser(expression).error??'',/Invalid argument count/,
      `${fixture.name} in ribbon_binding`);
  }
});

test('nested logical and text function expressions preserve lazy evaluation',()=>{
  for(const fixture of fixtures){
    const expression=`IF(TRUE, ${fixture.expression}, 1 / 0)`;
    for(const context of contexts){
      assert.equal(evaluateFlowFormula(expression,resolve,{},context),fixture.expected,
        `${fixture.name} nested in ${context}`);
    }
    assert.equal(browser(expression).value,display(fixture.expected),`${fixture.name} nested in ribbon_binding`);
  }
});

test('logical and text function edge cases agree across supported contexts',()=>{
  assert.deepEqual([...new Set(edgeCases.map(([name])=>name))].sort(),
    fixtures.map(({name})=>name).sort());
  for(const [name,expression,expected] of edgeCases){
    for(const context of contexts){
      assert.equal(evaluateFlowFormula(expression,resolve,{},context),expected,
        `${name} edge case in ${context}`);
    }
    assert.equal(browser(expression).value,display(expected),`${name} edge case in ribbon_binding`);
  }
});

test('every logical and text function enforces its declared authoring argument types',()=>{
  const typeCases:Array<[string,string,boolean]>=[
    ['IF','IF("yes", 1, 2)',true],
    ['IFERROR','IFERROR(1, "fallback")',true],
    ['CASE','CASE("x", 1, "a", "b")',true],
    ['AND','AND("yes")',true],
    ['OR','OR("yes")',true],
    ['NOT','NOT("yes")',true],
    ['XOR','XOR("yes", FALSE)',true],
    ['ISBLANK','ISBLANK(1)',false],
    ['ISNULL','ISNULL(1)',false],
    ['ISNUMBER','ISNUMBER(TRUE)',false],
    ['BLANKVALUE','BLANKVALUE(1, "fallback")',true],
    ['NULLVALUE','NULLVALUE(FALSE, "fallback")',true],
    ['TEXT','TEXT(1)',false],
    ['VALUE','VALUE(TRUE)',true],
    ['T','T(TRUE)',false],
    ['LEN','LEN(1)',true],
    ['LEFT','LEFT(1, 1)',true],
    ['RIGHT','RIGHT(1, 1)',true],
    ['MID','MID(1, 1, 1)',true],
    ['FIND','FIND(1, "text")',true],
    ['BEGINS','BEGINS(1, "text")',true],
    ['CONTAINS','CONTAINS(1, "text")',true],
    ['EXACT','EXACT(1, "text")',true],
    ['UPPER','UPPER(1)',true],
    ['LOWER','LOWER(1)',true],
    ['PROPER','PROPER(1)',true],
    ['TRIM','TRIM(1)',true],
    ['CONCATENATE','CONCATENATE(1, TRUE)',false],
    ['SUBSTITUTE','SUBSTITUTE(1, "a", "b")',true],
    ['REPLACE','REPLACE(1, 1, 1, "x")',true],
    ['REPT','REPT(1, 2)',true],
    ['LPAD','LPAD(1, 2)',true],
    ['RPAD','RPAD(1, 2)',true],
    ['REVERSE','REVERSE(1)',true],
    ['ASCII','ASCII(1)',true],
    ['CHAR','CHAR("A")',true],
    ['ENCODEURL','ENCODEURL(1)',true],
    ['URLENCODE','URLENCODE(1)',true],
    ['URLDECODE','URLDECODE(1)',true]
  ];
  assert.deepEqual(typeCases.map(([name])=>name).sort(),fixtures.map(({name})=>name).sort());
  for(const [name,expression,invalid] of typeCases){
    for(const context of contexts){
      if(invalid)assert.throws(()=>inferFlowFormulaType(expression,()=>null,context),undefined,
        `${name} in ${context}`);
      else assert.doesNotThrow(()=>inferFlowFormulaType(expression,()=>null,context),
        `${name} in ${context}`);
    }
  }
});

test('text and URL functions reject invalid boundary values',()=>{
  const invalidExpressions=[
    'VALUE("not a number")','URLDECODE("%")','CHAR(256)','REPT("x", -1)',
    'LPAD("x", 2, "")','REPLACE("abc", 0, 1, "x")',
    'LEFT("x", NULL)','RIGHT("x", NULL)','FIND("x", "text", NULL)'
  ];
  for(const expression of invalidExpressions){
    for(const context of contexts){
      assert.throws(()=>evaluateFlowFormula(expression,resolve,{},context),undefined,
        `${expression} in ${context}`);
    }
    assert.ok(browser(expression).error,`${expression} in ribbon_binding`);
  }
});

test('picklist formulas preserve scalar values and matching across consumers',()=>{
  const resources:Record<string,unknown>={Status:'Open',Choices:'Red;Blue'};
  const resolve=(reference:string)=>resources[reference];
  const values:Array<[string,unknown]>=[
    ['TEXT(@Status)','Open'],
    ['ISPICKVAL(@Status, "Open")',true],
    ['INCLUDES(@Choices, "Blue")',true],
    ['INCLUDES(@Choices, "blue")',false]
  ];
  const typedResolve=(reference:string)=>reference==='Status'?'Picklist'
    :reference==='Choices'?'MultiPicklist':null;
  for(const [expression,expected] of values){
    for(const context of contexts)
      assert.equal(evaluateFlowFormula(expression,resolve,{},context),expected,
        `${expression} in ${context}`);
    const result=evaluateFieldExpressionDetailed(expression,resources);
    assert.equal(result.error,undefined,expression);
    assert.equal(result.value,display(expected),expression);
  }
  assert.equal(inferFlowFormulaType('TEXT(@Status)',typedResolve),'Text');
  assert.equal(inferFlowFormulaType('ISPICKVAL(@Status, "Open")',typedResolve),'Checkbox');
  assert.equal(inferFlowFormulaType('INCLUDES(@Choices, "Blue")',typedResolve),'Checkbox');
});

test('text equality and search functions preserve documented case sensitivity',()=>{
  const expressions:Array<[string,unknown]>=[
    ['"Tea" = "Tea"',true],
    ['"Tea" = "tea"',false],
    ['"Tea" <> "tea"',true],
    ['EXACT("Tea", "tea")',false],
    ['FIND("t", "Tea")',0],
    ['BEGINS("Tea", "t")',false],
    ['CONTAINS("Tea", "t")',false]
  ];
  for(const [expression,expected] of expressions){
    for(const context of contexts)
      assert.equal(evaluateFlowFormula(expression,resolve,{},context),expected,
        `${expression} in ${context}`);
    assert.equal(browser(expression).value,display(expected),`${expression} in ribbon_binding`);
  }
});
