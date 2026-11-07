import { readPageBuilderModules } from '../../../web/test/helpers/builderSources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name:string)=>readFileSync(new URL(name,import.meta.url),'utf8');
test('Page Details edit uses scoped metadata and OneEngine without rewriting a canvas',()=>{
 const source=read('../../src/api/PageDetailsController.ts');
 assert.match(source,/app\.patch\('\/api\/metadata\/pages\/:apiName\/details'/);
 assert.match(source,/authenticated\(req\)/);
 assert.match(source,/rbac\.require\(actor\.tenant_id,actor\.user_id,'PageDefinition','manage'\)/);
 assert.match(source,/assertMetadataPackageEditable\(db,actor\.tenant_id,'page',pageApi\)/);
 assert.match(source,/AppExchange','manage'/);
 assert.match(source,/'App:'\+appName,'manage'/);
 assert.match(source,/md_app_installations/);
 assert.match(source,/md_app_entitlements/);
 assert.match(source,/e\.active=true AND \(e\.expires_at IS NULL/);
 assert.match(source,/p\.tenant_id=\$1 AND p\.api_name=\$2/);
 assert.match(source,/FOR UPDATE OF p,d/);
 assert.match(source,/row\.title!==expectedLabel/);
 assert.match(source,/set_config\('metadrive.actor_user'/);
 assert.match(source,/md_tenant_app_navigation/);
 assert.match(source,/md_lightning_page_activation/);
 assert.match(source,/md_page_definitions SET title=/);
 assert.match(source,/assertNoUnmanagedPageReferences/);
 assert.match(source,/nextApiName/);
 assert.match(source,/md_tenant_app_navigation SET api_name=/);
 assert.doesNotMatch(source,/DELETE FROM md_page_layout_versions|DELETE FROM md_lightning_page_nodes|DELETE FROM md_page_layout_version_nodes|UPDATE md_page_layout_heads/);
 assert.doesNotMatch(source,/req\.body\.tenant_id|req\.body\.app_id|const appId=req\.body/);
});
test('Page identity remains canonical through drafts, published layouts and future publishing',()=>{
 const runtime=read('../../src/system-files/page-layout-version-runtime.ts');
 assert.match(runtime,/label:base\.label/);
 assert.match(runtime,/base\.pageType==='App Page'/);
 assert.match(runtime,/type\.rows\[0\]\?\.page_type==='App Page'&&existing\.rows\.length/);
 assert.doesNotMatch(runtime,/UPDATE md_page_definitions SET title=\$3/);
});
test('Page Details dialog appears in Page Manager and editor, without changing API identity',()=>{
 const view=readPageBuilderModules();
 const dialog=read('../../../web/src/core/builders/PageBuilder/PageDetailsDialog.tsx');
 const presentation=read('../../../web/src/core/workspace/SetupShell/setupShellPresentation.tsx');
 const shell=read('../../../web/src/core/workspace/SetupShell/setupAppShell.tsx');
 assert.match(view,/Edit page properties for /);
 assert.match(view,/Edit page properties and versions/);
 assert.match(view,/<PageDetailsDialog/);
 assert.match(view,/onSave=\{onUpdatePageDetails\}/);
 assert.match(dialog,/Lowercase only/);
 assert.match(dialog,/page\.apiName/);
 assert.match(dialog,/Assign page to app/);
 assert.match(dialog,/page\.pageType==='App Page'/);
 assert.match(presentation,/onUpdatePageDetails=\{updatePageDetailsFromBuilder\}/);
 assert.match(shell,/method:'PATCH'/);
 assert.match(shell,/setPages\(current=>current\.map/);
 assert.match(shell,/setPage\(current=>current\.apiName===apiName/);
 assert.match(shell,/apiRequest<\{apps:LightningAppMetadata\[\]\}>\('\/metadata\/apps'\)/);
});

test('Page device flags are guarded SQL metadata, not component or canvas changes',()=>{
 const api=read('../../src/api/PageDetailsController.ts');
 const page=read('../../src/system-files/page-runtime.ts');
 const dialog=read('../../../web/src/core/builders/PageBuilder/PageDetailsDialog.tsx');
 const shell=read('../../../web/src/core/workspace/SetupShell/setupAppShell.tsx');
 assert.match(api,/deviceChoices=\['Desktop','Tablet','Phone','Custom'\]/);
 assert.match(api,/validDeviceList\(devices\)/);
 assert.match(api,/new Set\(value\)\.size===value\.length/);
 assert.match(api,/expectedDevices/);
 assert.match(api,/Page device settings changed\. Reload before saving/);
 assert.match(api,/SET devices=\$3::text\[\],updated_at=now\(\)/);
 assert.match(api,/UPDATE md_lightning_page_activation SET/);
 assert.match(api,/page\.page_type==='App Page'&&deviceChangeRequested/);
 assert.match(api,/'AppExchange','manage'/);
 assert.match(api,/'App:'\+appName,'manage'/);
 assert.match(api,/rbac\.require\(actor\.tenant_id,actor\.user_id,'PageDefinition','manage'\)/);
 assert.match(api,/assertMetadataPackageEditable/);
 assert.doesNotMatch(api,/DELETE FROM md_page_layout_versions/);
 assert.match(page,/new Set\(p\.devices\)\.size!==p\.devices\.length/);
 assert.match(dialog,/aria-label="Page enabled devices"/);
 assert.match(dialog,/page\.devices\)/);
 assert.match(shell,/devices:updated\.devices/);
});

test('Disabled page devices are excluded from resolved routes without deleting assignments',()=>{
 const pages=read('../../src/system-files/page-runtime.ts');
 const apps=read('../../src/system-files/app-runtime.ts');
 for(const factor of ['\\$6=ANY\\(d\\.devices\\)','\\$4=ANY\\(d\\.devices\\)'])
  assert.match(pages,new RegExp(factor));
 assert.match(apps,/=ANY\(d\.devices\)/);
 assert.match(apps,/=ANY\(home_detail\.devices\)/);
 assert.doesNotMatch(apps,/DELETE FROM md_lightning_page_activation/);
});
