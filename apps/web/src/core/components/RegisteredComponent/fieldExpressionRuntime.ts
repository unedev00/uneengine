import {
 evaluateFieldExpressionDetailed,FieldExpressionEvaluationError,
 type FormulaBindingContext
} from '../../../component-libraries/shared/FieldExpression.js';

function isFieldExpression(value:string):boolean{
  const input=value.trim();
  return /^(?:TRUE|FALSE|NULL|PI)$/i.test(input)||input.startsWith('(')||/^[+-]\d/.test(input)
    ||input.startsWith('@')||/^"(?:[^"]|"")*"\s*&/.test(input)
    ||/^(?:\d+(?:\.\d+)?\s*[+\-*/%^<>]|"(?:[^"]|"")*"\s*(?:&|=|<>|!=|<=|>=|<|>))/.test(input)
    ||/^(?:IF|IFERROR|CASE|AND|OR|NOT|XOR|ISBLANK|ISNULL|ISNUMBER|BLANKVALUE|NULLVALUE|TEXT|VALUE|ASCII|LOWER|UPPER|PROPER|INITCAP|LEN|TRIM|LEFT|RIGHT|MID|FIND|BEGINS|CONTAINS|EXACT|ISPICKVAL|INCLUDES|CONCATENATE|SUBSTITUTE|REPT|REVERSE|ENCODEURL|URLENCODE|URLDECODE|LPAD|RPAD|REPLACE|CHAR|CASESAFEID|T|COLLECTIONCOUNT|COLLECTIONSUM|VLOOKUP|ABS|ROUND|ROUNDUP|ROUNDDOWN|TRUNC|SIGN|MIN|MAX|MOD|SQRT|POWER|CEILING|FLOOR|MCEILING|MFLOOR|EXP|LN|LOG|SIN|COS|TAN|ASIN|ACOS|ATAN|ATAN2|SINH|COSH|TANH|DEGREES|RADIANS|DATE|DATEVALUE|DATETIMEVALUE|TODAY|NOW|DAY|MONTH|YEAR|HOUR|MINUTE|SECOND|TIMEVALUE|TIMENOW|TZOFFSET|WEEKDAY|ISOWEEK|ISOYEAR|ADDDAYS|ADDMONTHS|GEOLOCATION|DISTANCE)\s*\(/i.test(input);
}

/** Resolve text-property bindings against the already authorised record supplied to the component.
 * Never eval expressions, traverse dotted paths or fetch fields outside the runtime record. */
export function resolveFieldText(
  expression:unknown,record:unknown,context?:FormulaBindingContext
):unknown {
  if(typeof expression!=='string')return expression;
  if(!isFieldExpression(expression))return expression;
  const source=record&&typeof record==='object'&&!Array.isArray(record)?record as Record<string,unknown>:{};
  const result=evaluateFieldExpressionDetailed(expression,source,context);
  if(result.error)throw new FieldExpressionEvaluationError(result.error);
  return result.value;
}

export function resolveRegisteredTextProperties(
 definitions:ReadonlyArray<{propertyKey:string;kind:string}>,properties:Record<string,unknown>,
 context?:FormulaBindingContext
):Record<string,unknown>{
  const formulaContext=context??{timeZone:'UTC',now:new Date()};
  const record=properties.record??properties.currentRecord??properties.recordData;
  const hasRecord=Boolean(record&&typeof record==='object'&&!Array.isArray(record));
  let next=properties;
  for(const definition of definitions){
    if(!['TEXT','LONG_TEXT','TEXTAREA','STRING'].includes(definition.kind))continue;
    const value=properties[definition.propertyKey];
    if(typeof value!=='string'||!isFieldExpression(value))continue;
    if(!hasRecord&&/@[A-Za-z]/.test(value))continue;
    if(next===properties)next={...properties};
    next[definition.propertyKey]=resolveFieldText(value,record,formulaContext);
  }
  return next;
}
