import {
 evaluateFieldExpressionDetailed,FieldExpressionEvaluationError,
 type FormulaBindingContext
} from '../../../component-libraries/shared/FieldExpression.js';

let authenticatedFormulaBindingContext:FormulaBindingContext|null=null;
export function setAuthenticatedFormulaBindingContext(user:unknown):void {
  if(!user||typeof user!=='object'||Array.isArray(user)){
    authenticatedFormulaBindingContext=null;
    return;
  }
  const session=user as Record<string,unknown>;
  if(typeof session.timeZone!=='string'||!session.timeZone
    ||typeof session.locale!=='string'||!session.locale){
    authenticatedFormulaBindingContext=null;
    return;
  }
  new Intl.DateTimeFormat('en',{timeZone:session.timeZone});
  authenticatedFormulaBindingContext=Object.freeze({
    timeZone:session.timeZone,locale:session.locale,
    currencyIsoCode:typeof session.currencyIsoCode==='string'?session.currencyIsoCode:null,
    user:Object.freeze({
      Id:session.id,Name:session.displayName,Email:session.email,TimeZone:session.timeZone,
      Locale:session.locale,CurrencyIsoCode:session.currencyIsoCode??null
    }),
    profile:Object.freeze({
      Id:session.profileId??null,Name:session.profileName??null,
      DeveloperName:session.profileApi??null
    }),
    organization:Object.freeze({Id:session.tenantId,Name:session.tenantName})
  });
}
export function getAuthenticatedFormulaBindingContext():FormulaBindingContext|null {
  return authenticatedFormulaBindingContext;
}

function isFieldExpression(value:string):boolean{
  const input=value.trim();
  return /^(?:TRUE|FALSE|NULL|PI)$/i.test(input)||input.startsWith('(')||/^[+-]\d/.test(input)
    ||input.startsWith('@')||input.startsWith('{!')||/^"(?:[^"]|"")*"\s*&/.test(input)
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
  for(const [,scope,property] of expression.matchAll(
    /(?:@|\{!)\$(User|Profile|Organization|RecordType|Permission)(?:\.([A-Za-z][A-Za-z0-9_]*))?/g)){
    const supported=scope==='User'
      ?['Id','Name','Email','TimeZone','Locale','CurrencyIsoCode']
      :scope==='Profile'||scope==='RecordType'?['Id','Name','DeveloperName']
        :scope==='Organization'?['Id','Name']:[];
    if(scope==='Permission'&&(!context?.permissions||!property
      ||!Object.hasOwn(context.permissions,property)))
      throw new FieldExpressionEvaluationError('Custom permission snapshot is unavailable in page-binding context');
    if(property&&scope!=='Permission'&&!supported.includes(property))
      throw new FieldExpressionEvaluationError('Unsupported formula global reference: $'+scope+'.'+property);
  }
  const source=record&&typeof record==='object'&&!Array.isArray(record)?record as Record<string,unknown>:{};
  if(/(?:@|\{!)\$Permission\./.test(expression)&&!context?.permissions)
    throw new FieldExpressionEvaluationError('Custom permissions are unavailable in page-binding context');
  const recordType=context?.recordType??(typeof source.RecordTypeId==='string'
    ?{Id:source.RecordTypeId}:undefined);
  const referenceSource={
    ...source,Record:source,'$Record':source,
    ...(context?.user?{'$User':context.user}:{}),
    ...(context?.profile?{'$Profile':context.profile}:{}),
    ...(context?.organization?{'$Organization':context.organization}:{}),
    ...(recordType?{'$RecordType':recordType}:{}),
    ...(context?.permissions?{'$Permission':context.permissions}:{})
  };
  const result=evaluateFieldExpressionDetailed(expression,referenceSource,context);
  if(result.error)throw new FieldExpressionEvaluationError(result.error);
  return result.value;
}

export function resolveRegisteredTextProperties(
 definitions:ReadonlyArray<{propertyKey:string;kind:string}>,properties:Record<string,unknown>,
 context?:FormulaBindingContext
):Record<string,unknown>{
  const baseContext=context??getAuthenticatedFormulaBindingContext()??undefined;
  const formulaContext=baseContext
    ?{...baseContext,now:baseContext.now??new Date()}:undefined;
  const record=properties.record??properties.currentRecord??properties.recordData;
  const hasRecord=Boolean(record&&typeof record==='object'&&!Array.isArray(record));
  const resolvedContext=withRecordTypeContext(formulaContext,record,properties.object);
  let next=properties;
  for(const definition of definitions){
    if(!['TEXT','LONG_TEXT','TEXTAREA','STRING'].includes(definition.kind))continue;
    const value=properties[definition.propertyKey];
    if(typeof value!=='string'||!isFieldExpression(value))continue;
    if(!hasRecord&&/@[A-Za-z]/.test(value))continue;
    if(!resolvedContext?.timeZone&&requiresAuthenticatedTimeZone(value,record))
      throw new FieldExpressionEvaluationError('Authenticated formula time zone is unavailable');
    if(next===properties)next={...properties};
    next[definition.propertyKey]=resolveFieldText(value,record,resolvedContext);
  }
  return next;
}

function requiresAuthenticatedTimeZone(expression:string,record:unknown):boolean {
  if(/\b(?:TODAY|NOW|TIMENOW|TZOFFSET|HOUR|MINUTE|SECOND|DATEVALUE|DATETIMEVALUE|DAY|MONTH|YEAR|WEEKDAY|ISOWEEK|ISOYEAR)\s*\(/i.test(expression))
    return true;
  if(!record||typeof record!=='object'||Array.isArray(record))return false;
  const source=record as Record<string,unknown>;
  const references=[...expression.matchAll(/@([A-Za-z_$][A-Za-z0-9_$.]*)/g)]
    .map(match=>match[1].split('.').at(-1)??'');
  return references.some(name=>{
    const value=source[name];
    return value instanceof Date
      ||typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value);
  });
}

function withRecordTypeContext(context:FormulaBindingContext|undefined,
  record:unknown,object:unknown):FormulaBindingContext|undefined {
  if(!record||typeof record!=='object'||Array.isArray(record))return context;
  const recordValues=record as Record<string,unknown>;
  const recordTypeId=recordValues.RecordTypeId;
  if(typeof recordTypeId!=='string')return context;
  const metadata=object&&typeof object==='object'&&!Array.isArray(object)
    ?(object as Record<string,unknown>).recordTypes:null;
  const recordTypes=Array.isArray(metadata)?metadata:[];
  const definition=recordTypes.find((item:unknown)=>item&&typeof item==='object'
    &&!Array.isArray(item)&&(item as Record<string,unknown>).id===recordTypeId) as Record<string,unknown>|undefined;
  const recordType=definition?{
    Id:recordTypeId,Name:definition.label,DeveloperName:definition.developerName
  }:{Id:recordTypeId};
  return {...context,recordType};
}
