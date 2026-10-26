import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyFieldSecurity} from '../../../web/src/core/security/Permissions/fieldSecurityWizard.js';

test('Field Security Wizard applies to selected fields without touching other objects',()=>{
 const previous={
  'Lead__c.Name':{read:true,edit:true,create:true,delete:true},
  'Invoice__c.Total':{read:true,edit:false,create:false,delete:false}
 };
 const next=applyFieldSecurity(previous,'Lead__c',['Name','Name'],'ReadOnly');
 assert.deepEqual(next['Lead__c.Name'],{read:true,edit:false,create:false,delete:false});
 assert.deepEqual(next['Invoice__c.Total'],previous['Invoice__c.Total']);
 assert.deepEqual(previous['Lead__c.Name'],{read:true,edit:true,create:true,delete:true});
 const hidden=applyFieldSecurity(next,'Lead__c',['Name'],'Hidden');
 assert.equal(hidden['Lead__c.Name'].read,false);
 const editable=applyFieldSecurity(hidden,'Lead__c',['Name'],'Edit');
 assert.equal(editable['Lead__c.Name'].read,true);
 assert.equal(editable['Lead__c.Name'].create,true);
 assert.equal(editable['Lead__c.Name'].edit,true);
 assert.equal(editable['Lead__c.Name'].delete,false);
 assert.throws(()=>applyFieldSecurity(previous,'Lead__c',['bad.field'],'Edit'),/Invalid field/);
});
