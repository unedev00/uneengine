import type { FlowReferenceSymbol } from './flowReferenceCatalog';

/** @ / $ / # typed at the cursor (after a space, bracket or start of text).
 * The query must start with a letter, so "$5" or "Order #12" stay plain text. */
export function flowReferenceTokenAt(value:string,cursor:number)
  :{start:number;symbol:FlowReferenceSymbol;query:string}|null{
  const found=/(^|[\s([{,=:+\-*/&"'])([@$#])((?:[A-Za-z_][A-Za-z0-9_.]*)?)$/.exec(value.slice(0,cursor));
  if(!found)return null;
  return {start:cursor-found[3].length-1,symbol:found[2] as FlowReferenceSymbol,query:found[3]};
}

/** Insert a {!Reference} in place of the typed shortcut, keeping the surrounding text. */
export function insertFlowReference(value:string,start:number,end:number,reference:string)
  :{value:string;cursor:number}{
  return {value:value.slice(0,start)+reference+value.slice(end),cursor:start+reference.length};
}
