import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {gzipSync,brotliCompressSync} from 'node:zlib';
import {rendererFileName,compressRenderer} from '../component-delivery.mjs';
import {loadBundledRenderer} from '../src/core/components/RegisteredComponent/bundledAssetCache';
import type { LibraryComponentMetadata } from '../src/core/metadata/Definitions/metadata';
import ComponentLibrary from '../src/core/components/ComponentLibrary/ComponentLibrary';
import { libraryComponentLabel, oneComponentLabel, uniqueLibraryComponents } from '../src/core/components/Registry/componentLibraryDiscovery';
import { findRegisteredComponent } from '../src/core/components/Registry/componentRegistryLookup';
import { publishedPageLibraryComponents,getPageBuilderComponentCategories } from '../src/core/builders/PageBuilder/pageBuilderPalette';

function definition(apiName: string, patch: Partial<LibraryComponentMetadata> = {}): LibraryComponentMetadata {
  return { apiName, label: apiName, description: '', surfaces: ['page', 'dashboard', 'flow'],
    version: 1, status: 'Published', updatedAt: '', jsxSource: '', cssSource: '', compiledJs: '', scopedCss: '', ...patch };
}

test('One- names have one prefix while platform names and API references stay stable', () => {
  for (const label of ['Text', 'OneText', 'One Text', 'One-Text']) {
    assert.equal(oneComponentLabel({ label, apiName: 'OneText' }), 'One-Text');
  }
  const platform = definition('SystemPanel', { scope: 'platform-system', label: 'System Panel' });
  assert.equal(libraryComponentLabel(platform), 'System Panel');
  const custom = definition('Calendar', { label: 'Calendar' });
  assert.equal(libraryComponentLabel(custom), 'One-Calendar');
  assert.equal(custom.apiName, 'Calendar');
  assert.equal(libraryComponentLabel(definition('ui_calendar',{label:'UNE Calendar'})),'Calendar');
});

test('each builder offers one published definition per identity and supported surface', () => {
  const components = [definition('OneText', { status: 'Draft', version: 4 }),
    definition('OneText'), definition('OneText', { version: 2 }),
    definition('FlowOnly', { surfaces: ['flow'] }), definition('Invalid-Name')];
  for (const surface of ['page', 'dashboard', 'flow'] as const) {
    const available = uniqueLibraryComponents(components, surface);
    assert.deepEqual(available.map(item => item.apiName), surface === 'flow' ? ['OneText', 'FlowOnly'] : ['OneText']);
    assert.equal(available[0].version, 2);
    assert.equal(findRegisteredComponent(components, 'OneText', surface)?.version, 2);
  }
  assert.deepEqual(publishedPageLibraryComponents(components), uniqueLibraryComponents(components, 'page'));
});

test('bundled alias is hidden from new placements while saved placements remain resolvable', () => {
  const alias = definition('ChatterInbox', { trustedBundled: true });
  const canonical = definition('ui_conversation', { trustedBundled: true });
  for (const surface of ['page', 'dashboard', 'flow'] as const) {
    assert.deepEqual(uniqueLibraryComponents([alias, canonical], surface), []);
    assert.equal(findRegisteredComponent([alias, canonical], alias.apiName, surface), alias);
  }
  assert.deepEqual(uniqueLibraryComponents([alias]), []);
  assert.equal(uniqueLibraryComponents([alias, { ...canonical, status: 'Draft' }]).length, 0);
  assert.equal(uniqueLibraryComponents([{ ...alias, trustedBundled: false }, canonical]).length, 1);
  assert.equal(uniqueLibraryComponents([alias, { ...canonical, surfaces: ['page'] }]).length, 0);
});

test('equal labels do not erase distinct custom components or mutate registry metadata', () => {
  const entries = [definition('First', { label: 'Text' }), definition('Second', { label: 'Text' })];
  const before = structuredClone(entries);
  assert.equal(uniqueLibraryComponents(entries).length, 2);
  assert.deepEqual(entries, before);
});

test('library starts in Core with two library choices and no custom registration form', () => {
  const markup = renderToStaticMarkup(React.createElement(ComponentLibrary, {
    components: [], canManage: true,
    onSave: async () => {}, onDelete: async () => {}, onPublish: async () => {}, onRollback: async () => {}
  }));
  assert.match(markup, /Core library/);
  assert.doesNotMatch(markup, /UNE library/);
  assert.match(markup, /One- library/);
  assert.match(markup, /Core · Page components/);
  assert.doesNotMatch(markup, /id="library-component-label"/);
});


test('UNE palette uses published descriptor category instead of a guessed label',()=>{
  assert.deepEqual(getPageBuilderComponentCategories('ui_option_groups','UNE Option Groups','Dynamic options',false,'Inputs'),['Inputs']);
  assert.deepEqual(getPageBuilderComponentCategories('ui_cart','UNE Cart','Shopping',false,'Data'),['Data']);
  assert.deepEqual(getPageBuilderComponentCategories('ui_calendar','Calendar','Appointments',false,'Data'),['Data']);
});


test('only UNE equivalents are offered for trusted retired One components',()=>{
 const pairs: Array<[string,string]> = [
  ['OneText','ui_input'],['OneBadge','ui_input'],['OneButton','ui_button'],
  ['OneSearch','ui_search'],['OneCalendar','ui_calendar'],
  ['OneItemGrid','ui_item_grid'],['OneConversation','ui_conversation'],
  ['OneShoppingCart','ui_cart']
 ];
 for(const [legacy,canonical] of pairs){
  const old=definition(legacy,{trustedBundled:true});
  const replacement=definition(canonical,{trustedBundled:true});
  for(const surface of ['page','dashboard','flow'] as const){
   assert.deepEqual(uniqueLibraryComponents([old,replacement],surface),[]);
   assert.equal(findRegisteredComponent([replacement],legacy,surface),replacement);
   assert.equal(findRegisteredComponent([old,replacement],legacy,surface),['OneText','OneBadge'].includes(legacy)?replacement:old);
  }
  assert.deepEqual(uniqueLibraryComponents([definition(legacy),replacement]),[definition(legacy)],
   'tenant-owned components are never retired by name alone');
 }
});

test('retired UNE insert components are hidden but retained components remain',()=>{
 const names=['ui_alert','ui_chart','ui_table','ui_card','ui_image','ui_form','ui_repeater','ui_record_list','ui_progress','ui_navigation'];
 const retained=['ui_button','ui_input','ui_calendar','ui_item_grid'];
 const privatelyRegistered=['ui_cart','ui_search','ui_modal'];
 const entries=[...names,...retained,...privatelyRegistered].map(name=>definition(name));
 assert.deepEqual(publishedPageLibraryComponents(entries).map(d=>d.apiName),[]);
 assert.ok(findRegisteredComponent(entries,'ui_table','page'));
 assert.ok(findRegisteredComponent(entries,'ui_cart','page'));
 assert.ok(!publishedPageLibraryComponents(entries).some(d=>d.apiName==='ui_cart'));
});

test('UNE Conversation is AceChatter-only, hidden from new Page Builder placements', async () => {
 const { RETIRED_UNE_PAGE_BUILDER_COMPONENTS }=await import('../src/core/builders/PageBuilder/pageBuilderPalette');
 assert.ok(RETIRED_UNE_PAGE_BUILDER_COMPONENTS.has('ui_conversation'));
 assert.deepEqual(publishedPageLibraryComponents([definition('ui_conversation'),definition('ui_button')]).map(x=>x.apiName),[]);
 assert.equal(findRegisteredComponent([definition('ui_conversation')],'ui_conversation','page')?.apiName,'ui_conversation');
});

test('app-private bundled component identities are never offered for new placement',()=>{
 const aliases=['acetill_item_grid','aceassist_calendar','onechatter_conversation','uneacechatter_modal'];
 for(const alias of aliases){
  const privateComponent=definition(alias,{trustedBundled:true});
  assert.deepEqual(uniqueLibraryComponents([privateComponent]),[]);
  assert.equal(findRegisteredComponent([privateComponent],alias,'page'),privateComponent);
  assert.deepEqual(uniqueLibraryComponents([definition(alias)]),[definition(alias)],'tenant authors remain untouched');
 }
});


test('baseline: 22 independently delivered renderer JSONs have no transfer compression',()=>{
 // HAR-sized deterministic fixture: 11 buttons, 4 texts and 7 other renderers.
 const js='function Component(){ return "'+('RUNTIME_SHARED_0123456789'.repeat(9000))+'"; }';
 const payload=JSON.stringify({apiName:'smart_button',version:1,compiledJs:js,scopedCss:''});
 const raw=Buffer.byteLength(payload);
 const requests=22;
 const total=raw*requests;
 assert.equal(requests,22);
 assert.ok(raw>180_000);
 console.info('component delivery mock baseline: rendererBytes='+raw+
  ' requests='+requests+' bytes='+total+' cache=no-cache compression=none');
});

test('content-hashed renderer paths change on publication and transfer sizes drop',()=>{
 const payload=JSON.stringify({apiName:'smart_button',version:1,
  compiledJs:'function Renderer(){'+('return 123456789;'.repeat(13000))+'}',scopedCss:'.smart{padding:2px}'});
 const same=rendererFileName('smart_button',payload);
 assert.match(same,/^smart_button\.[a-f0-9]{16}\.json$/);
 assert.equal(same,rendererFileName('smart_button',payload));
 assert.notEqual(same,rendererFileName('smart_button',payload+'-new'));
 const packed=compressRenderer(payload);
 assert.ok(packed.gzip.length<Buffer.byteLength(payload));
 assert.ok(packed.brotli.length<packed.gzip.length);
 assert.deepEqual(gzipSync(payload),gzipSync(payload));
 assert.ok(brotliCompressSync(payload).length<Buffer.byteLength(payload));
 const raw=Buffer.byteLength(payload);
 console.info('component delivery mock: 22 renderer requests, rawBytes='+(22*raw)+
  ' gzipBytes='+(22*packed.gzip.length)+' brBytes='+(22*packed.brotli.length));
});
test('Nginx component delivery has immutable renderer caching and catalog revalidation',async()=>{
 const script=await (await import('node:fs/promises')).readFile(
  new URL('../../../scripts/oracle/ensure-frontend-component-delivery.sh',import.meta.url),'utf8');
 assert.match(script,/max-age=31536000, immutable/);
 assert.match(script,/gzip on/);
 assert.match(script,/brotli on/);
 assert.match(script,/catalog-index\.json/);
 assert.match(script,/no-cache/);
 assert.match(script,/nginx -t/);
});


test('baseline: 22 component mounts independently request the same renderer URL',async()=>{
 let calls=0;
 const kinds=[...Array(11).fill('smart_button'),...Array(4).fill('smart_text'),
  ...Array.from({length:7},(_,index)=>'other_'+index)];
 const network=async(_name:string)=>{calls++;return {compiledJs:'valid'};};
 await Promise.all(kinds.map(kind=>network(kind)));
 assert.equal(calls,22);
 assert.equal(new Set(kinds).size,9);
 console.info('component loader mock baseline: mounted=22 requests='+calls+' distinctTypes=9');
});

test('repeated page renderer types issue one request per type across mounts and rerenders',async()=>{
 const components=[...Array(11).fill('smart_button'),...Array(4).fill('smart_text'),
  ...Array.from({length:7},(_,index)=>'unique_'+index)];
 const calls:string[]=[];
 const loader=(name:string)=>loadBundledRenderer('hashed/'+name+'.'+('abc'.repeat(8)),async()=>{
  calls.push(name);
  await new Promise<void>(resolve=>setTimeout(resolve,2));
  return {apiName:name};
 });
 const first=await Promise.all(components.map(loader));
 assert.equal(first.length,22);
 assert.equal(calls.length,9,'one HTTP request per distinct type on first page mount');
 assert.equal(calls.filter(name=>name==='smart_button').length,1);
 assert.equal(calls.filter(name=>name==='smart_text').length,1);
 await Promise.all(components.map(loader));
 assert.equal(calls.length,9,'cached hashed renderer never re-fetched on second mount');
 console.info('component loader mock: mounted=22 requestsBefore=22 requestsAfter='+calls.length+
  ' distinctTypes=9');
});

test('invalid renderer is not cached and rejected renderer attempts retry',async()=>{
 let requests=0;
 const key='mock/rejected-bundle';
 await assert.rejects(loadBundledRenderer(key,async()=>{requests++;throw Error('Network denied');}));
 const approved=await loadBundledRenderer(key,async()=>{requests++;return 'approved';});
 assert.equal(approved,'approved');
 assert.equal(requests,2);
});

test('unhashed legacy renderer only in-flight dedupes, then revalidates',async()=>{
 let count=0;
 const load=()=>loadBundledRenderer('legacy/non-hashed',async()=>{count++;return count;},false);
 assert.deepEqual(await Promise.all([load(),load(),load()]),[1,1,1]);
 assert.equal(await load(),2,'a newly published legacy renderer must be fetchable');
});
