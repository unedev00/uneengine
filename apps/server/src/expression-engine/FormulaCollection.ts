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

export type NamedFormulaCollection={readonly name:string;readonly items:readonly unknown[]};
/** Name is the first argument and is not an item in the collection. */
export function createNamedFormulaCollection(name:unknown,values:readonly unknown[]):NamedFormulaCollection{
 if(typeof name!=='string'||!/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(name))
  throw Error('COLLECTION requires a name (letters, numbers and underscores; starts with a letter)');
 if(!values.length)throw Error('COLLECTION requires at least one value after its name');
 return {name,items:mergeFormulaCollectionValues(values)};
}
