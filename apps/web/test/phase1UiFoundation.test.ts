import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveSetupNavigation} from '../src/core/platform/Workspace/platformSetupNavigation';
import {appRoutePathWithoutBase} from '../src/core/workspace/Navigation/appRouting';

const read=(relative:string)=>readFileSync(new URL(relative,import.meta.url),'utf8');
const theme=read('../src/core/workspace/WorkspaceTheme/grokUiPolish.css');
const tokens=read('../src/core/workspace/WorkspaceTheme/design-system.css');
const density=read('../src/core/workspace/WorkspaceTheme/desktopDense.css');
const nav=read('../src/core/workspace/SetupShell/setupShellPresentation.tsx');

test('Setup search resolves nested security destinations and common terminology',()=>{
 for(const [query,target] of [
  ['connected apps','Connected Apps'],['oauth','Connected Apps'],['MFA','Security & Recovery'],
  ['session','Security & Recovery'],['audit','Audit Trail'],['company','Company Settings']
 ]){
  const items=resolveSetupNavigation(query,false).flatMap(group=>group.items);
  assert.ok(items.includes(target),query+' should locate '+target);
 }
 assert.deepEqual(resolveSetupNavigation('no-such-destination-xyz',false),[]);
});

test('Security deep links preserve destination in the existing metadata route',()=>{
 const path=appRoutePathWithoutBase({kind:'setup',workspace:'company-settings',
  resourceApiName:'security',resourceId:'connected-apps'});
 assert.equal(path,'/une/setup/company-settings/security/connected-apps');
 const source=read('../src/core/workspace/SetupShell/setupAppShell.tsx');
 assert.match(source,/resourceId:'connected-apps'/);
 assert.match(nav,/initialSection=\{route\.resourceApiName === 'security'/);
 assert.match(nav,/governanceTab=\{route\.resourceId === 'connected-apps'/);
 const governance=read('../src/core/settings/SettingsWorkspace/TenantGovernance.tsx');
 assert.match(governance,/useEffect\(\(\)=>setTab\(initialTab\),\[initialTab\]\)/);
});

test('Admin form primitives provide responsive widths, action separation and checkbox grids',()=>{
 for(const selector of ['.md-admin-form-grid','.md-admin-form-grid--3','.md-admin-field-short',
  '.md-admin-checkbox-grid','.md-admin-actions','.md-admin-table-wrap','.md-admin-table']){
  assert.ok(theme.includes(selector),selector);
 }
 assert.match(theme,/@media\(max-width:720px\)/);
 assert.match(tokens,/--md-form-short-width:220px/);
 assert.match(density,/--md-fs-body: 14px/);
 assert.match(density,/--md-fs-sm: 13px/);
 assert.doesNotMatch(theme,/\.free-canvas-component.*md-admin-form-grid/);
});

test('Actual administrative screens use shared layouts instead of overflowing single-column forms',()=>{
 const mfa=read('../src/core/settings/SettingsWorkspace/TenantMfaControls.tsx');
 const sessions=read('../src/core/settings/SettingsWorkspace/TenantSessionControls.tsx');
 const oauth=read('../src/core/settings/SettingsWorkspace/TenantConnectedApps.tsx');
 const oauthCss=read('../src/core/settings/SettingsWorkspace/TenantConnectedApps.css');
 const layout=read('../src/core/workspace/WorkspaceTheme/setupUsability.css');
 assert.match(mfa,/md-admin-actions/);
 assert.match(mfa,/<\/select><\/label>/);
 assert.match(mfa,/md-admin-form-grid/);
 assert.match(sessions,/md-admin-form-grid--3/);
 assert.match(oauth,/md-admin-form-grid/);
 assert.match(oauthCss,/grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,250px\),1fr\)\)/);
 assert.match(layout,/\.connected-apps-checklist \{/);
 assert.match(layout,/grid-template-columns: repeat\(auto-fit,minmax\(min\(100%,220px\),1fr\)\)/);
});

test('Audit tables and quick-find keep keyboard and long-identifier access',()=>{
 const gov=read('../src/core/settings/SettingsWorkspace/TenantGovernance.tsx');
 assert.match(gov,/role="region" aria-label="Setup audit events" tabIndex=\{0\}/);
 assert.match(gov,/data-long-id title=\{e.row_identifier\}/);
 assert.match(theme,/\.md-audit-table\{min-width:940px\}/);
 assert.match(nav,/id="md-setup-navigation"/);
 assert.match(nav,/htmlFor="md-setup-quickfind"/);
 assert.match(nav,/matching settings/);
 assert.match(nav,/Clear search/);
});
