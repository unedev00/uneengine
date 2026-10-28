import assert from 'node:assert/strict';
import test from 'node:test';
import {filterLayoutWritableValues,missingLayoutRequiredFields,applyRequiredLayoutDefaults} from '../src/core/records/RecordWorkspace/layoutWritableValues';
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

test('required defaults match create-form values without overriding explicit input',()=>{
 const required:PageLayoutMetadata={...layout,sections:[{...layout.sections[0],
   requiredFieldApiNames:['Name','Status','ReadOnly']}]};
 const fields=[{apiName:'Name',defaultValue:'Default name'},
   {apiName:'Status',defaultValue:'Draft'},
   {apiName:'ReadOnly',defaultValue:'No edits'}];
 const resolved=applyRequiredLayoutDefaults({Status:''},required,fields,
   new Set(['Name','Status','ReadOnly']));
 assert.deepEqual(resolved,{Name:'Default name',Status:''});
 assert.deepEqual(missingLayoutRequiredFields(resolved,required,
   new Set(['Name','Status','ReadOnly'])),['Status']);
 assert.deepEqual(applyRequiredLayoutDefaults({Name:false},required,
   [{apiName:'Name',defaultValue:'Replace'}],new Set(['Name'])),{Name:false});
});

test('authored Dynamic Forms never leak hidden schema-required values into a write',()=>{
 const values={Name:'Visible',RequiredOutside:'Hidden but required',ReadOnly:'Blocked',RecordTypeId:'rt'};
 assert.deepEqual(filterLayoutWritableValues(values,layout,
   new Set(['RequiredOutside','ReadOnly']),true),{Name:'Visible',RecordTypeId:'rt'});
 // Legacy layouts keep their compatibility behaviour.
 assert.deepEqual(filterLayoutWritableValues(values,layout,
   new Set(['RequiredOutside','ReadOnly']),false),
   {Name:'Visible',RequiredOutside:'Hidden but required',RecordTypeId:'rt'});
});
