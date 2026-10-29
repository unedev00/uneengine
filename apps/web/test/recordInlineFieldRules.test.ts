import test from 'node:test';
import assert from 'node:assert/strict';
import {recordInlineFieldRules,validateInlineFieldValue} from '../src/core/records/RecordWorkspace/recordInlineFieldRules';
import type {FieldMetadata} from '../src/core/metadata/Definitions/metadata';

const field={apiName:'Name',label:'Name',dataType:'Text(80)',required:false,unique:false} satisfies FieldMetadata;
const context={formFactor:'Desktop' as const};

test('inline editor combines standalone and Field Section required/read-only layout settings',()=>{
 assert.deepEqual(recordInlineFieldRules('Name',{requiredOnLayout:true},context),{visible:true,required:true,readOnly:false});
 assert.deepEqual(recordInlineFieldRules('Name',{readOnlyOnLayout:true},context),{visible:true,required:false,readOnly:true});
 assert.deepEqual(recordInlineFieldRules('Name',{requiredFieldApiNames:['Name']},context),{visible:true,required:true,readOnly:false});
 assert.deepEqual(recordInlineFieldRules('Name',{readOnlyFieldApiNames:['Name']},context),{visible:true,required:false,readOnly:true});
});

test('conditional field rules hide, require or lock inline fields only when their shared condition matches',()=>{
 const properties={pagePropertyContract:{version:1,fieldRules:[{
  fieldApiName:'Name',behavior:'Required',
  visibilityRules:{logic:'All',conditions:[{source:'Device',operator:'Equals',value:'Phone'}]}
 }]}};
 assert.deepEqual(recordInlineFieldRules('Name',properties,context),
  {visible:false,required:false,readOnly:false});
 assert.deepEqual(recordInlineFieldRules('Name',properties,{formFactor:'Phone'}),
  {visible:true,required:true,readOnly:false});
});

test('inline saves reject blank values for layout-required fields and all edits to read-only fields',()=>{
 const required=recordInlineFieldRules('Name',{requiredFieldApiNames:['Name']},context);
 assert.throws(()=>validateInlineFieldValue({...field,required:field.required||required.required},'',required.readOnly),/required/);
 const readOnly=recordInlineFieldRules('Name',{readOnlyFieldApiNames:['Name']},context);
 assert.throws(()=>validateInlineFieldValue(field,'Updated',readOnly.readOnly),/not permitted/);
 assert.doesNotThrow(()=>validateInlineFieldValue(field,'Updated',false));
});
