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
    ||typeof entry.value!=='string'
    ||typeof entry.criteria!=='string'
    ||typeof entry.criteriaField!=='string'
    ||(entry.criteriaField!==''&&!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)?$/.test(entry.criteriaField)))
   throw Error('COLLECTION entry requires a label, field and criterion');
  return item;
 });
 // A single @Field argument can expand to 200 authorised records even though
 // the formula itself accepts at most 19 user-authored item arguments.
 return {name,items:mergeFormulaCollectionValues([checked])};
}
