import assert from 'node:assert/strict';
import {test} from 'node:test';
import {resolveRelationshipFieldPath} from '../../src/relationship-engine/RelationshipPathResolver.js';

const fixture=(deny:string|null=null)=>{
 const queries:Array<{sql:string;params:unknown[]}>= [];
 const metadata:Record<string,Array<{api_name:string;related_object:string;relationship_name:string}>>={
  'Child__c':[
   {api_name:'PrimaryParentId',related_object:'Parent__c',relationship_name:'PrimaryParent'},
   {api_name:'ReviewParentId',related_object:'Parent__c',relationship_name:'ReviewParent'}
  ],
  'Parent__c':[
   {api_name:'GrandParentId',related_object:'Grand__c',relationship_name:'GrandParent'}
  ]
 };
 const ids:Record<string,string>={Parent:'parent-id',Grand:'grand-id'};
 const query=async(sql:string,params:unknown[]=[])=>{
  queries.push({sql,params});
  assert.equal(params[0],'tenant-a','Every relationship lookup must be tenant scoped');
  if(sql.includes('md_rbac_allowed'))return {rows:[{allowed:params[2]!==deny}]};
  if(sql.includes('FROM md_field_definitions')&&sql.includes('relationship_name')){
   const object=String(params[1]),part=String(params[2]);
   return {rows:(metadata[object]??[]).filter(row=>
     row.api_name===part||row.relationship_name===part||row.related_object===part)};
  }
  if(sql.includes('SELECT id FROM md_records'))
   return {rows:params[2]==='missing-id'?[]:[{id:params[2]}]};
  if(sql.includes('SELECT reference_record_id FROM md_record_values'))
   return {rows:[{reference_record_id:params[3]==='GrandParentId'?ids.Grand:null}]};
  if(sql.includes('SELECT f.data_type,v.value_text'))
   return {rows:[{data_type:'text',value_text:'Three-hop result',
     reference_record_id:null,value_number:null,value_boolean:null,value_date:null,
     value_datetime:null}]};
  throw new Error('Unexpected SQL '+sql);
 };
 return {db:{query},queries};
};

test('2C: metadata aliases traverse source -> parent -> grandparent with per-hop RBAC',async()=>{
 const {db,queries}=fixture();
 const value=await resolveRelationshipFieldPath(db as never,'tenant-a','actor-a','Child__c',
  {PrimaryParentId:'parent-id'},['PrimaryParent','GrandParent','Name']);
 assert.equal(value,'Three-hop result');
 const records=queries.filter(x=>x.sql.includes('SELECT id FROM md_records'));
 assert.deepEqual(records.map(x=>x.params[1]),['Parent__c','Grand__c']);
 assert.equal(records.length,2);
 assert.ok(records.every(x=>x.sql.includes('md_record_access(')),
  'Per-hop record sharing cannot be bypassed');
 assert.ok(queries.filter(x=>x.sql.includes('md_rbac_allowed')).length>=3,
  'Every relationship field and terminal field must honor field permissions');
});

test('2C: multiple lookups to same target must require explicit relationship identity',async()=>{
 const {db}=fixture();
 await assert.rejects(()=>resolveRelationshipFieldPath(db as never,
  'tenant-a','actor-a','Child__c', {PrimaryParentId:'parent-id'},['Parent__c','Name']),
  /Ambiguous relationship path/);
 assert.equal(await resolveRelationshipFieldPath(db as never,'tenant-a','actor-a',
  'Child__c',{ReviewParentId:null},['ReviewParent','Name']),null);
});

test('2C: hidden relationship fields return null without reading the parent',async()=>{
 const {db,queries}=fixture('Child__c.PrimaryParentId');
 const value=await resolveRelationshipFieldPath(db as never,'tenant-a','actor-a','Child__c',
  {PrimaryParentId:'parent-id'},['PrimaryParentId','Name']);
 assert.equal(value,null);
 assert.equal(queries.filter(x=>x.sql.includes('SELECT id FROM md_records')).length,0);
});

test('2C: malformed, over-depth and circular field traversals fail closed',async()=>{
 const {db}=fixture();
 for(const path of [[],['Name'],['Bad name','Name'],
  ['A','B','C','D','E','F','G']])
  await assert.rejects(()=>resolveRelationshipFieldPath(db as never,'tenant-a','actor-a',
   'Child__c',{},path),/Invalid relationship field path/);
 const circular={query:async(sql:string,params:unknown[])=>{
  if(sql.includes('md_rbac_allowed'))return {rows:[{allowed:true}]};
  if(sql.includes('FROM md_field_definitions'))
   return {rows:[{api_name:'SelfId',related_object:'Child__c',relationship_name:'Self'}]};
  if(sql.includes('SELECT id FROM md_records'))return {rows:[{id:'self-id'}]};
  if(sql.includes('SELECT reference_record_id'))return {rows:[{reference_record_id:'self-id'}]};
  return {rows:[]};
 }};
 await assert.rejects(()=>resolveRelationshipFieldPath(circular as never,'tenant-a','actor-a',
  'Child__c',{SelfId:'self-id'},['Self','Self','Name']),/Circular record relationship path/);
});
