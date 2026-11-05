import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptsTenantImageAsset} from '../src/core/records/RecordFormDialog/tenantImageTextField';

test('Only image-like text fields offer the tenant image picker in record forms',()=>{
  const field=(apiName:string,label:string,dataType='Text')=>({apiName,label,dataType});
  for(const ordinary of [field('Name','Name'),field('SKU','SKU'),field('Description','Description','Text(2000)'),
    field('Barcode','Barcode','Text(80)'),field('TaxCategory','Tax Category','Text(60)')])
    assert.equal(acceptsTenantImageAsset(ordinary),false,ordinary.apiName);
  for(const image of [field('ImageUrl','Image URL','Text(2048)'),field('CategoryImage','Category Image'),
    field('LogoRef__c','Brand logo'),field('Image_URL__c','Image URL','URL')])
    assert.equal(acceptsTenantImageAsset(image),true,image.apiName);
  // Dedicated media and non-text types keep their own controls.
  assert.equal(acceptsTenantImageAsset(field('imagefile__c','ImageFile','Image')),false);
  assert.equal(acceptsTenantImageAsset(field('IconCount','Icon count','Number')),false);
});
