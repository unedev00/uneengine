import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import {ObjectSchemaLifecycle} from '../../src/system-files/object-schema-lifecycle.js';

type Row={api_name:string;label:string;is_system:boolean;deleted_at:Date|null};
const tenant='tenant-a';
const objectName='Invoice__c';

function fixture(options:{isSystem?:boolean;deleted?:boolean;blocker?:string;
 revision?:number}={}){
 const current:Row={api_name:objectName,label:'Invoice',is_system:options.isSystem??false,
  deleted_at:options.deleted?new Date('2026-10-30T00:00:00Z'):null};
 const calls:Array<{sql:string;args:unknown[]}>= [];
 const query=async(sql:string,args:unknown[]=[])=>{
  calls.push({sql,args});
  // Advisory metadata locks are tenant+object keyed; ordinary reads and
  // mutations must include an explicit tenant predicate.
  if(sql.includes('pg_advisory_xact_lock')){
   assert.deepEqual(args,[tenant+':'+objectName]);
   return {rows:[],rowCount:1};
  }
  assert.match(sql,/tenant_id=\$1/);
  assert.equal(args[0],tenant);
  if(sql.includes('SELECT count(*)')){
   const affected=options.blocker&&sql.includes(options.blocker)?1:0;
   return {rows:[{count:affected}],rowCount:1};
  }
  if(sql.includes('pg_advisory_xact_lock'))return {rows:[],rowCount:1};
  if(sql.includes('md_object_lifecycle_page_states'))return {rows:[],rowCount:1};
  if(sql.includes('md_object_layout_versions'))
   return {rows:[{revision:options.revision??3}],rowCount:1};
  if(sql.includes('UPDATE md_object_definitions')){
   current.deleted_at=sql.includes('SET deleted_at=now()')?new Date('2026-10-30T00:00:00Z'):null;
   return {rows:[],rowCount:1};
  }
  if(sql.includes('SELECT api_name,label,deleted_at'))
   return {rows:current.deleted_at?[{...current}]:[],rowCount:current.deleted_at?1:0};
  if(sql.includes('SELECT api_name,label,is_system,deleted_at'))
   return {rows:[{...current}],rowCount:1};
  throw new Error('Unexpected query: '+sql);
 };
 const db={query,transaction:async <T>(run:(client:unknown)=>Promise<T>):Promise<T>=>run({query})} as unknown as SqlPersistence;
 return {service:new ObjectSchemaLifecycle(db),calls,current};
}

test('2A: custom object is soft deleted, hidden and restored without dropping schema',async()=>{
 const {service,calls,current}=fixture();
 assert.deepEqual((await service.impact(tenant,objectName)).blockers,[]);
 assert.deepEqual(await service.delete(tenant,objectName,3),{apiName:objectName,deleted:true});
 assert.ok(current.deleted_at);
 assert.deepEqual((await service.listDeleted(tenant)).map(x=>x.apiName),[objectName]);
 assert.deepEqual(await service.restore(tenant,objectName),{apiName:objectName,restored:true});
 assert.equal(current.deleted_at,null);
 assert.deepEqual(await service.listDeleted(tenant),[]);
 assert.equal(calls.some(call=>/DELETE FROM md_object_definitions|DROP TABLE|TRUNCATE/i.test(call.sql)),false);
});

test('2A: cross-object dependencies block deletion while records are preserved',async()=>{
 for(const table of ['md_field_definitions','md_lightning_page_details',
  'md_tenant_app_navigation','md_flow_trigger_subscriptions',
  'md_metadata_package_components','md_object_actions','md_app_package_resources']){
  const {service,current}=fixture({blocker:table});
  const impact=await service.impact(tenant,objectName);
  assert.equal(impact.blockers.length,1,table);
  await assert.rejects(()=>service.delete(tenant,objectName,3),/Object deletion blocked/);
  assert.equal(current.deleted_at,null,table);
 }
});

test('2A: an object with records may be archived and restored without deleting its data',async()=>{
 const {service,calls,current}=fixture({blocker:'md_records'});
 const impact=await service.impact(tenant,objectName);
 assert.equal(impact.recordCount,1);
 assert.deepEqual(impact.blockers,[]);
 await service.delete(tenant,objectName,3);
 assert.ok(current.deleted_at);
 assert.equal(calls.some(item=>/DELETE FROM md_records|TRUNCATE md_records/.test(item.sql)),false);
 await service.restore(tenant,objectName);
 assert.equal(current.deleted_at,null);
});

test('2A: system objects and stale revision cannot be deleted',async()=>{
 await assert.rejects(()=>fixture({isSystem:true}).service.delete(tenant,objectName,3),
  /Standard objects/);
 await assert.rejects(()=>fixture({revision:4}).service.delete(tenant,objectName,3),
  /revision conflict/);
 await assert.rejects(()=>fixture().service.delete(tenant,objectName,-1),
  /Invalid object revision/);
});

test('2A: restore only accepts a previously deleted custom object',async()=>{
 await assert.rejects(()=>fixture().service.restore(tenant,objectName),/Deleted object not found/);
 await assert.rejects(()=>fixture({isSystem:true,deleted:true}).service.restore(tenant,objectName),
  /Standard objects/);
});

test('2A: deleted objects remain reserved by stable tenant and API identity',async()=>{
 const {service,calls}=fixture({deleted:true});
 const rows=await service.listDeleted(tenant);
 assert.equal(rows[0].apiName,objectName);
 assert.deepEqual(calls[0].args,[tenant]);
 await assert.rejects(()=>service.delete(tenant,objectName,3),/Object not found/);
});
