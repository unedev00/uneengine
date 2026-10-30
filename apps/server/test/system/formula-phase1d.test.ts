import assert from 'node:assert/strict';
import {test} from 'node:test';
import {evaluateFlowFormula,inferFlowFormulaType} from '../../src/system-files/flow-formula-runtime.js';
import type {FormulaExpressionContext} from '../../src/expression-engine/FormulaFunctionRegistry.js';
import {evaluateFieldExpressionDetailed} from '../../../web/src/component-libraries/shared/FieldExpression.js';
import {resolveRegisteredTextProperties} from '../../../web/src/core/components/RegisteredComponent/fieldExpressionRuntime.js';

const contexts:FormulaExpressionContext[]=['formula_field','validation_rule','flow_formula'];
const now=new Date('2024-06-15T00:30:45.123Z');
const timeZone='America/Los_Angeles';
const browserContext={timeZone,now};
const fixtures:Array<{name:string;expression:string;expected:string;type:string}>=[
  {name:'DATE',expression:'DATE(2024, 2, 29)',expected:'2024-02-29',type:'Date'},
  {name:'DATEVALUE',expression:'DATEVALUE("2024-06-15T00:30:00Z")',expected:'2024-06-14',type:'Date'},
  {name:'DATETIMEVALUE',expression:'DATETIMEVALUE("2024-06-15T12:30:00")',
    expected:'2024-06-15T19:30:00.000Z',type:'DateTime'},
  {name:'TIMEVALUE',expression:'TIMEVALUE("2024-06-15T00:30:45.123Z")',
    expected:'17:30:45.123',type:'Time'},
  {name:'TODAY',expression:'TODAY()',expected:'2024-06-14',type:'Date'},
  {name:'NOW',expression:'NOW()',expected:'2024-06-15T00:30:45.123Z',type:'DateTime'},
  {name:'TIMENOW',expression:'TIMENOW()',expected:'17:30:45.123',type:'Time'},
  {name:'DAY',expression:'DAY(DATETIMEVALUE("2024-06-15T00:30:00Z"))',expected:'14',type:'Number'},
  {name:'MONTH',expression:'MONTH(DATETIMEVALUE("2024-06-15T00:30:00Z"))',expected:'6',type:'Number'},
  {name:'YEAR',expression:'YEAR(DATETIMEVALUE("2024-06-15T00:30:00Z"))',expected:'2024',type:'Number'},
  {name:'HOUR',expression:'HOUR(DATETIMEVALUE("2024-06-15T00:30:00Z"))',expected:'17',type:'Number'},
  {name:'MINUTE',expression:'MINUTE(DATETIMEVALUE("2024-06-15T00:30:00Z"))',expected:'30',type:'Number'},
  {name:'SECOND',expression:'SECOND(DATETIMEVALUE("2024-06-15T00:30:45Z"))',expected:'45',type:'Number'},
  {name:'WEEKDAY',expression:'WEEKDAY(DATE(2024, 6, 14))',expected:'6',type:'Number'},
  {name:'ISOWEEK',expression:'ISOWEEK(DATE(2021, 1, 1))',expected:'53',type:'Number'},
  {name:'ISOYEAR',expression:'ISOYEAR(DATE(2021, 1, 1))',expected:'2020',type:'Number'},
  {name:'ADDDAYS',expression:'ADDDAYS(DATE(2024, 2, 28), 1)',expected:'2024-02-29',type:'Date'},
  {name:'ADDMONTHS',expression:'ADDMONTHS(DATE(2024, 1, 31), 1)',expected:'2024-02-29',type:'Date'},
  {name:'TZOFFSET',expression:'TZOFFSET(DATETIMEVALUE("2024-06-15T00:30:00Z"))',
    expected:'-25200000',type:'Number'}
];

test('Phase 1D date/time functions agree across formula contexts and page bindings',()=>{
  assert.deepEqual(fixtures.map(({name})=>name).sort(),[
    'ADDDAYS','ADDMONTHS','DATE','DATETIMEVALUE','DATEVALUE','DAY','HOUR','ISOYEAR',
    'ISOWEEK','MINUTE','MONTH','NOW','SECOND','TIMEVALUE','TIMENOW','TODAY','TZOFFSET',
    'WEEKDAY','YEAR'
  ].sort());
  for(const fixture of fixtures){
    for(const context of contexts){
      assert.equal(evaluateFlowFormula(fixture.expression,()=>null,{timeZone,now},context),
        fixture.type==='Number'?Number(fixture.expected):fixture.expected,
        `${fixture.name} in ${context}`);
      assert.equal(inferFlowFormulaType(fixture.expression,()=>null,context),fixture.type,
        `${fixture.name} type in ${context}`);
    }
    const result=evaluateFieldExpressionDetailed(fixture.expression,{},browserContext);
    assert.equal(result.error,undefined,`${fixture.name} in page binding`);
    assert.equal(result.value,fixture.expected,`${fixture.name} in page binding`);
  }
});

test('date/time evaluation snapshots one instant and applies the supplied time zone',()=>{
  assert.equal(evaluateFlowFormula('NOW() = NOW()',()=>null,{timeZone,now}),true);
  assert.equal(evaluateFlowFormula('TODAY() = DATEVALUE(NOW())',()=>null,{timeZone,now}),true);
  assert.equal(evaluateFlowFormula('TIMENOW() = TIMEVALUE(NOW())',()=>null,{timeZone,now}),true);
  assert.equal(evaluateFieldExpressionDetailed('NOW() = NOW()',{},browserContext).value,'true');
  assert.equal(evaluateFieldExpressionDetailed('TODAY()',{},{
    timeZone:'America/Los_Angeles',now:'2024-03-10T08:30:00Z'
  }).value,'2024-03-10');
  assert.equal(evaluateFieldExpressionDetailed('HOUR("2024-01-01T01:00:00Z")',{},{
    timeZone:'America/Los_Angeles'
  }).value,'17');
});

test('date arithmetic handles leap years, month ends, calendar days, and comparisons',()=>{
  const resolve=()=>null;
  const cases:Array<[string,unknown]>=[
    ['DATE(2023, 1, 31) + 1','2023-02-01'],
    ['DATE(2024, 3, 1) - DATE(2024, 2, 28)',2],
    ['DATETIMEVALUE("2024-06-15T12:00:00Z") - DATETIMEVALUE("2024-06-14T12:00:00Z")',1],
    ['DATETIMEVALUE("2024-06-15T00:00:00Z") = DATETIMEVALUE("2024-06-14T20:00:00-04:00")',true],
    ['DATETIMEVALUE("2024-03-09T12:00:00") + 1','2024-03-10T20:00:00.000Z'],
    ['ADDMONTHS("2023-01-31", 1)','2023-02-28'],
    ['ADDMONTHS("2024-02-29", 12)','2025-02-28'],
    ['ADDDAYS("2024-03-09T12:00:00", 1)','2024-03-10T19:00:00.000Z']
  ];
  for(const [expression,expected] of cases){
    assert.equal(evaluateFlowFormula(expression,resolve,{timeZone}),expected,expression);
    const browser=evaluateFieldExpressionDetailed(expression,{},browserContext);
    assert.equal(browser.error,undefined,expression);
    assert.equal(browser.value,typeof expected==='boolean'?(expected?'true':'false'):String(expected),expression);
  }
  assert.equal(inferFlowFormulaType('DATE(2024, 3, 1) - DATE(2024, 2, 28)',resolve),'Number');
  assert.equal(inferFlowFormulaType('NOW() - DATETIMEVALUE("2024-01-01T00:00:00Z")',resolve),'Number');
  assert.equal(inferFlowFormulaType('ADDDAYS(NOW(), 1)',resolve),'DateTime');
  assert.throws(()=>inferFlowFormulaType('TODAY() = NOW()',resolve),/types do not match/);
  assert.throws(()=>evaluateFlowFormula('TODAY() = NOW()',resolve,{timeZone}),/matching types/);
});

test('registered page bindings share one explicit date/time context across properties',()=>{
  const properties=resolveRegisteredTextProperties([
    {propertyKey:'first',kind:'TEXT'},
    {propertyKey:'second',kind:'TEXT'}
  ],{first:'NOW()',second:'TIMENOW()'},{timeZone,now});
  assert.equal(properties.first,'2024-06-15T00:30:45.123Z');
  assert.equal(properties.second,'17:30:45.123');
});

test('local DateTime parsing rejects DST gaps and resolves overlaps deterministically',()=>{
  const resolve=()=>null;
  assert.equal(evaluateFlowFormula('DATETIMEVALUE("2024-03-10T01:30:00")',resolve,{timeZone}),
    '2024-03-10T09:30:00.000Z');
  assert.equal(evaluateFlowFormula('DATETIMEVALUE("2024-03-10T03:30:00")',resolve,{timeZone}),
    '2024-03-10T10:30:00.000Z');
  assert.throws(()=>evaluateFlowFormula('DATETIMEVALUE("2024-03-10T02:30:00")',resolve,{timeZone}),
    /does not exist/);
  assert.equal(evaluateFlowFormula('DATETIMEVALUE("2024-11-03T01:30:00")',resolve,{timeZone}),
    '2024-11-03T08:30:00.000Z');
  assert.throws(()=>evaluateFlowFormula('ADDDAYS("2024-03-09T02:30:00", 1)',resolve,{timeZone}),
    /does not exist/);
  assert.throws(()=>evaluateFlowFormula('DATEVALUE("2024-02-30")',resolve,{timeZone}),
    /Invalid formula date\/time value/);
  assert.throws(()=>evaluateFlowFormula('DATETIMEVALUE("not a date")',resolve,{timeZone}),
    /Invalid formula date\/time value/);
  assert.throws(()=>evaluateFlowFormula('ADDDAYS(DATE(2024, 1, 1), 1.5)',resolve,{timeZone}),
    /whole number/);
  assert.throws(()=>evaluateFlowFormula('ADDMONTHS(DATE(2024, 1, 1), 1.5)',resolve,{timeZone}),
    /whole number/);
});

test('browser page bindings reject invalid date context and invalid time zones',()=>{
  assert.match(evaluateFieldExpressionDetailed('TODAY()',{},null).error??'',/Invalid formula evaluation context/);
  assert.match(evaluateFieldExpressionDetailed('TODAY()',{},{timeZone:'Unknown/Zone'}).error??'',
    /time zone|Invalid/);
  assert.match(evaluateFieldExpressionDetailed('NOW()',{},{now:12}).error??'',
    /Invalid formula evaluation time/);
});
