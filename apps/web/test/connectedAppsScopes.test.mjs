import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('OAuth scopes are grouped from the SQL catalogue, not hardcoded in the UI',()=>{
 const client=read('../src/core/settings/SettingsWorkspace/TenantConnectedApps.tsx');
 const service=read('../../server/src/system-support/connected-app-service.ts');
 const catalogue=read('../../server/src/system-support/migrations/20270212-grouped-oauth-scope-catalogue.sql');
 assert.match(client,/data\?\.scopeGroups/);
 assert.match(client,/Select entire group/);
 assert.match(client,/Clear group/);
 assert.match(client,/disabled=\{!item\.assignable\}/);
 assert.match(client,/role="status"/);
 assert.match(service,/FROM md_oauth_scope_catalogue/);
 assert.match(service,/scope=ANY\(\$1::text\[\]\)/);
 assert.match(catalogue,/CREATE TABLE IF NOT EXISTS md_oauth_scope_routes/);
 assert.match(catalogue,/FOREIGN KEY\(scope\) REFERENCES md_oauth_scope_catalogue/);
 assert.doesNotMatch(client,/scopes:\s*\['records:read','records:write'/);
});

test('scope catalogue includes Core, Builders, Flows, Records and reserved diagnostics',()=>{
 const sql=read('../../server/src/system-support/migrations/20270212-grouped-oauth-scope-catalogue.sql');
 for(const scope of ['records:read','records:write','objects:manage','pages:manage',
  'components:manage','flows:manage','actions:manage','dashboards:manage','reports:manage',
  'licensing:manage','apps:manage','security:manage','audit:export','mcp:access']){
  assert.ok(sql.includes("'"+scope+"'"),scope);
 }
 assert.match(sql,/sql:diagnostics.*false\)/);
 assert.match(sql,/JOIN md_oauth_client_scopes allowed/);
 assert.match(sql,/JOIN md_oauth_scope_catalogue cat/);
 assert.match(sql,/path ~ r\.path_regex/);
 assert.match(sql,/services\/data\/v/,'compatibility with existing Salesforce API token scopes');
});
