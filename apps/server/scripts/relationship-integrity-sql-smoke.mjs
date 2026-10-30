import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const url=process.env.METADRIVE_SQL_TEST_DATABASE_URL;
if(!url||!url.includes('/metadrive_2c'))
 throw new Error('Phase 2C requires a disposable metadrive_2c database');
const built=new URL('../dist-system/system-files/',import.meta.url);
const support=new URL('../dist-system/system-support/',import.meta.url);
const relationships=new URL('../dist-system/relationship-engine/',import.meta.url);
const [{SqlPersistence},{applySystemMigrations},{ObjectDefinitionService},
 {RecordEngine},{RbacEngine},{listRelationshipDefinitions}]=await Promise.all([
 import(new URL('sql-persistence.js',built).href),
 import(new URL('system-migrations.js',support).href),
 import(new URL('object-definition.js',built).href),
 import(new URL('record-engine.js',built).href),
 import(new URL('rbac-engine.js',built).href),
 import(new URL('RelationshipRegistry.js',relationships).href)
]);
const db=new SqlPersistence(url);
try{
 await db.query(readFileSync(fileURLToPath(new URL('../src/system-files/schema.sql',import.meta.url)),'utf8'));
 await applySystemMigrations(db);
 const defs=new ObjectDefinitionService(db);
 const tenants=[];
 for(const slug of ['phase-2c-main','phase-2c-isolated']){
  const created=await db.query('INSERT INTO md_tenants(slug,name) VALUES($1,$1) RETURNING id',[slug]);
  tenants.push(created.rows[0].id);
 }
 const [tenant,otherTenant]=tenants;
 const principal=await db.query("INSERT INTO md_users(tenant_id,email,password_hash) VALUES($1,'phase2c@example.invalid','fixture') RETURNING id",[tenant]);
 const user=principal.rows[0].id;
 const access=await db.query("INSERT INTO md_permission_sets(tenant_id,api_name) VALUES($1,'Phase2C') RETURNING id",[tenant]);
 await db.query('INSERT INTO md_permission_assignments(tenant_id,user_id,permission_set_id) VALUES($1,$2,$3)',[tenant,user,access.rows[0].id]);
 await db.query("INSERT INTO md_permission_rules(tenant_id,permission_set_id,resource,action,effect) VALUES($1,$2,'*','*','allow')",[tenant,access.rows[0].id]);
 const rb=new RbacEngine(db),records=new RecordEngine(db,rb);
 const name=[{apiName:'Name',label:'Name',dataType:'Text(80)',required:true}];
 for(const t of [tenant,otherTenant])for(const nameOfObject of ['PhaseParent__c','PhaseChild__c','PhaseGrand__c']){
  await defs.create(t,nameOfObject,nameOfObject.replace('__c',''),name);
 }
 const lookup=(target,name,behavior='Clear')=>({
   relationship:{type:'Lookup',targetObject:target,relationshipName:name,
    childRelationshipName:name+'Records',deleteBehavior:behavior}
 });
 const master=(target,name,allowReparenting=false)=>({
   relationship:{type:'Master-Detail',targetObject:target,relationshipName:name,
    childRelationshipName:name+'Records',allowReparenting}
 });
 await defs.addField(tenant,'PhaseParent__c','PeerId','Lookup(PhaseParent__c)',undefined,'Peer',
  lookup('PhaseParent__c','Peer'));
 await defs.addField(tenant,'PhaseChild__c','ParentId','Master-Detail(PhaseParent__c)',undefined,'Parent',
  master('PhaseParent__c','PrimaryParent'));
 await defs.addField(tenant,'PhaseChild__c','SecondaryParentId','Lookup(PhaseParent__c)',undefined,
  'Secondary Parent',lookup('PhaseParent__c','SecondaryParent'));
 await defs.addField(tenant,'PhaseChild__c','ReviewParentId','Lookup(PhaseParent__c)',undefined,
  'Review Parent',lookup('PhaseParent__c','ReviewParent'));
 await defs.addField(tenant,'PhaseGrand__c','ChildId','Master-Detail(PhaseChild__c)',undefined,'Child',
  master('PhaseChild__c','PrimaryChild',true));
 await defs.addField(tenant,'PhaseGrand__c','BlockingParentId','Lookup(PhaseParent__c)',undefined,
  'Blocking Parent',lookup('PhaseParent__c','BlockingParent','Restrict'));
 const edges=await listRelationshipDefinitions(db,tenant);
 assert.equal(edges.filter(e=>e.sourceObject==='PhaseChild__c'&&e.targetObject==='PhaseParent__c').length,3);
 assert.ok(edges.some(e=>e.fieldApiName==='ParentId'&&e.relationshipType==='Master-Detail'
   &&e.childRelationshipName==='PrimaryParentRecords'));
 assert.ok(edges.some(e=>e.fieldApiName==='BlockingParentId'&&e.deleteBehavior==='Restrict'));
 assert.equal((await listRelationshipDefinitions(db,otherTenant)).length,0,'No tenant metadata leakage');
 assert.equal((await listRelationshipDefinitions(db,tenant,'PhaseParent__c')).length,5);
 await assert.rejects(()=>defs.addField(tenant,'PhaseParent__c','BadMasterId',
   'Master-Detail(PhaseGrand__c)'),/cycle/);
 const p1=await records.create(tenant,user,'PhaseParent__c',{Name:'Parent A'});
 const p2=await records.create(tenant,user,'PhaseParent__c',{Name:'Parent B'});
 const foreign=await db.query("INSERT INTO md_records(tenant_id,object_api) VALUES($1,'PhaseParent__c') RETURNING id",[otherTenant]);
 await assert.rejects(()=>records.create(tenant,user,'PhaseChild__c',
   {Name:'Foreign',ParentId:foreign.rows[0].id}),/relationship target/);
 await records.update(tenant,user,'PhaseParent__c',p1,{PeerId:p2});
 await records.update(tenant,user,'PhaseParent__c',p2,{PeerId:p1});
 const c1=await records.create(tenant,user,'PhaseChild__c',
  {Name:'Child A',ParentId:p1,SecondaryParentId:p2,ReviewParentId:p1});
 const c2=await records.create(tenant,user,'PhaseChild__c',
  {Name:'Child B',ParentId:p2});
 const g1=await records.create(tenant,user,'PhaseGrand__c',
  {Name:'Grand',ChildId:c1,BlockingParentId:p1}); 
 // Required lookup filters reject invalid targets at the shared Record Engine;
 // optional filters are advisory and must not block otherwise valid writes.
 const {persistObjectLookupFilters}=await import(new URL('object-manager-lookup-filters.js',built).href);
 await db.transaction(async client=>persistObjectLookupFilters(client,tenant,'PhaseChild__c',{
  relatedLookupFilters:[
   {id:'review-parent-check',fieldApiName:'ReviewParentId',relatedObject:'PhaseParent__c',
    relatedFieldApiName:'Name',operator:'Equals',value:'Parent A',required:true},
   {id:'secondary-parent-hint',fieldApiName:'SecondaryParentId',relatedObject:'PhaseParent__c',
    relatedFieldApiName:'Name',operator:'Equals',value:'Never Matching',required:false}
  ],
  relatedLookupFilterLogic:{ReviewParentId:'All'}
 }));
 await assert.rejects(()=>records.update(tenant,user,'PhaseChild__c',c1,
  {ReviewParentId:p2}),/Invalid required lookup filter/);
 await records.update(tenant,user,'PhaseChild__c',c1,{SecondaryParentId:p2});

 // SQL must never admit a valid-tenant ID from the wrong target object.
 await assert.rejects(()=>db.query("UPDATE md_record_values SET reference_record_id=$4 WHERE tenant_id=$1 AND record_id=$2 AND field_api=$3",
  [tenant,c1,'SecondaryParentId',c1]),/Invalid relationship target/);
 await assert.rejects(()=>records.update(tenant,user,'PhaseChild__c',c1,{ParentId:p2}),/does not allow reparenting/);
 await records.update(tenant,user,'PhaseGrand__c',g1,{ChildId:c2});
 await records.update(tenant,user,'PhaseGrand__c',g1,{ChildId:c1});
 const primary=await records.list(tenant,user,'PhaseChild__c',50,0,{relatedField:'ParentId',relatedId:p1});
 const secondary=await records.list(tenant,user,'PhaseChild__c',50,0,{relatedField:'SecondaryParentId',relatedId:p2});
 assert.ok(primary.records.some(row=>row.Id===c1),'Inverse master-detail query omitted the child');
 assert.ok(secondary.records.some(row=>row.Id===c1),'Second lookup query conflated relationship fields');
 await assert.rejects(()=>records.remove(tenant,user,'PhaseParent__c',p1),/restricted/);
 assert.equal((await db.query('SELECT is_deleted FROM md_records WHERE tenant_id=$1 AND id=$2',[tenant,p1])).rows[0].is_deleted,false);
 await records.update(tenant,user,'PhaseGrand__c',g1,{BlockingParentId:null});
 await records.remove(tenant,user,'PhaseParent__c',p1);
 const gone=await db.query('SELECT id,is_deleted FROM md_records WHERE tenant_id=$1 AND id=ANY($2::uuid[])',
  [tenant,[p1,c1,g1]]);
 assert.equal(gone.rows.length,3);
 assert.ok(gone.rows.every(row=>row.is_deleted),'Master-detail cascade must reach grandchild');
 assert.equal((await db.query('SELECT is_deleted FROM md_records WHERE tenant_id=$1 AND id=$2',[tenant,p2])).rows[0].is_deleted,false);
 assert.equal((await db.query('SELECT is_deleted FROM md_records WHERE tenant_id=$1 AND id=$2',[tenant,c2])).rows[0].is_deleted,false);
 await assert.rejects(()=>db.query("INSERT INTO md_record_values(tenant_id,record_id,object_api,field_api,reference_record_id) VALUES($1,$2,'PhaseChild__c','ReviewParentId',$3)",
  [tenant,c2,p1]),/Invalid relationship target/);

 // A record author can have Child create rights but must not reference a parent
 // that their record-sharing policy forbids them to read.
 const restrictedUser=(await db.query("INSERT INTO md_users(tenant_id,email,password_hash) VALUES($1,'blocked@example.invalid','fixture') RETURNING id",[tenant])).rows[0].id;
 const restrictedSet=(await db.query("INSERT INTO md_permission_sets(tenant_id,api_name) VALUES($1,'BlockedParent') RETURNING id",[tenant])).rows[0].id;
 await db.query("INSERT INTO md_permission_assignments(tenant_id,user_id,permission_set_id) VALUES($1,$2,$3)",[tenant,restrictedUser,restrictedSet]);
 await db.query("INSERT INTO md_permission_rules(tenant_id,permission_set_id,resource,action,effect) VALUES($1,$2,'*','*','allow'),($1,$2,'PhaseParent__c','read','deny')",[tenant,restrictedSet]);
 await assert.rejects(()=>records.create(tenant,restrictedUser,'PhaseChild__c',
  {Name:'Hidden parent attempt',ParentId:p2}),/Invalid relationship target/);

 console.info('Phase 2C SQL: 3-level cascade, distinct lookup edges, self-reference, reparenting, Restrict, tenant isolation, discovery passed');
}finally{await db.close();}
