import assert from 'node:assert/strict';
import test from 'node:test';
import {filterLayoutWritableValues,missingLayoutRequiredFields} from '../src/core/records/RecordWorkspace/layoutWritableValues';
import type {PageLayoutMetadata} from '../src/core/metadata/Definitions/metadata';
const layout:PageLayoutMetadata={
  id:'dynamic',label:'Dynamic form',actions:[],relatedLists:[],
  sections:[{id:'main',label:'Main',columns:1,fieldApiNames:['Name','Status','ReadOnly'],
    readOnlyFieldApiNames:['ReadOnly']}]
};
test('form payload excludes hidden and page-read-only data',()=>{
  const values={Name:'Fresh',Status:'Active',ReadOnly:'Old',Secret:'Private',RecordTypeId:'rt'};
  assert.deepEqual(filterLayoutWritableValues(values,layout,new Set(['Name'])),
    {Name:'Fresh',Status:'Active',RecordTypeId:'rt'});
});
test('schema-required fields retain compatibility even when outside a configured section',()=>{
  const values={Name:'N',RequiredOutside:'Present',Other:'Hidden'};
  assert.deepEqual(filterLayoutWritableValues(values,layout,new Set(['RequiredOutside'])),
    {Name:'N',RequiredOutside:'Present'});
});
test('read-only beats required and absent layout preserves existing behaviour',()=>{
  const values={ReadOnly:'Existing',Name:'A'};
  assert.deepEqual(filterLayoutWritableValues(values,layout,new Set(['ReadOnly'])),{Name:'A'});
  assert.deepEqual(filterLayoutWritableValues(values,undefined,new Set()),values);
});

test('conditional layout required fields validate only visible writable inputs',()=>{
 const dynamic:PageLayoutMetadata={...layout,sections:[{...layout.sections[0],
   requiredFieldApiNames:['Name','Status','ReadOnly','Hidden']}]};
 assert.deepEqual(missingLayoutRequiredFields({Name:'',Status:null,ReadOnly:'',Hidden:''},
  dynamic,new Set(['Name','Status','ReadOnly','Hidden'])),['Name','Status']);
 assert.deepEqual(missingLayoutRequiredFields({Name:'  ',Status:'Active'},
  dynamic,new Set(['Name','Status'])),['Name']);
 assert.deepEqual(missingLayoutRequiredFields({Name:'Present',Status:false},
  dynamic,new Set(['Name','Status'])),[]);
 assert.deepEqual(missingLayoutRequiredFields({},undefined,new Set(['Name'])),[]);
});
