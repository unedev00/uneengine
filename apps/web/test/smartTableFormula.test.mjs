import {readRetiredMigration} from '../../../scripts/read-retired-migration.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {evaluateCollectionFormula} from '../src/component-libraries/shared/FieldExpression.js';
import {getFormulaFunctionNames,validateFormulaFunctions} from '../../server/src/expression-engine/FormulaFunctionRegistry.ts';
import {Parser} from '../../server/src/expression-engine/FormulaParser.ts';
import {tokenize} from '../../server/src/expression-engine/FormulaTokenizer.ts';
import {loadComponentCatalog,buildBundledComponent} from '../../../scripts/component-catalog.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fields=['Name','Price','Quantity','Category'];
const rows=[
 {Id:'a',Name:'Tea',Price:2.5,Quantity:3,Category:'Drinks'},
 {Id:'b',Name:'Coffee',Price:3,Quantity:2,Category:'Drinks'}
];
const source={Product:rows};
const context={primaryObject:'Product',collectionSourceFields:{Product:fields}};

test('Global TABLE formula is in the shared function registry and returns ordered typed rows',()=>{
 assert.ok(getFormulaFunctionNames('ribbon_binding').includes('TABLE'));
 assert.ok(!getFormulaFunctionNames('validation_rule').includes('TABLE'));
 validateFormulaFunctions(new Parser(tokenize('=TABLE(@Product, Name, Price, Category)')).parse(),'ribbon_binding');
 const result=evaluateCollectionFormula('=TABLE(@Product, Name, Price, Category)',source,context);
 assert.equal(result.error,undefined);
 assert.deepEqual(Array.from(result.value.columns),['Name','Price','Category']);
 assert.equal(result.value.objectApiName,'Product');
 assert.equal(result.value.items.length,2);
 assert.deepEqual(Object.keys(result.value.items[0].record),['Id','Name','Price','Category']);
 assert.equal(result.value.items[0].record.Price,2.5);
 assert.equal(result.value.items[0].record.Quantity,undefined);

});

test('TABLE supports all authorised Object fields, bare names and typed errors',()=>{
 const all=evaluateCollectionFormula('TABLE(@Product)',source,context);
 assert.deepEqual(Array.from(all.value.columns),fields);
 const bare=evaluateCollectionFormula('=TABLE(@Product, Name, Price)',source,context);
 assert.deepEqual(Array.from(bare.value.columns),['Name','Price']);
 const lower=evaluateCollectionFormula('=TABLE(@product, name, price)',source,context);
 assert.deepEqual(Array.from(lower.value.columns),['Name','Price']);
 const qualified=evaluateCollectionFormula('TABLE(@Product, @Product.Name, @Product.Price)',source,context);
 assert.equal(qualified.value.items[1].record.Price,3);
 const denied=evaluateCollectionFormula('TABLE(@Product, Secret)',source,context);
 assert.match(denied.error,/TABLE field is unavailable or not permitted/);
 const cross=evaluateCollectionFormula('TABLE(@Product, Customer.Name)',source,context);
 assert.match(cross.error,/does not belong/);
 const duplicate=evaluateCollectionFormula('TABLE(@Product, Name, Name)',source,context);
 assert.match(duplicate.error,/must be unique/);
 const missing=evaluateCollectionFormula('TABLE(@Customer, Name)',source,context);
 assert.match(missing.error,/not authorised/);
 const large=evaluateCollectionFormula('TABLE(@Product, Price)',{
  Product:Array.from({length:201},(_,i)=>({Id:String(i),Price:1}))
 },context);
 assert.match(large.error,/maximum 200/);
});

test('Smart Table renders exactly the TABLE columns and metadata-driven buttons',async()=>{
 const catalog=await loadComponentCatalog();
 const definition=catalog.components.find(component=>component.apiName==='smart_table');
 assert.ok(definition,'Smart Table must be registered in the shared manifest');
 assert.deepEqual(definition.propertyDefinitions,[]);
 const built=await buildBundledComponent(definition);
 const sandbox={React,module:{exports:{}},Date,Intl,URL,crypto:globalThis.crypto};
 vm.runInNewContext(built.compiledJs,sandbox);
 const table=evaluateCollectionFormula('TABLE(@Product, Name, Price)',source,context).value;
 const records=table.items.map(item=>({...item.record,Id:item.record.Id??item.value}));
 const html=renderToStaticMarkup(React.createElement(sandbox.module.exports.default,{
  dataCollection:table,records,objectApiName:'Product',
  objects:[{apiName:'Product',label:'Product',fields:fields.map(apiName=>({apiName,label:apiName}))}],
  actionFlows:{customButton1:{actionType:'Flow'},customButton2:{actionType:'Flow'}},
  rowHeight:32,selectedRowColor:'#ccddee',headerBodyColor:'#001122'
 }));
 assert.match(html,/class="smart-table-native"/);
 assert.match(html,/>Name<\/th>/);
 assert.match(html,/>Price<\/th>/);
 assert.doesNotMatch(html,/>Category<\/th>/);
 assert.match(html,/>Delete<\/button>/);
 assert.match(html,/>View<\/button>/);
 assert.match(html,/>Tea<\/td>/);
 assert.match(html,/>2\.5<\/td>/);
 assert.match(html,/2 records/);
 assert.match(html,/#001122/);
});

test('Smart Table metadata extends shared ribbon instead of duplicating properties or engines',()=>{
 const sql=readRetiredMigration('20270308-smart-table-shared-ribbon.sql');
 const runtime=read('../src/component-libraries/smart_table/SmartComponent.jsx');
 const editor=read('../src/core/builders/PageBuilder/SmartFormulaField.tsx');
 const source=read('../src/core/pages/PageRuntime/usePageCollectionFormula.ts');
 for(const key of ['textSource','objectApiName','objectApiName2','objectApiName3',
  'column2Source','column3Source','column4Source','column5Source',
  'selectedRowColor','selectedRowBorderColor','summaryShadow','tableBorderColor',
  'headerBodyColor','width','height','x','y'])
  assert.ok(sql.includes("('"+key+"')"),key+' missing shared rule');
 assert.doesNotMatch(sql,/INSERT INTO md_builder_shared_properties/);
 assert.match(runtime,/evaluateFieldExpression/);
 assert.doesNotMatch(runtime,/SmartRuntime/);
 assert.match(editor,/tableSources\.map/);
 assert.match(editor,/tableObject\.fields\.map\(field=>\(\{reference:field\.apiName/);
 assert.doesNotMatch(editor,/tableObject\.fields\.map\(field=>\(\{reference:'@'/);
 assert.match(editor,/const tableArg=Boolean\(tableSourcePrompt\|\|tableObject\)/);
 assert.match(source,/tableFormulaObject\(source\)/);
 assert.match(source,/selectedTableSource/);
});
