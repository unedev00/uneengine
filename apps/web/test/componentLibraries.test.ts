import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
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
