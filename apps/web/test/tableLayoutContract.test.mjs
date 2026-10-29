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
  assert.match(interviews, /<th>Flow<\/th><th>Version<\/th>/);
  const routes = source('core/pages/PageRouteDirectory/PageRouteDirectory.tsx');
  assert.match(routes, /<th>Destination<\/th><th>Type<\/th><th>Destination API Name<\/th>/);
  const logs = source('core/automation/FlowLogs/FlowLogs.tsx');
  assert.match(logs, /<th scope="col">Flow<\/th>\s*<th scope="col">API Name<\/th>/);
  const triggers = source('core/automation/FlowTriggerExplorer/FlowTriggerExplorer.tsx');
  assert.match(triggers, /<th scope="col">Flow<\/th><th scope="col">API Name<\/th>/);
  const permissions = source('core/security/Permissions/permissionsView.tsx');
  assert.match(permissions, /<th>Object<\/th><th>API Name<\/th><th>Policy status<\/th>/);
  assert.match(permissions, /<th>Field<\/th><th>API Name<\/th>/);
  assert.doesNotMatch(permissions, /<td><strong>\{field\.label\}<\/strong><small>\{field\.apiName\}<\/small>/);
});
