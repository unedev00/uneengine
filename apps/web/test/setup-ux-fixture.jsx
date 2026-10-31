import React from 'react';
import { createRoot } from 'react-dom/client';
import TenantManagement from '../src/core/platform/TenantManagement/TenantManagement';
import OfflineBriefcaseSettings from '../src/core/platform/OfflineBriefcaseSettings/OfflineBriefcaseSettings';
import DashboardBuilder from '../src/core/builders/DashboardBuilder/DashboardBuilder';
import SchemaBuilder from '../src/core/builders/SchemaBuilder/SchemaBuilder';
import AceKiosk from '../../acekiosk/src/AceKiosk';
import AcetillTerminal from '../../acetill/src/AcetillTerminal';
import NamedCredentials from '../src/core/integrations/NamedCredentials/NamedCredentials';
import FlowLogs from '../src/core/automation/FlowLogs/FlowLogs';
import FlowBuilder from '../src/core/builders/FlowBuilder/FlowBuilder';
import { defaultFlow } from '../src/core/metadata/Definitions/metadata';
import TenantMfaControls from '../src/core/settings/SettingsWorkspace/TenantMfaControls';
import TenantConnectedApps from '../src/core/settings/SettingsWorkspace/TenantConnectedApps';
import TenantGovernance from '../src/core/settings/SettingsWorkspace/TenantGovernance';
import TenantPasswordPolicy from '../src/core/settings/SettingsWorkspace/TenantPasswordPolicy';
import TenantSessionControls from '../src/core/settings/SettingsWorkspace/TenantSessionControls';
import TenantFederationControls from '../src/core/settings/SettingsWorkspace/TenantFederationControls';
import CompanySettingsWorkspace from '../src/core/settings/CompanySettingsWorkspace/CompanySettingsWorkspace';
import {createSettingsViews} from '../src/core/settings/SettingsWorkspace/settingsWorkspaceViews';
import '../src/core/workspace/WorkspaceTheme/design-system.css';
import '../src/core/workspace/WorkspaceTheme/styles.css';
import '../src/core/workspace/WorkspaceTheme/appleTheme.css';
import '../src/core/workspace/WorkspaceTheme/applicationPolish.css';
import '../src/core/workspace/WorkspaceTheme/operationalPolish.css';
import '../src/core/workspace/WorkspaceTheme/settingsAppearance.css';
import '../src/core/workspace/WorkspaceTheme/desktopDense.css';
import '../src/core/workspace/WorkspaceTheme/contrastRepair.css';
import '../src/core/workspace/WorkspaceTheme/setupUsability.css';
import '../src/core/workspace/WorkspaceTheme/grokUiPolish.css';
import '../src/core/workspace/WorkspaceTheme/phase2AdminLayout.css';
import '../src/core/builders/SchemaBuilder/schemaBuilderUsability.css';
const params = new URLSearchParams(location.search);
const view=params.get('view');
const noop=()=>{};
const arrays={dashboards:[],dashboardFolders:[],objects:[],libraryComponents:[],reports:[],shareUsers:[],shareGroups:[],folderPublicGroups:[],folderPermissionSetGroups:[],folderRoles:[],dashboardTerritories:[],subscriptionUsers:[],runningUserIds:[],smtpCredentials:[]};
const callbacks=Object.fromEntries(['Select','OpenViewer','ExitViewer','Notify','Save','Delete','LoadRecords','RunReport','LoadSnapshots','LoadSubscriptions'].map(key=>['on'+key,noop]));
const object={apiName:'Account',label:'Account',pluralLabel:'Accounts',kind:'Standard Object',fields:[],compactLayout:{fieldApiNames:['Name']}};
const request=async(path,init)=>{
 if(path.startsWith('/platform/tenants'))return {tenants:[],total:0};
 if(path.startsWith('/records/'))return {records:[{Id:'00000000-0000-0000-0000-000000000001',Name:'Acme Corporation'}]};
 if(init?.method==='PUT'){window.savedSelections=JSON.parse(init.body);return {briefcase:JSON.parse(init.body)};}
 return {briefcase:{selections:[]}};
};
const uxRequest=async (path,init)=>{
 if(path.startsWith('/auth/security-events?')){window.securityEventQuery=path;const offset=Number(new URLSearchParams(path.split('?')[1]).get('offset')||0);return {events:[{id:'event-'+offset,at:'2026-10-30T10:00:00Z',actorUserId:'user-1',loginIdentifier:'operator@example.com',sourceIp:'192.0.2.4',action:'login.success',details:{}}],nextOffset:offset===0?25:null};}
 if(path==='/auth/mfa/status')return {mode:'Off',enrolled:false};
 if(path==='/auth/passkeys')return {credentials:[]};
 if(path==='/auth/user-locks')return {users:[{id:'user-1',name:'Test operator',email:'test.operator@example.com'}]};
 if(path==='/auth/password-policy')return {min_length:12,require_uppercase:false,require_lowercase:false,require_number:false,require_symbol:false,max_age_days:0,history_count:0,max_failed_attempts:5,lockout_minutes:30};
 if(path==='/auth/session-policy')return {policy:{access_minutes:60,refresh_minutes:43200,idle_minutes:60,require_mfa:false,frame_policy:'DENY',csp_enabled:true},ranges:[],hours:[],profiles:[]};
 if(path==='/auth/identity-providers')return {providers:[{id:'provider-1',label:'Example SSO',protocol:'oidc',enabled:true,issuer:'https://id.example.com',authorization_url:'https://id.example.com/auth',token_url:'https://id.example.com/token',jwks_url:'https://id.example.com/keys',client_id:'example-client',certificate:''}],deployment:{callbackUrl:'https://example.com/callback',configured:true}};
 if(path==='/auth/federated-identities')return {identities:[{provider_id:'provider-1',subject:'test-subject',user_id:'user-1'}]};
 if(path==='/security/licenses/tenants')return {tenants:[]};
 if(path==='/security/licenses')return {entitlements:Array.from({length:8},(_,i)=>({id:'lic-'+i,label:'Licence '+(i+1),kind:i<4?'User':'PermissionSet',enabled:true,used_seats:2,seat_limit:10,expires_at:null})),users:[{id:'user-1',email:'test.operator@example.com'}],permissionSets:[{id:'set-1',api_name:'OneEngine'}],assignments:[],requirements:[]};
 if(path==='/metadata/flows/list?page=1&search=')return {flows:[]};
 if(path.startsWith('/security/monitoring'))return {events:[],rules:[],settings:{enabled:true,retention_days:365},summary:{requests:180,errors:5,average_ms:62},nextCursor:null};
 if(path==='/security/connected-apps')return {clients:[],
  users:Array.from({length:9},(_,i)=>({id:'user-'+i,email:'operator'+(i+1)+'@example.com'})),
  scopes:['records:read','records:write','metadata:read','metadata:write','records:import','mcp:access'],
  scopeGroups:[{key:'sample',label:'Records and metadata',scopes:
   ['records:read','records:write','metadata:read','metadata:write','records:import','mcp:access']
    .map(scope=>({scope,label:scope,description:'Controlled permission '+scope,risk:'standard',assignable:true}))}]};
 if(path==='/security/audit/coverage')return {tables:[{table_name:'md_flow_editor_values'}]};
 if(path.startsWith('/security/audit'))return {events:[{id:'audit-1',actor_user_id:null,table_name:'md_flow_editor_values',
  operation:'INSERT',row_identifier:'8e4f5288-3284-444c-93e6-f3665943afd5',
  changed_fields:['flow_id','property_path','tenant_id','value'],created_at:'2026-10-21T22:46:11Z'}],nextCursor:null};
 return {};
};
const directoryRequest=async(path,init)=>{
 if(path==='/security/connected-apps'&&!init){const data=await uxRequest(path);return {...data,clients:[{id:'app-1',label:'Payroll connector',enabled:true,client_type:'public',require_mfa:true,redirects:['https://example.com/callback'],scopes:['records:read'],users:['user-0']}]};}
 if(path==='/security/connected-apps'&&init?.method==='PUT'){window.oauthSaved=JSON.parse(init.body);return {id:'app-1'};}
 return uxRequest(path,init);
};
const securityViews=createSettingsViews(uxRequest,()=>null);
const credentials=[{id:'sample',name:'Sample_Credential',label:'Sample credential',baseUrl:'https://example.com/long/integration/path',authType:'Bearer',hasSecret:true,protocol:'HTTPS',enabled:true,updatedAt:'2026-10-28T09:00:00Z',configuration:{}}];
function RecordImportCheck(){ const [ready,setReady]=React.useState(false); React.useEffect(()=>{import('../src/core/records/RecordWorkspace/recordWorkspaceViews').then(module=>setReady(typeof module.createRecordWorkspaceViews === 'function'));},[]);return <p>{ready ? 'Record workspace import passed' : 'Loading record workspace'}</p>; }
function Fixture(){
 if(view==='kiosk')return <AceKiosk onLogout={noop}/>;
 if(view==='till')return <AcetillTerminal/>;
 let content;
 if(view==='schema')content=<SchemaBuilder objects={[object,{...object,apiName:'Invoice',label:'Invoice',kind:'Custom Object'}]} selectedObjectApiName="Account" onOpenObject={noop} onOpenField={noop} onCreateObject={noop} onNewField={noop}/>;
 else if(view==='mfa')content=<TenantMfaControls request={uxRequest} canManage onReauthenticate={noop}/>;
  else if(view==='oauth')content=<TenantConnectedApps request={uxRequest}/>;
   else if(view==='oauth-directory')content=<TenantConnectedApps request={directoryRequest}/>;
   else if(view==='security-history')content=<securityViews.TenantSecurityAudit/>;
  else if(view==='governance')content=<TenantGovernance request={uxRequest} canManage/>;
   else if(view==='monitoring')content=<TenantGovernance request={uxRequest} canManage initialTab="monitoring"/>;
   else if(view==='licenses')content=<TenantGovernance request={uxRequest} canManage initialTab="licences"/>;
   else if(view==='federation')content=<TenantFederationControls request={uxRequest} canManage/>;
   else if(view==='password')content=<TenantPasswordPolicy request={uxRequest} canManage/>;
   else if(view==='sessions')content=<TenantSessionControls request={uxRequest} canManage/>;
  else if(view==='company')content=<CompanySettingsWorkspace initialSection="security" company={<p>Company</p>}
   domains={<p>Domains</p>} developer={<p>Developer</p>} usage={<p>Usage</p>} recovery={<p>Recovery</p>}
   mfa={<TenantGovernance request={uxRequest} canManage initialTab="connected apps" focusOnMount/>} emailRecovery={<p>Email recovery</p>} locks={<p>Locks</p>}
   sessions={<p>Sessions</p>} audit={<p>Audit</p>}/>;
  else if(view==='tenants')content=<TenantManagement request={request} permitted/>;
 else if(view==='records-import')content=<RecordImportCheck/>;
 else if(view==='offline')content=<OfflineBriefcaseSettings request={request} permitted objects={[object]}/>;
 else if(view==='dashboard')content=<DashboardBuilder {...arrays} {...callbacks} userId="test" canCreate={params.get('allowed')==='true'} canManageAll={false} />;
 else if(view==='credentials')content=<NamedCredentials credentials={credentials} canManage encryptionReady onSave={noop} onDelete={noop}/>;
 else if(view==='flows')content=<FlowBuilder landing flow={defaultFlow} flows={[{...defaultFlow,apiName:'Long_Test_Flow',label:'A long automation name to verify the existing list remains readable',status:'Active'}]} libraryComponents={[]} objects={[]} users={[]} platformEvents={[]} namedCredentials={[]} emailAlerts={[]} connectorProviders={[]} integrationConnections={[]} approvalProcesses={[]} validation={{errors:[],warnings:[]}} onLoadCapabilities={async()=>({registryVersion:1,elements:[],flowTypes:[{type:'Screen Flow',description:'Guide users through a process',createEnabled:true,validateEnabled:true}]})} onLoadExternalServices={async()=>({services:[]})} onCreateFlow={(label,type)=>{window.createdFlow={label,type};}} />;
 else content=<FlowLogs logs={[{id:'run-id-with-a-very-long-identifier',flowLabel:'A long running automation with diagnostic details',flowApiName:'Long_Flow',status:'completed',flowType:'Record-Triggered Flow',startedAt:'2026-10-28T10:00:00Z',finishedAt:'2026-10-28T10:01:00Z',userId:'test-user'}]} loading={false} onOpenFlow={noop}/>;
 return <div className="lightning"><div className="setup-layout"><aside className="setup-sidebar"><button className="tree-item"><span>Tenant Management</span></button></aside><main className="workspace" style={{minWidth:0,padding:20}}>{content}</main></div></div>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
