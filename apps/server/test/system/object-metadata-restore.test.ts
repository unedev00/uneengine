import assert from 'node:assert/strict';
import {test} from 'node:test';
import {restorableObjectLayoutSnapshot} from '../../src/system-files/object-metadata-history.js';

test('Object history restores only the allowlisted legacy layouts',()=>{
 const saved={
  apiName:'Invoice__c',label:'Old label',fields:[{apiName:'Secret',dataType:'Text'}],
  recordTypes:[{id:'master',picklistValues:{Status:['Old']}}],
  settings:{allowReports:false},
  pageLayouts:[{id:'default',label:'Old Layout',sections:[]}],
  pageLayoutAssignments:[{profileId:'*',recordTypeId:'master',pageLayoutId:'default'}]
 };
 const restored=restorableObjectLayoutSnapshot(saved,'Invoice__c','Current label');
 assert.deepEqual(restored,{apiName:'Invoice__c',label:'Current label',
  pageLayouts:saved.pageLayouts,pageLayoutAssignments:saved.pageLayoutAssignments});
 assert.equal('recordTypes' in restored,false);
 assert.equal('fields' in restored,false);
 assert.equal('settings' in restored,false);
});
test('Object history denies unrelated Object, empty and incomplete historical snapshots',()=>{
 for(const invalid of [null,{},[],{apiName:'Other__c',pageLayouts:[{}],pageLayoutAssignments:[]},
  {apiName:'Invoice__c',pageLayouts:[],pageLayoutAssignments:[]},
  {apiName:'Invoice__c',pageLayouts:[{}]}]){
  assert.throws(()=>restorableObjectLayoutSnapshot(invalid,'Invoice__c','Invoice'),/snapshot/);
 }
});
