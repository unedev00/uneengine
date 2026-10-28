import assert from 'node:assert/strict';
import test from 'node:test';
import {visibleRelatedListQuickLinks} from '../src/core/records/RecordWorkspace/relatedQuickLinks';

test('PB24 related quick links only include authorised returned relations',()=>{
 const related={Contacts:{objectApiName:'Contact'},PrivateChildren:{objectApiName:'Private__c'}};
 const objects=[{apiName:'Contact',pluralLabel:'Contacts'},
  {apiName:'Private__c',pluralLabel:'Private Children'}];
 assert.deepEqual(visibleRelatedListQuickLinks(
  ['Contacts','Missing','contacts','Private Children'],related,objects),
  ['Contacts','contacts','Private Children']);
 assert.deepEqual(visibleRelatedListQuickLinks(
  ['Invoices'],{Contacts:related.Contacts},objects),[]);
 assert.deepEqual(visibleRelatedListQuickLinks([],related,objects),[]);
});
