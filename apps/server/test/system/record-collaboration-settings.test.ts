import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import type {RbacEngine} from '../../src/system-files/rbac-engine.js';
import {RecordCollaborationService} from '../../src/system-support/record-collaboration-service.js';

const actor={tenant_id:'tenant-A',user_id:'user-A'};
const id='11111111-1111-4111-8111-111111111111';
const rbac={require:async()=>{},requireRecord:async()=>{}} as unknown as RbacEngine;
function service(settings:{allow_activities:boolean|null;allow_in_chatter:boolean|null}){
 const statements:string[]=[];
 const db={query:async(sql:string)=>{
  statements.push(sql);
  if(sql.includes('FROM md_records WHERE'))return {rows:[{id}],rowCount:1};
  if(sql.includes('LEFT JOIN md_object_manager_settings'))return {rows:[settings],rowCount:1};
  if(sql.includes('FROM md_record_activities'))return {rows:[],rowCount:0};
  if(sql.includes('FROM md_record_chatter_posts'))return {rows:[],rowCount:0};
  throw Error('Unexpected SQL: '+sql);
 }} as unknown as SqlPersistence;
 return {collaboration:new RecordCollaborationService(db,rbac),statements};
}

test('Object settings disable Activities on the server while allowing Chatter',async()=>{
 const {collaboration,statements}=service({allow_activities:false,allow_in_chatter:true});
 await assert.rejects(()=>collaboration.listActivities(actor,'Account',id),/Activities are disabled/);
 assert.deepEqual(await collaboration.listPosts(actor,'Account',id),{posts:[]});
 assert.equal(statements.filter(x=>x.includes('FROM md_record_activities')).length,0);
});

test('Object settings disable Chatter writes and reads independently of record RBAC',async()=>{
 const {collaboration,statements}=service({allow_activities:true,allow_in_chatter:false});
 assert.deepEqual(await collaboration.listActivities(actor,'Account',id),{activities:[]});
 await assert.rejects(()=>collaboration.addPost(actor,'Account',id,'test'),/Chatter is disabled/);
 await assert.rejects(()=>collaboration.listPosts(actor,'Account',id),/Chatter is disabled/);
 assert.ok(!statements.some(x=>x.includes('INSERT INTO md_record_chatter_posts')));
});

test('Unconfigured legacy settings retain existing collaboration access',async()=>{
 const {collaboration}=service({allow_activities:null,allow_in_chatter:null});
 assert.deepEqual(await collaboration.listActivities(actor,'Account',id),{activities:[]});
 assert.deepEqual(await collaboration.listPosts(actor,'Account',id),{posts:[]});
});
