import assert from 'node:assert/strict';
import {test} from 'node:test';
import {restoreBusinessProcessRevision,snapshotBusinessProcessRevision}
 from '../../src/system-support/business-process-history.js';

const selection={tenantId:'tenant-a',objectApi:'Opportunity',processApi:'Sales',actorId:'user-a'};
const makeClient=(update=true)=>{
 const statements:Array<{sql:string;values:unknown[]}>= [];
 const client={query:async(sql:string,values:unknown[]=[])=>{
  statements.push({sql,values});
  if(sql.includes('FROM md_object_business_process_history\n'))
   return {rows:[{revision:1,label:'Older',status_field:'Stage',active:true}]};
  if(sql.includes('FROM md_object_business_process_history_values'))
   return {rows:[{value_text:'Prospect'},{value_text:'Won'}]};
  if(sql.includes('FROM md_field_definitions'))return {rows:[{data_type:'picklist'}]};
  if(sql.includes('FROM md_field_picklist_values'))return {rows:[{value:'Prospect'},{value:'Won'}]};
  if(sql.includes('UPDATE md_object_business_processes'))
   return {rows:update?[{revision:4}]:[],rowCount:update?1:0};
  if(sql.includes('INSERT INTO md_object_business_process_history\n'))
   return {rows:[{revision:4}],rowCount:1};
  return {rows:[],rowCount:1};
 }} as never;
 return {client,statements};
};
test('record type business-process history snapshot saves a relational revision',async()=>{
 const {client,statements}=makeClient();
 await snapshotBusinessProcessRevision(client,selection);
 assert.equal(statements.length,2);
 assert.match(statements[0].sql,/RETURNING revision/);
 assert.deepEqual(statements[0].values,['tenant-a','Opportunity','Sales','user-a']);
 assert.match(statements[1].sql,/md_object_business_process_history_values/);
});
test('restore only changes process definition and rejects stale revision',async()=>{
 const {client,statements}=makeClient();
 const next=await restoreBusinessProcessRevision(client,selection,1,3);
 assert.equal(next,4);
 assert.equal(statements.filter(x=>x.sql.includes('INSERT INTO md_object_business_process_values')).length,2);
 assert.equal(statements.some(x=>x.sql.includes('UPDATE md_object_record_types')),false);
 const stale=makeClient(false);
 await assert.rejects(()=>restoreBusinessProcessRevision(stale.client,selection,1,3),
  /revision conflict/);
 assert.equal(stale.statements.some(x=>x.sql.includes('DELETE FROM md_object_business_process_values')),false);
});
test('restore rejects invalid versions before database access',async()=>{
 const {client,statements}=makeClient();
 await assert.rejects(()=>restoreBusinessProcessRevision(client,selection,0,3),/Invalid/);
 await assert.rejects(()=>restoreBusinessProcessRevision(client,selection,1,0),/Invalid/);
 assert.equal(statements.length,0);
});
