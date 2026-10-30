import assert from 'node:assert/strict';

export async function runFieldCatalogueBrowserCheck({page,origin,db,tenantId}){
 const objectApi='Browser_Fields__c';
 await page.goto(origin+'/une/setup/object-manager',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Object Manager',exact:true}).waitFor({timeout:15000});
 await page.getByRole('button',{name:'New Object',exact:true}).first().click();
 const objectWizard=page.getByRole('dialog',{name:'New Custom Object'});
 await objectWizard.getByLabel('Label',{exact:true}).fill('Browser Fields');
 await objectWizard.getByLabel('Plural Label',{exact:true}).fill('Browser Fields');
 await objectWizard.getByLabel('Record Name Label',{exact:true}).fill('Field Name');
 const created=page.waitForResponse(r=>r.url().endsWith('/api/metadata/objects')&&r.request().method()==='POST');
 await objectWizard.getByRole('button',{name:'Save',exact:true}).click();
 assert.equal((await created).status(),201,'Object Manager object create failed');
 await page.getByText('Object definition · Read only').waitFor({timeout:15000});
 const openField=async()=>{
  await page.getByRole('button',{name:'Object actions'}).click();
  await page.getByRole('button',{name:'New Field',exact:true}).click();
  const wizard=page.getByRole('dialog',{name:'New Field'});
  await wizard.waitFor({timeout:10000});
  return wizard;
 };
 const add=async(type,label,setup)=>{
  const wizard=await openField();
  await wizard.getByLabel('Data Type').selectOption({label:type});
  await wizard.getByRole('button',{name:'Next'}).click();
  await wizard.getByLabel('Field Label').fill(label);
  await setup(wizard);
  await wizard.getByRole('button',{name:'Next'}).click();
  await wizard.getByRole('button',{name:'Next'}).click();
  const response=page.waitForResponse(r=>r.url().endsWith('/api/metadata/objects/'+objectApi+'/fields')
    &&r.request().method()==='POST');
  await wizard.getByRole('button',{name:'Save Field'}).click();
  assert.equal((await response).status(),201,'Field wizard save API failed for '+label);
  await wizard.waitFor({state:'detached',timeout:10000});
 };
 await add('Text','ERP External',async wizard=>{
  await wizard.getByLabel('External ID').check();
  await wizard.getByLabel('Default Value').fill('EXT-1');
 });
 await add('Text','Ticket Code',async wizard=>{
  await wizard.getByLabel('Unique').check();
 });
 await add('Date/Time','Start At',async wizard=>{
  await wizard.getByLabel('Default Value').fill('2026-10-30T15:30');
 });
 const {rows}=await db.query("SELECT api_name,data_type,is_unique,external_id,default_value FROM md_field_definitions WHERE tenant_id=$1 AND object_api=$2 ORDER BY api_name",[tenantId,objectApi]);
 const ext=rows.find(f=>f.api_name==='ERP_External__c');
 const unique=rows.find(f=>f.api_name==='Ticket_Code__c');
 const datetime=rows.find(f=>f.api_name==='Start_At__c');
 assert.ok(ext,'External ID field was not persisted via UI');
 assert.equal(ext.external_id,true);
 assert.equal(ext.is_unique,false,'External ID must not silently enforce Unique');
 assert.equal(ext.default_value,'EXT-1');
 assert.ok(unique&&unique.is_unique,'Unique attribute not persisted');
 assert.ok(datetime&&datetime.data_type==='datetime'&&datetime.default_value.endsWith('Z'),
  'Local DateTime default was not normalized to UTC before API save');
 console.info('Phase 2B browser UI -> API -> SQL field defaults/unique/external ID passed');
}
