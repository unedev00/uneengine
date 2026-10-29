import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const migrationUrl=new URL('../../src/system-support/migrations/20270124-retire-legacy-une-app-tenants.sql',import.meta.url);
test('legacy tenant migration only rewrites explicitly owned, active installed app pages',async()=>{
 const sql=await readFile(migrationUrl,'utf8');
 for(const app of ['Acetill','AceAssist','OneChatter','UNEAceChatter'])
  assert.ok(sql.includes("'"+app+"'"),'missing app '+app);
 for(const renderer of ['acetill_input','acetill_cart','acetill_item_grid',
   'aceassist_calendar','onechatter_conversation','uneacechatter_conversation'])
  assert.ok(sql.includes("'"+renderer+"'"),'missing private renderer '+renderer);
 for(const guard of ['md_app_installations','md_app_entitlements','md_app_package_seed_receipts',
   'md_component_definitions target','legacy.renderer_key','target.renderer_key',
   'd.revision=1','md_page_layout_versions','md_page_layout_audit',
   'md_lightning_page_activation','md_legacy_une_component_replacements'])
  assert.ok(sql.includes(guard),'missing tenant safety guard '+guard);
 assert.doesNotMatch(sql,/\b(?:DROP|TRUNCATE)\s+TABLE\b|\bDELETE\s+FROM\b/i);
 assert.doesNotMatch(sql,/\bUPDATE\s+md_page_layout_version_nodes\b/i);
 assert.doesNotMatch(sql,/\bUPDATE\s+md_flow_(?:editor_values|node_properties)\b/i);
});
test('legacy SQL registry is deactivated, not erased, only without references',async()=>{
 const sql=await readFile(migrationUrl,'utf8');
 assert.match(sql,/UPDATE md_component_definitions d SET enabled=false/);
 for(const ref of ['md_page_components','md_lightning_page_nodes','md_page_layout_version_nodes',
    'md_component_library_versions','md_component_properties','md_flow_editor_values',
    'md_flow_node_properties','md_object_actions','md_global_quick_actions',
    'md_system_definitions','md_tenant_app_installed_versions'])
  assert.ok(sql.includes(ref),'missing legacy retention dependency '+ref);
 assert.match(sql,/ON CONFLICT DO NOTHING/);
});
test('old app source paths only delegate to the shared presentation helper',async()=>{
 const files=['une_conversation','onechatter_conversation','uneacechatter_conversation'];
 for(const part of files){
  const script=await readFile(new URL('../../../web/src/one/'+part+'/flowConversationPresenter.js',import.meta.url),'utf8');
  assert.match(script,/export \{presentFlowConversationCollections\} from/);
 }
 const shared=await readFile(new URL('../../../web/src/one/une/shared/flowConversationPresenter.js',import.meta.url),'utf8');
 assert.match(shared,/export function presentFlowConversationCollections/);
});


test('unused One component source directories are fully retired',async()=>{
 const {access}=await import('node:fs/promises');
 for(const name of ["OneAccordion","OneAvatar","OneBoard","OneDashboardEmbed","OneDivider","OneFileUpload","OneIcon","OneOverlay","OnePagination","OneRecordForm","OneSlider","OneTimeline","OneTree"]){
  await assert.rejects(access(new URL('../../../web/src/one/'+name+'/',import.meta.url)),
   {code:'ENOENT'},name+' must not ship as a stale standalone component');
 }
});
