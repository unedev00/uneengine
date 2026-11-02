import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateMetadataApiName,metadataNameConflict,suggestMetadataApiName,apiNameIsValid,suggestMetadataApiNameWithSuffix} from '../src/core/metadata/Definitions/metadataApiNames';

test('generates valid, deterministic metadata identifiers from labels',()=>{
  assert.equal(generateMetadataApiName('Customer Status'),'customer_status');
  assert.equal(generateMetadataApiName('  Invoice - Number  '),'invoice_number');
  assert.equal(generateMetadataApiName('123 Customer'),'customer');
  assert.equal(generateMetadataApiName('Résumé'),'resume');
  assert.equal(generateMetadataApiName('!!!'),'');
});
test('duplicate detection is case-insensitive and suggestions never overwrite',()=>{
  assert.equal(metadataNameConflict('customer_status',['customer_status']),true);
  assert.equal(suggestMetadataApiName('customer_status',['customer_status','Customer_Status_2']),'customer_status_3');
  assert.equal(suggestMetadataApiName('unique',['Existing']),'unique');
});
test('validates names before server submission',()=>{
  assert.equal(apiNameIsValid('Valid_2'),true);
  assert.equal(apiNameIsValid('2_Invalid'),false);
  assert.equal(apiNameIsValid('Invalid Name'),false);
});

test('custom metadata suffix stays at the end after case-insensitive collision resolution',()=>{
  assert.equal(suggestMetadataApiNameWithSuffix('Total Value',['total_value__c'],'__c'),'total_value_2__c');
  assert.equal(suggestMetadataApiNameWithSuffix('Résumé',['Resume__c','RESUME_2__C'],'__c'),'resume_3__c');
  assert.equal(suggestMetadataApiNameWithSuffix('123 Invoice',['Invoice__c'],'__c'),'invoice_2__c');
  assert.equal(suggestMetadataApiNameWithSuffix('!!!',[],'__c'),'');
  assert.equal(suggestMetadataApiNameWithSuffix('Active',[],'__c',8),'activ__c');
  const proposed=suggestMetadataApiNameWithSuffix('Very Long Description',['very__c'],'__c',11);
  assert.ok(proposed.length<=11&&proposed.endsWith('__c'));
  assert.equal(suggestMetadataApiNameWithSuffix('Valid',[],'$',80),'');
});
