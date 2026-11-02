import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  evaluateFlowFormula,inferFlowFormulaType,validateFlowFormula,validateFlowResources
} from '../../src/system-files/flow-formula-runtime.js';
import {
  formulaFunctionCatalog,getFormulaFunctionNames,validateFormulaFunctions
} from '../../src/expression-engine/FormulaFunctionRegistry.js';
import {
  evaluateFieldExpressionDetailed,evaluateCollectionFormula
} from '../../../web/src/component-libraries/shared/FieldExpression.js';
import {Parser} from '../../src/expression-engine/FormulaParser.js';
import {tokenize} from '../../src/expression-engine/FormulaTokenizer.js';

const record={
  Active:true,Amount:12,Blank:null,Name:'Café 😀'
};
const serverResolve=(reference:string):unknown=>{
  if(reference.startsWith('Record.'))return record[reference.slice(7) as keyof typeof record]??null;
  throw new Error('Unknown formula reference: '+reference);
};
const browserRecord={Record:record};

test('formula client and server share parsing, precedence, coercion, and blank semantics',()=>{
  const fixtures:Array<[string,unknown]>=[
    ['@Record.Amount + 2 * 3',18],
    ['2 ^ 3 ^ 2',512],
    ['-2 ^ 2',-4],
    ['2 ^ -2',0.25],
    ['NOT 1 = 2',true],
    ['"Café 😀" & " — ok"','Café 😀 — ok'],
    ['"He said ""yes"""','He said "yes"'],
    ['NULL & "x"','x'],
    ['@Record.Blank & "x"','x'],
    ['NULL = NULL',true],
    ['"alpha" < "beta"',true],
    ['1 < "2"',false],
    ['IF(TRUE, "safe", 1 / 0)','safe'],
    ['@Record.Active AND @Record.Amount > 0',true],
    ['IFERROR(1 / 0, 7)',7]
  ];
  for(const [expression,expected] of fixtures){
    const serverValue=evaluateFlowFormula(expression,serverResolve);
    const browserResult=evaluateFieldExpressionDetailed(expression,browserRecord);
    assert.equal(browserResult.error,undefined,expression);
    assert.equal(browserResult.value,serverValue==null?'':String(serverValue),expression);
    assert.equal(serverValue,expected,expression);
  }
});

test('MATCHES shares Excel wildcard semantics across Flow and browser formulas',()=>{
 const formula=(value:unknown,pattern:string)=>evaluateFlowFormula('MATCHES(@Value,@Pattern)',
  key=>key==='Value'?value:key==='Pattern'?pattern:null);
 const cases:[unknown,string,boolean][]=[
  ['Burgers','*',true],['','*',false],[null,'*',false],[42,'*',false],
  ['burger combo','Burger*',true],['Burger','B?rg*r',true],
  ['ba','b?',true],['baa','b?',false],['A*B','A~*B',true],
  ['A?B','A~?B',true],['A~B','A~~B',true],['a%b','a%b',true],
  ['a_b','a_b',true],['x/y','x/y',true],['one','two',false],
  ['', '',true],['test','',false],['A~z','A~z',true]
 ];
 for(const [value,pattern,expected] of cases){
  const f='MATCHES(@Value,@Pattern)';
  const result=evaluateFieldExpressionDetailed(f,{Value:value,Pattern:pattern});
  assert.equal(result.error,undefined,JSON.stringify([value,pattern]));
  assert.equal(result.value,String(expected),JSON.stringify([value,pattern]));
  assert.equal(formula(value,pattern),expected,JSON.stringify([value,pattern]));
 }
 assert.equal(evaluateFlowFormula('2 * 3',()=>null),6);
 assert.equal(evaluateFlowFormula('"*" = "*"',()=>null),true);
 assert.equal(evaluateFlowFormula('"Burgers" = "*"',()=>null),false);
 assert.equal(evaluateFieldExpressionDetailed('"*"',{}).value,'*');
 for(const context of ['formula_field','validation_rule','flow_formula','ribbon_binding','record_filter'] as const)
  validateFlowFormula('MATCHES(@Name,"B*")',context);
 assert.equal(inferFlowFormulaType('MATCHES(@Name, "B*")',
  name=>name==='Name'?'Text':null),'Checkbox');
 assert.throws(()=>inferFlowFormulaType('MATCHES(@Amount,"*")',
  name=>name==='Amount'?'Number':null),/invalid argument type/);
 assert.throws(()=>evaluateFlowFormula('MATCHES("test","'+'*'.repeat(257)+'")',()=>null),
  /256 characters/);
 assert.equal(evaluateFieldExpressionDetailed('MATCHES("test")',{}).error?.includes('argument count'),true);
});
test('COLLECTION requires a name and produces typed named content in Flow and ribbon',()=>{
 const formula='COLLECTION("LineChoices", "a22", "none", @Rows)';
 const rows=[{Id:'a',Name:'Widget'}];
 const result=evaluateFlowFormula(formula,key=>key==='Rows'?rows:null,{},'flow_formula') as
  {name:string;items:unknown[]};
 assert.equal(result.name,'LineChoices');
 assert.equal(result.items[2],rows[0]);
 const typed=evaluateCollectionFormula('COLLECTION("LineChoices","a22","none")');
 assert.equal(typed.error,undefined);
 assert.deepEqual(typed.value,{name:'LineChoices',items:['a22','none']});
 assert.equal(inferFlowFormulaType('COLLECTION("LineChoices","a22")',()=>null,'flow_formula'),'Collection');
 assert.throws(()=>validateFlowFormula('COLLECTION("LineChoices","a22")','formula_field'),/not available/);
 assert.throws(()=>evaluateFlowFormula('COLLECTION("1bad","a22")',()=>null),/name/);
});

test('formula contexts share validation and report unavailable functions before execution',()=>{
  const checkbox='@Record.Active AND @Record.Amount > 0';
  for(const context of ['formula_field','validation_rule','flow_formula','ribbon_binding'] as const)
    validateFlowFormula(checkbox,context);
  assert.equal(inferFlowFormulaType(checkbox,reference=>
    reference==='Record.Active'?'Checkbox':reference==='Record.Amount'?'Number':null,
  'validation_rule'),'Checkbox');
  assert.equal(evaluateFlowFormula(checkbox,serverResolve,{},'validation_rule'),true);

  validateFlowFormula('COLLECTIONCOUNT(@Rows)','flow_formula');
  assert.throws(()=>validateFlowFormula('COLLECTIONCOUNT(@Rows)','formula_field'),
    /not available in formula field context/);
  assert.throws(()=>validateFlowFormula('ISNEW()','formula_field'),
    /not available in formula field context/);
  assert.match(evaluateFieldExpressionDetailed('ISNEW()',browserRecord).error??'',
    /not available in ribbon binding context/);
  assert.deepEqual(getFormulaFunctionNames('component_visibility'),[]);
  assert.deepEqual(getFormulaFunctionNames('record_filter'),[]);
  assert.equal(formulaFunctionCatalog.get('IF')?.signature.minimumArguments,3);
  assert.equal(formulaFunctionCatalog.get('IF')?.signature.maximumArguments,3);
});

test('formula parser rejects malformed, unsafe, oversized, and non-finite expressions',()=>{
  for(const expression of [
    '1 +','(1 + 2','1 @ 2','RUN_CODE("process.exit()")',
    '1;globalThis.process.exit()',
    '('.repeat(70)+'1'+')'.repeat(70),
    '1+'.repeat(256)+'1',
    '9'.repeat(400)
  ])assert.throws(()=>validateFlowFormula(expression),undefined,expression);
  assert.throws(()=>evaluateFlowFormula('('+ '9'.repeat(200)+') * ('+'9'.repeat(200)+')',
    serverResolve),/finite/);
  assert.equal(evaluateFieldExpressionDetailed('@Record.constructor',browserRecord).value,'');
});

test('Flow formula resource dependencies reject cycles during authoring',()=>{
  assert.deepEqual(validateFlowResources([
    {name:'First',type:'Formula',dataType:'Text',value:'{!Second}'},
    {name:'Second',type:'Formula',dataType:'Text',value:'{!First}'}
  ]),['Cyclic Flow formula resource dependency: First -> Second -> First']);
  assert.deepEqual(validateFlowResources([
    {name:'First',type:'Formula',dataType:'Text',value:'{!Second}'},
    {name:'Second',type:'Formula',dataType:'Text',value:'"ready"'}
  ]),[]);
});

test('record lifecycle functions and globals are rejected outside record-triggered flows',()=>{
  assert.deepEqual(validateFlowResources([
    {name:'CloneFlag',type:'Formula',dataType:'Boolean',value:'ISCLONE()'}
  ]),['Record lifecycle formula functions and globals are only supported in Record-Triggered Flows']);
  assert.deepEqual(validateFlowResources([
    {name:'TypeName',type:'Formula',dataType:'Text',value:'$RecordType.Name'}
  ]),['Record lifecycle formula functions and globals are only supported in Record-Triggered Flows']);
  assert.deepEqual(validateFlowResources([
    {name:'CloneFlag',type:'Formula',dataType:'Boolean',value:'ISCLONE()'}
  ],true),[]);
});

test('function calls use declared arity and contexts at authoring time',()=>{
  assert.throws(()=>validateFlowFormula('ROUND()'),/Invalid argument count for ROUND/);
  assert.throws(()=>validateFlowFormula('LEFT("text", 1, 2)'),/Invalid argument count for LEFT/);
  assert.throws(()=>validateFlowFormula('UNKNOWN("x")'),/Unsupported Flow formula function: UNKNOWN/);
  const expression=new Parser(tokenize('ISNEW()')).parse();
  assert.throws(()=>validateFormulaFunctions(expression,'ribbon_binding'),/not available/);
});
