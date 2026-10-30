import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const url=process.env.METADRIVE_SQL_TEST_DATABASE_URL;
if(!url||!url.includes('/metadrive_2b'))throw new Error('2B smoke requires disposable metadrive_2b database');
const built=new URL('../dist-system/system-files/',import.meta.url);
const support=new URL('../dist-system/system-support/',import.meta.url);
const [{SqlPersistence},{applySystemMigrations},{ObjectDefinitionService}]=await Promise.all([
 import(new URL('sql-persistence.js',built).href),
 import(new URL('system-migrations.js',support).href),
 import(new URL('object-definition.js',built).href)
]);
const db=new SqlPersistence(url);
try{
 await db.query(readFileSync(fileURLToPath(new URL('../src/system-files/schema.sql',import.meta.url)),'utf8'));
 await applySystemMigrations(db);
 const defs=new ObjectDefinitionService(db);
 const tenants=[];
 for(const slug of ['field-primary','field-secondary']){
  const r=await db.query('INSERT INTO md_tenants(slug,name) VALUES($1,$1) RETURNING id',[slug]);
  tenants.push(r.rows[0].id);
 }
 const [primary,secondary]=tenants;
 const fields=[
  {apiName:'Name',label:'Name',dataType:'Text(80)',required:true},
  {apiName:'ExtKey',label:'External Key',dataType:'Text(80)',externalId:true},
  {apiName:'UniqueCode',label:'Unique Code',dataType:'Text(80)',unique:true},
  {apiName:'Amount',label:'Amount',dataType:'Currency(12,2)',defaultValue:12.34},
  {apiName:'IsActive',label:'Active',dataType:'Checkbox',defaultValue:true},
  {apiName:'Effective',label:'Effective',dataType:'Date',defaultValue:'2024-02-29'},
  {apiName:'Choice',label:'Choice',dataType:'Picklist',picklistValues:['A','B'],defaultValue:'A'}
 ];
 const created=await defs.create(primary,'Phase2B__c','Phase 2B',fields);
 assert.equal(created.fields.length,fields.length);
 await defs.create(secondary,'Phase2B__c','Other Tenant Phase 2B',fields);
 assert.deepEqual(created.fields.filter(f=>f.externalId).map(f=>[f.apiName,f.unique]),[['ExtKey',false]]);
 assert.equal(created.fields.find(f=>f.apiName==='Amount').defaultValue,12.34);
 const stored=await db.query("SELECT api_name,is_unique,external_id FROM md_field_definitions WHERE tenant_id=$1 AND object_api='Phase2B__c' AND api_name IN ('ExtKey','UniqueCode') ORDER BY api_name",[primary]);
 assert.deepEqual(stored.rows.map(f=>[f.api_name,f.is_unique,f.external_id]),[['ExtKey',false,true],['UniqueCode',true,false]]);
 const insert=async(tenant,name,ext,code)=>db.transaction(async client=>{
  const record=await client.query("INSERT INTO md_records(tenant_id,object_api) VALUES($1,'Phase2B__c') RETURNING id",[tenant]);
  for(const [fieldApi,value,isUnique] of [['Name',name,false],['ExtKey',ext,false],['UniqueCode',code,true]]){
   await client.query("INSERT INTO md_record_values (tenant_id,record_id,object_api,field_api,value_text,is_unique,case_sensitive) VALUES($1,$2,'Phase2B__c',$3,$4,$5,false)",
    [tenant,record.rows[0].id,fieldApi,value,isUnique]);
  }
  return record.rows[0].id;
 });
 await insert(primary,'A','shared-key','one');
 await insert(primary,'B','shared-key','two');
 await insert(secondary,'C','shared-key','one');
 await assert.rejects(()=>insert(primary,'D','some-key','ONE'),/duplicate key|unique constraint/i);
 const count=await db.query("SELECT count(*)::int AS total FROM md_records WHERE tenant_id=$1 AND object_api='Phase2B__c'",[primary]);
 assert.equal(count.rows[0].total,2,'Failed unique insert must roll back the entire record');
 for(const [apiName,invalid] of [
  ['BadDate__c',{apiName:'Invalid',dataType:'Date',defaultValue:'2025-02-29'}],
  ['BadEmail__c',{apiName:'Invalid',dataType:'Email',defaultValue:'not-an-email'}],
  ['BadType__c',{apiName:'Invalid',dataType:'Long Text Area',unique:true}],
  ['BadExternal__c',{apiName:'Invalid',dataType:'Checkbox',externalId:true}]
 ]){
  await assert.rejects(()=>defs.create(primary,apiName,apiName,[invalid]),/Invalid|Unique|External ID|date/i);
  const missing=await db.query('SELECT 1 FROM md_object_definitions WHERE tenant_id=$1 AND api_name=$2',[primary,apiName]);
  assert.equal(missing.rowCount,0,'Invalid field must not partially create an object');
 }
 console.info('2B SQL: defaults, tenant isolation, external IDs, unique storage and rollback passed');
}finally{await db.close();}
