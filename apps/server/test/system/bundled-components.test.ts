import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import type {PoolClient} from 'pg';
import {BUNDLED_COMPONENTS,seedFreshBundledComponents,deactivateUnavailableBundledComponents} from '../../src/app-seeders/bundled-components.js';
import {SMART_COMPONENTS} from '../../src/app-seeders/smart-components.js';
test('only Smart components are registered in the bundled manifest',async()=>{
 const catalog=JSON.parse(await readFile(new URL('../../../web/src/component-libraries/manifest.json',import.meta.url),'utf8')) as {components:string[]};
 assert.equal(catalog.components.length,16);
 assert.ok(catalog.components.every(p=>p.startsWith('smart_')));
 assert.deepEqual(BUNDLED_COMPONENTS,[]);
 assert.deepEqual(catalog.components.map(p=>p.split('/')[0]).sort(),[...SMART_COMPONENTS].sort());
});
test('retired system components are disabled without touching tenant components',async()=>{
 const writes:Array<{sql:string;args:unknown[]}>=[];
 const client={query:async(sql:string,args:unknown[])=>{writes.push({sql,args});return {rows:[],rowCount:0};}} as unknown as PoolClient;
 await deactivateUnavailableBundledComponents(client,'tenant-a');
 assert.equal(writes.length,1);
 assert.deepEqual(writes[0].args[1],[...SMART_COMPONENTS]);
 assert.match(writes[0].sql,/UPDATE md_component_definitions/);
 assert.match(writes[0].sql,/NOT EXISTS/);
 assert.match(writes[0].sql,/md_component_library_heads/);
 assert.match(writes[0].sql,/md_page_components/);
 assert.doesNotMatch(writes[0].sql,/DELETE FROM/);
});
test('Smart seeded component registration does not overwrite tenant customisations',async()=>{
 const writes:Array<{sql:string;args:unknown[]}>=[];
 const client={query:async(sql:string,args:unknown[])=>{writes.push({sql,args});return {rows:[]};}} as unknown as PoolClient;
 await seedFreshBundledComponents(client,'tenant-a');
 assert.equal(writes.length,0);
});
