import {Parser} from '../../../../../server/src/expression-engine/FormulaParser.js';
import {tokenize} from '../../../../../server/src/expression-engine/FormulaTokenizer.js';
import {matchesExcelWildcard,hasExcelWildcardCriteria} from '../../../../../server/src/expression-engine/FormulaWildcard.js';

/** Pure, context-sensitive record list binding for metadata fields that supply
 * collections. An ordinary scalar/Boolean formula remains a scalar elsewhere. */
export type CollectionListBinding={object:string;field:string;criterion:string};
export function parseCollectionListBinding(source:string,primaryObject:string):CollectionListBinding|null{
 const input=source.trim().replace(/^=\s*/,'');
 if(!input.startsWith('@'))return null;
 try{
  const node=new Parser(tokenize(input)).parse();
  if(node.kind!=='binary'||!['=','==','<>','!=','>','>=','<','<='].includes(node.operator)
    ||node.left.kind!=='reference'||node.right.kind!=='literal'
    ||typeof node.right.value!=='string')return null;
  const parts=node.left.value.split('.');
  if(parts.length>2||parts.some(part=>!/^[A-Za-z][A-Za-z0-9_]*$/.test(part)))return null;
  const object=parts.length===2?parts[0]:primaryObject;
  if(!object)return null;
  return {object,field:parts.at(-1)!,criterion:node.operator==='='||node.operator==='=='
   ?node.right.value:node.operator+node.right.value};
 }catch{return null;}
}
/** No source access happens here. Rows must already be authorised and complete. */
export function filteredCollectionItems(
 binding:CollectionListBinding,rows:readonly Record<string,unknown>[]
):Array<{label:string;value:string;criteriaField:string;criteria:string;record:Record<string,unknown>}>{
 const out:Array<{label:string;value:string;criteriaField:string;criteria:string;record:Record<string,unknown>}>=[];
 for(const row of rows){
  if(!Object.prototype.hasOwnProperty.call(row,binding.field))continue;
  const value=row[binding.field];
  if(value===null||value===undefined||String(value).trim()==='')continue;
  const comparison=/^(<>|!=|>=|<=|>|<|=)(.*)$/.exec(binding.criterion);
  const operator=comparison?.[1]??'=',criterion=comparison?comparison[2]:binding.criterion;
  const left=Number(value),right=Number(criterion);
  const matched=['>','<','>=','<='].includes(operator)
   ?Number.isFinite(left)&&Number.isFinite(right)&&(operator==='>'?left>right:
     operator==='<'?left<right:operator==='>='?left>=right:left<=right)
   :(operator==='!='||operator==='<>')
    ?!(hasExcelWildcardCriteria(criterion)?matchesExcelWildcard(String(value),criterion):String(value)===criterion)
    :(hasExcelWildcardCriteria(criterion)?matchesExcelWildcard(String(value),criterion):String(value)===criterion);
  if(!matched)continue;
  out.push({label:String(value),value:String(row.Id??row.id??''),
    criteriaField:typeof row.__collectionCriteriaField==='string'&&row.__collectionCriteriaField
     ?row.__collectionCriteriaField:binding.object+'.'+binding.field,
    criteria:typeof row.__collectionCriteria==='string'&&row.__collectionCriteria
     ?row.__collectionCriteria:String(value),record:row});
 }
 return out;
}
