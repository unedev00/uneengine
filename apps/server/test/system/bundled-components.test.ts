import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import type { PoolClient } from 'pg';
import { BUNDLED_COMPONENTS,seedFreshBundledComponents,deactivateUnavailableBundledComponents } from '../../src/app-seeders/bundled-components.js';
import {UNE_COMPONENTS,UNE_INSERT_EXCLUDED,seedFreshUneComponents} from '../../src/app-seeders/une-components.js';

test('SQL component seed matches the UNE-only manifest without duplicates', async()=>{
  const catalog=JSON.parse(await readFile(new URL('../../../web/src/one/manifest.json',import.meta.url),'utf8')) as {components:string[]};
  assert.deepEqual([...BUNDLED_COMPONENTS,...UNE_COMPONENTS],catalog.components.map(path=>path.split('/')[0]));
  assert.deepEqual(BUNDLED_COMPONENTS,[]);
  assert.ok(UNE_COMPONENTS.includes('une_cart'));
  assert.ok(UNE_COMPONENTS.includes('une_item_grid'));
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
  assert.ok(!(write.args[1] as string[]).includes('une_text'));
  assert.ok(!(write.args[1] as string[]).includes('OneAccordion'));
  assert.match(write.sql,/UPDATE md_component_definitions/);
  assert.match(write.sql,/d.renderer_key='one-bundled:'\|\|d.api_name/);
  assert.match(write.sql,/NOT EXISTS/);
  assert.match(write.sql,/md_component_library_heads/);
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
 const seeded=UNE_COMPONENTS.filter(name=>!UNE_INSERT_EXCLUDED.has(name));
 assert.equal(writes.length,seeded.length);
 assert.deepEqual(writes.map(write=>write.args[1]),seeded);
 for(const write of writes){
  assert.match(write.sql,/ON CONFLICT\(tenant_id,api_name\) DO NOTHING/);
  assert.equal(write.args[0],'tenant-une');assert.equal(write.args[2],'one-bundled:'+write.args[1]);
 }
});
