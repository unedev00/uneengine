import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// A disposable database provides an independent SQL-to-API-service check.
// Never run this smoke test against a production or shared database.
const url=process.env.METADRIVE_SQL_TEST_DATABASE_URL;
if(!url||!url.includes('/metadrive_2a'))
 throw new Error('Object lifecycle SQL smoke requires a disposable metadrive_2a database');
const built=new URL('../dist-system/system-files/',import.meta.url);
const support=new URL('../dist-system/system-support/',import.meta.url);
const [{SqlPersistence},{applySystemMigrations},{ObjectDefinitionService},{ObjectSchemaLifecycle}]=await Promise.all([
 import(new URL('sql-persistence.js',built).href),
 import(new URL('system-migrations.js',support).href),
 import(new URL('object-definition.js',built).href),
 import(new URL('object-schema-lifecycle.js',built).href)
]);
const db=new SqlPersistence(url);
try{
 const schema=readFileSync(fileURLToPath(new URL('../src/system-files/schema.sql',import.meta.url)),'utf8');
 await db.query(schema);
 await applySystemMigrations(db);
 const defs=new ObjectDefinitionService(db);
 const lifecycle=new ObjectSchemaLifecycle(db);
 const tenants=[];
 for(const slug of ['phase-2a-primary','phase-2a-secondary']){
  const result=await db.query('INSERT INTO md_tenants(slug,name) VALUES($1,$2) RETURNING id',[slug,slug]);
  tenants.push(result.rows[0].id);
 }
 const [primary,secondary]=tenants;
 // A user with full permissions must still lose record access while the object
 // is in the object recycle bin, and regain access after object restoration.
 const actor=(await db.query("INSERT INTO md_users(tenant_id,email,password_hash) VALUES($1,'object-lifecycle@example.invalid','fixture') RETURNING id",[primary])).rows[0].id;
 const set=(await db.query("INSERT INTO md_permission_sets(tenant_id,api_name) VALUES($1,'ObjectLifecycle') RETURNING id",[primary])).rows[0].id;
 await db.query("INSERT INTO md_permission_assignments(tenant_id,user_id,permission_set_id) VALUES($1,$2,$3)",[primary,actor,set]);
 await db.query("INSERT INTO md_permission_rules(tenant_id,permission_set_id,resource,action,effect) VALUES($1,$2,'*','*','allow')",[primary,set]);
 const fields=[{apiName:'Name',label:'Name',dataType:'Text(80)',required:true}];
 for(const name of ['Milestone__c','Invoice__c']){
  const object=await defs.create(primary,name,name.replace('__c',''),fields);
  assert.equal(object.fields.length,1);
 }
 await defs.create(secondary,'Invoice__c','Other Tenant Invoice',fields);
 // Rename label and keep stable API name, ID and layout using the supported revision contract.
 const invoice=await defs.get(primary,'Invoice__c');
 const modified=await defs.replaceLayouts(primary,'Invoice__c',{
  ...invoice,label:'Customer Invoice'
 },invoice.revision??0);
 assert.equal(modified.label,'Customer Invoice');
 assert.equal(modified.apiName,'Invoice__c');
 assert.equal(modified.id,invoice.id);
 assert.equal(modified.fields[0].apiName,'Name');
 // Recoverable object deletion retains both live and recycled records.
 const record=await db.query("INSERT INTO md_records(tenant_id,object_api) VALUES($1,'Milestone__c') RETURNING id",[primary]);
 assert.equal((await lifecycle.impact(primary,'Milestone__c')).recordCount,1);
 // Declarative cross-object relationship on a different object blocks deletion.
 await db.query(`INSERT INTO md_field_definitions
  (tenant_id,object_api,api_name,label,data_type,related_object,relationship_type)
  VALUES($1,'Invoice__c','MilestoneRef','Milestone Reference','reference','Milestone__c','Lookup')`,[primary]);
 const impact=await lifecycle.impact(primary,'Milestone__c');
 assert.ok(impact.blockers.some(x=>x.kind==='Inbound relationships'));
 await assert.rejects(()=>lifecycle.delete(primary,'Milestone__c',0),/Inbound relationships/);
 await db.query(`DELETE FROM md_field_definitions WHERE tenant_id=$1
  AND object_api='Invoice__c' AND api_name='MilestoneRef'`,[primary]);
 // Recoverable deletion preserves all definitions and reserves the API name.
 const deleted=await lifecycle.delete(primary,'Milestone__c',0);
 assert.equal(deleted.deleted,true);
 const invisible=await db.query("SELECT md_record_access($1,$2,$3,'read') AS visible",
  [primary,actor,record.rows[0].id]);
 assert.equal(invisible.rows[0].visible,false,'Deleted object must hide every preserved record');
 await assert.rejects(()=>defs.get(primary,'Milestone__c'),/Object not found/);
 assert.equal((await lifecycle.listDeleted(primary)).length,1);
 await assert.rejects(()=>defs.create(primary,'Milestone__c','Duplicate',fields),/API Name already exists|already exists/);
 await assert.rejects(()=>db.query("INSERT INTO md_records(tenant_id,object_api) VALUES($1,'Milestone__c')",[primary]),
  /Object is unavailable/);
 await lifecycle.restore(primary,'Milestone__c');
 assert.equal((await defs.get(primary,'Milestone__c')).fields[0].apiName,'Name');
 const preserved=await db.query('SELECT id,is_deleted FROM md_records WHERE tenant_id=$1 AND id=$2',
  [primary,record.rows[0].id]);
 assert.equal(preserved.rows[0]?.id,record.rows[0].id,
  'Restore must recover the original record identity');
 assert.equal(preserved.rows[0]?.is_deleted,false);
 const restoredVisibility=await db.query("SELECT md_record_access($1,$2,$3,'read') AS visible",
  [primary,actor,record.rows[0].id]);
 assert.equal(restoredVisibility.rows[0].visible,true,'Restore must recover record visibility');
 assert.equal((await lifecycle.listDeleted(primary)).length,0);
 // A separate tenant can independently delete/recover the same API name.
 const first=await lifecycle.delete(primary,'Invoice__c',1);
 assert.equal(first.deleted,true);
 assert.equal((await defs.get(secondary,'Invoice__c')).label,'Other Tenant Invoice');
 await lifecycle.restore(primary,'Invoice__c');
 await assert.rejects(()=>lifecycle.impact(secondary,'Milestone__c'),/Object not found/);
 assert.equal((await defs.get(primary,'Invoice__c')).label,'Customer Invoice');
 console.info('Phase 2A disposable SQL lifecycle smoke: passed (2 objects, 2 tenants, record preservation/relationship blocks, label revision, restore)');
}finally{await db.close();}
