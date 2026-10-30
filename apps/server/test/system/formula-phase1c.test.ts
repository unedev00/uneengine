import assert from 'node:assert/strict';
import {test} from 'node:test';
import {evaluateFlowFormula,inferFlowFormulaType} from '../../src/system-files/flow-formula-runtime.js';
import type {FormulaExpressionContext} from '../../src/expression-engine/FormulaFunctionRegistry.js';
import {evaluateFieldExpressionDetailed} from '../../../web/src/component-libraries/shared/FieldExpression.js';

type NumericFixture={
  name:string;
  expression:string;
  expected:number;
  typeErrorExpression?:string;
  tolerance?:number;
};

const fixtures:NumericFixture[]=[
  {name:'ABS',expression:'ABS(-4.25)',expected:4.25,typeErrorExpression:'ABS("4")'},
  {name:'ROUND',expression:'ROUND(2.675, 2)',expected:2.68,typeErrorExpression:'ROUND("2", 1)'},
  {name:'ROUNDUP',expression:'ROUNDUP(-2.31, 1)',expected:-2.4,typeErrorExpression:'ROUNDUP("2", 1)'},
  {name:'ROUNDDOWN',expression:'ROUNDDOWN(-2.39, 1)',expected:-2.3,typeErrorExpression:'ROUNDDOWN("2", 1)'},
  {name:'TRUNC',expression:'TRUNC(-2.39, 1)',expected:-2.3,typeErrorExpression:'TRUNC("2", 1)'},
  {name:'MIN',expression:'MIN(4, -2, 7)',expected:-2,typeErrorExpression:'MIN("2", 1)'},
  {name:'MAX',expression:'MAX(-4, 2, 7)',expected:7,typeErrorExpression:'MAX("2", 1)'},
  {name:'MOD',expression:'MOD(8, 3)',expected:2,typeErrorExpression:'MOD("8", 3)'},
  {name:'SIGN',expression:'SIGN(-2)',expected:-1,typeErrorExpression:'SIGN("2")'},
  {name:'SQRT',expression:'SQRT(9)',expected:3,typeErrorExpression:'SQRT("9")'},
  {name:'POWER',expression:'POWER(2, 3)',expected:8,typeErrorExpression:'POWER("2", 3)'},
  {name:'CEILING',expression:'CEILING(2.1)',expected:3,typeErrorExpression:'CEILING("2")'},
  {name:'FLOOR',expression:'FLOOR(2.9)',expected:2,typeErrorExpression:'FLOOR("2")'},
  {name:'MCEILING',expression:'MCEILING(2.1)',expected:3,typeErrorExpression:'MCEILING("2")'},
  {name:'MFLOOR',expression:'MFLOOR(2.9)',expected:2,typeErrorExpression:'MFLOOR("2")'},
  {name:'EXP',expression:'EXP(1)',expected:Math.E,typeErrorExpression:'EXP("1")',tolerance:1e-12},
  {name:'LN',expression:'LN(2)',expected:Math.LN2,typeErrorExpression:'LN("2")',tolerance:1e-12},
  {name:'LOG',expression:'LOG(100)',expected:2,typeErrorExpression:'LOG("100")'},
  {name:'PI',expression:'PI()',expected:Math.PI,tolerance:1e-12},
  {name:'SIN',expression:'SIN(PI() / 2)',expected:1,typeErrorExpression:'SIN("1")',tolerance:1e-12},
  {name:'COS',expression:'COS(0)',expected:1,typeErrorExpression:'COS("0")'},
  {name:'TAN',expression:'TAN(0)',expected:0,typeErrorExpression:'TAN("0")'},
  {name:'ASIN',expression:'ASIN(1)',expected:Math.PI/2,typeErrorExpression:'ASIN("1")',tolerance:1e-12},
  {name:'ACOS',expression:'ACOS(1)',expected:0,typeErrorExpression:'ACOS("1")'},
  {name:'ATAN',expression:'ATAN(1)',expected:Math.PI/4,typeErrorExpression:'ATAN("1")',tolerance:1e-12},
  {name:'ATAN2',expression:'ATAN2(1, 0)',expected:Math.PI/2,typeErrorExpression:'ATAN2("1", 0)',tolerance:1e-12},
  {name:'SINH',expression:'SINH(1)',expected:Math.sinh(1),typeErrorExpression:'SINH("1")',tolerance:1e-12},
  {name:'COSH',expression:'COSH(1)',expected:Math.cosh(1),typeErrorExpression:'COSH("1")',tolerance:1e-12},
  {name:'TANH',expression:'TANH(1)',expected:Math.tanh(1),typeErrorExpression:'TANH("1")',tolerance:1e-12},
  {name:'DEGREES',expression:'DEGREES(PI())',expected:180,typeErrorExpression:'DEGREES("1")',tolerance:1e-12},
  {name:'RADIANS',expression:'RADIANS(180)',expected:Math.PI,typeErrorExpression:'RADIANS("180")',tolerance:1e-12}
];

const contexts:FormulaExpressionContext[]=['formula_field','validation_rule','flow_formula'];
const resolve=()=>null;
const browser=(expression:string,record:Record<string,unknown>={})=>
  evaluateFieldExpressionDetailed(expression,record);
const assertClose=(actual:number,expected:number,tolerance:number,message:string)=>{
  assert.ok(Number.isFinite(actual),`${message}: result must be finite`);
  assert.ok(Math.abs(actual-expected)<=tolerance,`${message}: ${actual} != ${expected}`);
};

test('numeric, trigonometric and rounding functions agree across formula consumers and page bindings',()=>{
  assert.deepEqual(fixtures.map(({name})=>name).sort(),[
    'ABS','ACOS','ASIN','ATAN','ATAN2','CEILING','COS','COSH','DEGREES','EXP','FLOOR',
    'LN','LOG','MAX','MCEILING','MFLOOR','MIN','MOD','PI','POWER','RADIANS','ROUND',
    'ROUNDDOWN','ROUNDUP','SIGN','SIN','SINH','SQRT','TAN','TANH','TRUNC'
  ].sort());
  for(const fixture of fixtures){
    for(const context of contexts){
      assertClose(Number(evaluateFlowFormula(fixture.expression,resolve,{},context)),
        fixture.expected,fixture.tolerance??0,`${fixture.name} in ${context}`);
      assert.equal(inferFlowFormulaType(fixture.expression,resolve,context),'Number',
        `${fixture.name} inferred in ${context}`);
    }
    const result=browser(fixture.expression);
    assert.equal(result.error,undefined,`${fixture.name} in ribbon_binding`);
    assertClose(Number(result.value),fixture.expected,fixture.tolerance??0,
      `${fixture.name} in ribbon_binding`);
  }
});

test('every Phase 1C numeric function supports nested expressions and rejects invalid arity',()=>{
  for(const fixture of fixtures){
    const nested=`IF(TRUE, ${fixture.expression}, 1 / 0)`;
    for(const context of contexts){
      assertClose(Number(evaluateFlowFormula(nested,resolve,{},context)),
        fixture.expected,fixture.tolerance??0,`${fixture.name} nested in ${context}`);
      const invalidArity=fixture.name==='PI'?'PI(1)':`${fixture.name}()`;
      assert.throws(()=>evaluateFlowFormula(invalidArity,resolve,{},context),
        /Invalid argument count/,`${fixture.name} arity in ${context}`);
    }
    assertClose(Number(browser(nested).value),fixture.expected,fixture.tolerance??0,
      `${fixture.name} nested in ribbon_binding`);
    const invalidArity=fixture.name==='PI'?'PI(1)':`${fixture.name}()`;
    assert.match(browser(invalidArity).error??'',/Invalid(?: \w+)? argument count/,
      `${fixture.name} arity in ribbon_binding`);
  }
});

test('numeric edge cases preserve sign, scale, decimal precision, and domain errors',()=>{
  const values:Array<[string,number]>=[
    ['ROUND(-2.5)',-3],
    ['ROUND(25, -1)',30],
    ['ROUNDUP(-25, -1)',-30],
    ['ROUNDDOWN(-25, -1)',-20],
    ['TRUNC(25.9, -1)',20],
    ['ROUND(1.005, 2)',1.01],
    ['ROUND(2.675, 2)',2.68],
    ['ROUND(1.23456789012345, 12)',1.234567890123],
    ['ROUND(0.00000000000000000001, 20)',0.00000000000000000001],
    ['ROUND(1, -100)',0],
    ['MOD(-5, 3)',-2],
    ['MOD(5, -3)',2],
    ['LOG(0.1, 0.1)',1],
    ['CEILING(-2.1)',-2],
    ['FLOOR(-2.1)',-3],
    ['MCEILING(-2.1)',-2],
    ['MFLOOR(-2.1)',-3],
    ['DEGREES(RADIANS(90))',90]
  ];
  for(const [expression,expected] of values){
    for(const context of contexts)
      assertClose(Number(evaluateFlowFormula(expression,resolve,{},context)),expected,1e-12,
        `${expression} in ${context}`);
    const result=browser(expression);
    assert.equal(result.error,undefined,expression);
    assertClose(Number(result.value),expected,1e-12,`${expression} in ribbon_binding`);
  }

  const invalidExpressions:Array<[string,RegExp]>=[
    ['SQRT(-1)',/SQRT requires a non-negative value/],
    ['LN(0)',/LN requires a positive value/],
    ['LOG(10, 1)',/Invalid LOG arguments/],
    ['LOG(-1)',/Invalid LOG arguments/],
    ['MOD(1, 0)',/MOD divisor must not be zero/],
    ['ASIN(2)',/ASIN argument must be between -1 and 1/],
    ['ACOS(-2)',/ACOS argument must be between -1 and 1/],
    ['POWER(-1, 0.5)',/Formula result must be finite/],
    ['EXP(1000)',/Formula result must be finite/],
    ['COSH(1000)',/Formula result must be finite/],
    ['ROUND(1, 101)',/Invalid formula rounding precision/],
    ['ROUND(1, NULL)',/finite number/]
  ];
  for(const [expression,error] of invalidExpressions){
    for(const context of contexts)
      assert.throws(()=>evaluateFlowFormula(expression,resolve,{},context),error,
        `${expression} in ${context}`);
    assert.match(browser(expression).error??'',error,`${expression} in ribbon_binding`);
  }
});

test('numeric type inference accepts number-backed currency, percent, integer, and decimal fields only',()=>{
  const numericFields:Record<string,number>={
    Amount:1234.56,Rate:0.125,Quantity:7,Measurement:1.75
  };
  const resolveType=(reference:string):'Number'|null=>
    Object.hasOwn(numericFields,reference)?'Number':null;
  for(const [field,value] of Object.entries(numericFields)){
    const expression=`@${field} * 2`;
    for(const context of contexts){
      assert.equal(evaluateFlowFormula(expression,name=>numericFields[name],{},context),value*2,
        `${field} in ${context}`);
      assert.equal(inferFlowFormulaType(expression,resolveType,context),'Number',
        `${field} inferred in ${context}`);
    }
    const result=browser(expression,numericFields);
    assert.equal(result.error,undefined,`${field} in ribbon_binding`);
    assert.equal(Number(result.value),value*2,`${field} in ribbon_binding`);
  }
  for(const fixture of fixtures){
    if(!fixture.typeErrorExpression)continue;
    for(const context of contexts)
      assert.throws(()=>inferFlowFormulaType(fixture.typeErrorExpression,resolve,context),
        undefined,`${fixture.name} argument type in ${context}`);
  }
});
