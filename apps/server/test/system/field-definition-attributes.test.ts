import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateFieldDefinitionAttributes} from '../../src/system-files/field-definition-attributes.js';
import {requiresUniqueValue} from '../../src/business-rule-engine/UniqueConstraintManager.js';

const field=(overrides:Record<string,unknown>={})=>({
 dataType:'text',unique:false,externalId:false,caseSensitive:false,
 maxLength:80,precision:null,scale:null,defaultValue:null,
 picklistValues:[],globalValueSetApiName:null,...overrides
});

test('Phase 2B external IDs are independent of storage uniqueness',()=>{
 assert.equal(requiresUniqueValue({is_unique:false,external_id:true}),false);
 assert.equal(requiresUniqueValue({is_unique:true,external_id:false}),true);
 assert.equal(validateFieldDefinitionAttributes(field({externalId:true,defaultValue:'ERP-001'})),'ERP-001');
 assert.throws(()=>validateFieldDefinitionAttributes(field({dataType:'picklist',externalId:true,defaultValue:null})),/External ID/);
 assert.throws(()=>validateFieldDefinitionAttributes(field({dataType:'longtext',unique:true})),/Unique/);
 assert.throws(()=>validateFieldDefinitionAttributes(field({caseSensitive:true})),/Case sensitivity/);
 assert.equal(validateFieldDefinitionAttributes(field({unique:true,caseSensitive:true})),null);
});

test('Phase 2B rejects malformed field defaults before metadata persistence',()=>{
 const invalid=[
  {dataType:'text',maxLength:3,defaultValue:'toolong'},
  {dataType:'email',defaultValue:'not-an-email'},
  {dataType:'url',defaultValue:'javascript:alert(1)'},
  {dataType:'phone',defaultValue:'abcdef'},
  {dataType:'number',precision:5,scale:2,defaultValue:'123456'},
  {dataType:'number',precision:5,scale:2,defaultValue:'Infinity'},
  {dataType:'number',precision:5,scale:2,defaultValue:'bad'},
  {dataType:'boolean',defaultValue:'yes'},
  {dataType:'date',defaultValue:'2025-02-29'},
  {dataType:'datetime',defaultValue:'tomorrow'},
  {dataType:'time',defaultValue:'25:90'},
  {dataType:'autonumber',defaultValue:'0001'},
  {dataType:'reference',defaultValue:'some parent'},
  {dataType:'encryptedtext',defaultValue:'plaintext'},
  {dataType:'picklist',picklistValues:['Open','Closed'],defaultValue:'Unknown'},
  {dataType:'multipicklist',picklistValues:['A','B'],defaultValue:'A;A'}
 ];
 for(const example of invalid)
  assert.throws(()=>validateFieldDefinitionAttributes(field(example)),undefined,JSON.stringify(example));
});

test('Phase 2B accepts valid defaults across ordinary field catalogue',()=>{
 const valid=[
  {dataType:'text',maxLength:5,defaultValue:'A'},
  {dataType:'textarea',defaultValue:'some notes'},
  {dataType:'longtext',defaultValue:'some notes'},
  {dataType:'richtext',defaultValue:'<p>hello</p>'},
  {dataType:'email',defaultValue:'a@example.com'},
  {dataType:'phone',defaultValue:'+44 20 1234 5678'},
  {dataType:'url',defaultValue:'https://example.com'},
  {dataType:'number',precision:6,scale:2,defaultValue:12.34},
  {dataType:'percent',precision:6,scale:2,defaultValue:12.34},
  {dataType:'currency',precision:6,scale:2,defaultValue:12.34},
  {dataType:'boolean',defaultValue:false},
  {dataType:'date',defaultValue:'2024-02-29'},
  {dataType:'datetime',defaultValue:'2026-10-30T16:00:00Z'},
  {dataType:'time',defaultValue:'11:45'},
  {dataType:'picklist',picklistValues:['Open','Closed'],defaultValue:'Open'},
  {dataType:'multipicklist',picklistValues:['A','B'],defaultValue:'A;B'}
 ];
 for(const example of valid){
  const accepted=validateFieldDefinitionAttributes(field(example));
  assert.equal(typeof accepted,'string',JSON.stringify(example));
 }
});
