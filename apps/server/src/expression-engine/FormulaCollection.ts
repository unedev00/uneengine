/** One bounded collection constructor shared by Flow and component formulas.
 * Receives values already resolved from authorised contexts; performs no I/O.
 * Scalars and record entries retain their types. Nested arrays are flattened.
 */
export function mergeFormulaCollectionValues(values:readonly unknown[],limit=200):unknown[]{
 if(!Array.isArray(values)||values.length>20)throw Error('COLLECTION accepts up to 20 arguments');
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
   if(typeof value==='number'&&!Number.isFinite(value))throw Error('Nonfinite COLLECTION value');
   items.push(value);
   if(items.length>limit)throw Error('COLLECTION exceeds '+limit+' entries; narrow source filters');
  }
 };
 values.forEach(value=>append(value,0));
 return items;
}
