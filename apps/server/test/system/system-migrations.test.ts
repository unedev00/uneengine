import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import {applySystemMigrations,retiredMigrationVersions} from '../../src/system-support/system-migrations.js';
import {readRetiredMigration} from '../../../../scripts/read-retired-migration.mjs';

const baselineNames=['0001-initial-schema.sql','0002-current-platform.sql'];
function testDatabase(initialVersions:string[]=[],blank=false) {
 const versions=new Map<string,string>(initialVersions.map(name=>[name,'legacy-checksum']));
 const queries:string[]=[];
 const db={
  transaction:async(run:(client:{
   query:(sql:string,args?:readonly unknown[])=>Promise<{rows:any[]}>
  })=>Promise<void>)=>run({query:async(sql:string,args:readonly unknown[]=[])=>{
   queries.push(sql);
   if(sql.includes("SELECT to_regclass('md_tenants')"))return {rows:[{present:blank?null:'md_tenants'}]};
   if(sql==='SELECT version FROM md_system_migrations')
    return {rows:[...versions.keys()].map(version=>({version}))};
   if(sql.includes('SELECT checksum FROM md_system_migrations')){
    const checksum=versions.get(String(args[0]));
    return {rows:checksum?[{checksum}]:[]};
   }
   if(sql.includes('DELETE FROM md_system_migrations WHERE version = ANY')){
    for(const name of args[0] as string[])versions.delete(name);
   }
   if(sql.includes('INSERT INTO md_system_migrations')){
    const name=String(args[0]);
    if(!versions.has(name))versions.set(name,String(args[1]));
   }
   return {rows:[]};
  }})
 } as unknown as SqlPersistence;
 return {db,versions,queries};
}

test('fresh system schema bootstraps and both immutable baselines apply once',async()=>{
 const {db,versions,queries}=testDatabase([],true);
 const names=readdirSync(new URL('../../src/system-support/migrations/',import.meta.url))
  .filter(name=>name.endsWith('.sql')).sort();
 assert.deepEqual(names,baselineNames);
 await applySystemMigrations(db);
 assert.deepEqual([...versions.keys()],baselineNames);
 assert.ok(queries.some(query=>query.includes('CREATE TABLE IF NOT EXISTS md_tenants')));
 assert.ok(queries.some(query=>query.includes('CREATE TABLE IF NOT EXISTS md_named_credentials')));
 assert.ok(queries.some(query=>query.includes('md_flow_definitions_one_active_version')));
 assert.ok(queries.some(query=>query.includes('md_flow_execution_audit')));
 assert.equal(queries.filter(query=>query==='SELECT md_install_setup_audit()').length,1);
 const before=queries.filter(query=>query.includes('md_flow_definitions_one_active_version')).length;
 await applySystemMigrations(db);
 assert.equal(queries.filter(query=>query.includes('md_flow_definitions_one_active_version')).length,before);
 for(const name of baselineNames){
  const source=readFileSync(new URL('../../src/system-support/migrations/'+name,import.meta.url),'utf8');
  assert.equal(versions.get(name),createHash('sha256').update(source).digest('hex'));
 }
});

test('fully migrated legacy databases adopt the two baselines without replaying SQL',async()=>{
 assert.equal(retiredMigrationVersions.length,279);
 assert.equal(new Set(retiredMigrationVersions).size,279);
 const {db,versions,queries}=testDatabase([...retiredMigrationVersions]);
 await applySystemMigrations(db);
 assert.equal(versions.size,2);
 assert.deepEqual([...versions.keys()],baselineNames);
 for(const name of baselineNames)assert.ok(versions.has(name));
 assert.ok(!queries.some(query=>query.includes('CREATE TABLE IF NOT EXISTS md_named_credentials')));
 await applySystemMigrations(db);
 assert.equal(versions.size,2);
});

test('partially migrated legacy databases fail closed instead of damaging tenant data',async()=>{
 const {db}=testDatabase([retiredMigrationVersions[0]]);
 await assert.rejects(()=>applySystemMigrations(db),/Partial legacy SQL migration history/);
});

test('changed applied baseline checksum is rejected',async()=>{
 const {db}=testDatabase(['0001-initial-schema.sql']);
 await assert.rejects(()=>applySystemMigrations(db),/SQL system migration changed after application/);
});

test('Smart Cart consolidated SQL cannot upsert duplicate property keys',()=>{
 const sql=readRetiredMigration('20270130-smart-cart-ribbon.sql');
 const input=sql.match(/FROM \(VALUES([\s\S]*?)\) AS keys\(property_key\)/);
 assert.ok(input,'Smart Cart property inventory must remain inspectable');
 const keys=[...input[1].matchAll(/\('([A-Za-z][A-Za-z0-9_]*)'\)/g)].map(match=>match[1]);
 assert.ok(keys.length>=40);
 assert.equal(new Set(keys).size,keys.length);
 assert.equal(keys.filter(key=>key==='headerTextColor').length,1);
 assert.match(sql,/SELECT DISTINCT 'smart_cart', keys\.property_key/);
 assert.match(sql,/ON CONFLICT\(component_api,property_key\) DO UPDATE/);
});
