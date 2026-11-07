import {readRetiredMigration} from '../../../scripts/read-retired-migration.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {setupMenuTokens,canSeeSetupItem,canOpenSetupRoute} from '../src/core/platform/Workspace/setupNavigationAccess';

const root=new URL('../../../',import.meta.url);
const server=(relative:string)=>readFileSync(new URL('apps/server/src/'+relative,root),'utf8');

test('Every Setup destination has a registered OneEngine navigation permission',()=>{
  const resourceMap=server('system-support/permission-resource-map.ts');
  const sql=readRetiredMigration('20261105-setup-menu-permissions.sql');
  for(const [label,tokens] of Object.entries(setupMenuTokens)){
    assert.ok(tokens.length>0,label);
    for(const token of tokens){
      assert.ok(resourceMap.includes("'"+token+"':"),token+' not registered in OneEngine');
      assert.ok(sql.includes("'"+token+"'"),token+' missing from permission catalogue');
    }
  }
});

test('Role visibility follows least-privilege matrix, not general metadata privileges',()=>{
  const administrator=['CompanySettings','SecurityRecovery','ConnectedApps','AuditTrail',
    'ObjectManager','Records','DataLoader','AppExchange','ReportsView','ReportsBuilder',
    'DashboardsView','DashboardBuilder','Users','Roles','Profiles','PermissionSets','PermissionSetGroups'];
  const developer=[...administrator,'AppManager','NamedCredentials','WebhookEndpoints','Flows',
    'PausedInterviews','ScheduledFlows','FlowHistory','ProcessAutomation','PublicGroups',
    'SharingSettings','SharingRules'];
  const user=['Records','ReportsView','DashboardsView'];
  const checks:readonly [string,readonly string[]][]=[
    ['Tenant Management',[]],
    ['Company Settings',['Administrator','Developer']],
    ['App Manager',['Developer']],
    ['Named Credentials',['Developer']],
    ['Flow History',['Developer']],
    ['Users',['Administrator','Developer']],
    ['Public Groups',['Developer']],
    ['Sharing Rules',['Developer']],
    ['Reports Builder',['Administrator','Developer']],
    ['Reports View',['Administrator','Developer','User']],
    ['Dashboard Builder',['Administrator','Developer']],
    ['Dashboard View',['Administrator','Developer','User']],
    ['Records',['Administrator','Developer','User']],
    ['Page Builder',[]]
  ];
  const groups:Record<string,string[]>={Administrator:administrator,Developer:developer,User:user};
  const toGrants=(keys:readonly string[])=>keys.map(k=>'setup:'+k+':view');
  for(const [label,allowed] of checks){
    for(const [role,keys] of Object.entries(groups))
      assert.equal(canSeeSetupItem(label,toGrants(keys)),allowed.includes(role),role+' '+label);
  }
  assert.equal(canSeeSetupItem('Setup Home',[]),true);
  assert.equal(canSeeSetupItem('Tenant Management',['setup:TenantManagement:view']),true);
  assert.equal(canSeeSetupItem('Unknown Admin Page',[]),false);
});

test('Deep links fail closed and report/dashboard view grants do not reveal admin pages',()=>{
  const user=['setup:Records:view','setup:ReportsView:view','setup:DashboardsView:view'];
  assert.equal(canOpenSetupRoute({kind:'setup',workspace:'report-builder',resourceApiName:'viewer'},user),true);
  assert.equal(canOpenSetupRoute({kind:'setup',workspace:'report-builder'},user),false);
  assert.equal(canOpenSetupRoute({kind:'setup',workspace:'dashboard-builder',dashboardView:true},user),true);
  assert.equal(canOpenSetupRoute({kind:'setup',workspace:'dashboard-builder',resourceApiName:'viewer'},user),true);
  assert.equal(canOpenSetupRoute({kind:'setup',workspace:'dashboard-builder'},user),false);
  assert.equal(canOpenSetupRoute({kind:'setup',workspace:'rbac',resourceApiName:'Users'},user),false);
  assert.equal(canOpenSetupRoute({kind:'setup',workspace:'app-manager'},user),false);
  assert.equal(canOpenSetupRoute({kind:'setup',workspace:'named-credentials',resourceApiName:'Webhooks'},user),false);
  assert.equal(canOpenSetupRoute({kind:'setup',workspace:'tenant-management'},user),false);
  assert.equal(canOpenSetupRoute({kind:'setup',workspace:'home'},user),true);
  assert.equal(canOpenSetupRoute({kind:'setup',workspace:'company-settings',resourceApiName:'security',resourceId:'audit-trail'},['setup:AuditTrail:view']),true);
  assert.equal(canOpenSetupRoute({kind:'setup',workspace:'company-settings',resourceApiName:'security',resourceId:'connected-apps'},['setup:AuditTrail:view']),false);
});
