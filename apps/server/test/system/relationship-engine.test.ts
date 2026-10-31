import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {assertDeletionAllowed,shouldCascadeReference} from '../../src/relationship-engine/ReferentialIntegrityGuard.js';
import {enforceMasterDetailReparenting} from '../../src/relationship-engine/MasterDetailManager.js';
import {assertLookupTargetExists} from '../../src/relationship-engine/LookupResolver.js';
import {queryRelatedRecords} from '../../src/relationship-engine/RelatedRecordsQuery.js';

test('required and restricted lookup references stop deletion',()=>{
 assert.throws(()=>assertDeletionAllowed([{relationship_type:'Lookup',delete_behavior:'Restrict',required:false}]),/restricted/);
 assert.throws(()=>assertDeletionAllowed([{relationship_type:'Lookup',delete_behavior:null,required:true}]),/restricted/);
 assert.doesNotThrow(()=>assertDeletionAllowed([{relationship_type:'Master-Detail',delete_behavior:null,required:true}]));
});
test('master-detail reparenting rules retain shared Field Engine behavior',()=>{
 assert.throws(()=>enforceMasterDetailReparenting('old','new','Parent',false),/does not allow reparenting/);
 assert.doesNotThrow(()=>enforceMasterDetailReparenting('old','new','Parent',true));
});
test('lookup resolver scopes SQL to caller tenant and rejects missing targets',async()=>{
 const queries:Array<{sql:string;params:unknown[]}>=[];const fake={query:async(sql:string,params:unknown[])=>{queries.push({sql,params});return {rowCount:0};}};
 await assert.rejects(()=>assertLookupTargetExists(fake as never,'tenant-a','Account','record-a','Parent'),/Invalid relationship target/);
 assert.ok(queries[0].sql.includes('tenant_id=$1'));
 assert.deepEqual(queries[0].params,['tenant-a','Account','record-a']);
 await assert.rejects(()=>assertLookupTargetExists(fake as never,'tenant-a','Account','record-a','Parent','actor-a'),
  /Invalid relationship target/);
 assert.match(queries[1].sql,/md_record_access\(\$1,\$4,id,'read'\)/);
 assert.deepEqual(queries[1].params,['tenant-a','Account','record-a','actor-a']);
});
test('related record queries delegate to the RBAC-enforced shared Record Engine',async()=>{
 const calls:unknown[][]=[];
 const fake={list:async(...args:unknown[])=>{calls.push(args);return {records:[{Id:'child-a'}]};}};
 const result=await queryRelatedRecords(fake as never,'tenant-a','user-a','Line','Parent','record-a');
 assert.deepEqual(result,{records:[{Id:'child-a'}]});
 assert.deepEqual(calls[0],['tenant-a','user-a','Line',50,0,{relatedField:'Parent',relatedId:'record-a'}]);
});

test('lookup cascade is explicit and still forbids restrictive or unsafe deletions',()=>{
 const cascade={relationship_type:'Lookup',delete_behavior:'Cascade',required:true};
 const clear={relationship_type:'Lookup',delete_behavior:'Clear',required:false};
 assert.doesNotThrow(()=>assertDeletionAllowed([cascade,clear]));
 assert.equal(shouldCascadeReference(cascade),true);
 assert.equal(shouldCascadeReference(clear),false);
 assert.equal(shouldCascadeReference({relationship_type:'Master-Detail',delete_behavior:null,required:true}),true);
 assert.throws(()=>assertDeletionAllowed([{relationship_type:'Lookup',delete_behavior:'Restrict',required:false}]),
  /restricted/);
 assert.throws(()=>assertDeletionAllowed([{relationship_type:'Lookup',delete_behavior:'Unknown',required:false}]),
  /restricted/);
 assert.throws(()=>assertDeletionAllowed([{relationship_type:'Lookup',delete_behavior:null,required:true}]),
  /restricted/);
});


test('already-applied relationship SQL is immutable and row lock is an additive migration',()=>{
 const immutable=readFileSync(new URL('../../src/system-support/migrations/20270120-relationship-target-integrity.sql',import.meta.url),'utf8');
 const forward=readFileSync(new URL('../../src/system-support/migrations/20270209-relationship-target-row-lock.sql',import.meta.url),'utf8');
 const gitHash=createHash('sha1').update('blob '+Buffer.byteLength(immutable)+'\0'+immutable).digest('hex');
 assert.equal(gitHash,'3120c886437d0aa2a4d42a038e9daf2d9905549d','previously applied migration was modified; use a new migration');
 assert.doesNotMatch(immutable,/FOR SHARE/);
 assert.match(forward,/CREATE OR REPLACE FUNCTION md_validate_relationship_record_target\(\)/);
 assert.match(forward,/FOR SHARE/);
 assert.doesNotMatch(forward,/UPDATE md_system_migrations|DELETE FROM md_system_migrations|DROP TRIGGER/);
});
