/** Bounded browser formula evaluator shared by page bindings and UNE renderers.
 * It reads only own properties of the already-authorised record and never evals code.
 */
import {
 evaluateFormulaBinary,evaluateFormulaUnary,formulaTruth,Parser
} from '../../../../server/src/expression-engine/FormulaParser.js';
import {tokenize} from '../../../../server/src/expression-engine/FormulaTokenizer.js';
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
function parse(source,record,formulaContext){
 const expression=new Parser(tokenize(source)).parse();
 validateFormulaFunctions(expression,'ribbon_binding');
 const resolveReference=reference=>{
  if(!record||typeof record!=='object'||Array.isArray(record))return '';
  const parts=reference.split('.');
 if(parts.some(part=>!part||['__proto__','prototype','constructor'].includes(part)))throw Error('Invalid formula token');
  const ownValue=(source,key)=>{
   const descriptor=Object.getOwnPropertyDescriptor(source,key);
   return descriptor&&Object.prototype.hasOwnProperty.call(descriptor,'value')
    ?descriptor.value:undefined;
  };
  if(Object.prototype.hasOwnProperty.call(record,reference))return ownValue(record,reference)??'';
  let value=record;
  for(const part of parts){
   if(!value||typeof value!=='object'||Array.isArray(value)
    ||!Object.prototype.hasOwnProperty.call(value,part))return '';
   value=ownValue(value,part);
  }
  return value??'';
 };
 const evaluate=node=>{
  let result;
  if(node.kind==='literal')result=node.value;
  else if(node.kind==='reference')result=resolveReference(node.value);
  else if(node.kind==='unary')result=evaluateFormulaUnary(node.operator,evaluate(node.value));
  else if(node.kind==='binary'){
   const left=evaluate(node.left);
   if(node.operator==='AND'&&!truth(left))return false;
   if(node.operator==='OR'&&truth(left))return true;
   const right=evaluate(node.right);
   const temporal=evaluateFormulaDateBinary(node.operator,left,right,formulaContext.timeZone);
   result=temporal.handled?temporal.value:evaluateFormulaBinary(node.operator,left,right);
  }else if(node.name==='IF'){
   result=truth(evaluate(node.args[0]))?evaluate(node.args[1]):evaluate(node.args[2]);
  }else if(node.name==='NOT'){
   result=!truth(evaluate(node.args[0]));
  }else if(node.name==='IFERROR'){
   try{result=evaluate(node.args[0]);}catch{result=evaluate(node.args[1]);}
  }else if(node.name==='BLANKVALUE'||node.name==='NULLVALUE'){
   const value=evaluate(node.args[0]);
   result=value===null||value===undefined||node.name==='BLANKVALUE'&&value===''?
    evaluate(node.args[1]):value;
  }else if(node.name==='AND'){
   result=true;
   for(const argument of node.args)if(!truth(evaluate(argument))){result=false;break;}
  }else if(node.name==='OR'){
   result=false;
   for(const argument of node.args)if(truth(evaluate(argument))){result=true;break;}
  }else if(node.name==='CASE'){
   if(node.args.length%2!==0)throw Error('CASE requires a comparison value and a default result');
   const sourceValue=evaluate(node.args[0]);
   let matched=false;
   for(let index=1;index<node.args.length-1;index+=2){
    if(sourceValue===evaluate(node.args[index])){
     result=evaluate(node.args[index+1]);matched=true;break;
    }
   }
   if(!matched)result=evaluate(node.args[node.args.length-1]);
  }else if(node.kind==='call'){
   result=evaluateCall(node.name,node.args.map(evaluate),formulaContext);
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
 const input=expression.trim();if(!input)return {value:''};
 if(!/^(?:TRUE|FALSE|NULL|PI)$/i.test(input)&&!/@[A-Za-z]/.test(input)&&!input.startsWith('@')&&!/^[A-Za-z][A-Za-z0-9_]*\s*\(/.test(input)
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
  const result=parse(input,record,{timeZone,now});
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
