import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateMetadataApiName,metadataNameConflict,suggestMetadataApiName,apiNameIsValid,suggestMetadataApiNameWithSuffix} from '../src/core/metadata/Definitions/metadataApiNames';

test('generates valid, deterministic metadata identifiers from labels',()=>{
  assert.equal(generateMetadataApiName('Customer Status'),'Customer_Status');
  assert.equal(generateMetadataApiName('  Invoice - Number  '),'Invoice_Number');
  assert.equal(generateMetadataApiName('123 Customer'),'Customer');
  assert.equal(generateMetadataApiName('Résumé'),'Resume');
  assert.equal(generateMetadataApiName('!!!'),'');
});
test('duplicate detection is case-insensitive and suggestions never overwrite',()=>{
  assert.equal(metadataNameConflict('Customer_Status',['customer_status']),true);
  assert.equal(suggestMetadataApiName('Customer_Status',['Customer_Status','Customer_Status_2']),'Customer_Status_3');
  assert.equal(suggestMetadataApiName('Unique',['Existing']),'Unique');
});
test('validates names before server submission',()=>{
  assert.equal(apiNameIsValid('Valid_2'),true);
  assert.equal(apiNameIsValid('2_Invalid'),false);
  assert.equal(apiNameIsValid('Invalid Name'),false);
});

test('custom metadata suffix stays at the end after case-insensitive collision resolution',()=>{
  assert.equal(suggestMetadataApiNameWithSuffix('Total Value',['total_value__c'],'__c'),'Total_Value_2__c');
  assert.equal(suggestMetadataApiNameWithSuffix('Résumé',['Resume__c','RESUME_2__C'],'__c'),'Resume_3__c');
  assert.equal(suggestMetadataApiNameWithSuffix('123 Invoice',['Invoice__c'],'__c'),'Invoice_2__c');
  assert.equal(suggestMetadataApiNameWithSuffix('!!!',[],'__c'),'');
  assert.equal(suggestMetadataApiNameWithSuffix('Active',[],'__c',8),'Activ__c');
  const proposed=suggestMetadataApiNameWithSuffix('Very Long Description',['Very__c'],'__c',11);
  assert.ok(proposed.length<=11&&proposed.endsWith('__c'));
  assert.equal(suggestMetadataApiNameWithSuffix('Valid',[],'$',80),'');
});
