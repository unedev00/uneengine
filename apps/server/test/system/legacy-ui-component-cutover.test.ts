import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const migrations=new URL('../../src/system-support/migrations/',import.meta.url);
const load=(name:string)=>readFile(new URL(name,migrations),'utf8');

test('retirement archives superseded package versions before deleting only uninstalled system catalogue metadata',async()=>{
 const sql=await load('20270125-retire-uninstalled-app-package-versions.sql');
 assert.match(sql,/md_retired_app_package_version_archive/);
 assert.match(sql,/package_snapshot jsonb NOT NULL/);
 assert.match(sql,/child_snapshots jsonb NOT NULL/);
 assert.match(sql,/md_tenant_app_installed_versions/);
 assert.match(sql,/a\.tenant_owner_id IS NULL/);
 assert.match(sql,/p\.version < \(/);
 assert.match(sql,/current_version\.published=true/);
 assert.match(sql,/INSERT INTO md_retired_app_package_version_archive/);
 assert.ok(sql.indexOf('INSERT INTO md_retired_app_package_version_archive')<sql.indexOf('DELETE FROM md_app_package_versions'));
 assert.doesNotMatch(sql,/\bDELETE\s+FROM\s+md_(?:page_|records|record_|tenant_|app_installations)/i);
 assert.doesNotMatch(sql,/\bDROP\s+TABLE\b|\bTRUNCATE\b/i);
});

test('legacy UI cutover is SQL-registered, tenant scoped and preserves immutable authored layout versions',async()=>{
 const sql=await load('20270126-legacy-ui-component-cutover.sql');
 for(const name of ['md_component_definitions','md_component_key_cutover_audit',
   'md_page_components','md_lightning_page_nodes','md_flow_node_properties',
   'md_flow_editor_values','md_object_actions','md_global_quick_actions',
   'md_component_library_versions','md_tenant_app_installed_versions']) assert.ok(sql.includes(name),name);
 assert.match(sql,/ON CONFLICT\(tenant_id,api_name\) DO NOTHING/);
 assert.match(sql,/renderer_key='one-bundled:'\|\|modern\.api_name/);
 assert.match(sql,/old\.renderer_key='one-bundled:'\|\|old\.api_name/);
 assert.match(sql,/UPDATE md_component_definitions old SET enabled=false/);
 assert.doesNotMatch(sql,/\bDELETE FROM md_component_definitions\b/i);
 assert.doesNotMatch(sql,/\bUPDATE md_page_layout_version_nodes\b/i);
 assert.doesNotMatch(sql,/\bDELETE FROM md_(?:page_|records|record_|tenant_)/i);
});
