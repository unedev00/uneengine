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
  assert.equal(libraryComponentLabel(definition('une_calendar',{label:'UNE Calendar'})),'Calendar');
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
  const canonical = definition('une_conversation', { trustedBundled: true });
  for (const surface of ['page', 'dashboard', 'flow'] as const) {
    assert.deepEqual(uniqueLibraryComponents([alias, canonical], surface), [canonical]);
    assert.equal(findRegisteredComponent([alias, canonical], alias.apiName, surface), alias);
  }
  assert.deepEqual(uniqueLibraryComponents([alias]), [alias]);
  assert.equal(uniqueLibraryComponents([alias, { ...canonical, status: 'Draft' }]).length, 2);
  assert.equal(uniqueLibraryComponents([{ ...alias, trustedBundled: false }, canonical]).length, 2);
  assert.equal(uniqueLibraryComponents([alias, { ...canonical, surfaces: ['page'] }]).length, 2);
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
  assert.match(markup, /UNE library/);
  assert.match(markup, /One- library/);
  assert.match(markup, /Core · Page components/);
  assert.doesNotMatch(markup, /id="library-component-label"/);
});


test('UNE palette uses published descriptor category instead of a guessed label',()=>{
  assert.deepEqual(getPageBuilderComponentCategories('une_option_groups','UNE Option Groups','Dynamic options',false,'Inputs'),['Inputs']);
  assert.deepEqual(getPageBuilderComponentCategories('une_cart','UNE Cart','Shopping',false,'Data'),['Data']);
  assert.deepEqual(getPageBuilderComponentCategories('une_calendar','Calendar','Appointments',false,'Data'),['Data']);
});


test('only UNE equivalents are offered for trusted retired One components',()=>{
 const pairs: Array<[string,string]> = [
  ['OneText','une_text'],['OneBadge','une_badge'],['OneButton','une_button'],
  ['OneSearch','une_search'],['OneCalendar','une_calendar'],
  ['OneItemGrid','une_item_grid'],['OneConversation','une_conversation'],
  ['OneShoppingCart','une_cart']
 ];
 for(const [legacy,canonical] of pairs){
  const old=definition(legacy,{trustedBundled:true});
  const replacement=definition(canonical,{trustedBundled:true});
  for(const surface of ['page','dashboard','flow'] as const){
   assert.deepEqual(uniqueLibraryComponents([old,replacement],surface),[replacement]);
   assert.equal(findRegisteredComponent([replacement],legacy,surface),replacement);
   assert.equal(findRegisteredComponent([old,replacement],legacy,surface),old);
  }
  assert.deepEqual(uniqueLibraryComponents([definition(legacy),replacement]),[definition(legacy),replacement],
   'tenant-owned components are never retired by name alone');
 }
});

test('retired UNE insert components are hidden but retained components remain',()=>{
 const names=['une_alert','une_chart','une_table','une_card','une_image','une_form','une_repeater','une_record_list','une_progress','une_navigation'];
 const retained=['une_button','une_text','une_calendar','une_search','une_item_grid','une_cart'];
 const entries=[...names,...retained].map(name=>definition(name));
 assert.deepEqual(publishedPageLibraryComponents(entries).map(d=>d.apiName),retained);
 assert.ok(findRegisteredComponent(entries,'une_table','page'));
});

test('UNE Conversation is AceChatter-only, hidden from new Page Builder placements', async () => {
 const { RETIRED_UNE_PAGE_BUILDER_COMPONENTS }=await import('../src/core/builders/PageBuilder/pageBuilderPalette');
 assert.ok(RETIRED_UNE_PAGE_BUILDER_COMPONENTS.has('une_conversation'));
 assert.deepEqual(publishedPageLibraryComponents([definition('une_conversation'),definition('une_button')]).map(x=>x.apiName),['une_button']);
 assert.equal(findRegisteredComponent([definition('une_conversation')],'une_conversation','page')?.apiName,'une_conversation');
});
