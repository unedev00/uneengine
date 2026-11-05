import {executeActionPlan,normalizeFlowCalls} from '../../../../server/src/expression-engine/ActionFormulas.js';
/** Bounded browser formula evaluator shared by page bindings and UNE renderers.
 * It reads only own properties of the already-authorised record and never evals code.
 */
import {
 evaluateFormulaBinary,evaluateFormulaUnary,formulaTruth,Parser
} from '../../../../server/src/expression-engine/FormulaParser.js';
import {tokenize} from '../../../../server/src/expression-engine/FormulaTokenizer.js';
import {getTenantBrand} from './TenantBrand.js';
import {createNamedFormulaCollection,createCriteriaFormulaCollection,deriveFormulaCollection,sumFormulaCollection,projectFormulaTable,matchesFormulaCollectionCriterion} from '../../../../server/src/expression-engine/FormulaCollection.js';
import {isExcelWildcardDataReference,matchesExcelWildcard,hasExcelWildcardCriteria} from '../../../../server/src/expression-engine/FormulaWildcard.js';
import {validateFormulaFunctions} from '../../../../server/src/expression-engine/FormulaFunctionRegistry.js';
import {roundFormulaNumber} from '../../../../server/src/expression-engine/FormulaNumeric.js';
import {
 evaluateFormulaDateBinary,formulaAddDays,formulaAddMonths,formulaDateParts,formulaDateText,
 formulaDateTimeParts,formulaIsoDateTime,formulaIsoParts,formulaTimeText,formulaTimezoneOffset,
 formulaWeekday,isFormulaDate,parseFormulaDateTime
} from '../../../../server/src/expression-engine/FormulaDate.js';

const text=value=>value==null?'':String(value);
const formulaText=value=>typeof value==='boolean'?value?'TRUE':'FALSE':text(value);
const textPoints=value=>Array.from(text(value));
const numeric=value=>{
 const result=typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;
 if(!Number.isFinite(result))throw Error('Expected a finite number');
 return result;
};
const truth=formulaTruth;
const compare=(left,right)=>{
 if(typeof left==='number'&&typeof right==='number')return left===right?0:left<right?-1:1;
 if(typeof left==='boolean'&&typeof right==='boolean')return left===right?0:left?1:-1;
 if(typeof left==='string'&&typeof right==='string'){
  if(left===right)return 0;
  if(/^\d{4}-\d\d-\d\d(?:T.*)?$/.test(left)&&/^\d{4}-\d\d-\d\d(?:T.*)?$/.test(right))
   return left<right?-1:1;
  return left<right?-1:1;
 }
 return null;
};
const evaluateCall=(name,args,context)=>{
 const arity=(minimum,maximum=minimum)=>{
  if(args.length<minimum||args.length>maximum)throw Error(`Invalid ${name} argument count`);
 };
 switch(name){
  case 'TEXT':arity(1);return formulaText(args[0]);
  case 'VALUE':arity(1);return numeric(args[0]);
  case 'UPPER':arity(1);return text(args[0]).toUpperCase();
  case 'LOWER':arity(1);return text(args[0]).toLowerCase();
  case 'PROPER':case 'INITCAP':arity(1);return text(args[0]).toLowerCase()
   .replace(/(^|[^\p{L}\p{N}])(\p{L})/gu,(_match,prefix,letter)=>prefix+letter.toUpperCase());
  case 'LEN':arity(1);return textPoints(args[0]).length;
  case 'TRIM':arity(1);return text(args[0]).trim();
  case 'LEFT':arity(1,2);return textPoints(args[0])
   .slice(0,Math.max(0,Math.trunc(numeric(args.length===1?1:args[1])))).join('');
  case 'RIGHT':arity(1,2);{
   const value=textPoints(args[0]),length=Math.max(0,Math.trunc(numeric(args.length===1?1:args[1])));
   return length===0?'':value.slice(-length).join('');
  }
  case 'MID':arity(3);{
   const value=textPoints(args[0]),start=Math.max(0,Math.trunc(numeric(args[1]))-1);
   return value.slice(start,start+Math.max(0,Math.trunc(numeric(args[2])))).join('');
  }
  case 'FIND':arity(2,3);{
   const haystack=textPoints(args[1]),needle=textPoints(args[0]);
   const start=Math.max(0,Math.trunc(numeric(args.length===2?1:args[2]))-1);
   let found=-1;
   for(let index=start;index<=haystack.length-needle.length;index++){
    if(needle.every((point,offset)=>haystack[index+offset]===point)){found=index;break;}
   }
   return found<0?0:found+1;
  }
   case 'BEGINS':case 'CONTAINS':case 'EXACT':arity(2);
   if(name==='BEGINS')return text(args[0]).startsWith(text(args[1]));
   if(name==='CONTAINS')return text(args[0]).includes(text(args[1]));
   return text(args[0])===text(args[1]);
  case 'COLLECTION':arity(2,20);return createNamedFormulaCollection(args[0],args.slice(1));
  case 'SUM':arity(1);return sumFormulaCollection(args[0],context.collectionSources);
   case 'CONCATENATE':arity(1,20);return args.map(text).join('');
  case 'SUBSTITUTE':arity(3,4);{
   const source=text(args[0]),search=text(args[1]),replacement=text(args[2]);
   if(!search)return source;
   const instance=args[3]===undefined?0:Math.trunc(numeric(args[3]));
   if(instance<0)throw Error('Invalid SUBSTITUTE instance');
   if(!instance)return source.split(search).join(replacement);
   let count=0;return source.replaceAll(search,match=>++count===instance?replacement:match);
  }
  case 'REPT':arity(2);{
   const value=text(args[0]),count=Math.trunc(numeric(args[1]));
   if(count<0||textPoints(value).length*count>4000)throw Error('REPT result exceeds the 4000-character limit');
   return value.repeat(count);
  }
  case 'ASCII':arity(1);return text(args[0]).codePointAt(0)??0;
  case 'ISPICKVAL':arity(2);return text(args[0])===text(args[1]);
  case 'INCLUDES':arity(2);return text(args[0]).split(';').filter(Boolean).includes(text(args[1]));
  case 'ISNUMBER':arity(1);return typeof args[0]==='number'&&Number.isFinite(args[0])
   ||typeof args[0]==='string'&&args[0].trim()!==''&&Number.isFinite(Number(args[0]));
  case 'REVERSE':arity(1);return [...text(args[0])].reverse().join('');
  case 'ENCODEURL':case 'URLENCODE':arity(1);return encodeURIComponent(text(args[0]));
  case 'URLDECODE':arity(1);return decodeURIComponent(text(args[0]));
  case 'LPAD':case 'RPAD':arity(2,3);{
   const source=textPoints(args[0]),length=Math.trunc(numeric(args[1])),pad=textPoints(args[2]===undefined?' ':args[2]);
   if(length<0||length>4000||pad.length===0)throw Error(`Invalid ${name} arguments`);
   if(source.length>=length)return source.slice(0,length).join('');
   const fill=Array.from({length:length-source.length},(_,index)=>pad[index%pad.length]);
   return name==='LPAD'?[...fill,...source].join(''):[...source,...fill].join('');
  }
  case 'REPLACE':arity(4);{
   const source=textPoints(args[0]),start=Math.trunc(numeric(args[1]))-1,length=Math.trunc(numeric(args[2]));
   if(start<0||length<0)throw Error('Invalid REPLACE position or length');
   return source.slice(0,start).join('')+text(args[3])+source.slice(start+length).join('');
  }
  case 'CHAR':arity(1);{
   const code=Math.trunc(numeric(args[0]));
   if(code<1||code>255)throw Error('Invalid CHAR code');
   return String.fromCharCode(code);
  }
  case 'CASESAFEID':arity(1);{
   const id=text(args[0]);
   if(!/^[A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?$/.test(id))throw Error('Invalid record ID');
   const source=id.slice(0,15),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
   const suffix=Array.from({length:3},(_,block)=>{
    let mask=0;for(let bit=0;bit<5;bit++)if(source[block*5+bit]>='A'&&source[block*5+bit]<='Z')mask|=1<<bit;
    return alphabet[mask];
   }).join('');
   if(id.length===18&&id.slice(15)!==suffix)throw Error('Invalid 18-character record ID');
   return source+suffix;
  }
  case 'T':arity(1);return typeof args[0]==='string'?args[0]:'';
  case 'XOR':arity(2,20);return args.reduce((result,value)=>result!==truth(value),false);
  case 'COLLECTIONCOUNT':case 'COLLECTIONSUM':{
   arity(name==='COLLECTIONCOUNT'?1:2);
   const rows=args[0];
   if(!Array.isArray(rows)||rows.length>200||rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)))
    throw Error(`${name} requires a bounded record collection`);
   if(name==='COLLECTIONCOUNT')return rows.length;
   const field=text(args[1]);
   if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(field))throw Error('Invalid COLLECTIONSUM field');
   return rows.reduce((sum,row)=>{
    if(typeof row[field]!=='number'||!Number.isFinite(row[field]))throw Error('Invalid COLLECTIONSUM value');
    return sum+row[field];
   },0);
  }
  case 'VLOOKUP':arity(4);{
   const [needle,rows,lookupField,resultField]=args;
   if(!Array.isArray(rows)||rows.length>200||! /^[A-Za-z][A-Za-z0-9_]*$/.test(text(lookupField))
    ||! /^[A-Za-z][A-Za-z0-9_]*$/.test(text(resultField)))throw Error('Invalid VLOOKUP arguments');
   const match=rows.find(row=>row&&typeof row==='object'&&!Array.isArray(row)
    &&Object.prototype.hasOwnProperty.call(row,text(lookupField))&&row[text(lookupField)]===needle);
   if(!match)return null;
   const result=Object.prototype.hasOwnProperty.call(match,text(resultField))?match[text(resultField)]:null;
   if(result!==null&&!['string','number','boolean'].includes(typeof result))throw Error('Invalid VLOOKUP result');
   return result;
  }
  case 'ISBLANK':arity(1);return args[0]===null||args[0]===undefined||args[0]==='';
  case 'ISNULL':arity(1);return args[0]===null||args[0]===undefined;
  case 'BLANKVALUE':arity(2);return args[0]===null||args[0]===undefined||args[0]===''?args[1]:args[0];
  case 'NULLVALUE':arity(2);return args[0]===null||args[0]===undefined?args[1]:args[0];
  case 'ABS':arity(1);return Math.abs(numeric(args[0]));
  case 'ROUND':case 'ROUNDUP':case 'ROUNDDOWN':case 'TRUNC':{
   arity(1,2);
   const precision=args.length===1?0:numeric(args[1]);
   return roundFormulaNumber(numeric(args[0]),precision,name);
  }
  case 'MIN':arity(1,20);return Math.min(...args.map(numeric));
  case 'MAX':arity(1,20);return Math.max(...args.map(numeric));
  case 'SIGN':arity(1);return Math.sign(numeric(args[0]));
  case 'MOD':arity(2);{
   const divisor=numeric(args[1]);if(divisor===0)throw Error('MOD divisor must not be zero');
   return numeric(args[0])%divisor;
  }
  case 'SQRT':arity(1);{
   const value=numeric(args[0]);
   if(value<0)throw Error('SQRT requires a non-negative value');
   return Math.sqrt(value);
  }
  case 'POWER':arity(2);return numeric(args[0])**numeric(args[1]);
  case 'CEILING':arity(1);return Math.ceil(numeric(args[0]));
  case 'FLOOR':arity(1);return Math.floor(numeric(args[0]));
  case 'MCEILING':arity(1);return Math.ceil(numeric(args[0]));
  case 'MFLOOR':arity(1);return Math.floor(numeric(args[0]));
  case 'EXP':arity(1);return Math.exp(numeric(args[0]));
  case 'LN':arity(1);{
   const value=numeric(args[0]);if(value<=0)throw Error('LN requires a positive value');return Math.log(value);
  }
  case 'LOG':arity(1,2);{
   const value=numeric(args[0]),base=args.length===1?10:numeric(args[1]);
   if(value<=0||base<=0||base===1)throw Error('Invalid LOG arguments');
   return Math.log(value)/Math.log(base);
  }
  case 'SIN':arity(1);return Math.sin(numeric(args[0]));
  case 'COS':arity(1);return Math.cos(numeric(args[0]));
  case 'TAN':arity(1);return Math.tan(numeric(args[0]));
  case 'ASIN':case 'ACOS':{
   arity(1);const value=numeric(args[0]);
   if(value< -1||value>1)throw Error(`${name} argument must be between -1 and 1`);
   return name==='ASIN'?Math.asin(value):Math.acos(value);
  }
  case 'ATAN':arity(1);return Math.atan(numeric(args[0]));
  case 'ATAN2':arity(2);return Math.atan2(numeric(args[0]),numeric(args[1]));
  case 'SINH':arity(1);return Math.sinh(numeric(args[0]));
  case 'COSH':arity(1);return Math.cosh(numeric(args[0]));
  case 'TANH':arity(1);return Math.tanh(numeric(args[0]));
  case 'DEGREES':arity(1);return numeric(args[0])*180/Math.PI;
  case 'RADIANS':arity(1);return numeric(args[0])*Math.PI/180;
  case 'PI':arity(0);return Math.PI;
  case 'DATE':arity(3);{
   const year=Math.trunc(numeric(args[0])),month=Math.trunc(numeric(args[1])),day=Math.trunc(numeric(args[2]));
   if(year<1||year>9999||month<1||month>12||day<1||day>31)throw Error('Invalid DATE arguments');
   const value=`${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
   if(!isFormulaDate(value))throw Error('Invalid DATE arguments');
   return value;
  }
  case 'DATEVALUE':arity(1);{
   const value=text(args[0]);
   if(isFormulaDate(value))return value;
   return formulaDateText(formulaDateParts(parseFormulaDateTime(value,context.timeZone),context.timeZone));
  }
  case 'GEOLOCATION':arity(2);{
   const latitude=numeric(args[0]),longitude=numeric(args[1]);
   if(latitude< -90||latitude>90||longitude< -180||longitude>180)throw Error('Invalid geolocation');
   return {latitude,longitude};
  }
  case 'DISTANCE':arity(3);{
   const coordinates=value=>{
    if(!value||typeof value!=='object'||!('latitude'in value)||!('longitude'in value))throw Error('Invalid geolocation');
    const latitude=numeric(value.latitude),longitude=numeric(value.longitude);
    if(latitude< -90||latitude>90||longitude< -180||longitude>180)throw Error('Invalid geolocation');
    return {latitude,longitude};
   };
   const first=coordinates(args[0]),second=coordinates(args[1]),unit=text(args[2]).toLowerCase();
   const radians=degrees=>degrees*Math.PI/180,lat=radians(second.latitude-first.latitude),lon=radians(second.longitude-first.longitude);
   const haversine=Math.sin(lat/2)**2+Math.cos(radians(first.latitude))*Math.cos(radians(second.latitude))*Math.sin(lon/2)**2;
   const kilometers=6371.0088*2*Math.atan2(Math.sqrt(haversine),Math.sqrt(1-haversine));
   if(unit==='km')return kilometers;
   if(unit==='mi')return kilometers/1.609344;
   throw Error('DISTANCE unit must be km or mi');
  }
  case 'DATETIMEVALUE':arity(1);{
   return formulaIsoDateTime(parseFormulaDateTime(text(args[0]),context.timeZone));
  }
  case 'TODAY':arity(0);return formulaDateText(formulaDateParts(context.now,context.timeZone));
  case 'NOW':arity(0);return formulaIsoDateTime(context.now);
  case 'TIMENOW':arity(0);return formulaTimeText(context.now,context.timeZone);
  case 'DAY':case 'MONTH':case 'YEAR':{
   arity(1);const parts=formulaDateTimeParts(text(args[0]),context.timeZone);
   return name==='DAY'?parts.day:name==='MONTH'?parts.month:parts.year;
  }
  case 'HOUR':case 'MINUTE':case 'SECOND':arity(1);{
   const parts=formulaDateTimeParts(text(args[0]),context.timeZone);
   return name==='HOUR'?parts.hour:name==='MINUTE'?parts.minute:parts.second;
  }
  case 'TIMEVALUE':arity(1);{
   const value=text(args[0]);
   const time=/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,3}))?)?$/.exec(value);
   if(time){
    return `${time[1]}:${time[2]}:${time[3]??'00'}.${(time[4]??'').padEnd(3,'0')}`;
   }
   return formulaTimeText(parseFormulaDateTime(value,context.timeZone),context.timeZone);
  }
  case 'WEEKDAY':arity(1);{
   return formulaWeekday(formulaDateTimeParts(text(args[0]),context.timeZone));
  }
  case 'ADDDAYS':arity(2);{
   return formulaAddDays(text(args[0]),numeric(args[1]),context.timeZone);
  }
  case 'ADDMONTHS':arity(2);{
   return formulaAddMonths(text(args[0]),numeric(args[1]),context.timeZone);
  }
  case 'ISOYEAR':case 'ISOWEEK':arity(1);{
   const iso=formulaIsoParts(formulaDateTimeParts(text(args[0]),context.timeZone));
   return name==='ISOYEAR'?iso.year:iso.week;
  }
  case 'TZOFFSET':arity(1);{
   return formulaTimezoneOffset(parseFormulaDateTime(text(args[0]),context.timeZone),context.timeZone);
  }
  case 'CASE':{
   if(args.length<4||args.length%2!==0)throw Error('Invalid CASE argument count');
   for(let index=1;index<args.length-1;index+=2)if(compare(args[0],args[index])===0)return args[index+1];
   return args[args.length-1];
  }
  default:throw Error(`Unsupported formula function: ${name}`);
 }
};
export const componentReaderKey=Symbol.for('metadrive.pageFormulaComponentReader');
function parse(source,record,formulaContext){
 const parsed=new Parser(tokenize(source)).parse();
 const expression=formulaContext.flowReferences?normalizeFlowCalls(parsed):parsed;
 return evaluateParsedExpression(expression,record,formulaContext);
}
export function evaluateParsedExpression(expression,record,formulaContext){
 validateFormulaFunctions(expression,'ribbon_binding');
 const resolveReference=(reference,currentRecord=record)=>{
   // Page-local globals are scoped inputs; never read storage or arbitrary records.
   if(reference.startsWith('$component.')){
    const parts=reference.split('.');
    if(parts.length!==3||!formulaContext.readComponent)throw Error('Invalid component reference or missing page context');
    return formulaContext.readComponent(parts[1],parts[2]);
   }
   if(reference==='$session')return typeof formulaContext.sessionId==='string'
    ?formulaContext.sessionId:'';
   if(reference.startsWith('$state.')){
    const key=reference.slice(7);
    if(!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key))
     throw Error('Invalid Page State reference');
    const state=formulaContext.pageState;
    if(!state||typeof state!=='object'||Array.isArray(state))return '';
    const descriptor=Object.getOwnPropertyDescriptor(state,key);
    if(!descriptor||!Object.prototype.hasOwnProperty.call(descriptor,'value')
      ||descriptor.value===undefined||descriptor.value===null)return '';
    const value=descriptor.value;
    if(!['string','number','boolean'].includes(typeof value)
      ||typeof value==='number'&&!Number.isFinite(value))
     throw Error('Page State formula value must be a finite scalar');
    return value;
   }
   // The signed-in tenant's public brand (Company Settings trading name and logo).
   if(reference.toLowerCase()==='$tenant.name'||reference.toLowerCase()==='$tenant.logo'){
    const tenant=formulaContext.tenant&&typeof formulaContext.tenant==='object'
     ?formulaContext.tenant:getTenantBrand();
    const value=reference.toLowerCase()==='$tenant.name'?tenant.name:tenant.logo;
    return typeof value==='string'?value:'';
   }
   if(/^\$tenant(?:\.|$)/i.test(reference))
    throw Error('Unsupported tenant reference: '+reference+' (use $tenant.name or $tenant.logo)');
   if(reference==='$state'||reference.startsWith('$session.'))
    throw Error('Unsupported Page State or session reference: '+reference);
   // $flow.ApiName exists only in the Action formula bar, which passes the runnable
   // Flow names. It evaluates to the text "$flow.ApiName" for the action runtime.
   if(/^\$flow(?:\.|$)/i.test(reference)){
    const flows=formulaContext.flowReferences;
    if(!Array.isArray(flows))
     throw Error('$flow is only available in the Action formula bar');
    const name=reference.slice(6);
    const match=flows.find(item=>typeof item==='string'&&item.toLowerCase()===name.toLowerCase());
    if(!match)throw Error('Unknown or inactive Flow: '+name);
    return '$flow.'+match;
   }
   const named=formulaContext.namedCollections;
   if(named&&typeof named==='object'&&!Array.isArray(named)&&!reference.includes('.')){
    const collection=Object.entries(named).find(([key])=>key.toLowerCase()===reference.toLowerCase())?.[1];
    if(collection&&typeof collection==='object'&&!Array.isArray(collection)
      &&Array.isArray(collection.items))return collection;
   }
   // Collection selection values come from the authorised page-session state.
   const selected=/^([A-Za-z][A-Za-z0-9_]{0,79})\.state\.(Id|Name|Value|Field|Criteria)$/.exec(reference);
   if(selected){
    const selections=formulaContext.namedCollectionSelections;
    if(!selections||typeof selections!=='object'||Array.isArray(selections))return '';
    const entry=Object.entries(selections).find(([name])=>name.toLowerCase()===selected[1].toLowerCase())?.[1];
    if(!entry||typeof entry!=='object'||Array.isArray(entry)
      ||!Object.prototype.hasOwnProperty.call(entry,selected[2]))return '';
    const result=entry[selected[2]];
    return result===null||['string','number','boolean'].includes(typeof result)?result:'';
   }
   if(/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(reference)){
    const selections=formulaContext.namedCollectionSelections;
    if(selections&&typeof selections==='object'&&!Array.isArray(selections)){
     const entry=Object.entries(selections).find(([key])=>key.toLowerCase()===reference.toLowerCase())?.[1];
     if(entry&&typeof entry==='object'&&!Array.isArray(entry))
      return entry.Name??entry.Value??entry.Id??'';
    }
   }
   // Object.Field collection references can use only authorised records
   // supplied by the Page Runtime; a formula never performs a database query.
   const sourceRef=/^([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z][A-Za-z0-9_]*)$/.exec(reference);
   const sources=formulaContext.collectionSources;
   if(sourceRef&&formulaContext.collectionResult===true
     &&!['state','event','session'].includes(sourceRef[1])
     &&(!sources||!Object.prototype.hasOwnProperty.call(sources,sourceRef[1])))
    throw Error('COLLECTION source unavailable: '+sourceRef[1]);
   if(sourceRef&&sources&&Object.prototype.hasOwnProperty.call(sources,sourceRef[1])){
    const rows=sources[sourceRef[1]];
    if(!Array.isArray(rows))throw Error('COLLECTION source unavailable: '+sourceRef[1]);
    if(rows.length>200)throw Error('COLLECTION source exceeds 200 records');
    // An accessible field with an unset value may be omitted from Object API
    // records. Validate the field against authorised metadata (when supplied),
    // otherwise require it on at least one row; never expose an unknown field.
    const permitted=formulaContext.collectionSourceFields?.[sourceRef[1]];
    const known=Array.isArray(permitted)?permitted.includes(sourceRef[2]):
     rows.some(row=>row&&typeof row==='object'&&!Array.isArray(row)
       &&Object.prototype.hasOwnProperty.call(row,sourceRef[2]));
    if(!known)throw Error('COLLECTION field unavailable: '+reference);
    return rows.flatMap(row=>{
     if(!row||typeof row!=='object'||Array.isArray(row))
      throw Error('Invalid COLLECTION source record');
     if(!Object.prototype.hasOwnProperty.call(row,sourceRef[2])
       ||row[sourceRef[2]]===null||row[sourceRef[2]]===undefined
       ||row[sourceRef[2]]==='')return [];
     const value=row[sourceRef[2]];
     const id=row.Id??row.id;
     if(id===undefined||id===null||typeof id!=='string'&&typeof id!=='number')
      throw Error('COLLECTION source record has no ID');
     if(value!==null&&value!==undefined&&!['string','number','boolean'].includes(typeof value))
      throw Error('COLLECTION field must be scalar: '+reference);
     return [{label:String(value),
       value:String(id),record:row,objectApiName:sourceRef[1]}];
    });
   }
  if(!currentRecord||typeof currentRecord!=='object'||Array.isArray(currentRecord))return '';
  const parts=reference.split('.');
 if(parts.some(part=>!part||['__proto__','prototype','constructor'].includes(part)))throw Error('Invalid formula token');
  const ownValue=(source,key)=>{
   const descriptor=Object.getOwnPropertyDescriptor(source,key);
   return descriptor&&Object.prototype.hasOwnProperty.call(descriptor,'value')
    ?descriptor.value:undefined;
  };
  // Related values have been hydrated against Object Manager metadata and
  // read permissions by the Page Runtime; they are not arbitrary JS traversal.
  if(reference.includes('.')){
   const mentions=ownValue(currentRecord,'__mentionValues');
   if(mentions&&typeof mentions==='object'&&!Array.isArray(mentions)
    &&Object.getPrototypeOf(mentions)===Object.prototype){
    const resolved=ownValue(mentions,'@'+reference);
    if(resolved!==undefined)return resolved===null?'':resolved;
    // A missing hydrated path must not fall through into unverified nested data.
    return '';
   }
  }
  // The selected Object can be addressed as @Object.Field as well as @Field;
  // both read the same authorised currentRecord and do not execute another query.
  if(sourceRef&&sourceRef[1]===formulaContext.rootObjectApiName
    &&Object.prototype.hasOwnProperty.call(currentRecord,sourceRef[2]))
   return ownValue(currentRecord,sourceRef[2])??'';
  if(Object.prototype.hasOwnProperty.call(currentRecord,reference))return ownValue(currentRecord,reference)??'';
  let value=currentRecord;
  for(const part of parts){
   if(!value||typeof value!=='object'||Array.isArray(value)
    ||!Object.prototype.hasOwnProperty.call(value,part))return '';
   value=ownValue(value,part);
  }
  return value??'';
 };
 // A Collection supports SUMIFS-like clauses:
 // name, caption, @Field, criterion, caption2, @Field2, criterion2...
 // A lone @Field or @Field = criterion expands authorised source records.
 // Legacy scalar items remain supported. No source is fetched by this evaluator.
 const evaluateCriteriaCollection=args=>{
  if(!args.length)throw Error('COLLECTION requires a name');
  const name=args[0].kind==='reference'&&/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(args[0].value)
    ?args[0].value:evaluate(args[0]),items=[];
  if(args.length===3&&args[1].kind==='reference'){
   const sourceName=args[1].value;
   const owned=formulaContext.namedCollections&&Object.entries(formulaContext.namedCollections)
    .some(([key])=>key.toLowerCase()===sourceName.toLowerCase());
   if(owned)return deriveFormulaCollection(name,evaluate(args[1]),evaluate(args[2]));
   const root=formulaContext.rootObjectApiName;
   const rows=root&&formulaContext.collectionSources?.[root];
   const isField=Array.isArray(rows)&&rows.some(row=>row&&typeof row==='object'
     &&Object.prototype.hasOwnProperty.call(row,sourceName));
   // An unpublished/removed upstream collection must clear descendants instead
   // of retaining a previously rendered source under legacy syntax recovery.
   if(!isField&&/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(sourceName))
    throw Error('Named collection source unavailable: @'+sourceName);
  }
  const sourceField=node=>{
   if(node?.kind!=='reference')return null;
   const raw=node.value,parts=raw.split('.');
   if(parts.length>2||parts.length<1||parts.some(part=>!/^[A-Za-z][A-Za-z0-9_]*$/.test(part)))return null;
   const object=parts.length===2?parts[0]:formulaContext.rootObjectApiName;
   const field=parts.at(-1);
   const sources=formulaContext.collectionSources;
   if(!object||!sources||!Object.prototype.hasOwnProperty.call(sources,object))return null;
   return {object,field,reference:object+'.'+field};
  };
  const rowsFor=pointer=>{
   const rows=formulaContext.collectionSources[pointer.object];
   if(!Array.isArray(rows))throw Error('COLLECTION source unavailable: '+pointer.object);
   if(rows.length>200)throw Error('COLLECTION source exceeds 200 records');
   return rows;
  };
  const isCriteriaComparison=node=>node?.kind==='binary'
   &&['=','==','<>','!=','<','<=','>','>='].includes(node.operator)&&Boolean(sourceField(node.left));
  const sourceItems=(pointer,criterion,operator='')=>{
   const rows=rowsFor(pointer);
   const permitted=formulaContext.collectionSourceFields?.[pointer.object];
   const known=Array.isArray(permitted)?permitted.includes(pointer.field):
    rows.some(row=>row&&typeof row==='object'&&!Array.isArray(row)
      &&Object.prototype.hasOwnProperty.call(row,pointer.field));
   if(!known)throw Error('COLLECTION field unavailable: '+pointer.reference);
   for(const row of rows){
    if(!row||typeof row!=='object'||Array.isArray(row))
     throw Error('Invalid COLLECTION source record');
    // Unset nullable/lookup fields are omitted by generic CRUD, not invalid.
    if(!Object.prototype.hasOwnProperty.call(row,pointer.field))continue;
    const value=row[pointer.field],id=row.Id??row.id;
    if(value===null||value===undefined||String(value).trim()==='')continue;
    if(typeof value!=='string'&&typeof value!=='number'&&typeof value!=='boolean')
     throw Error('COLLECTION field must be scalar: '+pointer.reference);
    if(id===null||id===undefined||String(id).trim()==='')
     throw Error('COLLECTION source record has no ID');
    if(operator&&!matchesFormulaCollectionCriterion(value,operator+String(criterion)))continue;
    items.push({label:String(value),value:String(id),criteriaField:pointer.reference,
     criteria:String(value),record:row,objectApiName:pointer.object});
    if(items.length>200)throw Error('COLLECTION exceeds 200 entries');
   }
  };
  for(let index=1;index<args.length;){
   const node=args[index];
   // A literal caption followed by a field and explicit criterion forms a clause.
   if(node.kind==='literal'&&typeof node.value==='string'&&index+2<args.length
     &&args[index+1].kind==='literal'&&args[index+1].value===''){
    // A blank Field explicitly targets the caption instead of an Object field.
    const criterion=evaluate(args[index+2]);
    if(matchesFormulaCollectionCriterion(node.value,criterion))items.push(node.value);
    index+=3;continue;
   }
   if(node.kind==='literal'&&typeof node.value==='string'&&
     index+2<args.length&&sourceField(args[index+1])){
    const pointer=sourceField(args[index+1]);
    const criterion=evaluate(args[index+2]);
    if(criterion!==''&&typeof criterion!=='string'&&typeof criterion!=='number'
      &&typeof criterion!=='boolean')throw Error('Invalid COLLECTION criterion for '+pointer.reference);
    const matching=criterion===''?'*':String(criterion);
    items.push({label:node.value,value:matching,criteriaField:pointer.reference,
      criteria:matching,objectApiName:pointer.object});
    index+=3;continue;
   }
   if(isCriteriaComparison(node)){
    const pointer=sourceField(node.left),criterion=evaluate(node.right);
    if(criterion===null||!['string','number','boolean'].includes(typeof criterion)
      ||typeof criterion==='number'&&!Number.isFinite(criterion))
     throw Error('COLLECTION field comparison requires a scalar criterion');
    sourceItems(pointer,criterion,node.operator);index++;continue;
   }
   const pointer=sourceField(node);
   if(pointer){sourceItems(pointer,'');index++;continue;}
   const result=evaluate(node);
   if(Array.isArray(result))items.push(...result);
   else items.push(result);
   index++;
  }
  return createCriteriaFormulaCollection(name,items);
 };
 const evaluate=(node,currentRecord=record)=>{
  let result;
  if(node.kind==='literal')result=node.value;
  else if(node.kind==='reference')result=resolveReference(node.value,currentRecord);
  else if(node.kind==='unary')result=evaluateFormulaUnary(node.operator,evaluate(node.value,currentRecord));
  else if(node.kind==='binary'){
   const left=evaluate(node.left,currentRecord);
   if(node.operator==='AND'&&!truth(left))return false;
   if(node.operator==='OR'&&truth(left))return true;
   const right=evaluate(node.right,currentRecord);
   const temporal=evaluateFormulaDateBinary(node.operator,left,right,formulaContext.timeZone);
   result=temporal.handled?temporal.value:evaluateFormulaBinary(node.operator,left,right,
    node.left.kind==='reference'&&isExcelWildcardDataReference(node.left.value));
  }else if(node.name==='IF'){
   result=truth(evaluate(node.args[0],currentRecord))?evaluate(node.args[1],currentRecord):evaluate(node.args[2],currentRecord);
  }else if(node.name==='NOT'){
   result=!truth(evaluate(node.args[0],currentRecord));
  }else if(node.name==='IFERROR'){
   try{result=evaluate(node.args[0],currentRecord);}catch{result=evaluate(node.args[1],currentRecord);}
  }else if(node.name==='BLANKVALUE'||node.name==='NULLVALUE'){
   const value=evaluate(node.args[0],currentRecord);
   result=value===null||value===undefined||node.name==='BLANKVALUE'&&value===''?
    evaluate(node.args[1],currentRecord):value;
  }else if(node.name==='AND'){
   result=true;
   for(const argument of node.args)if(!truth(evaluate(argument,currentRecord))){result=false;break;}
  }else if(node.name==='OR'){
   result=false;
   for(const argument of node.args)if(truth(evaluate(argument,currentRecord))){result=true;break;}
  }else if(node.name==='COLLECTION'){
   result=evaluateCriteriaCollection(node.args);
  }else if(node.name==='TABLE'){
   const first=node.args[0];
   if(first?.kind!=='reference'||!/^[A-Za-z][A-Za-z0-9_]*$/.test(first.value))
    throw Error('TABLE first argument must be an Object source such as @Product');
   const object=Object.keys(formulaContext.collectionSources??{}).find(name=>
    name.toLowerCase()===first.value.toLowerCase())??first.value;
   const rows=formulaContext.collectionSources?.[object];
   const permitted=formulaContext.collectionSourceFields?.[object];
   if(!Array.isArray(rows)||!Array.isArray(permitted))
    throw Error('TABLE source is unavailable or not authorised: '+object);
   const columns=node.args.slice(1).map(argument=>{
    if(argument.kind!=='reference')
     throw Error('TABLE columns must be Object fields');
    const reference=argument.value;
    const parts=reference.split('.');
    if(parts.length>2||parts.length===2&&parts[0].toLowerCase()!==object.toLowerCase()
      ||parts.some(part=>!/^[A-Za-z][A-Za-z0-9_]*$/.test(part)))
     throw Error('TABLE field does not belong to source '+object);
    return permitted.find(field=>field.toLowerCase()===parts.at(-1).toLowerCase())??parts.at(-1);
   });
   result=projectFormulaTable(object,rows,permitted,columns);
  }else if(node.name==='SUM'&&node.args.length===1){
   const operand=node.args[0];
   const rows=formulaContext.collectionRows;
   // A single row-field (or row expression) sums over the bounded, authorised
   // collection passed by the page runtime. This is universal, not Cart logic.
   const rowField=reference=>/^[A-Za-z][A-Za-z0-9_]*$/.test(reference)
    &&Array.isArray(rows)&&rows.some(row=>row&&typeof row==='object'
      &&Object.prototype.hasOwnProperty.call(row,reference));
   const usesRowField=part=>part.kind==='reference'?rowField(part.value):
    part.kind==='unary'?usesRowField(part.value):
    part.kind==='binary'?usesRowField(part.left)||usesRowField(part.right):
    part.kind==='call'&&part.name!=='SUM'?part.args.some(usesRowField):false;
   const direct=operand.kind==='reference'?evaluate(operand,currentRecord):null;
   const objectField=operand.kind==='reference'
    ?/^([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z][A-Za-z0-9_]*)$/.exec(operand.value):null;
   if(objectField&&Array.isArray(direct)
    &&direct.every(item=>item&&typeof item==='object'&&!Array.isArray(item)
      &&item.objectApiName===objectField[1]&&item.record&&typeof item.record==='object')){
    // @Object.Field was resolved against already-authorised rows and FLS.
    // Aggregate the numeric field, never the record IDs used for selections.
    result=sumFormulaCollection(direct.map(item=>item.record[objectField[2]]),
     formulaContext.collectionSources);
   }else if(Array.isArray(direct)||(direct&&typeof direct==='object'&&Array.isArray(direct.items))){
    result=sumFormulaCollection(direct,formulaContext.collectionSources);
   }else if(Array.isArray(rows)&&usesRowField(operand)){
    if(rows.length>200)throw Error('SUM requires a bounded numeric collection');
    const values=rows.map(row=>{
     const value=evaluate(operand,row);
     const number=typeof value==='number'?value:
      typeof value==='string'&&value.trim()?Number(value):NaN;
     if(!Number.isFinite(number))throw Error('SUM requires finite numeric collection values');
     return number;
    });
    result=sumFormulaCollection(values,formulaContext.collectionSources);
   }else{
    result=evaluateCall('SUM',[evaluate(operand,currentRecord)],formulaContext);
   }
  }else if(node.name==='CASE'){
   if(node.args.length%2!==0)throw Error('CASE requires a comparison value and a default result');
   const sourceValue=evaluate(node.args[0],currentRecord);
   let matched=false;
   for(let index=1;index<node.args.length-1;index+=2){
    if(sourceValue===evaluate(node.args[index],currentRecord)){
     result=evaluate(node.args[index+1],currentRecord);matched=true;break;
    }
   }
   if(!matched)result=evaluate(node.args[node.args.length-1],currentRecord);
  }else if(node.kind==='call'){
   result=evaluateCall(node.name,node.args.map(argument=>evaluate(argument,currentRecord)),formulaContext);
  }else throw Error('Invalid formula syntax');
  if(typeof result==='number'&&!Number.isFinite(result))
   throw Error('Formula result must be finite');
  return result;
 };
 return evaluate(expression);
}
export class FieldExpressionEvaluationError extends Error {
 constructor(message){super(message);this.name='FieldExpressionEvaluationError';}
}
export function evaluateFieldExpressionDetailed(expression,record,options={}){
 if(typeof expression!=='string')return {value:''};
 if(expression.length>4000)return {value:'',error:'Formula exceeds the 4000-character limit'};
 const entered=expression.trim();if(!entered)return {value:''};
 // Excel convention: '=' makes a formula; Collection(...) without '=' is plain text
 // in ordinary display properties. Preserve legacy metadata-only collection sources.
 const explicit=entered.startsWith('=');
 const input=explicit?entered.slice(1).trim():entered;
 if(explicit&&!input)return {value:'',error:'Complete the formula after ='};
 if(!explicit&&!options?.collectionResult&&/^COLLECTION\s*\(/i.test(input))
  return {value:expression};
 if(!/^(?:TRUE|FALSE|NULL|PI)$/i.test(input)&&!/@[A-Za-z]/.test(input)&&!input.startsWith('@')&&!/^\$(?:component|state|session|tenant|flow)(?:\.|$)/i.test(input)&&!/^[A-Za-z][A-Za-z0-9_]*\s*\(/.test(input)
  &&!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+(?:\s*\(|$)/.test(input)
  &&!/^(?:["(]|[-+]?\d+(?:\.\d+)?\s*[+*\/%^<>=!-])/.test(input)
  &&!/\s(?:[&+*/%^<>=!]|AND\b|OR\b)\s/i.test(input))return {value:expression};
 try{
  if(!options||typeof options!=='object'||Array.isArray(options))
   throw Error('Invalid formula evaluation context');
  const timeZone=options.timeZone??'UTC';
  if(typeof timeZone!=='string'||timeZone.length>100)throw Error('Invalid formula time zone');
  new Intl.DateTimeFormat('en',{timeZone});
  const now=options.now===undefined?new Date():options.now instanceof Date
   ?new Date(options.now):typeof options.now==='string'
    ?parseFormulaDateTime(options.now,'UTC'):new Date(NaN);
  if(!Number.isFinite(now.getTime()))throw Error('Invalid formula evaluation time');
  const result=parse(input,record,{timeZone,now,collectionSources:options.collectionSources,
   collectionSourceFields:options.collectionSourceFields,
   collectionResult:options.collectionResult===true,
   namedCollections:options.namedCollections,
   namedCollectionSelections:options.namedCollectionSelections,
   collectionRows:options.collectionRows,
   readComponent:options.readComponent??options.pageState?.[componentReaderKey],
   pageState:options.pageState,sessionId:options.sessionId,tenant:options.tenant,
   flowReferences:options.flowReferences,
   rootObjectApiName:options.rootObjectApiName});
  if(options.collectionResult===true){
   if(!result||typeof result!=='object'||Array.isArray(result)
     ||typeof result.name!=='string'||!Array.isArray(result.items))
    return {value:null,error:'Collection formula must return a TABLE() or COLLECTION() dataset'}; 
   return {value:result};
  }
  if(result&&typeof result==='object'&&!Array.isArray(result)&&typeof result.name==='string'&&Array.isArray(result.items))
   return {value:'',error:'Use a dataset source for TABLE() or COLLECTION() results'};
  if(typeof result==='number'&&!Number.isFinite(result))return {value:'',error:'Formula result is not finite'};
  return {value:text(result)};
 }catch(failure){
  return {value:'',error:failure instanceof Error?failure.message:'Formula evaluation failed'};
 }
}
export function evaluateFieldExpression(expression,record,options){
 const result=evaluateFieldExpressionDetailed(expression,record,options);
 return result.error?'':result.value;
}

/** Returns a named, typed collection instead of coercing it to a text field. */
export function evaluateCollectionFormula(formula,sourceRecords={},context={}){
 const source=typeof formula==='string'?formula.trim().replace(/^=\s*/,''):'';
 if(!source)return {value:null,error:'Enter a collection formula'};
 return evaluateFieldExpressionDetailed(source,context?.record&&typeof context.record==='object'
   &&!Array.isArray(context.record)?context.record:{},
  {collectionSources:sourceRecords,collectionSourceFields:context?.collectionSourceFields,
   collectionResult:true,rootObjectApiName:context?.primaryObject,
   namedCollections:context?.namedCollections,
   pageState:context?.state,sessionId:context?.session?.id,
   namedCollectionSelections:context?.state?.collectionSelections});
}

/** Explicit action entry point. Ordinary field evaluation remains side-effect free. */
export function executeActionFormula(formula,record,context,services){
 return executeActionPlan(formula,{...record,sessionId:context?.sessionId??''},
  (node,scope)=>evaluateParsedExpression(node,scope,context),services);
}
