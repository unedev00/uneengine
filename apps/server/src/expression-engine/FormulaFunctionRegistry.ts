import type {Expression} from './FormulaParser.js';

export type FormulaExpressionContext='formula_field'|'validation_rule'|'flow_formula'
  |'component_visibility'|'record_filter'|'ribbon_binding';
type FormulaValueKind='Any'|'Number'|'Text'|'Checkbox'|'Date'|'DateTime'|'Time'
  |'Picklist'|'MultiPicklist'|'Geolocation'|'Collection';
type FormulaFunctionParameter={name:string;type:FormulaValueKind;optional:boolean};
export type FormulaFunctionDefinition={
  name:string;
  signature:{
    parameters:readonly FormulaFunctionParameter[];
    minimumArguments:number;
    maximumArguments:number;
    returnType:FormulaValueKind;
  };
  allowedContexts:readonly FormulaExpressionContext[];
};
type DefinitionInput=[name:string,min:number,max:number,contexts?:readonly FormulaExpressionContext[]];

const serverContexts:readonly FormulaExpressionContext[]=['formula_field','validation_rule','flow_formula'];
const formulaAndFlow:readonly FormulaExpressionContext[]=['formula_field','flow_formula'];
const validationAndFlow:readonly FormulaExpressionContext[]=['validation_rule','flow_formula'];
const flowOnly:readonly FormulaExpressionContext[]=['flow_formula'];
const ribbonFunctions=new Set([
  'IF','IFERROR','AND','OR','NOT','XOR','ISBLANK','ISNULL','ISNUMBER','BLANKVALUE','NULLVALUE',
  'TEXT','VALUE','LEN','ASCII','LOWER','UPPER','PROPER','TRIM','LEFT','RIGHT','MID','FIND',
  'SUBSTITUTE','CONCATENATE','EXACT','CONTAINS','BEGINS','ISPICKVAL','INCLUDES','REPT',
  'REVERSE','ENCODEURL','URLENCODE','URLDECODE','CHAR','INITCAP','LPAD','RPAD','REPLACE',
  'CASESAFEID','T','ABS','ROUND','ROUNDUP','ROUNDDOWN','TRUNC','SIGN','MIN','MAX','MOD',
  'SQRT','POWER','CEILING','FLOOR','MCEILING','MFLOOR','EXP','LN','LOG','CASE','DATE',
  'DATEVALUE','DATETIMEVALUE','TODAY','NOW','DAY','MONTH','YEAR','HOUR','MINUTE','SECOND',
  'WEEKDAY','ISOWEEK','ISOYEAR','ADDDAYS','ADDMONTHS','TIMEVALUE','TIMENOW','SIN','COS',
  'PI','TAN','ASIN','ACOS','ATAN','ATAN2','SINH','COSH','TANH','DEGREES','RADIANS','TZOFFSET',
  'GEOLOCATION','DISTANCE','COLLECTIONCOUNT','COLLECTIONSUM','VLOOKUP'
]);
const flowContextOnly=new Set(['ISCHANGED','ISNEW','PRIORVALUE']);
const formulaAndFlowOnly=new Set(['IMAGE','CURRENCYRATE']);
const numberFunctions=new Set([
  'VALUE','LEN','ASCII','COLLECTIONCOUNT','COLLECTIONSUM','CURRENCYRATE','ABS','ROUND','ROUNDUP',
  'ROUNDDOWN','TRUNC','SIGN','MIN','MAX','MOD','SQRT','POWER','CEILING','FLOOR','MCEILING',
  'MFLOOR','EXP','LN','LOG','PI','DAY','MONTH','YEAR','HOUR','MINUTE','SECOND','WEEKDAY',
  'ISOWEEK','ISOYEAR','TZOFFSET','DISTANCE','SIN','COS','TAN','ASIN','ACOS','ATAN','ATAN2',
  'SINH','COSH','TANH','DEGREES','RADIANS'
]);
const textFunctions=new Set([
  'TEXT','LEFT','RIGHT','MID','SUBSTITUTE','CONCATENATE','REVERSE','LOWER','UPPER','PROPER',
  'TRIM','ENCODEURL','URLENCODE','URLDECODE','LPAD','RPAD','REPLACE','CHAR','CASESAFEID',
  'INITCAP','T','IMAGE'
]);
const checkboxFunctions=new Set([
  'AND','OR','NOT','XOR','ISBLANK','ISNULL','ISNUMBER','ISCHANGED','ISNEW','ISCLONE','EXACT',
  'CONTAINS','BEGINS','ISPICKVAL','INCLUDES'
]);
const explicitParameters=new Map<string,FormulaValueKind[]>([
  ['IF',['Checkbox','Any','Any']],['IFERROR',['Any','Any']],['NOT',['Checkbox']],
  ['AND',['Checkbox']],['OR',['Checkbox']],['XOR',['Checkbox']],['VALUE',['Text']],
  ['LEN',['Text']],['ASCII',['Text']],['LEFT',['Text','Number']],['RIGHT',['Text','Number']],
  ['MID',['Text','Number','Number']],['FIND',['Text','Text','Number']],
  ['SUBSTITUTE',['Text','Text','Text','Number']],['EXACT',['Text','Text']],
  ['CONTAINS',['Text','Text']],['BEGINS',['Text','Text']],['ISPICKVAL',['Picklist','Text']],
  ['INCLUDES',['MultiPicklist','Text']],['REPT',['Text','Number']],
  ['LPAD',['Text','Number','Text']],['RPAD',['Text','Number','Text']],
  ['REPLACE',['Text','Number','Number','Text']],['CASESAFEID',['Text']],
  ['IMAGE',['Text','Text','Number','Number']],['CURRENCYRATE',['Text']],
  ['ROUND',['Number','Number']],['ROUNDUP',['Number','Number']],
  ['ROUNDDOWN',['Number','Number']],['TRUNC',['Number','Number']],
  ['MOD',['Number','Number']],['POWER',['Number','Number']],['LOG',['Number','Number']],
  ['DATE',['Number','Number','Number']],['ADDDAYS',['Date','Number']],
  ['ADDMONTHS',['Date','Number']],['DATEVALUE',['Text']],['DATETIMEVALUE',['Text']],
  ['TIMEVALUE',['Text']],['TZOFFSET',['DateTime']],['GEOLOCATION',['Number','Number']],
  ['DISTANCE',['Geolocation','Geolocation','Text']]
]);
const returnType=(name:string):FormulaValueKind=>numberFunctions.has(name)?'Number':
  textFunctions.has(name)?'Text':checkboxFunctions.has(name)?'Checkbox':
    name==='DATE'||name==='TODAY'||name==='ADDDAYS'?'Date':
      name==='NOW'||name==='DATETIMEVALUE'?'DateTime':
        name==='TIMENOW'||name==='TIMEVALUE'?'Time':
          name==='GEOLOCATION'?'Geolocation':'Any';

const inputs:DefinitionInput[]=[
  ['IF',3,3],['IFERROR',2,2],['AND',1,20],['OR',1,20],['NOT',1,1],['XOR',2,20],
  ['ISBLANK',1,1],['ISNULL',1,1],['ISNUMBER',1,1],['ISCHANGED',1,1,validationAndFlow],
  ['ISNEW',0,0,validationAndFlow],['ISCLONE',0,0],['PRIORVALUE',1,1,validationAndFlow],
  ['BLANKVALUE',2,2],['NULLVALUE',2,2],['TEXT',1,1],['VALUE',1,1],['LEN',1,1],
  ['COLLECTIONCOUNT',1,1,flowOnly],['COLLECTIONSUM',2,2,flowOnly],['ASCII',1,1],
  ['LOWER',1,1],['UPPER',1,1],['PROPER',1,1],['TRIM',1,1],['LEFT',1,2],['RIGHT',1,2],
  ['MID',3,3],['FIND',2,3],['SUBSTITUTE',3,4],['CONCATENATE',1,20],['EXACT',2,2],
  ['CONTAINS',2,2],['BEGINS',2,2],['ISPICKVAL',2,2],['INCLUDES',2,2],['REPT',2,2],
  ['REVERSE',1,1],['ENCODEURL',1,1],['URLENCODE',1,1],['URLDECODE',1,1],['CHAR',1,1],
  ['INITCAP',1,1],['LPAD',2,3],['RPAD',2,3],['REPLACE',4,4],['CASESAFEID',1,1],['T',1,1],
  ['IMAGE',2,4,formulaAndFlow],['CURRENCYRATE',1,1,formulaAndFlow],['ABS',1,1],
  ['ROUND',1,2],['ROUNDUP',1,2],['ROUNDDOWN',1,2],['TRUNC',1,2],['SIGN',1,1],
  ['MIN',1,20],['MAX',1,20],['MOD',2,2],['SQRT',1,1],['POWER',2,2],['CEILING',1,1],
  ['FLOOR',1,1],['MCEILING',1,1],['MFLOOR',1,1],['EXP',1,1],['LN',1,1],['LOG',1,2],
  ['CASE',4,12],['DATE',3,3],['DATEVALUE',1,1],['DATETIMEVALUE',1,1],['TODAY',0,0],
  ['NOW',0,0],['DAY',1,1],['MONTH',1,1],['YEAR',1,1],['HOUR',1,1],['MINUTE',1,1],
  ['SECOND',1,1],['WEEKDAY',1,1],['ISOWEEK',1,1],['ISOYEAR',1,1],['ADDDAYS',2,2],
  ['ADDMONTHS',2,2],['TIMEVALUE',1,1],['TIMENOW',0,0],['PI',0,0],['SIN',1,1],
  ['COS',1,1],['TAN',1,1],['ASIN',1,1],['ACOS',1,1],['ATAN',1,1],['ATAN2',2,2],
  ['SINH',1,1],['COSH',1,1],['TANH',1,1],['DEGREES',1,1],['RADIANS',1,1],
  ['TZOFFSET',1,1],['GEOLOCATION',2,2],['DISTANCE',3,3],['VLOOKUP',4,4,flowOnly]
];

const definitions=new Map<string,FormulaFunctionDefinition>();
for(const [name,minimumArguments,maximumArguments,contextOverride] of inputs){
  const allowedContexts=contextOverride??(flowContextOnly.has(name)?validationAndFlow:
    formulaAndFlowOnly.has(name)?formulaAndFlow:
      serverContexts);
  const declaredParameters=explicitParameters.get(name)??[];
  const parameters=Array.from({length:maximumArguments},(_,index)=>({
    name:'argument'+(index+1),type:declaredParameters[index]??'Any' as const,
    optional:index>=minimumArguments
  }));
  definitions.set(name,Object.freeze({
    name,
    signature:Object.freeze({
      parameters:Object.freeze(parameters),minimumArguments,maximumArguments,returnType:returnType(name)
    }),
    allowedContexts:Object.freeze(ribbonFunctions.has(name)
      ?[...allowedContexts,'ribbon_binding' as const]:[...allowedContexts])
  }));
}

export const formulaFunctionCatalog:ReadonlyMap<string,FormulaFunctionDefinition>=definitions;
export const supportedFunctions:ReadonlySet<string>=new Set(definitions.keys());
export function getFormulaFunctionNames(context:FormulaExpressionContext):string[] {
  return [...definitions.values()].filter(definition=>definition.allowedContexts.includes(context))
    .map(definition=>definition.name);
}
export function validateFormulaFunctions(expression:Expression,context:FormulaExpressionContext):void {
  const visit=(node:Expression):void=>{
    if(node.kind==='call'){
      const definition=definitions.get(node.name);
      if(!definition)throw new Error((context==='flow_formula'
        ?'Unsupported Flow formula function: ':'Unsupported formula function: ')+node.name);
      if(!definition.allowedContexts.includes(context)){
        const allowed=definition.allowedContexts.map(value=>value.replaceAll('_',' ')).join(', ');
        throw new Error('Formula function '+node.name+' is not available in '+context.replaceAll('_',' ')+
          ' context; supported contexts: '+allowed);
      }
      const {minimumArguments,maximumArguments}=definition.signature;
      if(node.args.length<minimumArguments||node.args.length>maximumArguments)
        throw new Error('Invalid argument count for '+node.name+
          ' (expected '+minimumArguments+'-'+maximumArguments+')');
      node.args.forEach(visit);
    }else if(node.kind==='unary')visit(node.value);
    else if(node.kind==='binary'){visit(node.left);visit(node.right);}
  };
  visit(expression);
}
