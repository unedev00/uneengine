import { readPageBuilderModules } from './helpers/builderSources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {PageComponentMetadata} from '../src/core/metadata/Definitions/metadata';
import {
 validateComponentId,renamePageComponentId,duplicatePageComponentId
} from '../src/core/builders/PageBuilder/componentIdentity';

const make=(id:string,properties:Record<string,unknown>={},
 parentId?:string):PageComponentMetadata=>({
 id,type:'Custom:smart_image',label:'Image',visible:true,region:'main',properties,parentId
});
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('Component ID is uniquely validated across ALL page components, ignoring letter case',()=>{
 const components=[make('smartimage1'),make('smartimage2'),make('Order_Table')];
 assert.equal(validateComponentId('smartimage3',components,'smartimage1'),null);
 assert.equal(validateComponentId('smartimage1',components,'smartimage1'),null);
 assert.equal(validateComponentId('SmartImage1',components,'smartimage1'),null);
 assert.match(validateComponentId('SMARTIMAGE2',components,'smartimage1')??'',/already used/);
 assert.match(validateComponentId('order_table',components,'smartimage1')??'',/already used/);
 assert.match(validateComponentId(' ',components,'smartimage1')??'',/required/);
 for(const bad of ['123image','with spaces','Image.Name','__proto__', 'image-💥', 'a'.repeat(129)]){
  assert.notEqual(validateComponentId(bad,components,'smartimage1'),null,bad);
 }
 assert.equal(duplicatePageComponentId(components),null);
 assert.match(duplicatePageComponentId([...components,make('SMARTIMAGE1')])??'',/Duplicate/);
});

test('rename updates page key, nested parents and declared interaction target references atomically',()=>{
 const source=[
  make('img',{pagePropertyContract:{version:1,interactions:[
   {event:'click',targetComponentId:'table',targetProperty:'textSource',sourceKey:'table'},
   {event:'select',targetComponentId:'img',targetProperty:'value'}
  ]},textSource:'The img should not be rewritten',objectApiName:'img'}),
  make('table',{layoutContainer:true,layoutParentId:'img',
   navigatorName:'table',actionFlows:{click:{componentId:'img',caption:'img'}},
   pagePropertyContract:{version:1,interactions:[
    {event:'click',targetComponentId:'img',targetProperty:'value'}
   ]}},'img'),
  make('child',{layoutParentId:'table',dataSource:'img',
   stateBindings:{myId:'img'},other:{sourceComponentId:'img'}} ,'table')
 ];
 const original=structuredClone(source);
 const renamed=renamePageComponentId(source,'img','logo1');
 assert.deepEqual(source,original,'never mutate saved metadata');
 assert.equal(renamed[0].id,'logo1');
 assert.equal(renamed[1].parentId,'logo1');
 assert.equal(renamed[1].properties.layoutParentId,'logo1');
 assert.equal((renamed[0].properties.pagePropertyContract as any).interactions[1].targetComponentId,'logo1');
 assert.equal((renamed[1].properties.pagePropertyContract as any).interactions[0].targetComponentId,'logo1');
 assert.equal((renamed[1].properties.actionFlows as any).click.componentId,'logo1');
 assert.equal((renamed[2].properties.other as any).sourceComponentId,'logo1');
 assert.equal(renamed[0].properties.textSource,'The img should not be rewritten');
 assert.equal(renamed[0].properties.objectApiName,'img');
 assert.equal((renamed[1].properties.actionFlows as any).click.caption,'img');
 assert.equal(renamed[2].properties.dataSource,'img');
 assert.equal((renamed[2].properties.stateBindings as any).myId,'img');
 assert.equal(renamed[2].parentId,'table');
 assert.equal(renamed[2].properties.layoutParentId,'table');
 assert.notEqual(renamed[0].properties.pagePropertyContract,source[0].properties.pagePropertyContract);
 assert.deepEqual(renamePageComponentId(renamed,'logo1','logo1'),renamed);
 assert.throws(()=>renamePageComponentId(renamed,'logo1','TABLE'),/already used/);
 assert.throws(()=>renamePageComponentId(renamed,'missing','other'),/no longer exists/);
});

test('Technical IDs remain immutable in ribbon while component name is validated for CSV',()=>{
 const advanced=read('../src/core/builders/PageBuilder/PageBuilderAdvancedSections.tsx');
 const page=readPageBuilderModules();
 const layout=read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css');
 const draft=read('../../server/src/system-files/page-layout-version-runtime.ts');
 const legacy=read('../../server/src/system-files/page-runtime.ts');
 assert.match(advanced,/aria-label="Component Name"/);
 assert.match(advanced,/validateInstanceName\(nameDraft\)/);
 assert.match(advanced,/onBlur=\{commitName\}/);
 assert.doesNotMatch(advanced,/aria-label="Component ID"/);
 assert.doesNotMatch(advanced,/technical\.onRename/);
 assert.match(page,/duplicatePageComponentId\(candidate\.components\)/);
 assert.match(page,/canonicalComponentName\(otherName\)===canonicalComponentName\(name\)/);
 assert.match(layout,/advanced-component-name-error/);
 assert.match(draft,/ids\.has\(String\(component\.id\)\.toLowerCase\(\)\)/);
 assert.match(legacy,/keys\.has\(String\(c\.id\)\.toLowerCase\(\)\)/);
});
