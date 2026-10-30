import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import type { PoolClient } from 'pg';
import { BUNDLED_COMPONENTS,seedFreshBundledComponents,deactivateUnavailableBundledComponents } from '../../src/app-seeders/bundled-components.js';
import {UNE_COMPONENTS,seedFreshUneComponents} from '../../src/app-seeders/une-components.js';

test('SQL component seed matches the UNE-only manifest without duplicates', async()=>{
  const catalog=JSON.parse(await readFile(new URL('../../../web/src/component-libraries/manifest.json',import.meta.url),'utf8')) as {components:string[]};
  assert.deepEqual([...BUNDLED_COMPONENTS,...UNE_COMPONENTS],catalog.components.filter(path=>path.startsWith('ui_')).map(path=>path.split('/')[0]));
  assert.ok(catalog.components.includes('acetill_cart/component.json'));
  assert.deepEqual(BUNDLED_COMPONENTS,[]);
  assert.ok(UNE_COMPONENTS.includes('ui_cart'));
  assert.ok(UNE_COMPONENTS.includes('ui_item_grid'));
  assert.equal(catalog.components.filter(path=>path.startsWith('One')).length,0);
});

test('obsolete system-only OneAccordion is disabled without modifying tenant components',async()=>{
  const writes:Array<{sql:string;args:unknown[]}>= [];
  const client={query:async(sql:string,args:unknown[])=>{
    writes.push({sql,args});return {rows:[],rowCount:0};
  }} as unknown as PoolClient;
  await deactivateUnavailableBundledComponents(client,'tenant-a');
  assert.equal(writes.length,1);
  const write=writes[0];
  assert.equal(write.args[0],'tenant-a');
  assert.ok(!(write.args[1] as string[]).includes('OneText'));
  assert.ok(!(write.args[1] as string[]).includes('ui_text'));
  assert.ok(!(write.args[1] as string[]).includes('OneAccordion'));
  assert.match(write.sql,/UPDATE md_component_definitions/);
  assert.match(write.sql,/d.renderer_key='one-bundled:'\|\|d.api_name/);
  assert.match(write.sql,/NOT EXISTS/);
  assert.match(write.sql,/md_component_library_heads/);
  assert.match(write.sql,/md_app_package_component_templates/);
  assert.match(write.sql,/md_page_components/);
  assert.match(write.sql,/md_lightning_page_nodes/);
  assert.doesNotMatch(write.sql,/DELETE FROM/);
});

test('bundled component seed never overwrites tenant customisations and is tenant scoped',async()=>{
  const writes:Array<{sql:string;args:unknown[]}>=[]; 
  const client={query:async(sql:string,args:unknown[])=>{writes.push({sql,args});return {rows:[]};}} as unknown as PoolClient;
  await seedFreshBundledComponents(client,'tenant-a');
  assert.equal(writes.length,BUNDLED_COMPONENTS.length);
  for(const write of writes){
    assert.match(write.sql,/ON CONFLICT\(tenant_id,api_name\) DO NOTHING/);
    assert.equal(write.args[0],'tenant-a');
    assert.equal(write.args[2],'one-bundled:'+write.args[1]);
  }
});


test('UNE seeding never overwrites tenant customisations',async()=>{
 const writes:Array<{sql:string;args:unknown[]}>=[];
 const client={query:async(sql:string,args:unknown[])=>{writes.push({sql,args});return {rows:[]};}} as unknown as PoolClient;
 await seedFreshUneComponents(client,'tenant-une');
 assert.equal(writes.length,0,'app-owned UNE components must never be globally seeded');
});

test('retired UNE Badge has no app placement, system manifest, or insert registration',async()=>{
  assert.equal((UNE_COMPONENTS as readonly string[]).includes('ui_badge'),false);
  const app=await readFile(new URL('../../../acetill/sql/register-v2.sql',import.meta.url),'utf8');
  assert.doesNotMatch(app,/ui_badge|OneBadge/);
  const catalog=JSON.parse(await readFile(new URL('../../../web/src/component-libraries/manifest.json',import.meta.url),'utf8')) as {components:string[]};
  assert.ok(!catalog.components.includes('ui_badge/component.json'));
  const migration=await readFile(new URL('../../src/system-support/migrations/20270118-retire-une-badge.sql',import.meta.url),'utf8');
  for(const clause of ['DELETE FROM md_lightning_page_nodes','DELETE FROM md_page_layout_version_nodes',
   'DELETE FROM md_page_components','DELETE FROM md_app_package_page_component_templates',
   "UPDATE md_component_definitions SET enabled=false"])
    assert.ok(migration.includes(clause),clause);
});
