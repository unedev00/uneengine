import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {appendFieldToFieldSection,objectRecordPageApiNames,placeNewFieldOnRecordPages}
 from '../../src/system-support/record-page-field-placement.js';

test('record page API names match the object record page scaffold', () => {
 const key=createHash('md5').update('tenant-1:Product').digest('hex').slice(0,20);
 assert.deepEqual(objectRecordPageApiNames('tenant-1','Product'),['Record_'+key+'_Edit','Record_'+key+'_View']);
});

test('appends a new field to the first Field Section only once', () => {
 const page={components:[{properties:{label:'x'}},{properties:{fieldApiNames:['Name']}}]};
 assert.equal(appendFieldToFieldSection(page,'ImageFile__c'),true);
 assert.equal(appendFieldToFieldSection(page,'ImageFile__c'),false);
 assert.deepEqual(page.components[1].properties.fieldApiNames,['Name','ImageFile__c']);
 assert.equal(appendFieldToFieldSection({components:[]},'X'),false);
});

function fakePages(pending:boolean){
 const saved:string[]=[];const published:string[]=[];
 return {saved,published,pages:{
  editor:async(_t:string,page:string,variant:string)=>({components:[{properties:{fieldApiNames:['Name']}}],
   draftRevision:pending?3:2,publishedRevision:2,page,variant}),
  saveLayoutDraft:async(_t:string,page:string,variant:string,payload:{draftRevision?:number})=>{
   saved.push(page+':'+variant);return {...payload,draftRevision:4};},
  publishLayout:async(_t:string,page:string,variant:string,expected?:number)=>{
   assert.equal(expected,4);published.push(page+':'+variant);}
 }};
}

test('places the field on every Record Edit/View variant and publishes clean pages', async () => {
 const fake=fakePages(false);
 const rbac={allowed:async()=>true};
 const results=await placeNewFieldOnRecordPages(fake.pages as never,rbac as never,'t','u','Product','ImageFile__c');
 assert.equal(results.filter(r=>r.status==='added').length,8);
 assert.equal(fake.published.length,8);
});

test('never publishes a variant that already had an unpublished draft', async () => {
 const fake=fakePages(true);
 const results=await placeNewFieldOnRecordPages(fake.pages as never,{allowed:async()=>true} as never,'t','u','Product','F');
 assert.equal(fake.saved.length,8);
 assert.equal(fake.published.length,0);
 assert.ok(results.every(r=>r.status==='draft-only'));
});

test('skips placement without PageDefinition manage permission', async () => {
 const fake=fakePages(false);
 const results=await placeNewFieldOnRecordPages(fake.pages as never,{allowed:async()=>false} as never,'t','u','Product','F');
 assert.equal(results[0].status,'skipped');
 assert.equal(fake.saved.length,0);
});
