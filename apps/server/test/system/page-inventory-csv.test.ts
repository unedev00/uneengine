import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyInventoryCsv,exportInventoryCsv,inventoryCsv,inventoryRequestedTypes,inventoryDefinitions,inventoryCsvPageGroups,originalInventoryIssue,inventoryChoiceAllowed,inventoryLayout,type InventoryPage,type InventoryDefinitions} from '../../src/system-support/page-inventory-csv.js';
import {componentInstanceNames,nextComponentInstanceName,ensureComponentInstanceNames,validateExplicitComponentNames} from '../../src/system-support/page-component-names.js';
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
const csv5=(...rows:string[])=>['pageapi,component_name,component_property,value,ribbon_tab',...rows].join('\r\n');
const typedCsv=(...rows:string[])=>['pageapi,component_type,component_name,propertyid,value',...rows].join('\r\n');
const typedCsv6=(...rows:string[])=>['pageapi,component_type,component_name,propertyid,value,ribbon_tab',...rows].join('\r\n');
test('inventory exports editable component properties, canvas coordinates and complex values',()=>{
 const output=exportInventoryCsv(original());
 assert.match(output,/CODEXTILL,smart_cart,smartcart1,width,100/);
 assert.match(output,/CODEXTILL,smart_cart,smartcart1,component.position.width,450/);
 assert.match(output,/CODEXTILL,smart_cart,smartcart1,style.fontSize,14/);
 assert.match(output,/CODEXTILL,smart_cart,smartcart1,summary1Formula,=SUM\(@LineTotal\)/);
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
 assert.match(exportInventoryCsv(page,definitions),/CODEXTILL,smart_cart,smartcart1,captionColor,,Desktop,Advanced\r\n/);
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
 assert.ok(exported.includes('CODEXTILL,smart_cart,smartcart1,objectApiName,Inventory'));
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

test('component_type column is the standard type and custom name is the lookup identity',()=>{
 const output=exportInventoryCsv(original());
 assert.match(output,/^pageapi,component_type,component_name,propertyid,value,layout,ribbon_tab\r\n/);
 assert.match(output,/CODEXTILL,smart_cart,smartcart1,component\.visible,true,Desktop,View/);
 assert.match(output,/CODEXTILL,smart_tabs,smarttabs1,component\.visible,true,Desktop,View/);
 assert.doesNotMatch(output,/component\.type|component\.id|navigatorName/);
 const imported=applyInventoryCsv(original(),typedCsv('CODEXTILL,smart_cart,smartcart1,width,35'));
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
test('legacy colliding names repair to unique persisted names used consistently in CSV',()=>{
 const page=original();
 page.components[0].properties.navigatorName='PrintBill';
 page.components[1].properties.navigatorName='printbill';
 const repaired=ensureComponentInstanceNames(page.components);
 assert.equal(repaired[0].properties.navigatorName,'PrintBill');
 assert.notEqual(String(repaired[1].properties.navigatorName).toLowerCase(),'printbill');
 assert.doesNotThrow(()=>validateExplicitComponentNames(repaired));
 const saved={...page,components:repaired};
 const download=exportInventoryCsv(saved);
 assert.match(download,/CODEXTILL,smart_cart,PrintBill,component\.visible/);
 const update=applyInventoryCsv(saved,typedCsv('CODEXTILL,smart_cart,printbill,width,385'));
 assert.equal(update.valid,true,JSON.stringify(update.issues));
 assert.equal(update.page.components[0].id,page.components[0].id);
 assert.equal(update.page.components[0].properties.width,385);
 assert.equal(update.page.components.length,2);
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
 assert.ok(invalid.issues.some(x=>x.remark.includes('numeric')));
 assert.equal(page.components.length,2,'invalid imports never mutate input page');
});

const ribbonDefinitions=():InventoryDefinitions=>{
 const defs=new Map<string,ComponentSettingDefinition[]>([
  ['Custom:smart_cart',[
   {propertyKey:'customCaption',label:'Caption',kind:'TEXT',defaultValue:'Untitled',section:'Data'},
   {propertyKey:'format',label:'Format',kind:'GROUP',section:'Design',fields:[
    {propertyKey:'fontSize',label:'Font size',kind:'NUMBER',defaultValue:13}
   ]}
  ]]
 ]) as InventoryDefinitions;
 defs.completeCatalog=true;
 defs.ribbonProperties=new Map([['Custom:smart_cart',[
  {id:'backgroundColor',kind:'color',tab:'Design',defaultValue:'#ffffff'},
  {id:'textSize',kind:'number',tab:'Design',defaultValue:16},
  {id:'wrapText',kind:'boolean',tab:'Design',defaultValue:true},
  {id:'shadow',kind:'shadow',tab:'Design',valueKey:'calendarShadowColor',defaultValue:'none'},
  {id:'textSource',kind:'expression',tab:'Data'}
 ]]]);
 return defs;
};

test('catalogue export has the same property IDs and row counts for the same type on different pages',()=>{
 const a=original();
 a.components=[a.components[0]];
 const b=original();
 b.apiName='OTHERPAGE';
 b.components=[{...b.components[0],id:'Other1',label:'Different',
  position:undefined,properties:{textSize:19,calendarShadowColor:'medium',
   navigatorName:'smartcart2',internalUnregistered:'not a Ribbon property'}}];
 const defs=ribbonDefinitions();
 const first=exportInventoryCsv(a,defs),second=exportInventoryCsv(b,defs);
 const parsed=(output:string)=>output.trim().split('\r\n').slice(1).map(row=>row.split(',')[3]);
 assert.deepEqual(parsed(first),parsed(second));
 assert.match(first,/CODEXTILL,smart_cart,smartcart1,backgroundColor,#ffffff,Desktop,Design/);
 assert.match(first,/CODEXTILL,smart_cart,smartcart1,textSize,16,Desktop,Design/);
 assert.match(first,/CODEXTILL,smart_cart,smartcart1,wrapText,true,Desktop,Design/);
 assert.match(second,/OTHERPAGE,smart_cart,smartcart2,textSize,19,Desktop,Design/);
 assert.match(first,/CODEXTILL,smart_cart,smartcart1,customCaption,Untitled,Desktop,Data/);
 assert.match(first,/CODEXTILL,smart_cart,smartcart1,format\.fontSize,13,Desktop,Design/);
 assert.doesNotMatch(first,/component\.label|navigatorName/);
 assert.doesNotMatch(second,/internalUnregistered/);
 assert.equal(first.split('\r\n')[0],'pageapi,component_type,component_name,propertyid,value,layout,ribbon_tab');
});

test('six-column export reimports without storing defaults or changing the draft',()=>{
 const page=original();page.components=[page.components[0]];
 const defs=ribbonDefinitions();
 const downloaded=exportInventoryCsv(page,defs);
 const result=applyInventoryCsv(page,downloaded,defs);
 assert.equal(result.valid,true,JSON.stringify(result.issues));
 assert.equal(result.changes,0,'effective defaults do not become explicit page overrides');
 assert.deepEqual(result.page,page);
});

test('CSV ignores Ribbon Tab values, validates by ID, and saves correctly typed properties',()=>{
 const defs=ribbonDefinitions();
 const page=original();
 const rows=csv5('CODEXTILL,smartcart1,textSize,22,Completely Incorrect Tab',
  'CODEXTILL,smartcart1,wrapText,false,Another arbitrary label',
  'CODEXTILL,smartcart1,shadow,large,Data',
  'CODEXTILL,smartcart1,customCaption,Named By User,Design');
 const result=applyInventoryCsv(page,rows,defs);
 assert.equal(result.valid,true,JSON.stringify(result.issues));
 assert.equal(result.page.components[0].properties.textSize,22);
 assert.equal(result.page.components[0].properties.wrapText,false);
 assert.equal(result.page.components[0].properties.calendarShadowColor,'large');
 assert.equal(result.page.components[0].properties.customCaption,'Named By User');
 assert.deepEqual(inventoryRequestedTypes(csv5('CODEXTILL,smartbox4,component.type,Custom:smart_image,Ignored')),
  ['Custom:smart_image']);
});

test('four-column CSV remains valid, incorrect extra headers and wrong row widths fail closed',()=>{
 const page=original();
 assert.equal(applyInventoryCsv(page,csv('CODEXTILL,Cart1,width,122')).valid,true);
 const badHeader='pageapi,component_name,component_property,value,surprise\r\n'+
  'CODEXTILL,Cart1,width,122,Design';
 assert.equal(applyInventoryCsv(page,badHeader).valid,false);
 const missingCell=csv5('CODEXTILL,Cart1,width,122');
 const result=applyInventoryCsv(page,missingCell);
 assert.equal(result.valid,false);
 assert.match(result.issues[0].remark,/5 CSV columns/);
});

test('tenant SQL Ribbon applicability and default overrides come from the existing shared registry',async()=>{
 const queries:string[]=[];
 const db={query:async(sql:string)=>{
  queries.push(sql);
  if(sql.includes('FROM md_component_definitions'))return {rows:[{api_name:'smart_cart'},{api_name:'smart_tabs'}]};
  if(sql.includes('md_component_library_heads'))return {rows:[]};
  if(sql.includes('md_builder_ribbon_component_rules'))return {rows:[
   {component_api:'smart_cart',property_key:'textSize',tab:'Design',kind:'number',
    default_value:18,value_key:null},
   {component_api:'smart_cart',property_key:'shadow',tab:'Design',kind:'shadow',
    default_value:'medium',value_key:'calendarShadowColor'}
  ]};
  throw Error('Unexpected SQL query');
 }} as unknown as Parameters<typeof inventoryDefinitions>[0];
 const defs=await inventoryDefinitions(db,'tenant-1',original().components,'Desktop');
 assert.equal(defs.completeCatalog,true);
 assert.deepEqual(defs.ribbonProperties?.get('Custom:smart_cart')?.map(x=>x.id),['textSize','shadow']);
 assert.ok(queries.some(query=>query.includes('r.enabled=true')));
 assert.ok(queries.some(query=>query.includes("p.scope='component'")));
 const output=exportInventoryCsv(original(),defs);
 assert.match(output,/CODEXTILL,smart_cart,smartcart1,textSize,18,Desktop,Design/);
 assert.match(output,/CODEXTILL,smart_cart,smartcart1,shadow,medium,Desktop,Design/);
});

test('typed CSV creates missing instance once and updates it by custom name on repeat',()=>{
 const page=original();page.layoutMode='free-canvas';page.canvasWidth=1440;page.canvasHeight=900;
 const definitions=new Map<string,ComponentSettingDefinition[]>([['Custom:smart_card_grid',[]]]) as InventoryDefinitions;
 definitions.completeCatalog=true;
 definitions.installedTypes=new Set(['Custom:smart_card_grid']);
 definitions.ribbonProperties=new Map([['Custom:smart_card_grid',[
  {id:'cardsPerRow',kind:'number',tab:'Layout',defaultValue:3,min:1,max:6},
  {id:'cardButtonText',kind:'expression',tab:'Data'},
  {id:'cardButtonShape',kind:'choice',tab:'Design',choices:['shape:rectangle','shape:oval']}
 ]]]);
 const csv=typedCsv(
  'CODEXTILL,smart_card_grid,ProductGrid,cardsPerRow,4',
  'CODEXTILL,smart_card_grid,productgrid,cardButtonText,"CHOOSE +"',
  'CODEXTILL,smart_card_grid,productgrid,component.position.x,240',
  'CODEXTILL,smart_card_grid,productgrid,cardButtonShape,shape:oval'
 );
 assert.deepEqual(inventoryRequestedTypes(csv),['Custom:smart_card_grid']);
 const added=applyInventoryCsv(page,csv,definitions);
 assert.equal(added.valid,true,JSON.stringify(added.issues));
 assert.equal(added.page.components.length,3);
 assert.equal(added.page.components[2].type,'Custom:smart_card_grid');
 assert.equal(added.page.components[2].properties.navigatorName,'ProductGrid');
 assert.equal(added.page.components[2].properties.cardButtonText,'CHOOSE +');
 assert.equal(added.page.components[2].position?.x,240);
 assert.equal(added.page.components[2].properties.cardButtonShape,'shape:oval');
 const stable=applyInventoryCsv(added.page,csv,definitions);
 assert.equal(stable.valid,true,JSON.stringify(stable.issues));
 assert.equal(stable.changes,0);
 assert.equal(stable.page.components.length,3);
 assert.equal(stable.page.components[2].id,added.page.components[2].id);
 assert.equal(page.components.length,2,'failed or successful validation cannot edit the input');
});

test('typed CSV validates existing type identity and rejects unknown or disabled component types',()=>{
 const page=original();page.layoutMode='free-canvas';
 const definitions=new Map<string,ComponentSettingDefinition[]>([['Custom:smart_card_grid',[]]]) as InventoryDefinitions;
 definitions.completeCatalog=true;
 definitions.installedTypes=new Set(['Custom:smart_card_grid']);
 definitions.ribbonProperties=new Map([['Custom:smart_card_grid',[
  {id:'cardsPerRow',kind:'number',tab:'Layout',min:1,max:6}
 ]]]);
 const file=typedCsv(
  'CODEXTILL,smart_tabs,smartcart1,component.visible,false',
  'CODEXTILL,smart_uninstalled,missing,component.visible,true',
  'CODEXTILL,smart_card_grid,newgrid,cardsPerRow,not-a-number',
  'CODEXTILL,smart_card_grid,newgrid,unknownProperty,hello',
  'CODEXTILL,smart_card_grid,newgrid,cardsPerRow,7'
 );
 const result=applyInventoryCsv(page,file,definitions);
 assert.equal(result.valid,false);
 assert.ok(result.issues.some(e=>e.remark.includes('type mismatch')));
 assert.ok(result.issues.some(e=>e.remark.includes('not enabled')));
 assert.ok(result.issues.some(e=>e.remark.includes('numeric')));
 assert.ok(result.issues.some(e=>e.remark.includes('Unknown or disabled')));
 assert.ok(result.issues.some(e=>e.remark.includes('Duplicate')));
 assert.deepEqual(page.components[0].properties.width,100);
 assert.equal(page.components.length,2);
});

test('type plus custom name can update a saved component without changing immutable ID',()=>{
 const page=original();page.components[0].properties.navigatorName='My Cart';
 const csv=typedCsv(
  'CODEXTILL,smart_cart,MY CART,width,375',
  'CODEXTILL,smart_cart,my cart,component.visible,false'
 );
 const result=applyInventoryCsv(page,csv);
 assert.equal(result.valid,true,JSON.stringify(result.issues));
 assert.equal(result.page.components.length,2);
 assert.equal(result.page.components[0].id,'Cart1');
 assert.equal(result.page.components[0].properties.navigatorName,'My Cart');
 assert.equal(result.page.components[0].properties.width,375);
 assert.equal(result.page.components[0].visible,false);
 assert.equal(result.page.components[0].properties.summary1Formula,'=SUM(@LineTotal)');
});

test('Smart Cart columnVisibility downloaded JSON list reimports unchanged and copies to a fresh page',()=>{
 const defs=ribbonDefinitions();
 defs.ribbonProperties!.get('Custom:smart_cart')!.push({
  id:'columnVisibility',kind:'choice',tab:'Data',
  defaultValue:['Column 1','Column 2','Column 3','Column 4','Column 5'],
  choices:['Column 1','Column 2','Column 3','Column 4','Column 5']
 });
 const source=original();
 source.components[0].properties.columnVisibility=['Column 1','Column 2','Column 3','Column 4'];
 const downloaded=exportInventoryCsv(source,defs);
 assert.ok(downloaded.includes('columnVisibility,"[""Column 1"",""Column 2"",""Column 3"",""Column 4""]"'),
  'CSV exports the actual JSON array as one correctly quoted cell');
 const same=applyInventoryCsv(source,downloaded,defs);
 assert.equal(same.valid,true,JSON.stringify(same.issues));
 assert.equal(same.changes,0,'a same-page download/upload must remain a no-op');
 assert.deepEqual(same.page,source);
 const target=original(); // Same component type, but columnVisibility has never been saved.
 const copied=applyInventoryCsv(target,downloaded,defs);
 assert.equal(copied.valid,true,JSON.stringify(copied.issues));
 assert.deepEqual(copied.page.components[0].properties.columnVisibility,
  ['Column 1','Column 2','Column 3','Column 4'],
  'column selection must remain an array after import');
 assert.equal(target.components[0].properties.columnVisibility,undefined,
  'preflight must not change the original page');
 const replay=applyInventoryCsv(copied.page,downloaded,defs);
 assert.equal(replay.valid,true,JSON.stringify(replay.issues));
 assert.equal(replay.changes,0,'repeated import must be idempotent');
});

test('SQL-backed multi-select validates every column option and preserves scalar choices',()=>{
 const defs=ribbonDefinitions();
 defs.ribbonProperties!.get('Custom:smart_cart')!.push(
  {id:'columnVisibility',kind:'choice',tab:'Data',
   defaultValue:['Column 1','Column 2','Column 3','Column 4','Column 5'],
   choices:['Column 1','Column 2','Column 3','Column 4','Column 5']},
  {id:'cartDisplayMode',kind:'choice',tab:'Design',defaultValue:'compact',
   choices:['compact','spacious']}
 );
 const make=(key:string,value:string)=>inventoryCsv([
  ['pageapi','component_type','component_name','propertyid','value','ribbon_tab'],
  ['CODEXTILL','smart_cart','smartcart1',key,value,'Ignored']
 ]);
 const page=original();
 for(const bad of [
  '["Column 1","Not a column"]',
  '["Column 1",17]',
  '[1,2,3]',
  '["Column 1"',
  'compact'
 ]){
  const result=applyInventoryCsv(page,make('columnVisibility',bad),defs);
  assert.equal(result.valid,false,'must reject '+bad);
  assert.equal(page.components[0].properties.columnVisibility,undefined);
 }
 const scalar=applyInventoryCsv(page,make('cartDisplayMode','spacious'),defs);
 assert.equal(scalar.valid,true,JSON.stringify(scalar.issues));
 assert.equal(scalar.page.components[0].properties.cartDisplayMode,'spacious');
 assert.equal(applyInventoryCsv(page,make('cartDisplayMode','missing'),defs).valid,false);
});

test('newly added Smart Cart instance accepts valid JSON multi-select with SQL default shape',()=>{
 const defs=ribbonDefinitions();
 defs.completeCatalog=true;
 defs.installedTypes=new Set(['Custom:smart_cart']);
 defs.ribbonProperties!.get('Custom:smart_cart')!.push({
  id:'columnVisibility',kind:'choice',tab:'Data',
  defaultValue:['Column 1','Column 2','Column 3','Column 4','Column 5'],
  choices:['Column 1','Column 2','Column 3','Column 4','Column 5']
 });
 const file=inventoryCsv([
  ['pageapi','component_type','component_name','propertyid','value'],
  ['CODEXTILL','smart_cart','NewCustomerCart','columnVisibility','["Column 1","Column 4"]']
 ]);
 const added=applyInventoryCsv(original(),file,defs);
 assert.equal(added.valid,true,JSON.stringify(added.issues));
 assert.equal(added.page.components.length,3);
 assert.deepEqual(added.page.components[2].properties.columnVisibility,['Column 1','Column 4']);
 const again=applyInventoryCsv(added.page,file,defs);
 assert.equal(again.valid,true,JSON.stringify(again.issues));
 assert.equal(again.changes,0);
 assert.equal(again.page.components.length,3);
});

test('sixth Ribbon Tab column is ignored while five-column typed imports remain accepted',()=>{
 const page=original();
 const result=applyInventoryCsv(page,typedCsv6(
  'CODEXTILL,smart_cart,smartcart1,width,240,Fake Ribbon Tab',
  'CODEXTILL,smart_cart,smartcart1,component.visible,false,ANYTHING'
 ));
 assert.equal(result.valid,true,JSON.stringify(result.issues));
 assert.equal(result.page.components[0].properties.width,240);
 assert.equal(result.page.components[0].visible,false);
 const badHeader='pageapi,component_type,component_name,propertyid,value,bogus\r\n'+
  'CODEXTILL,smart_cart,smartcart1,width,240,x';
 assert.equal(applyInventoryCsv(page,badHeader).valid,false);
});

test('non-Smart existing page node types still round-trip, but are not creatable as new APIs',()=>{
 const page=original();
 page.components=[{id:'field1',type:'Record Field',label:'Field',region:'main',
  visible:true,properties:{label:'Name',fieldApiName:'Name'}}];
 const downloaded=exportInventoryCsv(page);
 assert.match(downloaded,/CODEXTILL,Record Field,recordfield1,component.visible,true,Desktop,View/);
 assert.equal(applyInventoryCsv(page,downloaded).valid,true);
 const attempted=applyInventoryCsv(page,typedCsv('CODEXTILL,Record Field,newfield,component.visible,true'));
 assert.equal(attempted.valid,false);
});

test('installed SQL property metadata sets choice options, bounds and defaults without inventing keys',async()=>{
 const queries:Array<{sql:string;args:unknown[]}>= [];
 const db={query:async(sql:string,args:unknown[])=>{
  queries.push({sql,args});
  if(sql.includes('FROM md_component_definitions'))return {rows:[{api_name:'smart_tabs'}]};
  if(sql.includes('FROM md_component_library_heads'))return {rows:[]};
  if(sql.includes('FROM md_builder_ribbon_component_rules'))return {rows:[
   {component_api:'smart_tabs',property_key:'tabOrientation',tab:'Layout',kind:'choice',
    default_value:'horizontal',value_key:null,choices:['horizontal','vertical'],
    min_value:null,max_value:null},
   {component_api:'smart_tabs',property_key:'tabWidth',tab:'Layout',kind:'number',
    default_value:120,value_key:null,choices:[],min_value:40,max_value:600}
  ]};
  throw Error('Unexpected SQL');
 }} as unknown as Parameters<typeof inventoryDefinitions>[0];
 const defs=await inventoryDefinitions(db,'tenant-a',original().components,'Desktop',
  ['Custom:smart_tabs','Custom:uninstalled']);
 assert.deepEqual([...defs.installedTypes??[]],['Custom:smart_tabs']);
 assert.equal(defs.has('Custom:uninstalled'),false);
 assert.equal(defs.ribbonProperties?.get('Custom:smart_tabs')?.length,2);
 assert.ok(queries[0].sql.includes('tenant_id=$1 AND enabled=true'));
 const page=original();
 const valid=applyInventoryCsv(page,typedCsv(
  'CODEXTILL,smart_tabs,smarttabs1,tabOrientation,vertical',
  'CODEXTILL,smart_tabs,smarttabs1,tabWidth,200'
 ),defs);
 assert.equal(valid.valid,true,JSON.stringify(valid.issues));
 assert.equal(valid.page.components[1].properties.tabOrientation,'vertical');
 assert.equal(valid.page.components[1].properties.tabWidth,200);
 const bad=applyInventoryCsv(page,typedCsv(
  'CODEXTILL,smart_tabs,smarttabs1,tabOrientation,diagonal',
  'CODEXTILL,smart_tabs,smarttabs1,tabWidth,900'
 ),defs);
 assert.equal(bad.valid,false);
 assert.ok(bad.issues.some(issue=>issue.remark.includes('listed option')));
 assert.ok(bad.issues.some(issue=>issue.remark.includes('allowed range')));
});


test('one CSV groups multiple existing Page APIs without losing row identity',()=>{
 const all=typedCsv6(
  'CODEXTILL,smart_cart,PrintBill,width,450,Layout',
  'ACEKIOSK,smart_button,PayNow,label,Pay,Data',
  'CODEXTILL,smart_cart,PrintBill,component.visible,false,View',
  'ACEKIOSK,smart_button,PayNow,backgroundColor,#ffffff,Design'
 );
 const split=inventoryCsvPageGroups(all);
 assert.equal(split.issues.length,0);
 assert.deepEqual(split.groups.map(group=>group.pageapi),['CODEXTILL','ACEKIOSK']);
 assert.match(split.groups[0].csv,/CODEXTILL,smart_cart,PrintBill,width,450/);
 assert.doesNotMatch(split.groups[0].csv,/ACEKIOSK/);
 assert.match(split.groups[1].csv,/ACEKIOSK,smart_button,PayNow,label,Pay/);
 assert.deepEqual(split.groups[0].originalLines,{2:2,3:4});
 assert.deepEqual(split.groups[1].originalLines,{2:3,3:5});
 const issue=originalInventoryIssue(split.groups[1],{
  row:3,component_name:'PayNow',component_property:'backgroundColor',
  remark:'Unknown component property'
 });
 assert.equal(issue.row,5);
 assert.equal(issue.pageapi,'ACEKIOSK');
});
test('grouped CSV preserves original line numbers for quoted multi-line values',()=>{
 const content=inventoryCsv([
  ['pageapi','component_type','component_name','propertyid','value'],
  ['CODEXTILL','smart_cart','PrintBill','caption','Line one\nLine two'],
  ['OTHERPAGE','smart_button','PayNow','label','Pay'],
  ['CODEXTILL','smart_cart','PrintBill','component.visible','false']
 ]);
 const parsed=inventoryCsvPageGroups(content);
 assert.deepEqual(parsed.issues,[]);
 assert.deepEqual(parsed.groups[0].originalLines,{2:2,4:5});
 assert.equal(originalInventoryIssue(parsed.groups[0],{
  row:4,component_name:'PrintBill',component_property:'component.visible',remark:'Bad value'
 }).row,5);
 assert.equal(parsed.groups[1].firstRow,4);
});
test('missing and malformed pageapi are rejected before any multi-page import',()=>{
 const all=typedCsv(
  ',smart_button,PayNow,label,Pay',
  'Bad/Page,smart_button,PayNow,label,Pay',
  'CODEXTILL,smart_cart,PrintBill,width,350'
 );
 const split=inventoryCsvPageGroups(all);
 assert.equal(split.issues.length,2);
 assert.deepEqual(split.issues.map(issue=>issue.row),[2,3]);
 assert.deepEqual(split.groups.map(group=>group.pageapi),['CODEXTILL']);
 const badHeader=inventoryCsvPageGroups('not_a_csv,pageapi\\r\\nfoo,bar');
 assert.equal(badHeader.groups.length,0);
 assert.ok(badHeader.issues.length);
});
test('batch API enforces existing tenant pages, preflight and a single SQL transaction',()=>{
 const controller=readFileSync(new URL('../../src/api/PageApiController.ts',import.meta.url),'utf8');
 const dialog=readFileSync(new URL('../../../web/src/core/builders/PageBuilder/PageInventoryImportDialog.tsx',import.meta.url),'utf8');
 assert.match(controller,/\/api\/metadata\/pages\/inventory\/batch\/validate/);
 assert.match(controller,/\/api\/metadata\/pages\/inventory\/batch\/apply/);
 assert.match(controller,/p\.tenant_id=\$1 AND p\.enabled=true AND p\.api_name=ANY/);
 assert.match(controller,/remark:'Page API not found: '/);
 assert.match(controller,/await db\.transaction\(async\(\)=>\{/);
 assert.match(controller,/await pages\.saveLayoutDraft\(/);
 assert.match(controller,/await preflightInventory\(/);
 assert.match(controller,/expectedDraftRevisions/);
 assert.doesNotMatch(dialog,/Select page|page-inventory-page-select|initialPageApi/);
 assert.match(dialog,/\/metadata\/pages\/inventory\/batch\/validate/);
 assert.match(dialog,/\/metadata\/pages\/inventory\/batch\/apply/);
});

test('Layout column selects Desktop, Tablet, Mobile or Custom drafts per page',()=>{
 const all=['pageapi,component_type,component_name,propertyid,value,layout,ribbon_tab',
  'KIOSK,smart_button,PayNow,label,Pay,Custom,Data',
  'KIOSK,smart_button,PayNow,label,Pay,,Data',
  'KIOSK,smart_button,PayNow,label,Pay,phone,Data',
  'OTHER,smart_button,Go,label,Go,tablet,Data'].join('\r\n');
 const split=inventoryCsvPageGroups(all);
 assert.deepEqual(split.issues,[]);
 assert.deepEqual(split.groups.map(g=>[g.pageapi,g.variant,g.key]),[
  ['KIOSK','Custom','KIOSK|Custom'],['KIOSK','Desktop','KIOSK'],
  ['KIOSK','Mobile','KIOSK|Mobile'],['OTHER','Tablet','OTHER|Tablet']]);
 // Each group reaches the per-page engine without the Layout column.
 assert.match(split.groups[0].csv,/^pageapi,component_type,component_name,propertyid,value,ribbon_tab\r\n/);
 assert.match(split.groups[0].csv,/KIOSK,smart_button,PayNow,label,Pay,Data/);
 assert.deepEqual(split.groups[0].originalLines,{2:2});
 assert.deepEqual(split.groups[1].originalLines,{2:3});
 // Without the column, the request default is used.
 assert.equal(inventoryCsvPageGroups(typedCsv('KIOSK,smart_button,PayNow,label,Pay'),'Custom').groups[0].variant,'Custom');
 const bad=inventoryCsvPageGroups(['pageapi,component_type,component_name,propertyid,value,layout',
  'KIOSK,smart_button,PayNow,label,Pay,Watch'].join('\r\n'));
 assert.equal(bad.groups.length,0);
 assert.match(bad.issues[0].remark,/Layout must be Desktop, Tablet, Mobile or Custom/);
 assert.equal(inventoryLayout('CUSTOM'),'Custom');
 assert.equal(inventoryLayout(''),'Desktop');
 assert.equal(inventoryLayout('Watch'),null);
});
test('export writes the layout it was downloaded from and single-page upload rejects another layout',()=>{
 const page=original();page.components=[page.components[0]];
 const custom=exportInventoryCsv(page,new Map(),'Custom');
 assert.match(custom,/^pageapi,component_type,component_name,propertyid,value,layout,ribbon_tab\r\n/);
 assert.match(custom,/CODEXTILL,smart_cart,smartcart1,component\.position\.x,10,Custom,Layout/);
 const changed=custom.replace('component.position.x,10,Custom','component.position.x,55,Custom');
 const ok=applyInventoryCsv(page,changed,new Map(),'Custom');
 assert.deepEqual(ok.issues,[]);
 assert.equal(ok.page.components[0].position?.x,55);
 const wrong=applyInventoryCsv(page,changed,new Map(),'Desktop');
 assert.ok(wrong.issues.some(issue=>/Layout does not match the selected layout: Desktop/.test(issue.remark)));
});
test('Shape and icon gallery markers accept well-formed catalogue ids',()=>{
 assert.equal(inventoryChoiceAllowed(['shapes'],'shape:oval'),true);
 assert.equal(inventoryChoiceAllowed(['shapes'],'shape:round-rectangle'),true);
 assert.equal(inventoryChoiceAllowed(['shapes'],'arrow-left'),false);
 assert.equal(inventoryChoiceAllowed(['shapes','icons'],'arrow-left'),true);
 assert.equal(inventoryChoiceAllowed(['shapes','icons'],'Bad Icon'),false);
 assert.equal(inventoryChoiceAllowed(['shapes','icons'],'shapes'),true);
 assert.equal(inventoryChoiceAllowed(['left','right'],'top'),false);
 const page=original();page.components=[{id:'B1',type:'Custom:smart_button',label:'Button',region:'main',
  visible:true,position:{x:0,y:0,width:100,height:40},properties:{}}];
 const defs=new Map([['Custom:smart_button',[]]]) as InventoryDefinitions;
 defs.completeCatalog=true;defs.installedTypes=new Set(['Custom:smart_button']);
 defs.ribbonProperties=new Map([['Custom:smart_button',[
  {id:'shapeId',kind:'choice',tab:'Design',defaultValue:'shape:rectangle',choices:['shapes','icons']}]]]);
 const result=applyInventoryCsv(page,typedCsv('CODEXTILL,smart_button,smartbutton1,shapeId,shape:oval'),defs);
 assert.deepEqual(result.issues,[]);
 assert.equal(result.page.components[0].properties.shapeId,'shape:oval');
 const icon=applyInventoryCsv(page,typedCsv('CODEXTILL,smart_button,smartbutton1,shapeId,arrow-left'),defs);
 assert.equal(icon.page.components[0].properties.shapeId,'arrow-left');
 const invalid=applyInventoryCsv(page,typedCsv('CODEXTILL,smart_button,smartbutton1,shapeId,not valid'),defs);
 assert.ok(invalid.issues.some(issue=>/Choose a listed option for shapeId/.test(issue.remark)));
});
