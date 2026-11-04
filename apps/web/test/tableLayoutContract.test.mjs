import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');

test('workspace table behaviour is shared and lazy, without changing record-specific resizing', () => {
  const entry = source('main.tsx');
  const runtime = source('core/workspace/TableUsability/installWorkspaceTableResizing.ts');
  const css = source('core/workspace/TableUsability/tableResizing.css');
  assert.match(entry, /installWorkspaceTableResizing\(\)/);
  assert.match(runtime, /\.records-data-table/);
  assert.match(runtime, /role', 'separator'/);
  assert.match(runtime, /'pointermove'/);
  assert.match(runtime, /'ArrowRight'/);
  assert.match(css, /white-space: nowrap/);
  assert.match(css, /overflow-x: auto/);
});

test('page list has a compact leading Actions column without a frozen edge', () => {
  const styles = source('core/workspace/WorkspaceTheme/styles.css');
  const css = source('core/workspace/WorkspaceTheme/adminTableControls.css');
  const pages = source('core/builders/PageBuilder/pageBuilderView.tsx');
  const imports = [...styles.matchAll(/@import\s+["']([^"']+)["']/g)].map(match => match[1]);
  assert.equal(imports.at(-1), './adminTableControls.css', 'must load last so it wins the cascade');
  assert.match(css, /\.page-manager-table-scroll\s*\{[^}]*max-height/);
  assert.match(css, /thead th\s*\{[^}]*position:\s*sticky/);
  assert.doesNotMatch(css, /:last-child\s*\{[^}]*position:\s*sticky/);
  assert.match(css, /--md-actions-col-width:\s*152px/);
  assert.match(css, /\.page-manager-icon-action\s*\{[^}]*width:\s*32px/);
  assert.match(css, /\.page-status-badge\s*\{[^}]*min-width[^}]*height/);
  assert.match(pages, /<thead><tr><th scope="col" className="page-manager-actions-heading">Actions<\/th><th>Page name<\/th>/);
  assert.match(pages, /<tbody>\{paginatedPages\.map\(item=><tr key=\{item\.apiName\}>\s*<td className="page-manager-actions">/);
  assert.match(pages, /<div className="page-manager-action-icons" role="group" aria-label=/);
  assert.match(pages, /aria-pressed=\{item\.status==='Active'\}/);
  assert.match(pages, /<Pencil size=\{16\}\/>/);
  assert.match(pages, /<PanelsTopLeft size=\{16\}\/>/);
  assert.match(pages, /<Power size=\{16\}\/>/);
  assert.match(pages, /<Trash2 size=\{16\}\/>/);
});

test('independent values have independent labelled table columns', () => {
  const pages = source('core/builders/PageBuilder/pageBuilderView.tsx');
  assert.match(pages, /<th>Page name<\/th><th>API Name<\/th>/);
  assert.doesNotMatch(pages, /page-manager-page-link[^\n]*<small>\{item\.apiName\}/);

  const apps = source('core/applications/AppManagerList/AppManagerList.tsx');
  assert.match(apps, /<th scope="col">Description<\/th>/);
  assert.doesNotMatch(apps, /<small>\{app\.description\}/);

  const tenants = source('core/platform/TenantManagement/TenantManagement.tsx');
  assert.match(tenants, /<th>Organisation<\/th><th>Tenant ID<\/th>/);
  assert.doesNotMatch(tenants, /<small>\{item\.tenantId\}/);

  const interviews = source('core/automation/FlowInterviews/FlowInterviews.tsx');
  assert.match(interviews, /<th scope="col">Flow<\/th><th scope="col">Version<\/th>/);
  const routes = source('core/pages/PageRouteDirectory/PageRouteDirectory.tsx');
  assert.match(routes, /<th>Destination<\/th><th>Type<\/th><th>Destination API Name<\/th>/);
  const logs = source('core/automation/FlowLogs/FlowLogs.tsx');
  assert.match(logs, /<th scope="col">Flow<\/th>\s*<th scope="col">API Name<\/th>/);
  const triggers = source('core/automation/FlowTriggerExplorer/FlowTriggerExplorer.tsx');
  assert.match(triggers, /<th scope="col">Flow<\/th><th scope="col">API Name<\/th>/);
  const permissions = source('core/security/Permissions/permissionsView.tsx');
  assert.match(permissions, /<th scope="col">Object<\/th><th scope="col">API Name<\/th><th scope="col">Policy status<\/th>/);
  assert.match(permissions, /<th scope="col">Field<\/th><th scope="col">API Name<\/th>/);
  assert.match(permissions, /<th scope="col">Mute Create<\/th><th scope="col">Mute Read<\/th><th scope="col">Mute Edit<\/th><th scope="col">Mute Delete<\/th>/);
  assert.match(permissions, /\(\['create', 'read', 'edit', 'delete'\] as const\)\.map\(\(permission\)/);
  assert.doesNotMatch(permissions, /<td><strong>\{field\.label\}<\/strong><small>\{field\.apiName\}<\/small>/);
});
