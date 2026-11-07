import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formulaSignatureAt} from '../src/core/builders/PageBuilder/formulaSignatureHelp';
import {pageStateChoices} from '../src/core/builders/PageBuilder/pageStateChoices';
import {isCollectionSourceExpression,namedCollectionName,namedCollectionNames,registerSessionCollection,getSessionCollection,equalSessionCollection} from '../src/core/pages/PageRuntime/pageCollectionSession';
import {collectionRecordFilterFormula,pageComponentRecordQuery,filterPageComponentRecords,resolvePageFilterValue} from '../src/core/pages/PageRuntime/pageComponentBindings';
import {createNamedFormulaCollection,formulaCollectionReferenceKey} from '../../server/src/expression-engine/FormulaCollection';
import {parseCollectionListBinding,filteredCollectionItems} from '../src/core/pages/PageRuntime/pageCollectionListBinding';
import {namedCollectionRows,collectionFormulaReferences} from '../src/core/pages/PageRuntime/usePageCollectionFormula';
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

test('a single field can expand into more than nineteen authorised Collection entries',()=>{
 const rows=Array.from({length:35},(_,index)=>({Id:'c'+index,Name:'Category '+index}));
 const result=evaluateCollectionFormula('=COLLECTION("All Categories",@Name)',{
  MenuCategory:rows
 },{primaryObject:'MenuCategory'});
 assert.equal(result.error,undefined);
 assert.equal(result.value.items.length,35);
 assert.equal(result.value.items[34].value,'c34');
});

test('nested IF returns a typed Collection and publishes both possible output names',()=>{
 const formula='=IF(TRUE, COLLECTION("FoodTabs", "Fruits", @MenuCategory.Name, "Fruit*", "Vegetables", @MenuCategory.Name, "Vegetable*"), COLLECTION("DrinkTabs", "Tea", "", ""))';
 assert.deepEqual(namedCollectionNames(formula),['FoodTabs','DrinkTabs']);
 assert.deepEqual(namedCollectionNames('=SUM(COLLECTION("Temporary", 2))'),[]);
 const source={MenuCategory:[{Id:'a',Name:'Fruits'},{Id:'b',Name:'Vegetables'}]};
 const result=evaluateCollectionFormula(formula,source,{primaryObject:'MenuCategory'});
 assert.equal(result.error,undefined);
 assert.equal(result.value.name,'FoodTabs');
 assert.deepEqual(result.value.items.map((item:any)=>item.label),['Fruits','Vegetables']);
 const actual=evaluateCollectionFormula('=IF(@type = "Food", COLLECTION("FoodTabs", "Pizza", @MenuCategory.Name, "Pizza*"), COLLECTION("DrinkTabs", "Tea", "", ""))',
  source,{primaryObject:'MenuCategory',record:{type:'Food'}});
 assert.equal(actual.error,undefined);
 assert.equal(actual.value.name,'FoodTabs');
 const choices=pageStateChoices([{id:'source',properties:{textSource:formula}}]);
 assert.ok(choices.some(item=>item.key==='FoodTabs.state.Id'));
 assert.ok(choices.some(item=>item.key==='DrinkTabs.state.Id'));
});

test('derived named collections filter labels without mutating upstream session collections',()=>{
 const original=evaluateCollectionFormula('=COLLECTION("myfood","Fruits",@MenuCategory.Name,"Fruit*","Vegetables",@MenuCategory.Name,"Vegetable*")');
 assert.equal(original.error,undefined);
 const saved={myfood:original.value};
 const result=evaluateCollectionFormula('=COLLECTION(mynewfood,@myfood,"<>Vegetables")',
  {},{namedCollections:saved});
 assert.equal(result.error,undefined);
 assert.equal(result.value.name,'mynewfood');
 assert.deepEqual(result.value.items.map((item:any)=>item.label),['Fruits']);
 assert.deepEqual(saved.myfood.items.map((item:any)=>item.label),['Fruits','Vegetables']);
 const removed=evaluateCollectionFormula('=COLLECTION(mynewfood,@myfood,"<>Vegetables")',{},
  {namedCollections:{}});
 assert.match(removed.error??'',/Named collection source unavailable/i);
 assert.equal(removed.value,null);
 const wildcard=evaluateCollectionFormula('=COLLECTION("matching",@myfood,"Fru*")',
  {},{namedCollections:saved});
 assert.equal(wildcard.error,undefined);
 assert.deepEqual(wildcard.value.items.map((item:any)=>item.label),['Fruits']);
});

test('direct named Collection criteria can filter without requiring a selected Object',()=>{
 const source={name:'myfood',items:[{label:'Fruits',value:'f'},{label:'Vegetables',value:'v'}]};
 const formula=parseCollectionListBinding('@myfood <> "Vegetables"','');
 assert.ok(formula);
 assert.deepEqual(filteredCollectionItems({...formula!,field:'Name'},namedCollectionRows(source))
  .map(item=>item.label),['Fruits']);
 const prefix=parseCollectionListBinding('@myfood = "Fru*"','');
 assert.ok(prefix);
 assert.deepEqual(filteredCollectionItems({...prefix!,field:'Name'},namedCollectionRows(source))
  .map(item=>item.label),['Fruits']);
});

test('SUM composes with typed numeric Collections and field/criterion clauses',()=>{
 const rows={Order:[{Id:'1',Amount:10},{Id:'2',Amount:20},{Id:'3',Amount:-5}]};
 const direct=evaluateFieldExpression('=SUM(COLLECTION("Prices",@Order.Amount))',{},
  {collectionSources:rows});
 assert.equal(direct,'25');
 const conditional=evaluateFieldExpression('=IF(SUM(COLLECTION("Sales","Sales",@Order.Amount,">0")) > 25, "Met", "Missed")',{},
  {collectionSources:rows});
 assert.equal(conditional,'Met');
 const all=evaluateCollectionFormula('=COLLECTION("Manual", "All", "", "")');
 assert.equal(all.error,undefined);
 assert.deepEqual(all.value.items,['All']);
 const criteria=evaluateCollectionFormula('=COLLECTION("Manual", "Apple", "", "A*", "Banana", "", "A*")');
 assert.equal(criteria.error,undefined);
 assert.deepEqual(criteria.value.items,['Apple']);
});

test('scalar SUM formulas hydrate the same authorised Object fields as collection-valued formulas',()=>{
 assert.deepEqual(collectionFormulaReferences('=SUM(COLLECTION("Amounts","Positive",@Sale.Amount,">0"))','Sale'),
  [{object:'Sale',field:'Amount'}]);
 assert.deepEqual(collectionFormulaReferences('=IF(TRUE,COLLECTION("Food","Pizza",@MenuCategory.Name,"Pizza*"),COLLECTION("Drinks","Tea","",""))','MenuCategory'),
  [{object:'MenuCategory',field:'Name'}]);
});

test('direct Text formula @Name = "des*" uses the same permission-scoped record query as visual filtering',()=>{
 const fields=[{apiName:'Name',label:'Name',dataType:'Text'}] as any;
 const expression='@Name = "des*"';
 const predicate=collectionRecordFilterFormula({textSource:expression},'MenuCategory',fields);
 assert.equal(predicate,'@Name = "des*"');
 const direct=pageComponentRecordQuery([],fields,{},'AND',predicate);
 const visual=pageComponentRecordQuery([{field:'Name',operator:'Equals',value:'des*'}],fields);
 assert.equal(direct.blocked,false);
 assert.deepEqual(direct.filters,visual.filters);
 assert.deepEqual(direct.filters,[{field:'Name',operator:'matches',value:'des*'}]);
 const rows=[{Id:'1',Name:'Desserts'},{Id:'2',Name:'Drinks'}];
 const parsed=parseCollectionListBinding(expression,'MenuCategory');
 assert.ok(parsed);
 assert.deepEqual(filteredCollectionItems(parsed!,rows).map(row=>row.label),['Desserts']);
 assert.equal(collectionRecordFilterFormula({textSource:expression},'',fields),'',
  'named session collections do not trigger an Object query');
 assert.equal(collectionRecordFilterFormula({textSource:'@myfood = "B*"'},'MenuCategory',fields),'',
  'named collections are not mistaken for Object fields');
});

test('IF returning an existing named session collection is a list Data Source',()=>{
 const food={name:'myfood',items:['Fruits','Vegetables']};
 const drinks={name:'mydrinks',items:['Tea','Coffee']};
 const inputs={namedCollections:{myfood:food,mydrinks:drinks}};
 assert.equal(isCollectionSourceExpression('=IF(TRUE,@myfood,@mydrinks)',['myfood','mydrinks']),true);
 assert.equal(isCollectionSourceExpression('=IF(TRUE, @myfood, @missing)',['myfood']),true);
 assert.equal(isCollectionSourceExpression('=IF(TRUE, 1, 2)',['myfood']),false);
 assert.equal(isCollectionSourceExpression('=SUM(COLLECTION("Numbers", 1, 2))',[]),false);
 const selected=evaluateCollectionFormula('=IF(TRUE, @myfood, @mydrinks)',{},inputs);
 assert.equal(selected.error,undefined);
 assert.deepEqual(selected.value.items,food.items);
 const other=evaluateCollectionFormula('=IF(FALSE, @myfood, @mydrinks)',{},inputs);
 assert.equal(other.error,undefined);
 assert.deepEqual(other.value.items,drinks.items);
 assert.deepEqual(collectionFormulaReferences('=IF(TRUE,@myfood,@missing)','MenuCategory',['myfood'],['Name']),[]);
});

test('direct collection criterion and authored filters combine without widening record access',()=>{
 const fields=[{apiName:'Name',label:'Name',dataType:'Text'},
  {apiName:'Active',label:'Active',dataType:'Boolean'}] as any;
 const collectionPredicate=collectionRecordFilterFormula(
  {textSource:'@Name = "des*"',filterFormula:'@Active = TRUE'},'Category',fields);
 assert.equal(collectionPredicate,'@Name = "des*"');
 const query=pageComponentRecordQuery([],fields,{},'AND',
  'AND(@Active = TRUE,'+collectionPredicate+')');
 assert.equal(query.blocked,false);
 assert.deepEqual(query.filters,[
  {field:'Active',operator:'eq',value:'true'},
  {field:'Name',operator:'matches',value:'des*'}
 ]);
});

test('collection data overrides generic presenter records in both Page Runtime adapters',()=>{
 for(const path of ['../src/core/pages/PageRuntime/pageRuntimeViews.tsx',
  '../src/core/pages/MetadataBoundPageComponent/MetadataBoundPageComponent.tsx']){
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  const data=source.indexOf('...(dataCollectionRows?{records:dataCollectionRows}:{}),');
  assert.ok(data>=0,path+' must supply typed collection rows to the component');
  const presenter=source.lastIndexOf('...presented,',data);
  assert.ok(presenter>=0&&data-presenter<400,
   path+' must not overwrite filtered Collection records with default presenter rows');
  assert.ok(!source.slice(data,data+350).includes('...presented,'),
   path+' must preserve source priority for collection records');
 }
});

test('session Collection visual filter and direct Formula Bar share wildcard comparisons',()=>{
 const fields=[{apiName:'Name',label:'Caption',dataType:'Text'}] as any;
 const saved={name:'myfood',items:['Fruits','Vegetables','Banana']};
 const rows=namedCollectionRows(saved);
 const visual=filterPageComponentRecords(rows,[{field:'Name',operator:'Equals',value:'B*'}],fields);
 const direct=parseCollectionListBinding('@myfood = "B*"','');
 assert.ok(direct);
 const source=filteredCollectionItems({...direct!,field:'Name'},rows);
 assert.deepEqual(visual.map(row=>row.Name),source.map(row=>row.label));
});

test('COLLECTION composes an All tab with authorised categories excluding Offers',()=>{
 const records=[
  {Id:'cat-1',Name:'Offers'}, {Id:'cat-2',Name:'Desserts'},
  {Id:'cat-3',Name:'Burgers'}, {Id:'cat-4',Name:'Chicken'}
 ];
 const sources={MenuCategory:records};
 const result=evaluateCollectionFormula(
  '=COLLECTION("mycoll","All",@Name,"*",@Name<>"Offers")',
  sources,{primaryObject:'MenuCategory'});
 assert.equal(result.error,undefined);
 assert.deepEqual(result.value.items.map((item:any)=>item.label),
  ['All','Desserts','Burgers','Chicken']);
 assert.deepEqual(result.value.items.map((item:any)=>item.value),
  ['*','cat-2','cat-3','cat-4']);
 assert.equal(result.value.items[1].criteriaField,'MenuCategory.Name');
 assert.equal(result.value.items[1].record,records[1]);
 const filtered=evaluateCollectionFormula(
  '=COLLECTION("notOffers",@MenuCategory.Name!="off*")',
  sources,{primaryObject:'MenuCategory'});
 assert.equal(filtered.error,undefined);
 assert.deepEqual(filtered.value.items.map((item:any)=>item.label),
  ['Desserts','Burgers','Chicken']);
 const matching=evaluateCollectionFormula(
  '=COLLECTION("matching",@Name="Burg*")',
  sources,{primaryObject:'MenuCategory'});
 assert.equal(matching.error,undefined);
 assert.deepEqual(matching.value.items.map((item:any)=>item.label),['Burgers']);
 assert.equal(evaluateFieldExpression('=@Name<>"Offers"',records[1]),'true');
});

test('COLLECTION shares all Excel field-comparison operators for numeric and Boolean values',()=>{
 const numeric={
  Product:[{Id:'1',Price:5},{Id:'2',Price:10},{Id:'3',Price:15}]
 };
 const comparisons:Array<[string,string,string[]]>=[
  ['=', '10',['2']], ['==','10',['2']],
  ['<>','10',['1','3']], ['!=','10',['1','3']],
  ['<','10',['1']], ['<=','10',['1','2']],
  ['>','10',['3']], ['>=','10',['2','3']]
 ];
 for(const [operator,limit,expected] of comparisons){
  const result=evaluateCollectionFormula(
   '=COLLECTION("PriceFilter",@Price'+operator+limit+')',
   numeric,{primaryObject:'Product'});
  assert.equal(result.error,undefined,operator);
  assert.deepEqual(result.value.items.map((item:any)=>item.value),expected,operator);
 }
 const bool=evaluateCollectionFormula(
  '=COLLECTION("Enabled",@Enabled<>FALSE)',
  {Setting:[{Id:'a',Enabled:false},{Id:'b',Enabled:true}]},
  {primaryObject:'Setting'});
 assert.equal(bool.error,undefined);
 assert.deepEqual(bool.value.items.map((item:any)=>item.value),['b']);
 assert.equal(evaluateFieldExpression('=@Price>=10',{Price:10}),'true');
});

test('COLLECTION field comparisons fail closed on unavailable or non-scalar fields',()=>{
 const source={MenuCategory:[{Id:'1',Name:'Offers',Details:{hidden:true}}]};
 const missing=evaluateCollectionFormula(
  '=COLLECTION("Missing",@Missing<>"Offers")',source,{primaryObject:'MenuCategory'});
 assert.match(missing.error??'',/COLLECTION field unavailable: MenuCategory.Missing/);
 const unsafe=evaluateCollectionFormula(
  '=COLLECTION("Unsafe",@Details<>"Offers")',source,{primaryObject:'MenuCategory'});
 assert.match(unsafe.error??'',/COLLECTION field must be scalar: MenuCategory.Details/);
});

test('COLLECTION joins selected category to nullable authorised lookups without losing record data',()=>{
 const products=[
  {Id:'uncategorised',Name:'Uncategorised',Price:3},
  {Id:'p1',Name:'Cola',Price:1.25,ImageUrl:'https://example.com/cola.png',MenuCategory:'drinks'},
  {Id:'p2',Name:'Fries',Price:2,MenuCategory:'sides'},
  {Id:'p3',Name:'Water',Price:1,MenuCategory:'drinks'}
 ];
 const formula='=COLLECTION("FilteredProducts",@Product.MenuCategory=@CatCollection.state.Id)';
 const context={primaryObject:'Product',
  state:{collectionSelections:{CatCollection:{Id:'drinks'}}},
  collectionSourceFields:{Product:['MenuCategory','Name','Price','ImageUrl']}};
 const result=evaluateCollectionFormula(formula,{Product:products},context);
 assert.equal(result.error,undefined);
 assert.deepEqual(result.value.items.map((item:any)=>item.value),['p1','p3']);
 const gridRows=namedCollectionRows(result.value);
 assert.deepEqual(gridRows.map(row=>row.Name),['Cola','Water']);
 assert.equal(gridRows[0].Price,1.25);
 assert.equal(gridRows[0].ImageUrl,'https://example.com/cola.png');
 assert.equal(gridRows[0].Id,'p1');
 assert.equal(gridRows[0].__collectionLabel,'drinks');

 // Even if every authorised lookup is unset, this is an empty result, not
 // an unavailable-field error. Unknown or inaccessible metadata still fails.
 const empty=evaluateCollectionFormula(formula,{Product:products.slice(0,1)},context);
 assert.equal(empty.error,undefined);
 assert.equal(empty.value.items.length,0);
 const inaccessible=evaluateCollectionFormula(formula,{Product:products},{
  ...context,collectionSourceFields:{Product:['Name','Price']}});
 assert.match(inaccessible.error??'',/COLLECTION field unavailable: Product.MenuCategory/);
 const all=evaluateCollectionFormula(
  '=COLLECTION("FilteredProducts",@Product.Name)',{Product:products},context);
 assert.equal(all.error,undefined);
 assert.equal(all.value.items.length,4);
 // All and no selection must include uncategorised rows; a literal "*" on
 // a nullable lookup otherwise matches only populated category references.
 const allOrSelected='=IF(OR(ISBLANK(@CatCollection.state.Id),@CatCollection.state.Id="*"),'
  +'COLLECTION("FilteredProducts",@Product.Name),'
  +'COLLECTION("FilteredProducts",@Product.MenuCategory=@CatCollection.state.Id))';
 const allChoice=evaluateCollectionFormula(allOrSelected,{Product:products},{
  ...context,state:{collectionSelections:{CatCollection:{Id:'*'}}}});
 assert.equal(allChoice.error,undefined);
 assert.equal(allChoice.value.items.length,4);
 const noChoice=evaluateCollectionFormula(allOrSelected,{Product:products},{
  ...context,state:{collectionSelections:{}}});
 assert.equal(noChoice.error,undefined);
 assert.equal(noChoice.value.items.length,4);
 const categoryChoice=evaluateCollectionFormula(allOrSelected,{Product:products},context);
 assert.equal(categoryChoice.error,undefined);
 assert.deepEqual(categoryChoice.value.items.map((item:any)=>item.value),['p1','p3']);
});


test('equivalent collection publications do not replace data values or leave an orphan owner',()=>{
 const scope='equal-collection-test',first={name:'Items',items:[{Id:'1',Name:'One',Flags:[true,2]}]};
 const second={name:'Items',items:[{Flags:[true,2],Name:'One',Id:'1'}]};
 assert.equal(equalSessionCollection(first,second),true);
 assert.equal(equalSessionCollection(undefined,null),true);
 assert.equal(equalSessionCollection(first,{name:'Items',items:[{Id:'1',Name:'Changed',Flags:[true,2]}]}),false);
 const firstCleanup=registerSessionCollection(scope,'owner',first);
 const secondCleanup=registerSessionCollection(scope,'owner',second);
 assert.deepEqual(getSessionCollection(scope,'Items'),second);
 firstCleanup();
 assert.deepEqual(getSessionCollection(scope,'Items'),second,'old cleanup cannot remove newer equivalent owner');
 secondCleanup();
 assert.equal(getSessionCollection(scope,'Items'),undefined);
});
