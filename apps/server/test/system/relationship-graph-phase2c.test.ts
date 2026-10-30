import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import {listRelationshipDefinitions,registeredRelationships} from '../../src/relationship-engine/RelationshipRegistry.js';
import {assertDeletionAllowed} from '../../src/relationship-engine/ReferentialIntegrityGuard.js';

test('relationship metadata returns distinct inverse lookup edges with stable names and tenant scope',async()=>{
 const calls:Array<{sql:string;args:unknown[]}>= [];
 const db={query:async(sql:string,args:unknown[])=>{
  calls.push({sql,args});
  return {rows:[
   {object_api:'Child__c',api_name:'PrimaryParentId',related_object:'Parent__c',
    relationship_type:'Master-Detail',relationship_name:'PrimaryParent',
    child_relationship_name:'PrimaryChildren',required:true,delete_behavior:'Cascade',allow_reparenting:false},
   {object_api:'Child__c',api_name:'ReviewParentId',related_object:'Parent__c',
    relationship_type:'Lookup',relationship_name:'ReviewParent',
    child_relationship_name:'ReviewChildren',required:false,delete_behavior:'Clear',allow_reparenting:false},
   {object_api:'Grand__c',api_name:'ChildId',related_object:'Child__c',
    relationship_type:'Master-Detail',relationship_name:'PrimaryChild',
    child_relationship_name:'Grandchildren',required:true,delete_behavior:'Cascade',allow_reparenting:true}
  ],rowCount:3};
 }} as unknown as SqlPersistence;
 const edges=await listRelationshipDefinitions(db,'tenant-a','Parent__c');
 assert.equal(edges.length,3);
 assert.deepEqual(edges.filter(x=>x.sourceObject==='Child__c').map(x=>x.fieldApiName),
  ['PrimaryParentId','ReviewParentId']);
 assert.equal(edges[0].childRelationshipName,'PrimaryChildren');
 assert.equal(edges[1].deleteBehavior,'Clear');
 assert.equal(edges[2].allowReparenting,true);
 assert.deepEqual(calls[0].args,['tenant-a','Parent__c']);
 assert.match(calls[0].sql,/f\.deleted_at IS NULL/);
 assert.match(calls[0].sql,/source\.deleted_at IS NULL/);
 assert.match(calls[0].sql,/target\.deleted_at IS NULL/);
});

test('incoming relationship deletion graph excludes retired non-reference fields',async()=>{
 const db={query:async(sql:string,args:unknown[])=>{
  assert.match(sql,/f\.data_type='reference'/);
  assert.match(sql,/f\.deleted_at IS NULL/);
  assert.deepEqual(args,['tenant-a','parent-id','Parent__c']);
  return {rows:[{record_id:'child-id',object_api:'Child__c',field_api:'ReviewParentId',
   relationship_type:'Lookup',delete_behavior:'Restrict',required:false}],rowCount:1};
 }};
 const edges=await registeredRelationships(db as never,'tenant-a',
  {recordId:'parent-id',objectApi:'Parent__c'});
 assert.equal(edges.length,1);
 assert.throws(()=>assertDeletionAllowed(edges),/restricted/);
});
