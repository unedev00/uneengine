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
 assert.match(nav,/initialSection=\{route\.resourceApiName\}/);
 assert.match(nav,/onSelectSection=\{\(section\)=>navigateRoute/);
 for(const section of ['general','currency','branding','business','contacts','mobile','integrations','security','developer']) {
  assert.equal(appRoutePathWithoutBase({kind:'setup',workspace:'company-settings',resourceApiName:section}),'/une/setup/company-settings/'+section);
 }
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

test('Offline briefcase enforces server caps with correct whitespace parsing',()=>{
 const offline=read('../src/core/platform/OfflineBriefcaseSettings/OfflineBriefcaseSettings.tsx');
 const picker=read('../src/core/platform/OfflineBriefcaseSettings/OfflineRecordPicker.tsx');
 assert.ok(offline.includes(String.raw`row.recordIdsText.split(/[\s,]+/)`),
  'Record IDs separated by newlines must be counted as separate selections');
 assert.ok(!offline.includes(String.raw`row.recordIdsText.split(/[\\s,]+/)`),
  'Do not match literal backslashes in record ID validation');
 assert.match(offline,/ids\.length <= 50/);
 assert.match(offline,/total>=100/);
 assert.match(picker,/onToggle\(record\.Id, event\.target\.checked\)/);
});

test('Related records and recycle bin never render inverted ranges on empty pages',()=>{
 const records=read('../src/core/records/RecordWorkspace/recordWorkspaceViews.tsx');
 assert.match(records,/loaded === 0 \? `0–0 of \$\{total\}`/);
 assert.match(records,/recycleRows\.length === 0 \? `0–0 of \$\{recycleTotal\}`/);
});

test('Mobile permission list and detail follow addressable routes',()=>{
 const permissions=read('../src/core/security/Permissions/permissionsView.tsx');
 assert.match(permissions,/setMobilePermissionDetail\(Boolean\(routeResourceId\)\)/);
 assert.match(permissions,/\[routeResourceApiName,routeResourceId\]/);
 assert.match(permissions,/viewportWidth < 1024 && \(nextTab==='sets'\|\|nextTab==='users'\) \? undefined : initialId/);
});

test('Mobile Flow Builder provides an explicit way back to the flow list',()=>{
 const flow=read('../src/core/builders/FlowBuilder/editor/FlowBuilderWorkspace.tsx');
 const scheduled=read('../src/core/automation/ScheduledFlows/ScheduledFlows.tsx');
 assert.match(flow, /flow-phone-top-actions[\s\S]*onClick=\{onOpenFlowList\}[\s\S]*Back to flows/);
 assert.match(scheduled, /className="btn btn-link" onClick=\{\(\) => selectView\('triggers'\)\}/);
 assert.match(scheduled, /view === 'triggers' \? 'Flow Trigger Explorer' : 'Scheduled Flows'/);
});

test('Company currency settings can retry failed loads without leaking SQL errors',()=>{
 const settings=read('../src/core/settings/SettingsWorkspace/settingsWorkspaceViews.tsx');
 assert.match(settings,/const \[currencyRetry,setCurrencyRetry\]=useState\(0\)/);
 assert.match(settings,/\}, \[currencyRetry\]\)/);
 assert.match(settings,/Retry loading currency settings/);
 assert.match(settings,/currencyFailureMessage\(saveError\)/);
});

test('Phone Flow Builder controls wrap instead of clipping at 390px',()=>{
 const css=read('../src/core/builders/FlowBuilder/FlowBuilderMobile.css');
 assert.match(css,/\.flow-phone-top-actions\{[^}]*flex-wrap:wrap/);
 assert.match(css,/\.flow-phone-top-actions p\{[^}]*flex:1 0 100%/);
 assert.match(css,/\.flow-phone-top-actions button\{[^}]*flex:1 1 120px/);
});

test('Permission Save remains disabled after a user restores the original draft',()=>{
 const src=read('../src/core/security/Permissions/permissionsView.tsx');
 assert.match(src,/const permissionDirty=useMemo\(\(\)=>JSON\.stringify\(draft\)!==JSON\.stringify\(savedDraft\)/);
 assert.doesNotMatch(src,/draft===savedDraft/);
 assert.match(src,/disabled=\{saving \|\| !permissionDirty \|\| Boolean\(accessControlError\)\}/);
});

test('Permission Set Group advanced muting editors are six independent collapsible sections',()=>{
 const permissions=read('../src/core/security/Permissions/permissionsView.tsx');
 const group=permissions.split("{tab === 'groups' && selectedGroup && <>")[1]?.split("{tab === 'users' && <>")[0]??'';
 const summaries=[...group.matchAll(/<details className="md-permission-collapsible md-permission-group-advanced"><summary>([^<]+)<\/summary>/g)].map(match=>match[1]);
 assert.deepEqual(summaries,[
  'Muted System Permissions','Muted Application Access','Muted Tab Visibility',
  'Muted Object Permissions','Muted Record Type Access','Muted Field Permissions'
 ]);
 assert.match(group,/ObjectPermissionPhoneList/);
 assert.match(group,/selectedGroup\.mutedFieldPermissions/);
});

test('Business calendar load failures are safe and can be retried without saving defaults',()=>{
 const calendar=read('../src/core/platform/BusinessCalendarSettings/BusinessCalendarSettings.tsx');
 assert.match(calendar,/businessCalendarFailure\(cause,'Unable to load business calendar'\)/);
 assert.match(calendar,/businessCalendarFailure\(cause,'Unable to save business calendar'\)/);
 assert.match(calendar,/!loading&&!loaded&&<button type="button" className="btn" onClick=\{\(\)=>setRevision\(value=>value\+1\)\}/);
 assert.match(calendar,/Retry loading business calendar/);
 assert.match(calendar,/!loading && loaded && !configured/);
});

test('Profile permission editors collapse all long tables and preserve underlying policy controls',()=>{
 const src=read('../src/core/security/Permissions/permissionsView.tsx');
 const profile=src.split("{tab === 'profiles' && selectedProfile && <>")[1]?.split("{tab === 'sets' && selectedSet && <>")[0]??'';
 const groups=[...profile.matchAll(/<details className="md-permission-collapsible md-profile-advanced"><summary>([^<]+)<\/summary>/g)].map(match=>match[1]);
 assert.deepEqual(groups,['Advanced permission rules','System Permissions','Application Access','Tab Visibility','Object Permissions','Record Type Access','Field Permissions']);
 assert.match(profile,/selectedProfile\.objectPermissions/);
 assert.match(profile,/selectedProfile\.recordTypePermissions/);
 assert.match(profile,/selectedProfile\.fieldPermissions/);
});

test('Laptop record rows prioritise identity and a compact action menu',()=>{
 const records=read('../src/core/records/RecordWorkspace/recordWorkspaceViews.tsx');
 const styles=read('../src/core/records/RecordWorkspace/recordsListToolbar.css');
 assert.match(records,/viewportWidth>0&&viewportWidth<=1200\)\)\?listFields\.slice\(0,5\)/);
 assert.match(records,/viewportWidth>0&&viewportWidth<=1200\s*\?\s*<details className="record-row-actions-menu">/);
 assert.match(records,/aria-label=\{`Actions for \$\{String\(item\.Name \?\? item\.Id\)\}`\}/);
 assert.match(styles,/\.record-row-actions-menu>summary/);
 assert.match(styles,/\.record-row-actions-menu>div>button/);
});
test('Tablet security and setup audit rows are labelled cards with no clipped 920px table',()=>{
 const styles=read('../src/core/workspace/WorkspaceTheme/phase2AdminLayout.css');
 assert.match(styles,/@media\(max-width:899px\)\{\s*\.lightning \.md-admin-table-wrap:has\(\.md-audit-table\)/);
 assert.match(styles,/@media\(min-width:900px\)\{\s*\.lightning \.md-audit-table\{min-width:920px/);
 assert.match(styles,/\.md-audit-table td::before\{content:attr\(data-label\)/);
});
