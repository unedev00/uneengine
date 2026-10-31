import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const css=read('../src/core/workspace/WorkspaceTheme/phase2AdminLayout.css');

test('Phase 2 admin styles load only inside authenticated workspace after shared theme polish',()=>{
 const startup=read('../src/main.tsx');
 const workspace=startup.indexOf('const Workspace = lazy(async () => {');
 const shared=startup.indexOf("await import('./core/workspace/WorkspaceTheme/grokUiPolish.css')");
 const phase2=startup.indexOf("await import('./core/workspace/WorkspaceTheme/phase2AdminLayout.css')");
 const runtime=startup.indexOf("return import('./core/workspace/App/App')");
 assert.ok(workspace>=0&&workspace<shared&&shared<phase2&&phase2<runtime);
 assert.match(css,/Published Page Runtime and Builder canvases are excluded/);
 assert.doesNotMatch(css,/[.]page-runtime|[.]page-canvas|[.]properties-panel/);
});

test('Security governance tabs are accessible and long audit tables remain scrollable',()=>{
 const s=read('../src/core/settings/SettingsWorkspace/TenantGovernance.tsx');
 assert.match(s,/role="tablist" aria-label="Security governance views"/);
 assert.match(s,/role="tabpanel"/);
 assert.match(s,/aria-selected=\{tab===t\}/);
 assert.match(s,/md-admin-toolbar/);
 assert.match(s,/md-admin-subheading/);
 assert.match(s,/md-admin-empty-row/);
 assert.match(css,/\.lightning \.md-admin-tabstrip/);
 assert.match(css,/\.lightning \.md-admin-table-wrap/);
});

test('Licensing, SSO, password and session administration use compact accessible grids',()=>{
 const licences=read('../src/core/settings/SettingsWorkspace/TenantLicenses.tsx');
 const federation=read('../src/core/settings/SettingsWorkspace/TenantFederationControls.tsx');
 const password=read('../src/core/settings/SettingsWorkspace/TenantPasswordPolicy.tsx');
 const session=read('../src/core/settings/SettingsWorkspace/TenantSessionControls.tsx');
 assert.match(licences,/md-admin-licence-assignments/);
 assert.match(licences,/md-admin-issuer/);
 assert.match(licences,/md-admin-checkbox-grid/);
 assert.match(federation,/md-admin-entity-row/);
 assert.match(federation,/md-admin-form-grid/);
 assert.match(password,/md-admin-password-grid/);
 assert.match(password,/checkbox-row md-admin-boolean-option/);
 assert.match(session,/md-admin-restriction-grid/);
 assert.match(css,/@media\(max-width:720px\)/);
});

test('RBAC matrices and Named Credential dialog remain keyboard reachable without inline geometry',()=>{
 const rbac=read('../src/core/security/Permissions/permissionsView.tsx');
 const credentials=read('../src/core/integrations/NamedCredentials/NamedCredentials.tsx');
 assert.match(rbac,/role="region" aria-label="Object permission matrix" tabIndex=\{0\}/);
 assert.match(rbac,/scope="col"/);
 assert.match(credentials,/aria-label="Named Credential connections" tabIndex=\{0\}/);
 assert.doesNotMatch(credentials,/named-credential-modal" style=\{\{/);
 assert.doesNotMatch(credentials,/named-credential-form-grid" style=\{\{/);
 assert.match(css,/\.lightning \.named-credential-modal/);
 assert.match(css,/\.lightning \.permissions-page \.permission-check-grid/);
});

test('Company, App Manager and automation pages inherit tenant tokens, not tiny help text',()=>{
 const company=read('../src/core/settings/CompanySettingsWorkspace/CompanySettingsWorkspace.css');
 const manager=read('../src/core/applications/AppManager/AppManagerLayout.css');
 const interviews=read('../src/core/automation/FlowInterviews/FlowInterviews.tsx');
 assert.match(company,/company-workspace-section-general \.company-profile-logo/);
 assert.match(company,/var\(--md-surface,#fff\)/);
 assert.match(manager,/var\(--md-label-size,13px\)/);
 assert.match(interviews,/aria-label="Paused and waiting Flow interviews"/);
 assert.match(interviews,/aria-label="Failed durable Flow jobs"/);
 assert.match(css,/\.lightning \.app-exchange/);
 assert.match(css,/\.lightning \.tenant-domains/);
});
