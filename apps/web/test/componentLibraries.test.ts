import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadComponentCatalog} from '../../../scripts/component-catalog.mjs';
import ComponentLibrary from '../src/core/components/ComponentLibrary/ComponentLibrary';
import {libraryComponentLabel,uniqueLibraryComponents} from '../src/core/components/Registry/componentLibraryDiscovery';
import {findRegisteredComponent} from '../src/core/components/Registry/componentRegistryLookup';
import {publishedPageLibraryComponents} from '../src/core/builders/PageBuilder/pageBuilderPalette';
import type {LibraryComponentMetadata} from '../src/core/metadata/Definitions/metadata';
const definition=(apiName:string,extra:Partial<LibraryComponentMetadata>={}):LibraryComponentMetadata=>({
 apiName,label:apiName,description:'',surfaces:['page','dashboard','flow'],version:1,
 status:'Published',updatedAt:'',jsxSource:'',cssSource:'',compiledJs:'',scopedCss:'',...extra
});
test('bundled catalog publishes only 16 Smart renderers',async()=>{
 const catalog=await loadComponentCatalog();
 assert.equal(catalog.components.length,16);
 assert.ok(catalog.components.every(component=>component.apiName.startsWith('smart_')));
});
test('Smart components are visible and other system renderers are not',()=>{
 const smart=definition('smart_button',{trustedBundled:true,version:3});
 const old=definition('LegacyRenderer',{trustedBundled:true});
 const own=definition('TenantCustom',{label:'My component'});
 const list=uniqueLibraryComponents([smart,old,own]);
 assert.deepEqual(list.map(item=>item.apiName),['smart_button','TenantCustom']);
 assert.equal(findRegisteredComponent(list,'smart_button','page')?.version,3);
 assert.equal(libraryComponentLabel(own),'My component');
 assert.deepEqual(publishedPageLibraryComponents(list).map(item=>item.apiName),['smart_button','TenantCustom']);
});
test('component library keeps Core and tenant custom authoring',()=>{
 const html=renderToStaticMarkup(React.createElement(ComponentLibrary,{
  components:[definition('smart_button',{trustedBundled:true})],canManage:true,
  onSave:async()=>{},onDelete:async()=>{},onPublish:async()=>{},onRollback:async()=>{}
 }));
 assert.match(html,/Core library/);
 assert.match(html,/Custom library/);
 assert.doesNotMatch(html,/One- library/);
});
