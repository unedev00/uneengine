import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {PoolClient} from 'pg';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import {
 compareLookupFilter,loadObjectLookupFilters,persistObjectLookupFilters
} from '../../src/system-files/object-manager-lookup-filters.js';

const valid={
 id:'lookup-filter-a',fieldApiName:'AccountId',relatedObject:'Account',
 relatedFieldApiName:'Status',operator:'Equals',value:'Active',required:true
} as const;

test('Object Manager lookup filters load from tenant SQL with group logic',async()=>{
 const db={query:async(sql:string,params:unknown[])=>{
  assert.equal(params[0],'tenant');
  if(sql.includes('FROM md_object_lookup_filters l'))return {rows:[{
   object_api:'Contact',filter_id:'lookup-filter-a',field_api:'AccountId',
   related_object:'Account',related_field_api:'Status',operator:'Equals',
   value_text:'Active',value_field_api:null,required:true
  }]};
  if(sql.includes('FROM md_object_lookup_filter_logic'))return {rows:[{
   object_api:'Contact',field_api:'AccountId',logic:'Any'
  }]};
  throw Error('Unexpected lookup metadata query '+sql);
 }} as unknown as SqlPersistence;
 const map=await loadObjectLookupFilters(db,'tenant',['Contact']);
 assert.deepEqual(map.get('Contact'),{
  relatedLookupFilters:[valid],relatedLookupFilterLogic:{AccountId:'Any'}
 });
});

test('lookup filters are relational, referentially validated and replace atomically',async()=>{
 const calls:Array<{sql:string;params:unknown[]}>= [];
 const client={query:async(sql:string,params:unknown[]=[])=>{
  calls.push({sql,params});
  if(sql.includes('FROM md_field_definitions WHERE tenant_id=$1 AND object_api=$2'))
   return {rows:[{api_name:'AccountId',data_type:'reference',related_object:'Account'},
    {api_name:'Status',data_type:'picklist',related_object:null}],rowCount:2};
  if(sql.includes('FROM md_field_definitions WHERE tenant_id=$1 AND object_api=ANY'))
   return {rows:[{object_api:'Account',api_name:'Status',data_type:'picklist'}],rowCount:1};
  return {rows:[],rowCount:1};
 }} as unknown as PoolClient;
 await persistObjectLookupFilters(client,'tenant','Contact',{
  relatedLookupFilters:[valid],relatedLookupFilterLogic:{AccountId:'All'}
 });
 assert.ok(calls.some(x=>x.sql.includes('INSERT INTO md_object_lookup_filters')
   &&x.params[2]===valid.id&&x.params[8]===true));
 assert.ok(calls.some(x=>x.sql.includes('INSERT INTO md_object_lookup_filter_logic')
   &&x.params[2]==='AccountId'));
 assert.ok(calls.filter(x=>x.sql.includes('INSERT INTO md_object_lookup_'))
   .every(x=>x.params[0]==='tenant'));
 const before=calls.length;
 await assert.rejects(()=>persistObjectLookupFilters(client,'tenant','Contact',{
  relatedLookupFilters:[{...valid,relatedFieldApiName:'Nonexistent'}],
  relatedLookupFilterLogic:{}
 }),/Invalid lookup filter field reference/);
 assert.ok(calls.slice(before).every(x=>!x.sql.includes('DELETE FROM md_object_lookup_')),
  'invalid lookup filter must never erase persisted definitions');
 // Typed comparison and operator checks are enforced by metadata, not picker alone.
 await assert.rejects(()=>persistObjectLookupFilters(client,'tenant','Contact',{
  relatedLookupFilters:[{...valid,operator:'Contains',relatedFieldApiName:'Id'}],
  relatedLookupFilterLogic:{}
 }),/Text lookup operators/);
 await assert.rejects(()=>persistObjectLookupFilters(client,'tenant','Contact',{
  relatedLookupFilters:[{...valid,valueFieldApiName:'AccountId'}],
  relatedLookupFilterLogic:{}
 }),/incompatible/);

});

test('required filter comparator handles null, numeric and case-insensitive search',()=>{
 assert.equal(compareLookupFilter(null,'','Is Null'),true);
 assert.equal(compareLookupFilter('','', 'Is Not Null'),false);
 assert.equal(compareLookupFilter('Acme Bank','bank','Contains'),true);
 assert.equal(compareLookupFilter('Active','Act','Starts With'),true);
 assert.equal(compareLookupFilter('10','2','Greater Than'),true);
 assert.equal(compareLookupFilter('7','9','Less Than'),true);
 assert.equal(compareLookupFilter('Active','Inactive','Not Equal To'),true);
});
