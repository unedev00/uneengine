import test from 'node:test';
import assert from 'node:assert/strict';
import {applyInventoryCsv,exportInventoryCsv,inventoryRequestedTypes,type InventoryPage} from '../../src/system-support/page-inventory-csv.js';
import {componentInstanceNames,nextComponentInstanceName,validateExplicitComponentNames} from '../../src/system-support/page-component-names.js';
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
 assert.match(output,/CODEXTILL,smartcart1,width,100/);
 assert.match(output,/CODEXTILL,smartcart1,component.position.width,450/);
 assert.match(output,/CODEXTILL,smartcart1,style.fontSize,14/);
 assert.match(output,/CODEXTILL,smartcart1,summary1Formula,=SUM\(@LineTotal\)/);
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
 assert.match(exportInventoryCsv(page,definitions),/CODEXTILL,smartcart1,captionColor,\r\n/);
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

test('Advanced placeholder and parent-link keys stay persisted but are omitted from inventory',()=>{
 const page=original();
 Object.assign(page.components[0].properties,{
   cssClass:'not-used',allowedChildTypes:['Button'],maxChildren:2,
   layoutParentId:'Group1',parentId:'Group1',objectApiName:'Inventory'
 });
 const defs=new Map<string,ComponentSettingDefinition[]>([['Custom:smart_cart',[
  {propertyKey:'cssClass',label:'Legacy CSS class',kind:'TEXT'},
  {propertyKey:'maxChildren',label:'Legacy max children',kind:'NUMBER'},
  {propertyKey:'layoutParentId',label:'Parent link',kind:'TEXT'},
  {propertyKey:'objectApiName',label:'Source Object',kind:'OBJECT'}
 ]]]);
 const exported=exportInventoryCsv(page,defs);
 for(const excluded of ['cssClass','allowedChildTypes','maxChildren','layoutParentId','parentId'])
  assert.ok(!exported.includes(','+excluded+','),excluded+' should not appear in inventory');
 assert.ok(exported.includes('CODEXTILL,smartcart1,objectApiName,Inventory'));
 assert.deepEqual(page.components[0].properties.layoutParentId,'Group1',
  'hiding a structural property must not modify page metadata');
 const importable=applyInventoryCsv(page,csv('CODEXTILL,Cart1,width,110'),defs);
 assert.equal(importable.valid,true);
 assert.equal(importable.page.components[0].properties.layoutParentId,'Group1');
 assert.equal(importable.page.components[0].properties.cssClass,'not-used');
 assert.equal(importable.page.components[0].properties.objectApiName,'Inventory');
});
test('CSV cannot override internal parent structure or retired Advanced properties',()=>{
 const page=original();
 page.components[0].properties.layoutParentId='Group1';
 page.components[0].properties.cssClass='old';
 const rows=['layoutParentId','cssClass','maxChildren','allowedChildTypes','parentId']
  .map(key=>'CODEXTILL,Cart1,'+key+',changed');
 const result=applyInventoryCsv(page,csv(...rows));
 assert.equal(result.valid,false);
 assert.equal(result.issues.length,rows.length);
 assert.deepEqual(result.issues.map(issue=>issue.row),[2,3,4,5,6]);
 assert.equal(result.page.components[0].properties.layoutParentId,'Group1');
 assert.equal(result.page.components[0].properties.cssClass,'old');
});

test('component_name is readable; type/id are explicit immutable metadata rows',()=>{
 const output=exportInventoryCsv(original());
 assert.match(output,/CODEXTILL,smartcart1,component\.id,Cart1/);
 assert.match(output,/CODEXTILL,smartcart1,component\.type,Custom:smart_cart/);
 assert.match(output,/CODEXTILL,smarttabs1,component\.type,Custom:smart_tabs/);
 assert.doesNotMatch(output,/CODEXTILL,Cart1,component\.label/);
 const imported=applyInventoryCsv(original(),csv('CODEXTILL,smartcart1,width,35'));
 assert.equal(imported.valid,true);
 assert.equal(imported.page.components[0].properties.width,35);
});
test('sequence skips deleted numbers, retains historical high water, and names are unique',()=>{
 const components=[{id:'a',type:'Custom:smart_image',properties:{navigatorName:'smartimage1'}},
  {id:'c',type:'Custom:smart_image',properties:{navigatorName:'smartimage3'}}];
 assert.equal(nextComponentInstanceName(components,'Custom:smart_image'),'smartimage4');
 assert.equal(nextComponentInstanceName(components,'Custom:smart_image',9),'smartimage10');
 components.push({id:'d',type:'Custom:smart_image',properties:{navigatorName:'SMARTIMAGE3'}});
 assert.throws(()=>validateExplicitComponentNames(components),/Duplicate component name/);
 assert.equal(new Set([...componentInstanceNames(components).values()].map(x=>x.toLowerCase())).size,3);
});
test('Desktop CSV upsert creates a missing named published Smart component with typed properties',()=>{
 const page=original();
 page.layoutMode='free-canvas';page.canvasWidth=1440;page.canvasHeight=900;
 const defs=new Map<string,ComponentSettingDefinition[]>([['Custom:smart_image',[
  {propertyKey:'imageHeight',label:'Image height',kind:'NUMBER'},
  {propertyKey:'wrapText',label:'Wrap',kind:'BOOLEAN'}
 ]]]);
 const file=csv('CODEXTILL,smartimage4,component.type,Custom:smart_image',
  'CODEXTILL,smartimage4,component.position.x,220',
  'CODEXTILL,smartimage4,imageHeight,90',
  'CODEXTILL,smartimage4,wrapText,true',
  'CODEXTILL,smartcart1,width,'); 
 assert.deepEqual(inventoryRequestedTypes(file),['Custom:smart_image']);
 const result=applyInventoryCsv(page,file,defs);
 assert.equal(result.valid,true,JSON.stringify(result.issues));
 assert.equal(result.page.components.length,3);
 const image=result.page.components[2];
 assert.equal(image.type,'Custom:smart_image');
 assert.equal(image.properties.navigatorName,'smartimage4');
 assert.equal(image.properties.libraryComponentId,'smart_image');
 assert.equal(image.properties.imageHeight,90);
 assert.equal(image.properties.wrapText,true);
 assert.equal(image.position?.x,220);
 assert.equal(result.page.components[0].properties.width,100);
 assert.equal(page.components.length,2,'preflight must not mutate the saved draft');
});
test('upsert rejects unknown type, missing type, conflicting ID, invalid values and duplicate properties',()=>{
 const page=original();page.layoutMode='free-canvas';
 const defs=new Map<string,ComponentSettingDefinition[]>([['Custom:smart_image',[
  {propertyKey:'imageHeight',label:'Height',kind:'NUMBER'}
 ]]]);
 const absent=applyInventoryCsv(page,csv('CODEXTILL,smartimage9,imageHeight,50'),defs);
 assert.equal(absent.valid,false);
 assert.match(absent.issues[0].remark,/component.type/);
 const unavailable=applyInventoryCsv(page,csv('CODEXTILL,smartimage9,component.type,Custom:bad_image'),defs);
 assert.equal(unavailable.valid,false);
 const invalid=applyInventoryCsv(page,csv('CODEXTILL,smartimage9,component.type,Custom:smart_image',
  'CODEXTILL,smartimage9,component.id,other-id',
  'CODEXTILL,smartimage9,imageHeight,abc',
  'CODEXTILL,smartimage9,imageHeight,50'),defs);
 assert.equal(invalid.valid,false);
 assert.ok(invalid.issues.some(x=>x.remark.includes('ID is immutable')));
 assert.ok(invalid.issues.some(x=>x.remark.includes('Duplicate')));
 assert.ok(invalid.issues.some(x=>x.remark.includes('number')));
 assert.equal(page.components.length,2,'invalid imports never mutate input page');
});
