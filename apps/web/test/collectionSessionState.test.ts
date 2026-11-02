import test from 'node:test';
import assert from 'node:assert/strict';
import {formulaSignatureAt} from '../src/core/builders/PageBuilder/formulaSignatureHelp';
import {pageStateChoices} from '../src/core/builders/PageBuilder/pageStateChoices';
import {namedCollectionName,registerSessionCollection,getSessionCollection} from '../src/core/pages/PageRuntime/pageCollectionSession';
import {pageComponentRecordQuery,filterPageComponentRecords,resolvePageFilterValue} from '../src/core/pages/PageRuntime/pageComponentBindings';
import {createNamedFormulaCollection,formulaCollectionReferenceKey} from '../../server/src/expression-engine/FormulaCollection';
import {parseCollectionListBinding,filteredCollectionItems} from '../src/core/pages/PageRuntime/pageCollectionListBinding';
import {namedCollectionRows} from '../src/core/pages/PageRuntime/usePageCollectionFormula';
import {evaluateFieldExpression,evaluateCollectionFormula} from '../src/component-libraries/shared/FieldExpression.js';

test('Excel-style signature follows nested calls, quoted commas and any registered formula',()=>{
 const a=formulaSignatureAt('IF(AND(@Open, OR(TRUE, FALSE)), "yes, ok", 3)',32);
 assert.equal(a?.name,'IF');
 assert.equal(a?.argument,1);
 const b=formulaSignatureAt('COLLECTION("MyCollection", IF(TRUE, 1, 2), ',43);
 assert.equal(b?.name,'COLLECTION');
 assert.equal(b?.argument,2);
 assert.equal(b?.parameters[0].name,'name');
 assert.equal(b?.parameters[1].name,'tab_label');
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

test('named Collection selection is readable by general formula engine without a component binding',()=>{
 const options={namedCollectionSelections:{MyCollection:{Id:'cat-22',Name:'Burgers',Value:'cat-22'}}};
 assert.equal(evaluateFieldExpression('@MyCollection.state.Id',{},options),'cat-22');
 assert.equal(evaluateFieldExpression('@MyCollection.state.Name',{},options),'Burgers');
 assert.equal(evaluateFieldExpression('IF(@MyCollection.state.Id = "cat-22", "YES", "NO")',{},options),'YES');
 assert.equal(evaluateFieldExpression('@Unknown.state.Id',{},options),'');
 const created=evaluateCollectionFormula('COLLECTION("Selections",@MyCollection.state.Id)',{},
  {state:{collectionSelections:options.namedCollectionSelections}});
 assert.equal(created.error,undefined);
 assert.deepEqual(created.value.items,['cat-22']);
});

test('Excel equals-prefix distinguishes typed Collection formula from ordinary literal text',()=>{
 assert.equal(evaluateFieldExpression('Collection',{}),'Collection');
 assert.equal(evaluateFieldExpression('Collection("Menu", "Burgers")',{}),
   'Collection("Menu", "Burgers")');
 assert.equal(evaluateFieldExpression('=IF(TRUE, "Burgers", "Other")',{}),'Burgers');
 assert.equal(evaluateFieldExpression('=@Name',{Name:'Burgers'}),'Burgers');
 const created=evaluateCollectionFormula('=COLLECTION("Menu", "Burgers", "Drinks")');
 assert.equal(created.error,undefined);
 assert.equal(created.value.name,'Menu');
 assert.deepEqual(created.value.items,['Burgers','Drinks']);
 assert.equal(namedCollectionName('=COLLECTION("Menu", "Burgers")'),'Menu');
 const page=pageStateChoices([{id:'tabs',properties:{textSource:'=COLLECTION("Menu", "Burgers")'}}]);
 assert.ok(page.some(item=>item.key==='Menu.state.Id'));
});
test('wildcard criteria are global formula comparisons, never an unrestricted Object query',()=>{
 const options={namedCollectionSelections:{MyCollection:{Id:'22',Name:'Burgers',Value:'22'}}};
 assert.equal(evaluateFieldExpression('=@MyCollection = "*"',{},options),'true');
 assert.equal(evaluateFieldExpression('=@MyCollection = "Burgers*"',{},options),'true');
 assert.equal(evaluateFieldExpression('=@MyCollection = "Drinks*"',{},options),'false');
 assert.equal(evaluateFieldExpression('=@MyCollection.state.Id = "22"',{},options),'true');
 assert.equal(evaluateFieldExpression('=@Product.Name = "*"',{Name:'Burgers'},
  {rootObjectApiName:'Product'}),'true','qualified source field reads primary authorised row');
 assert.equal(evaluateFieldExpression('=@Product.Name = "*"',{Product:{Name:'Burgers'}}),'true');
 assert.equal(evaluateFieldExpression('=@Product.Name = "Burgers*"',{Product:{Name:'Burgers'}}),'true');
 assert.equal(evaluateFieldExpression('=@Product.Name = "Burgers*"',{Product:{Name:'Drinks'}}),'false');
 assert.equal(evaluateFieldExpression('=2*3',{}),'6','bare star remains multiplication');
});

test('COLLECTION supports SUMIFS-like repeating tab caption, source field and criterion clauses',()=>{
 const source={MenuCategory:[
  {Id:'22',Name:'Burgers'},{Id:'23',Name:'Coca Cola'},
  {Id:'24',Name:'Coca Zero'},{Id:'25',Name:'Drinks'}]};
 const formula='=COLLECTION("MyTabs", "All", @MenuCategory.Name, "*", '
  +'"Coca", @MenuCategory.Name, "Coca*", '
  +'"Burgers", @MenuCategory.Name, "Burgers", @MenuCategory.Name)';
 const result=evaluateCollectionFormula(formula,source,{primaryObject:'MenuCategory'});
 assert.equal(result.error,undefined);
 assert.equal(result.value.name,'MyTabs');
 const rows=result.value.items as Array<Record<string,unknown>>;
 assert.deepEqual(rows.slice(0,3).map(row=>[row.label,row.value,row.criteriaField]),
  [['All','*','MenuCategory.Name'],['Coca','Coca*','MenuCategory.Name'],
   ['Burgers','Burgers','MenuCategory.Name']]);
 assert.equal(rows[3].label,'Burgers');
 assert.equal(rows[3].value,'22');
 assert.equal(rows[4].value,'23');
 assert.equal(rows.length,7);
});
test('unqualified @Name works with selected Object records and legacy item input without blank errors',()=>{
 const source={MenuCategory:[{Id:'22',Name:'Burgers'},{Id:'23',Name:'Coca Cola'}]};
 const formula='=COLLECTION("testproducts","test",@Name)';
 const result=evaluateCollectionFormula(formula,source,{primaryObject:'MenuCategory'});
 assert.equal(result.error,undefined);
 assert.equal(result.value.items[0],'test');
 assert.equal(result.value.items[1].label,'Burgers');
 assert.equal(result.value.items[1].value,'22');
 assert.equal(result.value.items[2].label,'Coca Cola');
 const generated=evaluateCollectionFormula('=COLLECTION("Filtered", @Name = "Coca*")',
  source,{primaryObject:'MenuCategory'});
 assert.equal(generated.error,undefined);
 assert.equal(generated.value.items.length,1);
 assert.equal(generated.value.items[0].value,'23');
 assert.equal(generated.value.items[0].criteriaField,'MenuCategory.Name');
 const noMatch=evaluateCollectionFormula('=COLLECTION("Empty", @Name = "Absent*")',
  source,{primaryObject:'MenuCategory'});
 assert.equal(noMatch.error,undefined);
 assert.equal(noMatch.value.items.length,0);
});
test('Collection state carries criterion field separately from ID and respects field-specific wildcards',()=>{
 const fields=[{apiName:'Name',dataType:'Text',label:'Name'}] as any;
 const chosen={field:'Name',operator:'Equals',value:{source:'CollectionState',
  key:'MyTabs.state.Id',skipWhenBlank:true,allWhenStar:false}};
 const context=(Id:string)=>({pageState:{collectionSelections:{
  MyTabs:{Id,Name:'All',Criteria:Id,Field:'MenuCategory.Name'}}}});
 assert.deepEqual(pageComponentRecordQuery([chosen],fields,context('Coca*')).filters,
  [{field:'Name',operator:'matches',value:'Coca*'}]);
 assert.deepEqual(pageComponentRecordQuery([chosen],fields,context('*')).filters,
  [{field:'Name',operator:'matches',value:'*'}]);
 const rows=[{Name:'Coca Cola'},{Name:'Drinks'}];
 assert.deepEqual(filterPageComponentRecords(rows,[chosen],fields,context('Coca*')),[rows[0]]);
 assert.deepEqual(filterPageComponentRecords(rows,[chosen],fields,context('*')),rows);
 assert.equal(resolvePageFilterValue({source:'CollectionState',key:'MyTabs.state.Field'},
  context('*')),'MenuCategory.Name');
 assert.equal(resolvePageFilterValue({source:'CollectionState',key:'MyTabs.state.Criteria'},
  context('Coca*')),'Coca*');
 const names=pageStateChoices([{id:'tabs',
  properties:{textSource:'=COLLECTION("MyTabs","All",@Name,"*")'}}]);
 assert.ok(names.some(item=>item.key==='MyTabs.state.Criteria'));
 assert.ok(names.some(item=>item.key==='MyTabs.state.Field'));
});
test('global Collection formula signature hints reflect repeated SUMIFS-like clauses',()=>{
 const formula='=COLLECTION("MyTabs", "All", @Name, "*", "Coca", @Name, ';
 const signature=formulaSignatureAt(formula,formula.length);
 assert.equal(signature?.name,'COLLECTION');
 assert.equal(signature?.parameters[0].name,'name');
 assert.equal(signature?.parameters[1].name,'tab_label');
 assert.equal(signature?.parameters[2].name,'criteria_range');
 assert.equal(signature?.parameters[3].name,'criteria');
 assert.equal(signature?.parameters[4].name,'tab_label2');
 assert.equal(signature?.parameters[5].name,'criteria_range2');
 assert.equal(signature?.argument,6);
});

test('spaced Collection names are readable and expose safe stable state references',()=>{
 const source='=COLLECTION("test collection","All",@Name,"*","Coca",@Name,"Coca*")';
 assert.equal(namedCollectionName(source),'test collection');
 assert.equal(formulaCollectionReferenceKey('test collection'),'test_collection');
 const collection=evaluateCollectionFormula(source,{
  MenuCategory:[{Id:'1',Name:'Burgers'},{Id:'2',Name:'Coca Cola'}]
 },{primaryObject:'MenuCategory'});
 assert.equal(collection.error,undefined);
 assert.equal(collection.value.name,'test collection');
 assert.equal(collection.value.items[0].value,'*');
 const suggestions=pageStateChoices([{id:'tabs',properties:{textSource:source}}]);
 assert.ok(suggestions.some(item=>item.key==='test_collection.state.Id'));
 const stop=registerSessionCollection('page#session','tabs',collection.value);
 assert.equal(getSessionCollection('page#session','test_collection')?.name,'test collection');
 assert.equal(getSessionCollection('other#session','test_collection'),undefined);
 stop();
});
test('Collection names with aliased collisions do not overwrite existing session data',()=>{
 const first={name:'test collection',items:['All']};
 const second={name:'test_collection',items:['Other']};
 const stopFirst=registerSessionCollection('alias-page','one',first);
 const stopSecond=registerSessionCollection('alias-page','two',second);
 assert.equal(getSessionCollection('alias-page','test_collection'),first);
 stopSecond();stopFirst();
});
test('list-valued field criteria return matching names or empty rows, never Boolean captions',()=>{
 const rows=[{Id:'1',Name:'Burgers'},{Id:'2',Name:'Desserts'},
  {Id:'3',Name:'Drinks'},{Id:'4',Name:''}];
 const all=parseCollectionListBinding('@Name = "*"', 'MenuCategory');
 assert.ok(all);
 assert.deepEqual(filteredCollectionItems(all!,rows).map(item=>item.label),
  ['Burgers','Desserts','Drinks']);
 const matches=parseCollectionListBinding('@Name="Dessert*"', 'MenuCategory');
 assert.ok(matches);
 assert.deepEqual(filteredCollectionItems(matches!,rows).map(item=>item.label),['Desserts']);
 const none=parseCollectionListBinding('@Name="Coca*"', 'MenuCategory');
 assert.ok(none);
 assert.deepEqual(filteredCollectionItems(none!,rows),[]);
 assert.equal(parseCollectionListBinding('=IF(@Name="Coca*",TRUE,FALSE)','MenuCategory'),null);
 assert.equal(parseCollectionListBinding('=@Name','MenuCategory'),null);
 const many=parseCollectionListBinding('=@MenuCategory.Name = "Dessert*"','MenuCategory');
 assert.equal(many?.object,'MenuCategory');
});
test('spaced Collection names remain rejected if invalid or unescaped',()=>{
 assert.throws(()=>createNamedFormulaCollection('Not.Valid',['ok']),/name/i);
 assert.throws(()=>createNamedFormulaCollection(' bad',['ok']),/name/i);
 assert.equal(namedCollectionName('=COLLECTION("123 bad","x")'),undefined);
});

test('named Collection list filters reuse saved items without losing IDs or criteria',()=>{
 const saved={name:'tab collection',items:[
  {label:'All',value:'*',criteriaField:'MenuCategory.Name',criteria:'*'},
  {label:'Desserts',value:'22',criteriaField:'MenuCategory.Name',criteria:'Desserts'},
  {label:'Burgers',value:'23',criteriaField:'MenuCategory.Name',criteria:'Burgers'}
 ]};
 const rows=namedCollectionRows(saved);
 const choice=parseCollectionListBinding('@tab_collection = "Dessert*"','MenuCategory');
 assert.ok(choice);
 const match=filteredCollectionItems({...choice!,field:'Name'},rows);
 assert.equal(match.length,1);
 assert.equal(match[0].label,'Desserts');
 assert.equal(match[0].value,'22');
 assert.equal(match[0].criteriaField,'MenuCategory.Name');
 assert.equal(match[0].criteria,'Desserts');
});
