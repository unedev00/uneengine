import test from 'node:test';
import assert from 'node:assert/strict';
import type {FieldMetadata} from '../src/core/metadata/Definitions/metadata';
import {scopedFieldAllows,scopedFieldRule} from '../src/core/pages/PageRuntime/fieldScopedRecordFilters';

const fields=[
 {apiName:'Active',label:'Active',dataType:'Boolean'},
 {apiName:'Price',label:'Price',dataType:'Number'}
] as FieldMetadata[];
const config={
 imageSource:{filters:[{field:'Active',operator:'Equals',value:'true'}],filterLogic:'AND',filterFormula:''},
 textSource:{filters:[{field:'Price',operator:'Greater Than',value:'5'}],filterLogic:'AND',filterFormula:''}
};
test('each field owns its own filter count and accepts only matching authorised row values',()=>{
 assert.equal(scopedFieldRule(config,'imageSource')?.filters.length,1);
 assert.equal(scopedFieldRule(config,'textSource')?.filters.length,1);
 const first={Active:true,Price:2};
 const second={Active:false,Price:12};
 assert.equal(scopedFieldAllows(config,'imageSource',first,fields),true);
 assert.equal(scopedFieldAllows(config,'textSource',first,fields),false);
 assert.equal(scopedFieldAllows(config,'imageSource',second,fields),false);
 assert.equal(scopedFieldAllows(config,'textSource',second,fields),true);
 assert.equal(scopedFieldAllows(config,'badgeText',first,fields),true);
});
test('invalid or unreadable scoped fields fail closed without affecting unrelated fields',()=>{
 const bad={imageSource:{filters:[{field:'Private',operator:'Equals',value:'secret'}],filterLogic:'AND',filterFormula:''}};
 assert.equal(scopedFieldAllows(bad,'imageSource',{Price:4},fields),false);
 assert.equal(scopedFieldAllows(bad,'textSource',{Price:4},fields),true);
 assert.equal(scopedFieldAllows({imageSource:'invalid'},'imageSource',{Active:true},fields),false);
});
test('selected field formulas use the existing bounded expression compiler',()=>{
 const configured={textSource:{filters:[],filterLogic:'AND',filterFormula:'@Price > 5'}};
 assert.equal(scopedFieldAllows(configured,'textSource',{Price:10},fields),true);
 assert.equal(scopedFieldAllows(configured,'textSource',{Price:2},fields),false);
 assert.equal(scopedFieldAllows({textSource:{filters:[],filterLogic:'AND',filterFormula:'INVALID('}},
   'textSource',{Price:10},fields),false);
});


test('scoped Field and Formula modes apply only the selected saved rules',()=>{
 const both={filters:[{field:'Active',operator:'Equals',value:'true'}],
   filterLogic:'AND' as const,filterFormula:'@Price > 5'};
 const formulas={badgeText:{...both,filterMode:'Formula'}};
 const manual={badgeText:{...both,filterMode:'Field'}};
 assert.equal(scopedFieldAllows(formulas,'badgeText',{Active:false,Price:10},fields),true);
 assert.equal(scopedFieldAllows(formulas,'badgeText',{Active:true,Price:2},fields),false);
 assert.equal(scopedFieldAllows(manual,'badgeText',{Active:false,Price:10},fields),false);
 assert.equal(scopedFieldAllows(manual,'badgeText',{Active:true,Price:2},fields),true);
 assert.equal(scopedFieldRule(formulas,'badgeText')?.filterMode,'Formula');
 assert.equal(scopedFieldAllows({badgeText:{...both,filterMode:'Invalid'}},
   'badgeText',{Active:true,Price:10},fields),false);
});

test('scoped output filters safely ignore blank optional state under AND and OR',()=>{
 const rule={field:'Price',operator:'Equals',
  value:{source:'PageState',key:'selectedPrice',skipWhenBlank:true}};
 const always={field:'Active',operator:'Equals',value:'true'};
 const sample={Active:true,Price:12};
 const other={Active:false,Price:12};
 const conditions={textSource:{filters:[rule,always],filterLogic:'OR' as const,filterFormula:'',filterMode:'Field'}};
 assert.equal(scopedFieldAllows(conditions,'textSource',sample,fields,{pageState:{}}),true);
 assert.equal(scopedFieldAllows(conditions,'textSource',other,fields,{pageState:{}}),false);
 assert.equal(scopedFieldAllows(conditions,'textSource',other,fields,{pageState:{selectedPrice:12}}),true);
 const required={textSource:{filters:[{...rule,value:{source:'PageState',key:'selectedPrice'}}],
  filterLogic:'AND' as const,filterFormula:'',filterMode:'Field'}};
 assert.equal(scopedFieldAllows(required,'textSource',sample,fields,{pageState:{}}),false);
 const optionalOnly={textSource:{filters:[rule],filterLogic:'AND' as const,filterFormula:'',filterMode:'Field'}};
 assert.equal(scopedFieldAllows(optionalOnly,'textSource',other,fields,{pageState:{}}),true);
});
