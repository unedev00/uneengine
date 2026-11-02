import {hasExcelWildcardCriteria,matchesExcelWildcard} from './FormulaWildcard.js';
/** One bounded collection constructor shared by Flow and component formulas.
 * Receives values already resolved from authorised contexts; performs no I/O.
 * Scalars and record entries retain their types. Nested arrays are flattened.
 */
export function mergeFormulaCollectionValues(values:readonly unknown[],limit=200):unknown[]{
 if(!Array.isArray(values)||values.length>19)throw Error('COLLECTION accepts up to 19 item arguments');
 const items:unknown[]=[];
 const append=(value:unknown,depth:number):void=>{
  if(depth>4)throw Error('COLLECTION nesting exceeds four levels');
  if(Array.isArray(value)){
   for(const item of value)append(item,depth+1);
  }else{
   if(value!==null&&value!==undefined
     &&typeof value!=='string'&&typeof value!=='number'&&typeof value!=='boolean'
     &&(typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype
       &&Object.getPrototypeOf(value)!==null))
    throw Error('COLLECTION expects scalar values or plain authorised records');
   if(value===null||value===undefined||typeof value==='string'&&!value.trim())
    throw Error('COLLECTION has a blank value at item '+(items.length+1));
   if(typeof value==='number'&&!Number.isFinite(value))throw Error('Nonfinite COLLECTION value');
   items.push(value);
   if(items.length>limit)throw Error('COLLECTION exceeds '+limit+' entries; narrow source filters');
  }
 };
 values.forEach(value=>append(value,0));
 return items;
}

/** Human-readable names may contain spaces. Formula references use their stable
 * underscore alias, e.g. "test collection" -> @test_collection.state.Id.
 * Both spellings occupy the same unique page-session namespace. */
export const validFormulaCollectionName=(name:unknown):name is string=>
 typeof name==='string'&&/^[A-Za-z][A-Za-z0-9_ ]{0,79}$/.test(name)&&name.trim()===name;
export const formulaCollectionReferenceKey=(name:string):string=>name.replace(/ +/g,'_');
export type NamedFormulaCollection={readonly name:string;readonly items:readonly unknown[]};
/** Name is the first argument and is not an item in the collection. */
export function createNamedFormulaCollection(name:unknown,values:readonly unknown[]):NamedFormulaCollection{
 if(!validFormulaCollectionName(name))
  throw Error('COLLECTION name must start with a letter and contain only letters, numbers, spaces or underscores (maximum 80 characters)');
 if(!values.length)throw Error('COLLECTION requires at least one value after its name');
 return {name,items:mergeFormulaCollectionValues(values)};
}

/** Structured, metadata-derived Collection selections.
 * A caption is never an implicit wildcard. Field + criterion are explicit
 * and travel together so receiving components can choose their own filters. */
export type CriteriaCollectionItem={
 readonly label:string;readonly value:string;
 readonly criteriaField:string;readonly criteria:string;
 readonly objectApiName?:string;readonly record?:Record<string,unknown>
};
export function createCriteriaFormulaCollection(name:unknown,items:readonly unknown[]):NamedFormulaCollection{
 if(!validFormulaCollectionName(name))
  throw Error('COLLECTION requires a valid name');
 if(!Array.isArray(items)||items.length>200)throw Error('COLLECTION exceeds 200 entries');
 const checked=items.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))return item;
  if(!('criteriaField' in item))return item;
  const entry=item as CriteriaCollectionItem;
  if(typeof entry.label!=='string'||!entry.label.trim()
    ||typeof entry.value!=='string'||!entry.value.trim()
    ||typeof entry.criteria!=='string'||!entry.criteria.trim()
    ||typeof entry.criteriaField!=='string'
    ||!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)?$/.test(entry.criteriaField))
   throw Error('COLLECTION entry requires a label, field and criterion');
  return item;
 });
 // A single @Field argument can expand to 200 authorised records even though
 // the formula itself accepts at most 19 user-authored item arguments.
 return {name,items:mergeFormulaCollectionValues([checked])};
}

/** Apply one Excel criterion to a scalar without coercing text into a SQL query.
 * Used for both formula-created and session-derived collections. */
export function matchesFormulaCollectionCriterion(value:unknown,raw:unknown):boolean{
 if(raw===null||raw===undefined||raw==='')return true;
 if(typeof raw!=='string'&&typeof raw!=='number'&&typeof raw!=='boolean')
  throw Error('COLLECTION criterion must be text, number or Boolean');
 const criterion=String(raw).trim();
 const match=/^(<>|!=|>=|<=|>|<|==|=)?\s*(.*)$/.exec(criterion);
 const op=match?.[1]||'=',expected=match?.[2]??criterion;
 if(expected===''&&op==='=')return value===null||value===undefined||value==='';
 if(value===null||value===undefined||value==='')return op==='!='||op==='<>'?expected!=='' : false;
 const actual=String(value);
 const expectedNumber=expected.trim()!==''?Number(expected):NaN;
 const valueNumber=typeof value==='number'?value:NaN;
 const comparable=Number.isFinite(expectedNumber)&&Number.isFinite(valueNumber);
 if(op==='>'||op==='>='||op==='<'||op==='<='){
  const left=comparable?valueNumber:actual.toLocaleLowerCase('en');
  const right=comparable?expectedNumber:expected.toLocaleLowerCase('en');
  if(op==='>')return left>right;
  if(op==='>=')return left>=right;
  if(op==='<')return left<right;
  return left<=right;
 }
 const matched=hasExcelWildcardCriteria(expected)
  ?matchesExcelWildcard(actual,expected)
  :comparable?valueNumber===expectedNumber:actual.toLocaleLowerCase('en')===expected.toLocaleLowerCase('en');
 return op==='!='||op==='<>'?!matched:matched;
}

/** A filtered collection keeps its authorised record/value metadata and never
 * mutates the source collection owned by another page component. */
export function deriveFormulaCollection(
 name:unknown,source:unknown,criterion:unknown
):NamedFormulaCollection{
 if(!source||typeof source!=='object'||Array.isArray(source)
  ||!Array.isArray((source as NamedFormulaCollection).items))
  throw Error('COLLECTION source must be a named collection');
 const items=(source as NamedFormulaCollection).items;
 if(items.length>200)throw Error('COLLECTION source exceeds 200 entries');
 return createCriteriaFormulaCollection(name,items.filter(item=>{
  const value=item&&typeof item==='object'&&!Array.isArray(item)
   ?('label' in item?item.label:'Name' in item?item.Name:'value' in item?item.value:null)
   :item;
  return matchesFormulaCollectionCriterion(value,criterion);
 }));
}

/** Excel SUM over a typed collection: numbers and numeric Object fields only.
 * Record IDs, captions and criteria strings are never treated as amounts. */
export function sumFormulaCollection(source:unknown):number{
 const rows=Array.isArray(source)?source:
  source&&typeof source==='object'&&!Array.isArray(source)
   &&Array.isArray((source as NamedFormulaCollection).items)
   ?(source as NamedFormulaCollection).items:null;
 if(!rows||rows.length>200)throw Error('SUM requires a bounded numeric collection');
 let total=0;
 for(const entry of rows){
  let value:unknown=entry;
  if(entry&&typeof entry==='object'&&!Array.isArray(entry)){
   const item=entry as Record<string,unknown>;
   const record=item.record;
   const field=typeof item.criteriaField==='string'?item.criteriaField.split('.').at(-1):null;
   if(record&&typeof record==='object'&&!Array.isArray(record)&&field
    &&Object.prototype.hasOwnProperty.call(record,field))
    value=(record as Record<string,unknown>)[field];
   else value=item.value;
  }
  if(typeof value!=='number'||!Number.isFinite(value))
   throw Error('SUM requires finite numeric collection values');
  total+=value;
  if(!Number.isFinite(total))throw Error('SUM result must be finite');
 }
 return total;
}
