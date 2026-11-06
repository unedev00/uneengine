import assert from 'node:assert/strict';
import {loadBoundedCollectionSource} from '../src/core/pages/PageRuntime/loadBoundedCollectionSource';
import test from 'node:test';
import {componentReaderKey,evaluateFieldExpressionDetailed} from '../src/component-libraries/shared/FieldExpression.js';
import {resolveActionFormulaValue} from '../src/core/pages/PageRuntime/formulaAction';
import {compileRecordFilterFormula} from '../src/core/pages/PageRuntime/recordFilterFormula';
import {formulaSignatureAt} from '../src/core/builders/PageBuilder/formulaSignatureHelp';

test('a product image reads a separate component, leaving record field names available',()=>{
 const formula='=IF($component.userCard.text = "Andy", "", @Image)';
 let user='Andy';
 const readComponent=(name:string,key:string)=>{
  assert.equal(name,'userCard');assert.equal(key,'text');return user;
 };
 const record={Image:'product.png',component:'field value'};
 const run=()=>evaluateFieldExpressionDetailed(formula,record,{readComponent});
 assert.deepEqual(run(),{value:''});
 user='Sarah';
 assert.deepEqual(run(),{value:'product.png'});
 assert.deepEqual(evaluateFieldExpressionDetailed('@component',record,{readComponent}),{value:'field value'});
 assert.deepEqual(evaluateFieldExpressionDetailed('"$component.userCard.text"',record),{value:'$component.userCard.text'});
 assert.equal(formulaSignatureAt(formula,formula.indexOf('@Image'))?.argument,2);
});

test('page actions and bounded record queries consume the same page-local value',()=>{
 const state={[componentReaderKey]:()=> 'Andy'};
 assert.equal(resolveActionFormulaValue('$component.userCard.text',{},state),'Andy');
 const result=compileRecordFilterFormula('@Name = $component.userCard.text',
  [{apiName:'Name',dataType:'Text'}] as never,state);
 assert.deepEqual(result.filters,[{field:'Name',operator:'eq',value:'Andy'}]);
 assert.ok(evaluateFieldExpressionDetailed('$component.userCard.text',{}).error);
});

test('secondary COLLECTION uses 100-row bounded pages for 0 through 200 rows',async()=>{
 for(const total of [0,1,100,101,200]){
  const reads:Array<{limit:number;offset:number}>=[];
  const rows=await loadBoundedCollectionSource('Secondary',async (_name,options)=>{
   reads.push(options);
   return {total,records:Array.from({length:Math.min(options.limit,Math.max(0,total-options.offset))},
    (_,index)=>({Id:String(options.offset+index)})};
  });
  assert.equal(rows.length,total);
  assert.deepEqual(reads,total<=100?[{limit:100,offset:0}]:
   [{limit:100,offset:0},{limit:100,offset:100}]);
 }
});

test('secondary COLLECTION rejects over-limit, failed and shifting pages without publishing a partial total',async()=>{
 let count=0;
 await assert.rejects(loadBoundedCollectionSource('Secondary',async()=>{
  count++;return {total:201,records:[] as {Id:string}[]};
 }),/more records than can be safely loaded/);
 assert.equal(count,1);
 for(const failure of ['denied','shifted','short']){
  let reads=0;
  await assert.rejects(loadBoundedCollectionSource('Secondary',async (_name,options)=>{
   reads++;
   if(options.offset===0)return {total:150,records:Array.from({length:100},(_,i)=>({Id:String(i)}))};
   if(failure==='denied')throw Error('Permission denied');
   if(failure==='shifted')return {total:149,records:Array.from({length:49},(_,i)=>({Id:String(i+100)}))};
   return {total:150,records:[] as {Id:string}[]};
  }),failure==='denied'?/Permission denied/:failure==='shifted'?/changed during pagination/:/incomplete page/);
  assert.equal(reads,2);
 }
});
