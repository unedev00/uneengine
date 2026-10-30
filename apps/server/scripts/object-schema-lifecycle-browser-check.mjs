import assert from 'node:assert/strict';

/** Real browser Object Manager -> API -> SQL lifecycle, inside disposable tenant smoke. */
export async function runObjectSchemaLifecycleBrowserCheck({page,origin,db,tenantId}){
 const objectApi='Browser_Lifecycle__c';
 await page.goto(origin+'/une/setup/object-manager',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Object Manager',exact:true}).waitFor({timeout:15000});
 await page.getByRole('button',{name:'New Object',exact:true}).first().click();
 const wizard=page.getByRole('dialog',{name:'New Custom Object'});
 await wizard.getByLabel('Label',{exact:true}).fill('Browser Lifecycle');
 await wizard.getByLabel('Plural Label',{exact:true}).fill('Browser Lifecycles');
 await wizard.getByLabel('Record Name Label',{exact:true}).fill('Lifecycle Name');
 await wizard.getByLabel('Description',{exact:true}).fill('2A browser-created object');
 const create=page.waitForResponse(response=>response.url().endsWith('/api/metadata/objects')
   &&response.request().method()==='POST');
 await wizard.getByRole('button',{name:'Save',exact:true}).click();
 assert.equal((await create).status(),201,'Object Manager object creation failed');
 await page.getByText('Object definition · Read only').waitFor({timeout:15000});
 assert.equal((await db.query('SELECT label FROM md_object_definitions WHERE tenant_id=$1 AND api_name=$2',
   [tenantId,objectApi])).rows[0]?.label,'Browser Lifecycle');
 await page.getByRole('button',{name:'Edit',exact:true}).click();
 await page.getByRole('heading',{name:'Edit Details'}).waitFor({timeout:15000});
 await page.getByLabel('Label',{exact:true}).fill('Browser Lifecycle Updated');
 const update=page.waitForResponse(response=>response.url().endsWith('/api/metadata/objects/'+objectApi)
   &&response.request().method()==='PUT');
 await page.getByRole('button',{name:'Save',exact:true}).click();
 assert.equal((await update).status(),200,'Object Manager object label edit failed');
 assert.equal((await db.query('SELECT label FROM md_object_definitions WHERE tenant_id=$1 AND api_name=$2',
   [tenantId,objectApi])).rows[0]?.label,'Browser Lifecycle Updated');
 await page.getByRole('button',{name:'Object actions'}).click();
 await page.getByRole('button',{name:'Delete Object',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:/Delete Browser Lifecycle Updated/});
 await dialog.getByText(/No blocking references found/).waitFor({timeout:15000});
 const deletion=page.waitForResponse(response=>response.url().endsWith('/api/metadata/objects/'+objectApi)
   &&response.request().method()==='DELETE');
 await dialog.getByRole('button',{name:'Delete Object'}).click();
 assert.equal((await deletion).status(),200,'Object Manager delete failed');
 assert.ok((await db.query('SELECT deleted_at FROM md_object_definitions WHERE tenant_id=$1 AND api_name=$2',
   [tenantId,objectApi])).rows[0]?.deleted_at);
 await page.goto(origin+'/une/setup/object-manager',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Object Manager',exact:true}).waitFor({timeout:15000});
 await page.getByRole('button',{name:'Deleted Objects'}).click();
 const deletedRow=page.getByRole('row').filter({hasText:objectApi});
 await deletedRow.getByText(objectApi,{exact:true}).waitFor({timeout:15000});
 const restore=page.waitForResponse(response=>response.url().endsWith('/api/metadata/objects/'+objectApi+'/restore')
   &&response.request().method()==='POST');
 await deletedRow.getByRole('button',{name:'Restore'}).click();
 assert.equal((await restore).status(),200,'Object Manager restore failed');
 assert.equal((await db.query('SELECT deleted_at FROM md_object_definitions WHERE tenant_id=$1 AND api_name=$2',
   [tenantId,objectApi])).rows[0]?.deleted_at,null);
 console.info('Phase 2A browser Object Manager create/edit/delete/restore SQL E2E passed');
}
