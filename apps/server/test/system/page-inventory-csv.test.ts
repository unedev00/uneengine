import test from 'node:test';
import assert from 'node:assert/strict';
import {applyInventoryCsv,exportInventoryCsv,type InventoryPage} from '../../src/system-support/page-inventory-csv.js';
import type {ComponentSettingDefinition} from '../../src/system-support/component-property-contract.js';

const original=():InventoryPage=>({
 apiName:'CODEXTILL',draftRevision:4,
 components:[{
  id:'Cart1',type:'Custom:smart_cart',label:'Cart',region:'main',visible:true,
  position:{x:10,y:20,width:450,height:600},
  properties:{width:100,summary1Formula:'=SUM(@LineTotal)',enabled:true,
   style:{textColor:'#ffffff',fontSize:14},rows:[{name:'Tea, milk',qty:1}]}
 },{
  id:'Tab1',type:'Custom:smart_tabs',label:'Tabs',region:'main',visible:true,
  properties:{caption:'Products'}
 }]
});
const csv=(...rows:string[])=>['pageapi,component_name,component_property,value',...rows].join('\r\n');
test('inventory exports editable component properties, canvas coordinates and complex values',()=>{
 const output=exportInventoryCsv(original());
 assert.match(output,/CODEXTILL,Cart1,width,100/);
 assert.match(output,/CODEXTILL,Cart1,component.position.width,450/);
 assert.match(output,/CODEXTILL,Cart1,style.fontSize,14/);
 assert.match(output,/CODEXTILL,Cart1,summary1Formula,=SUM\(@LineTotal\)/);
 assert.match(output,/""Tea, milk""/);
});
test('blank and absent CSV properties preserve saved metadata',()=>{
 const page=original();
 const result=applyInventoryCsv(page,csv('CODEXTILL,Cart1,width,','CODEXTILL,Cart1,style.fontSize,20'));
 assert.equal(result.valid,true);
 assert.equal(result.changes,1);
 assert.equal(result.skipped,1);
 assert.equal(result.page.components[0].properties.width,100);
 assert.deepEqual(result.page.components[0].properties.style,{textColor:'#ffffff',fontSize:20});
 assert.deepEqual(page,original(),'input page must not be mutated');
});
test('reject wrong page API and unknown component, property and numeric values',()=>{
 const result=applyInventoryCsv(original(),csv(
  'OTHER,Cart1,width,50','CODEXTILL,Missing,width,50',
  'CODEXTILL,Cart1,doesNotExist,20','CODEXTILL,Cart1,width,not-a-number',
  'CODEXTILL,Cart1,enabled,maybe'));
 assert.equal(result.valid,false);
 assert.equal(result.issues.length,5);
 assert.deepEqual(result.issues.map(issue=>issue.row),[2,3,4,5,6]);
});
test('duplicate property rows are rejected with complete file rollback signal',()=>{
 const result=applyInventoryCsv(original(),csv('CODEXTILL,Cart1,width,20','CODEXTILL,Cart1,width,30'));
 assert.equal(result.valid,false);
 assert.equal(result.issues[0].row,3);
});
test('numeric layout and boolean fields retain types and validate bounds',()=>{
 const result=applyInventoryCsv(original(),csv(
  'CODEXTILL,Cart1,component.position.x,30','CODEXTILL,Cart1,component.visible,false'));
 assert.equal(result.valid,true);
 assert.equal(result.page.components[0].position?.x,30);
 assert.equal(result.page.components[0].visible,false);
 assert.equal(applyInventoryCsv(original(),csv('CODEXTILL,Cart1,component.position.width,-5')).valid,false);
});
test('unknown current property may be filled only when published metadata declares it',()=>{
 const definitions=new Map<string,ComponentSettingDefinition[]>([['Custom:smart_cart',[
  {propertyKey:'captionColor',label:'Caption colour',kind:'COLOR'}
 ]]]);
 const page=original();
 assert.match(exportInventoryCsv(page,definitions),/CODEXTILL,Cart1,captionColor,\r\n/);
 const imported=applyInventoryCsv(page,csv('CODEXTILL,Cart1,captionColor,#ff0000'),definitions);
 assert.equal(imported.valid,true);
 assert.equal(imported.page.components[0].properties.captionColor,'#ff0000');
});
test('quoted commas and escaped quotes round-trip without mis-parsing',()=>{
 const data=original();
 const output=exportInventoryCsv(data);
 const result=applyInventoryCsv(data,output);
 assert.equal(result.valid,true);
 assert.equal(result.changes,0);
});
