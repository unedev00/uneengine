import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveFieldText,resolveRegisteredTextProperties} from '../src/core/components/RegisteredComponent/fieldExpressionRuntime';
import {evaluateFieldExpression} from '../src/component-libraries/shared/FieldExpression.js';
import {pageComponentRecordQuery,pageComponentRelatedQuery,filterPageComponentRecords} from '../src/core/pages/PageRuntime/pageComponentBindings';
import type {FieldMetadata} from '../src/core/metadata/Definitions/metadata';
const field=(apiName:string,dataType:string)=>({apiName,label:apiName,dataType}) as FieldMetadata;
test('leap dates validate the requested year including years below 100',()=>{
 for(const [expression,result] of [['DATE(2024,2,29)','2024-02-29'],['DATE(2000,2,29)','2000-02-29'],['DATE(4,2,29)','0004-02-29']])assert.equal(resolveFieldText(expression,{}),result);
 for(const expression of ['DATE(1900,2,29)','DATE(2023,2,29)'])assert.throws(()=>resolveFieldText(expression,{}),/Invalid DATE/);
});
test('unbound constants and grouped, signed and exponent expressions agree across hosts',()=>{
 for(const [expression,result] of [['(1+2)*3','9'],['-2+3','1'],['2^3','8'],['1+2','3']]){
  assert.equal(evaluateFieldExpression(expression,{}),result);
  assert.equal(resolveFieldText(expression,{}),result);
  assert.equal(resolveRegisteredTextProperties([{propertyKey:'text',kind:'TEXT'}],{text:expression}).text,result);
 }
 assert.equal(resolveRegisteredTextProperties([{propertyKey:'text',kind:'TEXT'}],{text:'@Name'}).text,'@Name');
});
test('multi-select and date-only datetime filters retain SQL semantics during client fallback',()=>{
 const fields=[field('Tags','Multi-Select Picklist'),field('When','Date/Time'),field('Calculated','Formula(Number)')];
 const row={Tags:'A;B',When:'2026-10-29T12:00:00Z',Calculated:1};
 for(const filter of [{field:'Tags',operator:'Includes',value:'A;B'},{field:'When',operator:'Equals',value:'2026-10-29'},{field:'When',operator:'Less Than or Equal',value:'2026-10-29'}]){
  assert.equal(pageComponentRecordQuery([filter],fields).serverFilterable,true);
  const filters=[filter,{field:'Calculated',operator:'Equals',value:'1'}];
  assert.equal(pageComponentRecordQuery(filters,fields).serverFilterable,false);
  assert.deepEqual(filterPageComponentRecords([row],filters,fields),[row]);
 }
 assert.deepEqual(filterPageComponentRecords([row],[{field:'When',operator:'Greater Than',value:'2026-10-29'}],fields),[]);
});
test('encrypted and legacy exclusion filters never claim safe server pagination',()=>{
 for(const [dataType,operator] of [['Text (Encrypted)','Equals'],['Text','Not Equals'],['Multi-Select Picklist','Excludes']]){
  assert.equal(pageComponentRecordQuery([{field:'Value',operator,value:'A'}],[field('Value',dataType)]).serverFilterable,false);
 }
});
test('selected parent becomes an independent server query scope and missing selections block reads',()=>{
 const fields=[{...field('ParentId','Lookup(Parent)'),relationship:{targetObject:'Parent'}} as FieldMetadata];
 const properties={relatedFilterKey:'selectedParent',relatedFieldApiName:'ParentId'};
 assert.deepEqual(pageComponentRelatedQuery(properties,fields,'parent-2'),{blocked:false,filter:{field:'ParentId',value:'parent-2',related:true}});
 assert.equal(pageComponentRelatedQuery(properties,fields,undefined).blocked,true);
 assert.equal(pageComponentRelatedQuery({...properties,relatedFieldApiName:'Missing'},fields,'parent-2').blocked,true);
});
