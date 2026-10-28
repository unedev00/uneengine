import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
async function loadEditor(name:string){
 const built=await build({entryPoints:[`apps/web/src/core/builders/ComponentProperties/${name}.tsx`],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',loader:{'.css':'empty'},define:{'import.meta.env':'{"VITE_API_BASE_URL":"http://localhost/api"}'},jsx:'automatic'});
 const module={exports:{} as any};
 new Function('require','module','exports',built.outputFiles[0].text)(require,module,module.exports);
 return module.exports.default;
}
const CustomComponentPropertyEditor=await loadEditor('CustomComponentPropertyEditor');
const PropertyDefinitionEditor=await loadEditor('PropertyDefinitionEditor');
import {validateComponentDefinitions,type ComponentSettingDefinition} from '../src/core/components/Properties/componentSettingDefinitions';
import {loadComponentCatalog} from '../../../scripts/component-catalog.mjs';
import {behaviorTabs,behaviorAction,behaviorRecordAction,behaviorAppearance,behaviorAppearanceLabel,behaviorField,behaviorInteractions} from '../src/core/pages/PageRuntime/pageBehaviorRuntime';
test('all retained bundled descriptor definitions remain compatible',async()=>{
 const catalog=await loadComponentCatalog();
 assert.equal(catalog.components.length,38); // 36 UNE and two Core platform descriptors
 for(const component of catalog.components)assert.deepEqual(validateComponentDefinitions(component.propertyDefinitions??[]),[],component.apiName);
});
const definitions:ComponentSettingDefinition[]=[{propertyKey:'layout',label:'Layout',kind:'GROUP',fields:[
 {propertyKey:'title',label:'Title',kind:'TEXT'},
 {propertyKey:'rows',label:'Rows',kind:'COLLECTION',fields:[{propertyKey:'label',label:'Row label',kind:'TEXT'}]}
]},{propertyKey:'fields',label:'Fields',kind:'STRING_LIST'}];
test('groups, repeated settings and string lists have guided controls with unique IDs',()=>{
 const html=renderToStaticMarkup(React.createElement(CustomComponentPropertyEditor,{definitions,
  properties:{layout:{title:'Keep',rows:[{label:'First'},{label:'Second'}]},fields:['Name']},onChange:()=>{}}));
 assert.match(html,/Add Rows row/);assert.match(html,/Add Fields item/);assert.match(html,/value="First"/);
 assert.match(html,/value="Second"/);assert.doesNotMatch(html,/textarea/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});
test('device-hidden declarations remain saved but are not exposed as unknown controls',()=>{
 const html=renderToStaticMarkup(React.createElement(CustomComponentPropertyEditor,{device:'Mobile',
 definitions:[{propertyKey:'desktopOnly',label:'Desktop only',kind:'TEXT',devices:['Desktop']}],
 properties:{desktopOnly:'Preserved'},onChange:()=>{}}));
 assert.doesNotMatch(html,/value="Preserved"/);
});
test('schema authoring supports all behaviour templates and nested properties without JSON',()=>{
 const html=renderToStaticMarkup(React.createElement(PropertyDefinitionEditor,{value:definitions,onChange:()=>{}}));
 for(const label of ['Field behaviour','Conditional appearance','Action rules','Tab rules','Component interactions'])assert.ok(html.includes(label));
 assert.match(html,/Add property/);assert.match(html,/Available from component version/);
});

test('Page Behavior runtime enforces tab and action conditions by device',()=>{
 const properties={pagePropertyContract:{version:1,
  tabVisibility:[{tabId:'Admin',when:{logic:'All',conditions:[{source:'Device',operator:'Equals',value:'Desktop'}]}}],
  actionVisibility:[{actionId:'delete',unavailable:'Disable',when:{logic:'All',conditions:[{source:'Device',operator:'Equals',value:'Desktop'}]}},
   {actionId:'private',unavailable:'Hide',when:{logic:'All',conditions:[{source:'Device',operator:'Equals',value:'Desktop'}]}}]
 }};
 assert.deepEqual(behaviorTabs(properties,['Overview','Admin'],{formFactor:'Phone'}),['Overview']);
 assert.deepEqual(behaviorTabs(properties,['Overview','Admin'],{formFactor:'Desktop'}),['Overview','Admin']);
 assert.equal(behaviorAction(properties,'delete',{formFactor:'Phone'}),'disabled');
 assert.equal(behaviorAction(properties,'private',{formFactor:'Phone'}),'hidden');
 assert.equal(behaviorAction(properties,'delete',{formFactor:'Desktop'}),'enabled');
 assert.equal(behaviorAction({},'delete',{formFactor:'Phone'}),'enabled');
});
test('conditional appearance is field-specific, safely color-tokenized and permission-aware',()=>{
 const when={logic:'All',conditions:[{source:'Record Field',fieldApiName:'Status',operator:'Equals',value:'Active'}]};
 const properties={pagePropertyContract:{version:1,conditionalFormatting:[
  {fieldApiName:'Amount',when,appearance:{color:'#ff0055',backgroundColor:'url(javascript:alert(1))'}},
  {fieldApiName:'Other',when,appearance:{color:'#00ffaa'}}]}};
 const fields=[{apiName:'Status',label:'Status',dataType:'Text(80)'}];
 const context={formFactor:'Desktop' as const,record:{Status:'Active'},fields,
  readableFieldApiNames:new Set(['Status'])};
 assert.deepEqual(behaviorAppearance(properties,context,'Amount'),{color:'#ff0055'});
 assert.deepEqual(behaviorAppearance(properties,context,'Other'),{color:'#00ffaa'});
 assert.deepEqual(behaviorAppearance(properties,{...context,readableFieldApiNames:new Set<string>()},'Amount'),{});
});
test('record field rules respect readable records and preserve no-rule defaults',()=>{
 const properties={pagePropertyContract:{version:1,fieldRules:[
  {fieldApiName:'Name',behavior:'Required',visibilityRules:{logic:'All',
   conditions:[{source:'Record Field',fieldApiName:'Status',operator:'Equals',value:'Active'}]}},
  {fieldApiName:'Email',behavior:'ReadOnly'}]}};
 const context={formFactor:'Desktop' as const,record:{Status:'Active'},fields:[{apiName:'Status',label:'Status',dataType:'Text(40)'}],
  readableFieldApiNames:new Set(['Status'])};
 assert.deepEqual(behaviorField(properties,'Name',context),{visible:true,required:true,readOnly:false});
 assert.deepEqual(behaviorField(properties,'Email',context),{visible:true,required:false,readOnly:true});
 assert.deepEqual(behaviorField(properties,'Name',{...context,record:{Status:'Closed'}}),{visible:false,required:false,readOnly:false});
 assert.equal(behaviorField(properties,'Unknown',context),null);
});
test('component interactions update declared bindable target properties only',()=>{
 const rules={pagePropertyContract:{version:1,interactions:[
  {event:'change',targetComponentId:'target',targetProperty:'title',source:'Event',sourceKey:'value'},
  {event:'change',targetComponentId:'target',targetProperty:'onAction',source:'Literal',value:'unsafe'},
  {event:'change',targetComponentId:'target',targetProperty:'unbound',source:'Literal',value:'unsafe'},
  {event:'change',targetComponentId:'other',targetProperty:'title',source:'Literal',value:'unsafe'}]}};
 const targets=[{id:'target',propertyDefinitions:[
  {propertyKey:'title',label:'Title',kind:'TEXT' as const,isBindable:true},
  {propertyKey:'unbound',label:'Unbound',kind:'TEXT' as const}]}];
 assert.deepEqual(behaviorInteractions(rules,'change',{value:'Selected'}, {},targets,'Desktop'),
  [{targetComponentId:'target',targetProperty:'title',value:'Selected'}]);
 assert.deepEqual(behaviorInteractions(rules,'change',{value:{hidden:'nested'}},{},targets,'Desktop'),[]);
 assert.deepEqual(behaviorInteractions(rules,'other',{value:'Selected'},{},targets,'Desktop'),[]);
});


test('no-code property editor offers metadata reference pickers without authored JSON',()=>{
 const html=renderToStaticMarkup(React.createElement(CustomComponentPropertyEditor,{
  definitions:[{propertyKey:'pagePropertyContract',label:'Page behaviour',kind:'GROUP',fields:[
   {propertyKey:'interactions',label:'Interactions',kind:'COLLECTION',fields:[
    {propertyKey:'event',label:'Event',kind:'TEXT'},
    {propertyKey:'targetComponentId',label:'Target',kind:'TEXT'},
    {propertyKey:'targetProperty',label:'Property',kind:'TEXT'}]}]}],
  properties:{pagePropertyContract:{interactions:[{event:'change',targetComponentId:'card',targetProperty:'title'}]}},
  choiceOverrides:{event:[{key:'change',label:'When value changes'}],
   targetComponentId:[{key:'card',label:'Result card'}],
   targetProperty:[{key:'title',label:'Title'}]},
  onChange:()=>{}}));
 assert.match(html,/Result card/);
 assert.match(html,/When value changes/);
 assert.match(html,/Title/);
 assert.doesNotMatch(html,/textarea/);
});

test('Dynamic Actions respect record permission conditions and fail closed when context is absent',()=>{
 const properties={pagePropertyContract:{version:1,actionVisibility:[
  {actionId:'delete',unavailable:'Hide',when:{logic:'All',conditions:[
   {source:'Record Permission',operator:'Equals',value:'Delete'}]}}
 ]}};
 const allowed={formFactor:'Desktop' as const,record:{Id:'record-1'},
  fields:[{apiName:'Name',label:'Name',dataType:'Text(40)'}],
  readableFieldApiNames:new Set(['Name']),
  recordPermissions:new Set<'Create'|'Edit'|'Delete'>(['Delete'])};
 assert.equal(behaviorAction(properties,'delete',allowed),'enabled');
 assert.equal(behaviorAction(properties,'delete',{...allowed,recordPermissions:new Set<'Create'|'Edit'|'Delete'>()}),'hidden');
 assert.equal(behaviorAction(properties,'delete',{formFactor:'Desktop'}),'hidden');
});

test('legacy and versioned Dynamic Action conditions compose without overriding a denial',()=>{
 const prop={pagePropertyContract:{version:1,actionVisibility:[{
  actionId:'Delete',unavailable:'Disable',when:{logic:'All',conditions:[
   {source:'Record Permission',operator:'Equals',value:'Delete'}]}
 }]}};
 const ctx={formFactor:'Desktop' as const,record:{Status:'Open'},fields:[
  {apiName:'Status',label:'Status',dataType:'Text(30)'}],
  readableFieldApiNames:new Set(['Status']),
  recordPermissions:new Set<'Create'|'Edit'|'Delete'>(['Delete'])};
 const legacy={fieldApiName:'Status',equalsValue:'Open',operator:'Equals'};
 assert.equal(behaviorRecordAction(prop,'Delete',ctx,legacy),'enabled');
 assert.equal(behaviorRecordAction(prop,'Delete',{...ctx,record:{Status:'Closed'}},legacy),'hidden');
 assert.equal(behaviorRecordAction(prop,'Delete',{...ctx,readableFieldApiNames:new Set<string>()},legacy),'hidden');
 assert.equal(behaviorRecordAction(prop,'Delete',{...ctx,recordPermissions:new Set<'Create'|'Edit'|'Delete'>()},legacy),'disabled');
 assert.equal(behaviorRecordAction(prop,'Delete',ctx,{...legacy,operator:'Unexpected'}),'hidden');
});

test('record-permission action conditions evaluate with no readable record fields',()=>{
 const data={pagePropertyContract:{version:1,actionVisibility:[{
  actionId:'Edit',unavailable:'Hide',when:{logic:'All',conditions:[
   {source:'Record Permission',operator:'Equals',value:'Edit'}]}
 }]}};
 assert.equal(behaviorAction(data,'Edit',{formFactor:'Desktop',
  recordPermissions:new Set<'Create'|'Edit'|'Delete'>(['Edit'])}),'enabled');
 assert.equal(behaviorAction(data,'Edit',{formFactor:'Desktop',
  recordPermissions:new Set<'Create'|'Edit'|'Delete'>()}),'hidden');
});

test('P1 multiple field behavior rules resolve independently as values change',()=>{
 const rules={pagePropertyContract:{version:1,fieldRules:[
  {fieldApiName:'Name',behavior:'Required',visibilityRules:{logic:'All',conditions:[
   {source:'Record Field',fieldApiName:'Status',operator:'Equals',value:'Active'}]}},
  {fieldApiName:'Name',behavior:'ReadOnly',visibilityRules:{logic:'All',conditions:[
   {source:'Record Field',fieldApiName:'Status',operator:'Equals',value:'Locked'}]}}
 ]}};
 const base={formFactor:'Desktop' as const,fields:[{apiName:'Status',label:'Status',dataType:'Text(40)'}],
  readableFieldApiNames:new Set(['Status'])};
 assert.deepEqual(behaviorField(rules,'Name',{...base,record:{Status:'Active'}}),
  {visible:true,required:true,readOnly:false});
 assert.deepEqual(behaviorField(rules,'Name',{...base,record:{Status:'Locked'}}),
  {visible:true,required:false,readOnly:true});
 assert.deepEqual(behaviorField(rules,'Name',{...base,record:{Status:'Other'}}),
  {visible:false,required:false,readOnly:false});
});

test('P1 duplicate action rules combine with hide precedence and recalculate',()=>{
 const p={pagePropertyContract:{version:1,actionVisibility:[
  {actionId:'Edit',unavailable:'Disable',when:{logic:'All',conditions:[
   {source:'Record Field',fieldApiName:'Status',operator:'Equals',value:'Active'}]}},
  {actionId:'Edit',unavailable:'Hide',when:{logic:'All',conditions:[
   {source:'Record Permission',operator:'Equals',value:'Edit'}]}}
 ]}};
 const c={formFactor:'Desktop' as const,record:{Status:'Inactive'},
  fields:[{apiName:'Status',label:'Status',dataType:'Text(40)'}],
  readableFieldApiNames:new Set(['Status']),
  recordPermissions:new Set<'Create'|'Edit'|'Delete'>()};
 assert.equal(behaviorAction(p,'Edit',c),'hidden');
 assert.equal(behaviorAction(p,'Edit',{...c,recordPermissions:new Set<'Create'|'Edit'|'Delete'>(['Edit'])}),'disabled');
 assert.equal(behaviorAction(p,'Edit',{...c,record:{Status:'Active'},
  recordPermissions:new Set<'Create'|'Edit'|'Delete'>(['Edit'])}),'enabled');
});

test('parity PB21 conditional tabs never expose panels after a second rule denies',()=>{
 const p={pagePropertyContract:{version:1,tabVisibility:[
  {tabId:'Details',when:{logic:'All',conditions:[{source:'Device',operator:'Equals',value:'Desktop'}]}},
  {tabId:'Details',when:{logic:'All',conditions:[{source:'Record Permission',operator:'Equals',value:'Edit'}]}}
 ]}};
 const base={formFactor:'Desktop' as const,recordPermissions:new Set<'Create'|'Edit'|'Delete'>()};
 assert.deepEqual(behaviorTabs(p,['Details','History'],base),['History']);
 assert.deepEqual(behaviorTabs(p,['Details','History'],{
  ...base,recordPermissions:new Set<'Create'|'Edit'|'Delete'>(['Edit'])}),['Details','History']);
 assert.deepEqual(behaviorTabs(p,['Details','History'],{
  ...base,formFactor:'Phone',recordPermissions:new Set<'Create'|'Edit'|'Delete'>(['Edit'])}),['History']);
});

test('PB18 conditional formatting presents a non-colour accessible state label',()=>{
 const properties={pagePropertyContract:{version:1,conditionalFormatting:[{
  id:'caution',fieldApiName:'Status',
  when:{logic:'All',conditions:[{source:'Device',operator:'Equals',value:'Desktop'}]},
  appearance:{color:'#f00',accessibleLabel:'Requires attention'}
 }]}};
 assert.equal(behaviorAppearanceLabel(properties,{formFactor:'Desktop'},'Status'),'Requires attention');
 assert.equal(behaviorAppearanceLabel(properties,{formFactor:'Phone'},'Status'),'');
 assert.equal(behaviorAppearanceLabel(properties,{formFactor:'Desktop'},'Other'),'');
});
