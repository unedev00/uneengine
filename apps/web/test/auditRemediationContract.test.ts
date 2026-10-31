import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
test('brand primary action uses accessible dark fill, not light accent behind white text',()=>{
 const css=read('../src/core/workspace/WorkspaceTheme/grokUiPolish.css');
 assert.match(css,/\.lightning \.btn-brand \{\s*background: var\(--md-action-fill/);
 assert.doesNotMatch(css,/\.lightning \.btn-brand \{\s*background: var\(--md-primary/);
});
test('Connected Apps includes searchable directory, user picker and consent warnings',()=>{
 const source=read('../src/core/settings/SettingsWorkspace/TenantConnectedApps.tsx');
 assert.match(source,/Find connected app/);
 assert.match(source,/Find user/);
 assert.match(source,/Browse applications/);
 assert.match(source,/New connected app/);
 assert.match(source,/Existing user consents will be revoked/);
 assert.match(source,/existing user consents|Existing user consents/);
 const css=read('../src/core/settings/SettingsWorkspace/TenantConnectedApps.css');
 assert.match(css,/connected-apps-directory-grid/);
});
test('security history is server-paged, permission checked and filterable',()=>{
 const view=read('../src/core/settings/SettingsWorkspace/settingsWorkspaceViews.tsx');
 const backend=read('../../../server/src/system-support/server.ts');
 assert.match(view,/\/auth\/security-events\?\x27\+query\.toString\(\)/);
 for(const field of ["'action'","'identifier'","'ip'","'from'","'to'"])assert.ok(view.includes(field));
 assert.match(view,/nextOffset!==null/);
 assert.match(backend,/\x27Security\x27,\x27read\x27/);
 assert.match(backend,/tenant_id=\$1/);
 assert.match(backend,/ORDER BY created_at DESC,id DESC LIMIT/);
 assert.match(backend,/ILIKE/);
 assert.match(backend,/offset>100000/);
});
test('security settings no longer load a monolithic stack; mobile audit has labels',()=>{
 const company=read('../src/core/settings/CompanySettingsWorkspace/CompanySettingsWorkspace.tsx');
 const views=read('../src/core/settings/SettingsWorkspace/settingsWorkspaceViews.tsx');
 assert.match(company,/company-security-tab-/);
 assert.match(company,/securityView===\x27history\x27/);
 assert.match(views,/security-tab-/);
 const tables=read('../src/core/settings/SettingsWorkspace/TenantGovernance.tsx');
 assert.match(tables,/data-label="Changed fields"/);
 assert.match(tables,/data-label="Milliseconds"/);
 const css=read('../src/core/workspace/WorkspaceTheme/phase2AdminLayout.css');
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/\.md-audit-table td::before/);
});
test('Till secondary display inherits appearance; all modal types use shared focus management',()=>{
 const till=read('../../acetill/src/AcetillTerminal.tsx');
 const doc=read('../../aceassist/src/FinancialDocumentEditor.tsx');
 const hook=read('../src/core/accessibility/useModalFocus.ts');
 assert.match(till,/themeValue\(\x27--md-action-ink\x27/);
 assert.match(till,/--display-bg/);
 assert.match(till,/pinSetupDialogRef/);
 assert.match(till,/lockedDialogRef/);
 assert.match(till,/ageDialogRef/);
 assert.match(doc,/documentDialogRef/);
 assert.match(doc,/customerDialogRef/);
 assert.match(hook,/document\.addEventListener\(\x27keydown\x27,onKey,true\)/);
 assert.match(hook,/previous\.focus\(\)/);
});
test('Assist small captions and Report/Object Manager data grids have accessibility standards',()=>{
 const assist=read('../../aceassist/src/aceassist.css');
 assert.doesNotMatch(assist,/font-size:(?:9|10|11)px/);
 for(const p of [
   '../src/core/builders/ReportBuilder/reportBuilderView.tsx',
   '../src/core/builders/ObjectManager/GlobalValueSetManager.tsx',
   '../src/core/builders/ObjectManager/CustomMetadataManager.tsx'
 ]){
   const source=read(p);assert.match(source,/role="region"/);assert.match(source,/tabIndex=\{0\}/);
   assert.match(source,/scope="col"/);
 }
});
