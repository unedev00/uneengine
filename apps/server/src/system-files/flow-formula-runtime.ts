import {flowFormulaReferences} from '../expression-engine/FormulaDependencyGraph.js';
export {flowFormulaReferences} from '../expression-engine/FormulaDependencyGraph.js';
import {
  validateFormulaFunctions,
  type FormulaExpressionContext
} from '../expression-engine/FormulaFunctionRegistry.js';
import {flowChoiceValues} from './flow-screen-choice-runtime.js';

import {tokenize} from '../expression-engine/FormulaTokenizer.js';
import {
  evaluateFormulaBinary,evaluateFormulaUnary,formulaTruth,Parser
} from '../expression-engine/FormulaParser.js';
import {
  evaluateFormulaDateBinary,formulaAddDays,formulaAddMonths,formulaDateParts,formulaDateText,
  formulaDateTimeParts,formulaIsoDateTime,formulaTimeText,formulaTimezoneOffset,
  formulaWeekday,formulaIsoParts,isFormulaDate,parseFormulaDateTime
} from '../expression-engine/FormulaDate.js';
import {roundFormulaNumber} from '../expression-engine/FormulaNumeric.js';
import type {Expression} from '../expression-engine/FormulaParser.js';

type FormulaResolver=(name:string)=>unknown;
export type FormulaEvaluationContext={
  timeZone?:string;
  now?:Date|string;
  currencyRates?:Readonly<Record<string,number>>;
  isClone?:boolean;
};
export type FormulaImageResult={
  __formulaImage:'MetaDriveFormulaImage';
  url:string;
  alt:string;
  height:number|null;
  width:number|null;
};
const numeric=(value:unknown):number=>{
  const result=typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;
  if(!Number.isFinite(result))throw new Error('Flow formula expected a finite number');
  return result;
};
const validISODate=isFormulaDate;
export function isFormulaImageResult(value:unknown):value is FormulaImageResult {
  return Boolean(value&&typeof value==='object'&&!Array.isArray(value)
    &&(value as FormulaImageResult).__formulaImage==='MetaDriveFormulaImage'
    &&typeof (value as FormulaImageResult).url==='string');
}
const text=(value:unknown):string=>value===null||value===undefined?''
  :isFormulaImageResult(value)?value.url:String(value);
const formulaText=(value:unknown):string=>typeof value==='boolean'?value?'TRUE':'FALSE':text(value);
const textPoints=(value:unknown):string[]=>Array.from(text(value));
const truth=formulaTruth;
function triggerFieldReference(node:Expression):string {
  if(node.kind!=='reference')throw new Error('Record change functions require a $Record field reference');
  const match=/^\$Record\.([A-Za-z][A-Za-z0-9_]*)$/.exec(node.value);
  if(!match)throw new Error('Record change functions require a $Record field reference');
  return match[1];
}
function requiresRecordTriggerContext(node:Expression):boolean {
  if(node.kind==='call'){
    return ['ISCHANGED','ISNEW','PRIORVALUE'].includes(node.name)
      ||node.args.some(requiresRecordTriggerContext);
  }
  if(node.kind==='unary')return requiresRecordTriggerContext(node.value);
  if(node.kind==='binary')
    return requiresRecordTriggerContext(node.left)||requiresRecordTriggerContext(node.right);
  return false;
}
function triggerFieldValues(field:string,resolve:FormulaResolver) {
  const current=resolve('$Record'),prior=resolve('$Record__Prior');
  if(!current||typeof current!=='object'||Array.isArray(current))
    throw new Error('Record change functions require a Record-Triggered Flow');
  if(!Object.hasOwn(current,field))throw new Error('Unknown Flow record field: '+field);
  const priorValue=prior&&typeof prior==='object'&&!Array.isArray(prior)
    &&Object.hasOwn(prior,field)?(prior as Record<string,unknown>)[field]:null;
  return {current:(current as Record<string,unknown>)[field],prior:priorValue};
}

function evaluate(node:Expression,resolve:FormulaResolver,context:FormulaEvaluationContext):unknown {
  const value=evaluateNode(node,resolve,context);
  if(typeof value==='number'&&!Number.isFinite(value))
    throw new Error('Formula result must be finite');
  return value;
}

function evaluateNode(node:Expression,resolve:FormulaResolver,context:FormulaEvaluationContext):unknown {
  if(node.kind==='literal')return node.value;
  if(node.kind==='reference')return resolve(node.value);
  if(node.kind==='unary'){
    const value=evaluate(node.value,resolve,context);
    return evaluateFormulaUnary(node.operator,value);
  }
  if(node.kind==='binary'){
    const left=evaluate(node.left,resolve,context);
    if(node.operator==='AND'&&!truth(left))return false;
    if(node.operator==='OR'&&truth(left))return true;
    const right=evaluate(node.right,resolve,context);
    const temporal=evaluateFormulaDateBinary(node.operator,left,right,context.timeZone??'UTC');
    if(temporal.handled)return temporal.value;
    return evaluateFormulaBinary(node.operator,left,right);
  }
  const argument=(index:number):unknown=>{
    if(!node.args[index])throw new Error(node.name+' has too few arguments');
    return evaluate(node.args[index],resolve,context);
  };
  const arity=(minimum:number,maximum=minimum)=>{
    if(node.args.length<minimum||node.args.length>maximum)
      throw new Error('Invalid argument count for '+node.name);
  };
  switch(node.name){
    case 'ISCHANGED':arity(1);{
      const field=triggerFieldReference(node.args[0]);
      const values=triggerFieldValues(field,resolve);
      return values.current!==values.prior;
    }
    case 'ISNEW':arity(0);{
      const record=resolve('$Record');
      if(!record||typeof record!=='object'||Array.isArray(record))
        throw new Error('ISNEW requires a Record-Triggered Flow');
      return resolve('$Record__Prior')===null;
    }
    case 'ISCLONE':arity(0);return context.isClone===true;
    case 'PRIORVALUE':arity(1);{
      const field=triggerFieldReference(node.args[0]);
      return triggerFieldValues(field,resolve).prior;
    }
    case 'IF':arity(3);return truth(argument(0))?argument(1):argument(2);
    case 'IFERROR':arity(2);{
      try{return argument(0);}
      catch{return argument(1);}
    }
    case 'AND':arity(1,20);return node.args.every(item=>truth(evaluate(item,resolve,context)));
    case 'OR':arity(1,20);return node.args.some(item=>truth(evaluate(item,resolve,context)));
    case 'NOT':arity(1);return !truth(argument(0));
    case 'XOR':arity(2,20);return node.args.reduce((value,item)=>
      value!==truth(evaluate(item,resolve,context)),false);
    case 'ISBLANK':arity(1);return argument(0)===null||argument(0)===undefined||argument(0)==='';
    case 'ISNULL':arity(1);return argument(0)===null||argument(0)===undefined;
    case 'ISNUMBER':arity(1);{
      const value=argument(0);
      return typeof value==='number'&&Number.isFinite(value)
        ||typeof value==='string'&&value.trim()!==''&&Number.isFinite(Number(value));
    }
    case 'CASE':arity(4,12);{
      if(node.args.length%2!==0)throw new Error('CASE requires a comparison value and a default result');
      const expression=argument(0);
      for(let index=1;index<node.args.length-1;index+=2)
        if(expression===evaluate(node.args[index],resolve,context))return evaluate(node.args[index+1],resolve,context);
      return evaluate(node.args[node.args.length-1],resolve,context);
    }
    case 'BLANKVALUE':arity(2);{
      const value=argument(0);return value===null||value===undefined||value===''?argument(1):value;
    }
    case 'NULLVALUE':arity(2);{
      const value=argument(0);return value===null||value===undefined?argument(1):value;
    }
    case 'TEXT':arity(1);return formulaText(argument(0));
    case 'VALUE':arity(1);return numeric(argument(0));
    case 'LEN':arity(1);return textPoints(argument(0)).length;
    case 'COLLECTIONCOUNT':case 'COLLECTIONSUM':{
      arity(node.name==='COLLECTIONCOUNT'?1:2);
      const source=argument(0);
      if(!Array.isArray(source)||source.length>200||source.some(row=>
        !row||typeof row!=='object'||Array.isArray(row)))
        throw new Error(node.name+' requires a Record Collection (maximum 200 records)');
      if(node.name==='COLLECTIONCOUNT')return source.length;
      const field=argument(1);
      if(typeof field!=='string'||!/^[A-Za-z][A-Za-z0-9_]*$/.test(field))
        throw new Error('COLLECTIONSUM requires a valid numeric field name');
      const sum=source.reduce((total:number,row:Record<string,unknown>)=>{
        const value=row[field];
        if(typeof value!=='number'||!Number.isFinite(value))
          throw new Error('COLLECTIONSUM requires finite numeric values: '+field);
        const next=total+value;
        if(!Number.isFinite(next))throw new Error('COLLECTIONSUM result is not finite');
        return next;
      },0);
      return sum;
    }
    case 'ASCII':arity(1);return text(argument(0)).codePointAt(0)??0;
    case 'LOWER':arity(1);return text(argument(0)).toLowerCase();
    case 'UPPER':arity(1);return text(argument(0)).toUpperCase();
    case 'PROPER':case 'INITCAP':arity(1);return text(argument(0)).toLowerCase()
      .replace(/(^|[^\p{L}\p{N}])(\p{L})/gu,
        (_match,prefix:string,letter:string)=>prefix+letter.toUpperCase());
    case 'TRIM':arity(1);return text(argument(0)).trim();
    case 'LEFT':arity(1,2);return textPoints(argument(0))
      .slice(0,argument(1)===undefined?1:Math.max(0,Math.trunc(numeric(argument(1))))).join('');
    case 'RIGHT':arity(1,2);{
      const value=textPoints(argument(0)),length=argument(1)===undefined?1:Math.max(0,Math.trunc(numeric(argument(1))));
      return value.slice(Math.max(0,value.length-length)).join('');
    }
    case 'MID':arity(3);{
      const value=textPoints(argument(0)),start=Math.max(0,Math.trunc(numeric(argument(1)))-1);
      return value.slice(start,start+Math.max(0,Math.trunc(numeric(argument(2))))).join('');
    }
    case 'FIND':arity(2,3);{
      const haystack=textPoints(argument(1)),needle=textPoints(argument(0));
      const start=node.args[2]?Math.max(0,Math.trunc(numeric(argument(2)))-1):0;
      let found=-1;
      for(let index=start;index<=haystack.length-needle.length;index++){
        if(needle.every((point,offset)=>haystack[index+offset]===point)){found=index;break;}
      }
      return found<0?0:found+1;
    }
    case 'SUBSTITUTE':arity(3,4);{
      const source=text(argument(0)),search=text(argument(1)),replacement=text(argument(2));
      if(!search)return source;
      const instance=node.args[3]?Math.trunc(numeric(argument(3))):0;
      if(instance<0)throw new Error('SUBSTITUTE instance must not be negative');
      if(instance===0)return source.split(search).join(replacement);
      let count=0;
      return source.replaceAll(search,match=>++count===instance?replacement:match);
    }
    case 'CONCATENATE':arity(1,20);return node.args.map(item=>text(evaluate(item,resolve,context))).join('');
    case 'EXACT':arity(2);return text(argument(0))===text(argument(1));
    case 'CONTAINS':arity(2);return text(argument(0)).includes(text(argument(1)));
    case 'BEGINS':arity(2);return text(argument(0)).startsWith(text(argument(1)));
    case 'IMAGE':arity(2,4);{
      const url=text(argument(0)),alt=text(argument(1));
      if(url.length>2048||alt.length>512)throw new Error('IMAGE URL or alt text exceeds its supported size');
      const filePath=/^\/api\/files\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/content$/i;
      let safeUrl=filePath.test(url);
      if(!safeUrl){
        try{
          const parsed=new URL(url);
          safeUrl=parsed.protocol==='https:'&&!parsed.username&&!parsed.password;
        }catch{safeUrl=false;}
      }
      if(!safeUrl)throw new Error('IMAGE requires an HTTPS or tenant file URL');
      const dimension=(index:number)=>node.args[index]
        ?Math.trunc(numeric(argument(index))):null;
      const height=dimension(2),width=dimension(3);
      if([height,width].some(value=>value!==null&&(value!<1||value!>8192)))
        throw new Error('IMAGE dimensions must be between 1 and 8192 pixels');
      return {__formulaImage:'MetaDriveFormulaImage',url,alt,height,width} satisfies FormulaImageResult;
    }
    case 'CURRENCYRATE':arity(1);{
      const currency=text(argument(0)).toUpperCase();
      if(!/^[A-Z]{3}$/.test(currency))throw new Error('CURRENCYRATE requires a three-letter ISO currency code');
      const rate=context.currencyRates?.[currency];
      if(rate===undefined)throw new Error('CURRENCYRATE is unavailable for currency '+currency);
      if(!Number.isFinite(rate)||rate<=0)throw new Error('Invalid configured currency rate: '+currency);
      return rate;
    }
    case 'VLOOKUP':arity(4);{
      const needle=argument(0),source=argument(1);
      const lookupField=text(argument(2)),resultField=text(argument(3));
      if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(lookupField)
        ||!/^[A-Za-z][A-Za-z0-9_]*$/.test(resultField)
        ||!Array.isArray(source)||source.length>200)
       throw new Error('VLOOKUP requires a bounded record collection and valid field names');
      for(const item of source){
       if(!item||typeof item!=='object'||Array.isArray(item))
        throw new Error('VLOOKUP collection contains an invalid record');
       if(Object.hasOwn(item,lookupField)&&
          (item as Record<string,unknown>)[lookupField]===needle){
        const result=(item as Record<string,unknown>)[resultField]??null;
        if(result!==null&&typeof result!=='string'&&typeof result!=='number'
          &&typeof result!=='boolean')
         throw new Error('VLOOKUP result is not scalar');
        return result;
       }
      }
      return null;
    }
    case 'ISPICKVAL':arity(2);return text(argument(0))===text(argument(1));
    case 'INCLUDES':arity(2);{
      const choices=text(argument(0)).split(';').filter(Boolean);
      const expected=text(argument(1));
      return choices.includes(expected);
    }
    case 'REPT':arity(2);{
      const value=text(argument(0)),count=Math.trunc(numeric(argument(1)));
      if(count<0||textPoints(value).length*count>4000)throw new Error('REPT result exceeds the 4000-character limit');
      return value.repeat(count);
    }
    case 'LPAD':case 'RPAD':arity(2,3);{
      const source=textPoints(argument(0)),length=Math.trunc(numeric(argument(1))),
        pad=textPoints(node.args[2]?argument(2):' ');
      if(length<0||length>4000||pad.length===0)throw new Error('Invalid '+node.name+' arguments');
      if(source.length>=length)return source.slice(0,length).join('');
      const fill=Array.from({length:length-source.length},(_,index)=>pad[index%pad.length]);
      return node.name==='LPAD'?[...fill,...source].join(''):[...source,...fill].join('');
    }
    case 'REPLACE':arity(4);{
      const source=textPoints(argument(0)),start=Math.trunc(numeric(argument(1)))-1,
        length=Math.trunc(numeric(argument(2))),replacement=text(argument(3));
      if(start<0||length<0)throw new Error('Invalid REPLACE position or length');
      return source.slice(0,start).join('')+replacement+source.slice(start+length).join('');
    }
    case 'CHAR':arity(1);{
      const code=Math.trunc(numeric(argument(0)));
      if(code<1||code>255)throw new Error('CHAR requires a value from 1 to 255');
      return String.fromCharCode(code);
    }
    case 'CASESAFEID':arity(1);{
      const id=text(argument(0));
      if(!/^[A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?$/.test(id))
        throw new Error('CASESAFEID requires a 15- or 18-character record ID');
      const source=id.slice(0,15),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
      const suffix=Array.from({length:3},(_,block)=>{
        let mask=0;
        for(let bit=0;bit<5;bit++)
          if(source[block*5+bit]>='A'&&source[block*5+bit]<='Z')mask|=1<<bit;
        return alphabet[mask];
      }).join('');
      if(id.length===18&&id.slice(15)!==suffix)
        throw new Error('CASESAFEID received an invalid 18-character record ID');
      return source+suffix;
    }
    case 'T':arity(1);{
      const value=argument(0);
      return typeof value==='string'?value:'';
    }
    case 'REVERSE':arity(1);return [...text(argument(0))].reverse().join('');
    case 'ENCODEURL':case 'URLENCODE':arity(1);return encodeURIComponent(text(argument(0)));
    case 'URLDECODE':arity(1);{
      try{return decodeURIComponent(text(argument(0)));}
      catch{throw new Error('Invalid URL-encoded Flow formula text');}
    }
    case 'ABS':arity(1);return Math.abs(numeric(argument(0)));
    case 'ROUND':arity(1,2);{
      const scale=node.args[1]?Math.trunc(numeric(argument(1))):0;
      return roundFormulaNumber(numeric(argument(0)),scale,'ROUND');
    }
    case 'ROUNDUP':case 'ROUNDDOWN':case 'TRUNC':arity(1,2);{
      const scale=node.args[1]?Math.trunc(numeric(argument(1))):0;
      return roundFormulaNumber(numeric(argument(0)),scale,node.name);
    }
    case 'SIGN':arity(1);return Math.sign(numeric(argument(0)));
    case 'MIN':arity(1,20);return Math.min(...node.args.map(item=>numeric(evaluate(item,resolve,context))));
    case 'MAX':arity(1,20);return Math.max(...node.args.map(item=>numeric(evaluate(item,resolve,context))));
    case 'MOD':arity(2);{
      const divisor=numeric(argument(1));
      if(divisor===0)throw new Error('MOD divisor must not be zero');
      return numeric(argument(0))%divisor;
    }
    case 'SQRT':arity(1);{
      const value=numeric(argument(0));
      if(value<0)throw new Error('SQRT requires a non-negative value');
      return Math.sqrt(value);
    }
    case 'POWER':arity(2);return numeric(argument(0))**numeric(argument(1));
    case 'CEILING':arity(1);return Math.ceil(numeric(argument(0)));
    case 'FLOOR':arity(1);return Math.floor(numeric(argument(0)));
    case 'MCEILING':arity(1);return Math.ceil(numeric(argument(0)));
    case 'MFLOOR':arity(1);return Math.floor(numeric(argument(0)));
    case 'EXP':arity(1);return Math.exp(numeric(argument(0)));
    case 'LN':arity(1);{
      const value=numeric(argument(0));
      if(value<=0)throw new Error('LN requires a positive value');
      return Math.log(value);
    }
    case 'LOG':arity(1,2);{
      const value=numeric(argument(0)),base=node.args[1]?numeric(argument(1)):10;
      if(value<=0||base<=0||base===1)throw new Error('Invalid LOG arguments');
      return Math.log(value)/Math.log(base);
    }
    case 'PI':arity(0);return Math.PI;
    case 'SIN':arity(1);return Math.sin(numeric(argument(0)));
    case 'COS':arity(1);return Math.cos(numeric(argument(0)));
    case 'TAN':arity(1);return Math.tan(numeric(argument(0)));
    case 'ASIN':case 'ACOS':arity(1);{
      const value=numeric(argument(0));
      if(value< -1||value>1)throw new Error(node.name+' argument must be between -1 and 1');
      return node.name==='ASIN'?Math.asin(value):Math.acos(value);
    }
    case 'ATAN':arity(1);return Math.atan(numeric(argument(0)));
    case 'ATAN2':arity(2);return Math.atan2(numeric(argument(0)),numeric(argument(1)));
    case 'SINH':arity(1);return Math.sinh(numeric(argument(0)));
    case 'COSH':arity(1);return Math.cosh(numeric(argument(0)));
    case 'TANH':arity(1);return Math.tanh(numeric(argument(0)));
    case 'DEGREES':arity(1);return numeric(argument(0))*180/Math.PI;
    case 'RADIANS':arity(1);return numeric(argument(0))*Math.PI/180;
    case 'DATE':arity(3);{
      const year=Math.trunc(numeric(argument(0))),month=Math.trunc(numeric(argument(1))),
        day=Math.trunc(numeric(argument(2)));
      if(year<1||year>9999||month<1||month>12||day<1||day>31)
        throw new Error('Invalid DATE arguments');
      const value=`${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      if(!validISODate(value))throw new Error('Invalid DATE arguments');
      return value;
    }
    case 'ADDDAYS':arity(2);{
      return formulaAddDays(text(argument(0)),numeric(argument(1)),context.timeZone??'UTC');
    }
    case 'DATEVALUE':arity(1);{
      const input=text(argument(0));
      if(validISODate(input))return input;
      return formulaDateText(formulaDateParts(
        parseFormulaDateTime(input,context.timeZone??'UTC'),context.timeZone??'UTC'));
    }
    case 'DATETIMEVALUE':arity(1);{
      const input=text(argument(0));
      return formulaIsoDateTime(parseFormulaDateTime(input,context.timeZone??'UTC'));
    }
    case 'TIMEVALUE':arity(1);{
      const input=text(argument(0));
      const match=/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,3}))?)?$/.exec(input);
      if(match)return `${match[1]}:${match[2]}:${match[3]??'00'}.${(match[4]??'').padEnd(3,'0')}`;
      return formulaTimeText(parseFormulaDateTime(input,context.timeZone??'UTC'),context.timeZone??'UTC');
    }
    case 'TIMENOW':arity(0);{
      return formulaTimeText(context.now as Date,context.timeZone??'UTC');
    }
    case 'TODAY':arity(0);{
      return formulaDateText(formulaDateParts(context.now as Date,context.timeZone??'UTC'));
    }
    case 'NOW':arity(0);return formulaIsoDateTime(context.now as Date);
    case 'TZOFFSET':arity(1);{
      const timeZone=context.timeZone??'UTC';
      return formulaTimezoneOffset(parseFormulaDateTime(text(argument(0)),timeZone),timeZone);
    }
    case 'DAY':case 'MONTH':case 'YEAR':case 'HOUR':case 'MINUTE':case 'SECOND':case 'WEEKDAY':arity(1);{
      const parts=formulaDateTimeParts(text(argument(0)),context.timeZone??'UTC');
      switch(node.name){
        case 'DAY':return parts.day;
        case 'MONTH':return parts.month;
        case 'YEAR':return parts.year;
        case 'HOUR':return parts.hour;
        case 'MINUTE':return parts.minute;
        case 'SECOND':return parts.second;
        default:return formulaWeekday(parts);
      }
    }
    case 'ISOWEEK':case 'ISOYEAR':arity(1);{
      const parts=formulaDateTimeParts(text(argument(0)),context.timeZone??'UTC');
      const iso=formulaIsoParts(parts);
      return node.name==='ISOYEAR'?iso.year:iso.week;
    }
    case 'ADDMONTHS':arity(2);{
      return formulaAddMonths(text(argument(0)),numeric(argument(1)),context.timeZone??'UTC');
    }
    case 'GEOLOCATION':arity(2);{
      const latitude=numeric(argument(0)),longitude=numeric(argument(1));
      if(latitude < -90||latitude > 90||longitude < -180||longitude > 180)
        throw new Error('Invalid formula geolocation coordinates');
      return {latitude,longitude};
    }
    case 'DISTANCE':arity(3);{
      const first=argument(0),second=argument(1),unit=text(argument(2)).toLowerCase();
      const coordinates=(value:unknown)=>{
        if(!value||typeof value!=='object'||!('latitude' in value)||!('longitude' in value))
          throw new Error('DISTANCE requires two geolocation values');
        const latitude=numeric(value.latitude),longitude=numeric(value.longitude);
        if(latitude < -90||latitude > 90||longitude < -180||longitude > 180)
          throw new Error('Invalid formula geolocation coordinates');
        return {latitude,longitude};
      };
      const a=coordinates(first),b=coordinates(second);
      const toRadians=(degrees:number)=>degrees*Math.PI/180;
      const latitudeDelta=toRadians(b.latitude-a.latitude);
      const longitudeDelta=toRadians(b.longitude-a.longitude);
      const haversine=Math.sin(latitudeDelta/2)**2
        +Math.cos(toRadians(a.latitude))*Math.cos(toRadians(b.latitude))
          *Math.sin(longitudeDelta/2)**2;
      const kilometers=6371.0088*2*Math.atan2(Math.sqrt(haversine),Math.sqrt(1-haversine));
      if(unit==='km')return kilometers;
      if(unit==='mi')return kilometers/1.609344;
      throw new Error('DISTANCE unit must be "km" or "mi"');
    }
    default:throw new Error('Unsupported Flow formula function: '+node.name);
  }
}

export function evaluateFlowFormula(expression:string,resolve:FormulaResolver,
  context:FormulaEvaluationContext={},expressionContext:FormulaExpressionContext='flow_formula'):unknown {
  if(typeof expression!=='string'||!expression.trim())throw new Error('Flow formula is empty');
  const ast=new Parser(tokenize(expression)).parse();
  validateFormulaFunctions(ast,expressionContext);
  const now=context.now===undefined?new Date():context.now instanceof Date
    ?new Date(context.now):parseFormulaDateTime(context.now,'UTC');
  if(!Number.isFinite(now.getTime()))throw new Error('Invalid formula evaluation time');
  return evaluate(ast,resolve,{...context,now});
}

export function validateFlowFormula(expression:string,
  context:FormulaExpressionContext='flow_formula'):void {
  if(typeof expression!=='string'||!expression.trim())throw new Error('Flow formula is empty');
  const ast=new Parser(tokenize(expression)).parse();
  validateFormulaFunctions(ast,context);
}

export type FormulaValueType='Number'|'Text'|'Checkbox'|'Date'|'DateTime'|'Time'
  |'Picklist'|'MultiPicklist'|'Geolocation'|'Null';
type FormulaTypeResolver=(reference:string)=>FormulaValueType|null;
const formulaTextTypes=new Set<FormulaValueType>(['Text','Picklist']);
const formulaNumeric=(type:FormulaValueType)=>type==='Number';
const compatibleFormulaTypes=(left:FormulaValueType,right:FormulaValueType):FormulaValueType|null=>{
  if(left==='Null')return right;
  if(right==='Null')return left;
  if(left===right)return left;
  if(formulaTextTypes.has(left)&&formulaTextTypes.has(right))return 'Text';
  return null;
};
export function inferFlowFormulaType(expression:string,resolve:FormulaTypeResolver,
  context:FormulaExpressionContext='formula_field'):FormulaValueType {
  validateFlowFormula(expression,context);
  const infer=(node:Expression):FormulaValueType=>{
    if(node.kind==='literal')return node.value===null?'Null':typeof node.value==='number'?'Number':
      typeof node.value==='boolean'?'Checkbox':'Text';
    if(node.kind==='reference'){
      const type=resolve(node.value);
      if(!type)throw new Error('Unknown formula field reference: '+node.value);
      return type;
    }
    if(node.kind==='unary'){
      const type=infer(node.value);
      if(node.operator==='NOT'){
        if(type!=='Checkbox')throw new Error('NOT requires a checkbox value');
        return 'Checkbox';
      }
      if(!formulaNumeric(type))throw new Error('Numeric unary operators require a number');
      return 'Number';
    }
    if(node.kind==='binary'){
      const left=infer(node.left),right=infer(node.right),operator=node.operator;
      if(operator==='AND'||operator==='OR'){
        if(left!=='Checkbox'||right!=='Checkbox')throw new Error(operator+' requires checkbox values');
        return 'Checkbox';
      }
      if(operator==='&')return 'Text';
      if(['=','==','!=','<>'].includes(operator)){
        if(!compatibleFormulaTypes(left,right))throw new Error('Formula comparison types do not match');
        return 'Checkbox';
      }
      if(['>','>=','<','<='].includes(operator)){
        const orderedTypes=compatibleFormulaTypes(left,right);
        if(!(formulaNumeric(left)&&formulaNumeric(right)
          ||orderedTypes==='Text'||['Date','DateTime','Time'].includes(left)&&left===right))
          throw new Error('Ordered formula comparisons require matching numbers, text, or temporal values');
        return 'Checkbox';
      }
      if(operator==='-'&&left===right&&(left==='Date'||left==='DateTime'))return 'Number';
      if((operator==='+'||operator==='-')&&left==='Date'&&formulaNumeric(right))return 'Date';
      if(operator==='+'&&formulaNumeric(left)&&right==='Date')return 'Date';
      if((operator==='+'||operator==='-')&&left==='DateTime'&&formulaNumeric(right))return 'DateTime';
      if(operator==='+'&&formulaNumeric(left)&&right==='DateTime')return 'DateTime';
      if(!formulaNumeric(left)||!formulaNumeric(right))
        throw new Error('Arithmetic formula operators require numeric values');
      return 'Number';
    }
    // Record Collection is a runtime resource, not a scalar Field formula type.
    // Allow only a directly referenced collection and a literal field name.
    if(node.name==='COLLECTIONCOUNT'||node.name==='COLLECTIONSUM'){
      const expected=node.name==='COLLECTIONCOUNT'?1:2;
      if(node.args.length!==expected||node.args[0].kind!=='reference'
        ||(expected===2&&(node.args[1].kind!=='literal'
          ||typeof node.args[1].value!=='string'
          ||!/^[A-Za-z][A-Za-z0-9_]*$/.test(node.args[1].value))))
        throw new Error(node.name+' requires a collection reference'+
          (expected===2?' and a literal numeric field name':''));
      return 'Number';
    }
    const args=node.args.map(infer),arity=(minimum:number,maximum=minimum)=>{
      if(args.length<minimum||args.length>maximum)
        throw new Error('Invalid argument count for '+node.name);
    };
    const requireType=(index:number,allowed:FormulaValueType[])=>{
      if(!allowed.includes(args[index]))throw new Error(node.name+' has an invalid argument type');
    };
    const requireText=(index:number)=>requireType(index,['Text','Picklist']);
    const requireNumber=(index:number)=>requireType(index,['Number']);
    switch(node.name){
      case 'ISCHANGED':arity(1);triggerFieldReference(node.args[0]);return 'Checkbox';
      case 'ISNEW':case 'ISCLONE':arity(0);return 'Checkbox';
      case 'PRIORVALUE':arity(1);triggerFieldReference(node.args[0]);return args[0];
      case 'IF':arity(3);requireType(0,['Checkbox']);{
        const result=compatibleFormulaTypes(args[1],args[2]);
        if(!result)throw new Error('IF result types do not match');
        return result;
      }
      case 'IFERROR':arity(2);{
        const result=compatibleFormulaTypes(args[0],args[1]);
        if(!result)throw new Error('IFERROR result types do not match');
        return result;
      }
      case 'AND':case 'OR':arity(1,20);args.forEach((_,index)=>requireType(index,['Checkbox']));return 'Checkbox';
      case 'XOR':arity(2,20);args.forEach((_,index)=>requireType(index,['Checkbox']));return 'Checkbox';
      case 'NOT':arity(1);requireType(0,['Checkbox']);return 'Checkbox';
      case 'ISBLANK':case 'ISNULL':case 'ISNUMBER':arity(1);return 'Checkbox';
      case 'BLANKVALUE':case 'NULLVALUE':arity(2);{
        const result=compatibleFormulaTypes(args[0],args[1]);
        if(!result)throw new Error(node.name+' argument types do not match');
        return result;
      }
      case 'TEXT':case 'T':arity(1);return 'Text';
      case 'IMAGE':arity(2,4);requireText(0);requireText(1);
        if(args.length>2)requireNumber(2);if(args.length>3)requireNumber(3);return 'Text';
      case 'CURRENCYRATE':arity(1);requireText(0);return 'Number';
      case 'VALUE':arity(1);requireText(0);return 'Number';
      case 'LEN':case 'ASCII':arity(1);requireText(0);return 'Number';
      case 'LOWER':case 'UPPER':case 'PROPER':case 'TRIM':case 'REVERSE':
      case 'ENCODEURL':case 'URLENCODE':case 'URLDECODE':arity(1);requireText(0);return 'Text';
      case 'INITCAP':arity(1);requireText(0);return 'Text';
      case 'LEFT':case 'RIGHT':arity(1,2);requireText(0);if(args.length===2)requireNumber(1);return 'Text';
      case 'MID':arity(3);requireText(0);requireNumber(1);requireNumber(2);return 'Text';
      case 'FIND':arity(2,3);requireText(0);requireText(1);if(args.length===3)requireNumber(2);return 'Number';
      case 'SUBSTITUTE':arity(3,4);requireText(0);requireText(1);requireText(2);if(args.length===4)requireNumber(3);return 'Text';
      case 'CONCATENATE':arity(1,20);return 'Text';
      case 'EXACT':case 'CONTAINS':case 'BEGINS':arity(2);requireText(0);requireText(1);return 'Checkbox';
      case 'VLOOKUP':arity(4);requireText(2);requireText(3);
        // The column type is defined by the referenced Object metadata at execution.
        // Keep formula inference conservative for dynamically typed record collections.
        return 'Text';
      case 'ISPICKVAL':arity(2);requireType(0,['Picklist']);requireText(1);return 'Checkbox';
      case 'INCLUDES':arity(2);requireType(0,['MultiPicklist']);requireText(1);return 'Checkbox';
      case 'REPT':arity(2);requireText(0);requireNumber(1);return 'Text';
      case 'LPAD':case 'RPAD':arity(2,3);requireText(0);requireNumber(1);if(args.length===3)requireText(2);return 'Text';
      case 'REPLACE':arity(4);requireText(0);requireNumber(1);requireNumber(2);requireText(3);return 'Text';
      case 'CHAR':arity(1);requireNumber(0);return 'Text';
      case 'CASESAFEID':arity(1);requireText(0);return 'Text';
      case 'ABS':case 'CEILING':case 'FLOOR':case 'MCEILING':case 'MFLOOR':
      case 'EXP':case 'LN':case 'SQRT':case 'SIGN':arity(1);requireNumber(0);return 'Number';
      case 'ROUND':arity(1,2);requireNumber(0);if(args.length===2)requireNumber(1);return 'Number';
      case 'ROUNDUP':case 'ROUNDDOWN':case 'TRUNC':
        arity(1,2);requireNumber(0);if(args.length===2)requireNumber(1);return 'Number';
      case 'MIN':case 'MAX':arity(1,20);args.forEach((_,index)=>requireNumber(index));return 'Number';
      case 'MOD':case 'POWER':arity(2);requireNumber(0);requireNumber(1);return 'Number';
      case 'LOG':arity(1,2);requireNumber(0);if(args.length===2)requireNumber(1);return 'Number';
      case 'PI':arity(0);return 'Number';
      case 'SIN':case 'COS':case 'TAN':case 'ASIN':case 'ACOS':case 'ATAN':
      case 'SINH':case 'COSH':case 'TANH':case 'DEGREES':case 'RADIANS':
        arity(1);requireNumber(0);return 'Number';
      case 'ATAN2':arity(2);requireNumber(0);requireNumber(1);return 'Number';
      case 'CASE':arity(4,12);{
        if(args.length%2!==0)throw new Error('CASE requires a comparison value and a default result');
        for(let index=1;index<args.length-1;index+=2)
          if(!compatibleFormulaTypes(args[0],args[index]))
            throw new Error('CASE comparison types do not match');
        let result=args[2];
        for(let index=4;index<args.length;index+=2){
          const compatible=compatibleFormulaTypes(result,args[index]);
          if(!compatible)throw new Error('CASE result types do not match');
          result=compatible;
        }
        const compatible=compatibleFormulaTypes(result,args[args.length-1]);
        if(!compatible)throw new Error('CASE result types do not match');
        return compatible;
      }
      case 'DATE':arity(3);args.forEach((_,index)=>requireNumber(index));return 'Date';
      case 'ADDDAYS':arity(2);requireType(0,['Date','DateTime']);requireNumber(1);return args[0];
      case 'DATEVALUE':arity(1);requireType(0,['Text','Date','DateTime']);return 'Date';
      case 'DATETIMEVALUE':arity(1);requireType(0,['Text','Date','DateTime']);return 'DateTime';
      case 'TIMEVALUE':arity(1);requireType(0,['Text','DateTime','Time']);return 'Time';
      case 'TIMENOW':arity(0);return 'Time';
      case 'TODAY':arity(0);return 'Date';
      case 'NOW':arity(0);return 'DateTime';
      case 'TZOFFSET':arity(1);requireType(0,['DateTime']);return 'Number';
      case 'DAY':case 'MONTH':case 'YEAR':case 'WEEKDAY':case 'ISOWEEK':case 'ISOYEAR':
        arity(1);requireType(0,['Date','DateTime']);return 'Number';
      case 'HOUR':case 'MINUTE':case 'SECOND':
        arity(1);requireType(0,['DateTime','Time']);return 'Number';
      case 'ADDMONTHS':arity(2);requireType(0,['Date','DateTime']);requireNumber(1);return args[0];
      case 'GEOLOCATION':arity(2);requireNumber(0);requireNumber(1);return 'Geolocation';
      case 'DISTANCE':arity(3);requireType(0,['Geolocation']);requireType(1,['Geolocation']);requireText(2);return 'Number';
      default:throw new Error('Unsupported Flow formula function: '+node.name);
    }
  };
  return infer(new Parser(tokenize(expression)).parse());
}

export function validateFlowResources(resources:unknown,recordTriggered=false):string[] {
  if(resources===undefined)return [];
  if(!Array.isArray(resources))return ['Flow resources must be an array'];
  const errors:string[]=[];
  const names=new Set<string>();
  const formulaResources=new Map<string,string>();
  for(const resource of resources){
    if(!resource||typeof resource!=='object'||Array.isArray(resource)){
      errors.push('Invalid Flow resource');continue;
    }
    const item=resource as Record<string,unknown>;
    if(typeof item.name!=='string'||!/^[A-Za-z][A-Za-z0-9_]*$/.test(item.name)||names.has(item.name))
      errors.push('Flow resource names must be unique valid identifiers');
    else names.add(item.name);
    if(item.type==='Choice Set'){
      try{flowChoiceValues(item.value);}
      catch(error){errors.push('Invalid Flow Choice Set '+String(item.name)+': '
        +(error instanceof Error?error.message:'Invalid choices'));}
    }
    if(item.type==='Formula'){
      try{
        const expression=String(item.value??'');
        validateFlowFormula(expression,'flow_formula');
        if(!recordTriggered&&requiresRecordTriggerContext(
          new Parser(tokenize(expression)).parse()))
          errors.push('Record change formula functions are only supported in Record-Triggered Flows');
        else formulaResources.set(String(item.name),expression);
      }
      catch(error){errors.push('Invalid Flow formula resource '+String(item.name)+': '
        +(error instanceof Error?error.message:'Invalid formula'));}
    }
  }
  const visiting:string[]=[],states=new Map<string,'visiting'|'visited'>(),cycles=new Set<string>();
  const visit=(name:string):void=>{
    if(states.get(name)==='visited')return;
    if(states.get(name)==='visiting'){
      const start=visiting.indexOf(name);
      const cycle=[...visiting.slice(start),name];
      const key=cycle.join(' -> ');
      if(!cycles.has(key)){
        cycles.add(key);
        errors.push('Cyclic Flow formula resource dependency: '+key);
      }
      return;
    }
    states.set(name,'visiting');
    visiting.push(name);
    for(const reference of flowFormulaReferences(formulaResources.get(name)!))
      if(formulaResources.has(reference))visit(reference);
    visiting.pop();
    states.set(name,'visited');
  };
  for(const name of formulaResources.keys())visit(name);
  return errors;
}
