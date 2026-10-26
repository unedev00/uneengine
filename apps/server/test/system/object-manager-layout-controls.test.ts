import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {PoolClient} from 'pg';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import {loadObjectLayoutControls,persistObjectLayoutControls} from '../../src/system-files/object-manager-layout-controls.js';

test('tenant SQL compact layouts, assignments and buttons round-trip in order',async()=>{
 const db={query:async(sql:string,args:unknown[])=>{
  assert.equal(args[0],'tenant-A');
  if(sql.includes('FROM md_object_compact_layouts'))return {rows:[
   {object_api:'Account',layout_id:'main',label:'Main'}]};
  if(sql.includes('FROM md_object_compact_layout_fields'))return {rows:[
   {object_api:'Account',layout_id:'main',field_api:'Name'},
   {object_api:'Account',layout_id:'main',field_api:'Status'}]};
  if(sql.includes('FROM md_object_compact_layout_assignments'))return {rows:[
   {object_api:'Account',profile_id:'*',record_type_id:'retail',layout_id:'main'}]};
  if(sql.includes('FROM md_object_list_view_buttons'))return {rows:[
   {object_api:'Account',button_name:'New',enabled:false},
   {object_api:'Account',button_name:'Change Owner',enabled:true},
   {object_api:'Account',button_name:'Printable View',enabled:false}]};
  throw Error('Unexpected query '+sql);
 }} as unknown as SqlPersistence;
 const result=await loadObjectLayoutControls(db,'tenant-A',['Account','Contact']);
 assert.deepEqual(result.get('Account'),{
  compactLayouts:[{id:'main',label:'Main',fieldApiNames:['Name','Status']}],
  compactLayoutAssignments:[{profileId:'*',recordTypeId:'retail',compactLayoutId:'main'}],
  listViewButtons:['Change Owner']
 });
 assert.deepEqual(result.get('Contact')?.listViewButtons,['New'],
  'legacy default is retained only where no button configuration exists');
});

test('compact layout editor writes validated tenant-scoped relational rows atomically',async()=>{
 const calls:Array<{sql:string;args:unknown[]}>= [];
 const client={query:async(sql:string,args:unknown[]=[])=>{
  calls.push({sql,args});
  if(sql.includes('SELECT record_type_id FROM md_object_record_types'))return {
   rows:[{record_type_id:'retail'}],rowCount:1
  };
  return {rows:[],rowCount:1};
 }} as unknown as PoolClient;
 const draft={
  compactLayouts:[{id:'main',label:'Highlights',fieldApiNames:['Name','Status']}],
  compactLayoutAssignments:[{profileId:'*',recordTypeId:'retail',compactLayoutId:'main'}],
  listViewButtons:['Printable View']
 };
 await persistObjectLayoutControls(client,'tenant-A','Account',draft,new Set(['Name','Status']));
 assert.ok(calls.some(x=>x.sql.includes('INSERT INTO md_object_compact_layout_fields')&&x.args[3]==='Name'));
 assert.ok(calls.some(x=>x.sql.includes('INSERT INTO md_object_compact_layout_assignments')&&x.args[3]==='retail'));
 const buttons=calls.filter(x=>x.sql.includes('INSERT INTO md_object_list_view_buttons'));
 assert.equal(buttons.length,4);
 assert.deepEqual(buttons.map(x=>[x.args[2],x.args[3]]),[
  ['New',false],['Change Owner',false],['Import',false],['Printable View',true]]);
 assert.ok(calls.filter(x=>x.sql.startsWith('INSERT')).every(x=>x.args[0]==='tenant-A'));
});

test('invalid compact layouts are rejected before altering persisted metadata',async()=>{
 const writes:string[]=[];
 const client={query:async(sql:string)=>{writes.push(sql);return {rows:[],rowCount:0};}} as unknown as PoolClient;
 const valid=new Set(['Name','Status']);
 await assert.rejects(()=>persistObjectLayoutControls(client,'tenant','Account',{
  compactLayouts:[{id:'main',label:'Broken',fieldApiNames:['HiddenField']}],
  compactLayoutAssignments:[],listViewButtons:['New']
 },valid),/Invalid compact layout/);
 await assert.rejects(()=>persistObjectLayoutControls(client,'tenant','Account',{
  compactLayouts:[{id:'main',label:'Valid',fieldApiNames:['Name']}],
  compactLayoutAssignments:[{profileId:'*',recordTypeId:'*',compactLayoutId:'missing'}]
 },valid),/Invalid compact layout assignment/);
 await assert.rejects(()=>persistObjectLayoutControls(client,'tenant','Account',{
  listViewButtons:['New','New']
 },valid),/Invalid list view button configuration/);
 assert.ok(!writes.some(x=>x.includes('DELETE FROM md_object_compact_layouts')||x.includes('DELETE FROM md_object_list_view_buttons')));
});
