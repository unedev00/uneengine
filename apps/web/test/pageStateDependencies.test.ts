import test from 'node:test';
import assert from 'node:assert/strict';
import {pageStateDependencies,applyPageSelection} from '../src/core/pages/PageRuntime/pageStateDependencies';

type Component={id:string;properties:Record<string,unknown>};
const component=(id:string,properties:Record<string,unknown>):Component=>({id,properties});
const selected=(Id:string,Name=Id)=>({Id,Name,Value:Id,Field:'',Criteria:''});
const source=(key:string)=>({source:'CollectionState',key,skipWhenBlank:false});

const components:Component[]=[
 component('categories',{textSource:'=COLLECTION("Categories", @Category.Name)'}),
 component('subcategories',{
  textSource:'=COLLECTION("Subcategories", @Category.Name)',
  filters:[{field:'Parent',operator:'Equals',value:source('Categories.state.Id')}],
  actionFlows:{change:{actionType:'PageState',stateKey:'subCategoryId',value:'$event.record.Id'}}
 }),
 component('subsubcategories',{
  textSource:'=COLLECTION("SubSubcategories", @Category.Name)',
  filterFormula:'IF(ISBLANK($state.subCategoryId), TRUE, @Parent = $state.subCategoryId)',
  filters:[{field:'Parent',operator:'Equals',value:source('Subcategories.state.Id')}]
 }),
 component('products',{
  filters:[{field:'Category',operator:'Equals',value:source('SubSubcategories.state.Id')}]
 }),
 component('cart',{actionFlows:{change:{actionType:'PageState',stateKey:'cartId'}}})
];
const graph=pageStateDependencies(components);
const initial={
 collectionSelections:{
  Categories:selected('food'),Subcategories:selected('pizza'),
  SubSubcategories:selected('premium'),Independent:selected('keep')
 },
 subCategoryId:'pizza',cartId:'cart-10',customerName:'Alice'
};

test('changing first Collection clears all downstream selections and state, not independent state',()=>{
 const next=applyPageSelection(initial,{kind:'collection',key:'Categories',value:selected('drinks')},graph);
 assert.deepEqual(next.collectionSelections,{
  Categories:selected('drinks'),Independent:selected('keep')
 });
 assert.equal(next.subCategoryId,undefined);
 assert.equal(next.cartId,'cart-10');
 assert.equal(next.customerName,'Alice');
 assert.equal(initial.subCategoryId,'pizza','source state stays immutable');
 assert.equal(initial.collectionSelections.Subcategories.Id,'pizza');
});

test('reselecting the same parent retains valid dependent state',()=>{
 assert.strictEqual(applyPageSelection(initial,
  {kind:'collection',key:'Categories',value:selected('food')},graph),initial);
});

test('changing a middle Collection clears only its descendants',()=>{
 const next=applyPageSelection(initial,
  {kind:'collection',key:'Subcategories',value:selected('burgers')},graph);
 assert.equal(next.collectionSelections.Categories.Id,'food');
 assert.equal(next.collectionSelections.Subcategories.Id,'burgers');
 assert.equal(next.collectionSelections.SubSubcategories,undefined);
 assert.equal(next.subCategoryId,'pizza','separate Page State changes through its action');
});

test('changing the middle Page State clears matching formula-dependent descendants',()=>{
 const next=applyPageSelection(initial,{kind:'state',key:'subCategoryId',value:'burgers'},graph);
 assert.equal(next.subCategoryId,'burgers');
 assert.equal(next.collectionSelections.Categories.Id,'food');
 assert.equal(next.collectionSelections.Subcategories.Id,'pizza');
 assert.equal(next.collectionSelections.SubSubcategories,undefined);
 assert.equal(next.cartId,'cart-10');
});

test('ordinary object-bound tabs also cascade without a named collection',()=>{
 const custom=[
  component('parent',{actionFlows:{change:{actionType:'PageState',stateKey:'categoryId'}}}),
  component('child',{filters:[{field:'Parent',operator:'Equals',
   value:{source:'PageState',key:'categoryId'}}],
   actionFlows:{change:{actionType:'PageState',stateKey:'subcategoryId'}}}),
  component('leaf',{filters:[{field:'Parent',operator:'Equals',
   value:{source:'PageState',key:'subcategoryId'}}],
   actionFlows:{change:{actionType:'PageState',stateKey:'subsubId'}}})
 ];
 const deps=pageStateDependencies(custom);
 const next=applyPageSelection({categoryId:'old',subcategoryId:'sub',subsubId:'leaf',cartId:'cart'},
  {kind:'state',key:'categoryId',value:'new'},deps);
 assert.deepEqual(next,{categoryId:'new',cartId:'cart',collectionSelections:{}});
});

test('Formula actions and relatedFilterKey create reusable dependencies',()=>{
 const deps=pageStateDependencies([
  component('middle',{relatedFilterKey:'categoryId',
   actionFlows:{change:{actionType:'Formula',formula:'@state.childId := @event.record.Id'}}}),
  component('leaf',{filterFormula:'@Parent = $state.childId',collectionFormula:'COLLECTION("Leaves",@Leaf.Name)'})
 ]);
 const next=applyPageSelection({categoryId:'old',childId:'child',
  collectionSelections:{Leaves:selected('leaf')}}, {kind:'state',key:'categoryId',value:'new'},deps);
 assert.equal(next.childId,undefined);
 assert.deepEqual(next.collectionSelections,{});
});

test('cycles are bounded and never clear the source of the current selection',()=>{
 const deps=new Map([
  ['state:a',new Set(['state:b'])],['state:b',new Set(['state:a'])]
 ]);
 const next=applyPageSelection({a:'old',b:'child',independent:3},
  {kind:'state',key:'a',value:'new'},deps);
 assert.deepEqual(next,{a:'new',independent:3,collectionSelections:{}});
});

test('inactive field/formula modes do not create unintended dependency edges',()=>{
 const deps=pageStateDependencies([component('child',{
  collectionFormula:'COLLECTION("Child",@Data.Name)',
  filterMode:'Field',
  filterFormula:'@Name = $state.inactive',
  filters:[{field:'Parent',operator:'Equals',value:{source:'PageState',key:'active'}}]
 })]);
 const existing={active:'a',inactive:'x',collectionSelections:{Child:selected('id')}};
 assert.strictEqual(applyPageSelection(existing,
  {kind:'state',key:'inactive',value:'y'},deps).collectionSelections,existing.collectionSelections);
 assert.deepEqual(applyPageSelection(existing,{kind:'state',key:'active',value:'b'},deps).collectionSelections,{});
});
