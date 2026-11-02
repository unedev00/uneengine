import test from 'node:test';
import assert from 'node:assert/strict';
import {formulaSignatureAt} from '../src/core/builders/PageBuilder/formulaSignatureHelp';
import {pageStateChoices} from '../src/core/builders/PageBuilder/pageStateChoices';
import {namedCollectionName,registerSessionCollection,getSessionCollection} from '../src/core/pages/PageRuntime/pageCollectionSession';
import {pageComponentRecordQuery,filterPageComponentRecords,resolvePageFilterValue} from '../src/core/pages/PageRuntime/pageComponentBindings';
import {createNamedFormulaCollection} from '../../server/src/expression-engine/FormulaCollection';

test('Excel-style signature follows nested calls, quoted commas and any registered formula',()=>{
 const a=formulaSignatureAt('IF(AND(@Open, OR(TRUE, FALSE)), "yes, ok", 3)',29);
 assert.equal(a?.name,'IF');
 assert.equal(a?.argument,1);
 const b=formulaSignatureAt('COLLECTION("MyCollection", IF(TRUE, 1, 2), ',43);
 assert.equal(b?.name,'COLLECTION');
 assert.equal(b?.argument,2);
 assert.equal(b?.parameters[0].name,'name');
 assert.equal(b?.parameters[1].name,'value1');
 const c=formulaSignatureAt('ROUND(10,',9);
 assert.equal(c?.name,'ROUND');assert.equal(c?.argument,1);
 assert.equal(c?.parameters[1].name,'digits');
 assert.equal(formulaSignatureAt('not-a-function',14),null);
});
test('named Collection registry is isolated per page session, rejects duplicates, and cleans up',()=>{
 assert.equal(namedCollectionName('COLLECTION("Categories", @MenuCategory.Name)'),'Categories');
 assert.equal(namedCollectionName('COLLECTION("", "x")'),undefined);
 const a={name:'Categories',items:[{Id:'cat1',Name:'Food'}]};
 const b={name:'categories',items:[{Id:'cat2',Name:'Drink'}]};
 const clear1=registerSessionCollection('page-A#session-1','tabs1',a);
 const clear2=registerSessionCollection('page-A#session-1','tabs2',b);
 assert.deepEqual(getSessionCollection('page-A#session-1','Categories'),a);
 assert.equal(getSessionCollection('page-A#session-1','categories'),a);
 assert.equal(getSessionCollection('page-B#session-1','Categories'),undefined);
 clear1();assert.deepEqual(getSessionCollection('page-A#session-1','Categories'),b);
 clear2();assert.equal(getSessionCollection('page-A#session-1','Categories'),undefined);
});
test('Page Builder derives valid state choices from metadata, not component display labels',()=>{
 const options=pageStateChoices([
  {id:'tabs',properties:{collectionFormula:'Collection("MyCollection", "All", @MenuCategory.Name)',
   actionFlows:{change:{actionType:'PageState',stateKey:'categoryId'}}}},
  {id:'lookup',properties:{stateBindings:{items:'cartRows'},collectionFormula:''}},
 ]);
 assert.ok(options.some(x=>x.source==='CollectionState'&&x.key==='MyCollection.state.Id'));
 assert.ok(options.some(x=>x.source==='CollectionState'&&x.key==='MyCollection.state.Name'));
 assert.ok(options.some(x=>x.source==='PageState'&&x.key==='categoryId'));
 assert.ok(options.some(x=>x.source==='PageState'&&x.key==='cartRows'));
});
test('selected Collection ID filters any record data source and star only skips opted-in condition',()=>{
 const fields=[{apiName:'Category',label:'Category',dataType:'Text'},
  {apiName:'Active',label:'Active',dataType:'Boolean'}] as any;
 const all={field:'Category',operator:'Equals',
  value:{source:'CollectionState',key:'MyCollection.state.Id',skipWhenBlank:true,allWhenStar:true}};
 const active={field:'Active',operator:'Equals',value:'true'};
 const items=[{Category:'a',Active:true},{Category:'b',Active:true},{Category:'b',Active:false}];
 const scope=(id:unknown)=>({pageState:{collectionSelections:{MyCollection:{Id:id,Name:'Choice'}}}});
 assert.equal(resolvePageFilterValue(all.value,scope('a')),'a');
 assert.deepEqual(filterPageComponentRecords(items,[all],fields,scope('a')),[items[0]]);
 assert.deepEqual(filterPageComponentRecords(items,[all],fields,scope('*')),items);
 assert.deepEqual(filterPageComponentRecords(items,[all,active],fields,scope('*'),'OR'),
  [items[0],items[1]]);
 assert.equal(pageComponentRecordQuery([all,active],fields,scope('*'),'AND').blocked,false);
 assert.equal(pageComponentRecordQuery([{...all,value:{...all.value,allWhenStar:false}}],fields,scope('*')).filters?.[0]?.value,'*');
 assert.equal(pageComponentRecordQuery([{...all,value:{source:'CollectionState',key:'Bad-Name.state.Id'}}],fields,scope('*')).blocked,true);
});
test('COLLECTION constructor rejects empty item slots while preserving valid zero and false',()=>{
 assert.throws(()=>createNamedFormulaCollection('Choices',['',2]),/blank value at item 1/i);
 assert.throws(()=>createNamedFormulaCollection('Choices',[null]),/blank value at item 1/i);
 assert.deepEqual(createNamedFormulaCollection('Choices',[0,false]).items,[0,false]);
});
