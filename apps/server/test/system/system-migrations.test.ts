import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {test} from 'node:test';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import {applySystemMigrations} from '../../src/system-support/system-migrations.js';

test('system migrations are additive, recorded, and idempotent',async()=>{
 const versions=new Map<string,string>();
 const queries:string[]=[];
 const db={
  transaction:async(run:(client:{query:(sql:string,args?:readonly unknown[])=>Promise<{rows:Array<{checksum:string}>}>})=>Promise<void>)=>
   run({query:async(sql:string,args:readonly unknown[]=[])=>{
    queries.push(sql);
    if(sql.includes('SELECT checksum FROM md_system_migrations')){
     const checksum=versions.get(String(args[0]));
     return {rows:checksum?[{checksum}]:[]};
    }
    if(sql.includes('INSERT INTO md_system_migrations')){
     versions.set(String(args[0]),String(args[1]));
    }
    return {rows:[]};
   }})
 } as unknown as SqlPersistence;
 await applySystemMigrations(db);
 const numberOfDDL=queries.filter(q=>q.includes('CREATE TABLE IF NOT EXISTS md_named_credentials')).length;
 assert.ok(queries.some(q=>q.includes('CREATE TABLE IF NOT EXISTS md_tenant_settings')));
 const expected=readdirSync(new URL('../../src/system-support/migrations/',import.meta.url)).filter(name=>/^(?:\d{3}|\d{8})-[a-z0-9-]+\.sql$/.test(name)).length;
 assert.equal(versions.size,expected);
 assert.ok(versions.has('001-metadata-bindings.sql'),'legacy metadata bindings migration is tracked');
 assert.ok(queries.some(query=>query.includes('md_flow_definitions_one_active_version')),
  'the active Flow version constraint is applied as a system migration');
 assert.ok(queries.some(query=>query.includes('md_flow_execution_audit')),
  'explicit System-context execution has a durable audit table');
 await applySystemMigrations(db);
 assert.equal(queries.filter(q=>q.includes('CREATE TABLE IF NOT EXISTS md_named_credentials')).length,numberOfDDL);
 assert.equal(versions.size,expected);
});


test('Smart Cart migration cannot upsert the same property twice during API startup',()=>{
 const sql=readFileSync(new URL(
  '../../src/system-support/migrations/20270130-smart-cart-ribbon.sql',import.meta.url
 ),'utf8');
 const input=sql.match(/FROM \(VALUES([\s\S]*?)\) AS keys\(property_key\)/);
 assert.ok(input,'Smart Cart key inventory must remain inspectable');
 const keys=[...input[1].matchAll(/\('([A-Za-z][A-Za-z0-9_]*)'\)/g)].map(match=>match[1]);
 assert.ok(keys.length>=40,'Expected Smart Cart property coverage');
 assert.equal(new Set(keys).size,keys.length,
  'Duplicate ribbon keys can crash PostgreSQL ON CONFLICT DO UPDATE with SQLSTATE 21000');
 assert.equal(keys.filter(key=>key==='headerTextColor').length,1);
 assert.match(sql,/SELECT DISTINCT 'smart_cart', keys\.property_key/);
 assert.match(sql,/ON CONFLICT\(component_api,property_key\) DO UPDATE/);
});
