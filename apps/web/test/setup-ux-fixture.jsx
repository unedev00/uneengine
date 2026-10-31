import React from 'react';
import { createRoot } from 'react-dom/client';
import TenantManagement from '../src/core/platform/TenantManagement/TenantManagement';
import OfflineBriefcaseSettings from '../src/core/platform/OfflineBriefcaseSettings/OfflineBriefcaseSettings';
import DashboardBuilder from '../src/core/builders/DashboardBuilder/DashboardBuilder';
import NamedCredentials from '../src/core/integrations/NamedCredentials/NamedCredentials';
import FlowLogs from '../src/core/automation/FlowLogs/FlowLogs';
import FlowBuilder from '../src/core/builders/FlowBuilder/FlowBuilder';
import { defaultFlow } from '../src/core/metadata/Definitions/metadata';
import TenantMfaControls from '../src/core/settings/SettingsWorkspace/TenantMfaControls';
import TenantConnectedApps from '../src/core/settings/SettingsWorkspace/TenantConnectedApps';
import TenantGovernance from '../src/core/settings/SettingsWorkspace/TenantGovernance';
import CompanySettingsWorkspace from '../src/core/settings/CompanySettingsWorkspace/CompanySettingsWorkspace';
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
const params = new URLSearchParams(location.search);
const view=params.get('view');
const noop=()=>{};
const arrays={dashboards:[],dashboardFolders:[],objects:[],libraryComponents:[],reports:[],shareUsers:[],shareGroups:[],folderPublicGroups:[],folderPermissionSetGroups:[],folderRoles:[],dashboardTerritories:[],subscriptionUsers:[],runningUserIds:[],smtpCredentials:[]};
const callbacks=Object.fromEntries(['Select','OpenViewer','ExitViewer','Notify','Save','Delete','LoadRecords','RunReport','LoadSnapshots','LoadSubscriptions'].map(key=>['on'+key,noop]));
const object={apiName:'Account',label:'Account',pluralLabel:'Accounts',fields:[],compactLayout:{fieldApiNames:['Name']}};
const request=async(path,init)=>{
 if(path.startsWith('/platform/tenants'))return {tenants:[],total:0};
 if(path.startsWith('/records/'))return {records:[{Id:'00000000-0000-0000-0000-000000000001',Name:'Acme Corporation'}]};
 if(init?.method==='PUT'){window.savedSelections=JSON.parse(init.body);return {briefcase:JSON.parse(init.body)};}
 return {briefcase:{selections:[]}};
};
const uxRequest=async path=>{
 if(path==='/auth/mfa/status')return {mode:'Off',enrolled:false};
 if(path==='/auth/passkeys')return {credentials:[]};
 if(path==='/auth/user-locks')return {users:[]};
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
const credentials=[{id:'sample',name:'Sample_Credential',label:'Sample credential',baseUrl:'https://example.com/long/integration/path',authType:'Bearer',hasSecret:true,protocol:'HTTPS',enabled:true,updatedAt:'2026-10-28T09:00:00Z',configuration:{}}];
function RecordImportCheck(){ const [ready,setReady]=React.useState(false); React.useEffect(()=>{import('../src/core/records/RecordWorkspace/recordWorkspaceViews').then(module=>setReady(typeof module.createRecordWorkspaceViews === 'function'));},[]);return <p>{ready ? 'Record workspace import passed' : 'Loading record workspace'}</p>; }
function Fixture(){
 let content;
 if(view==='mfa')content=<TenantMfaControls request={uxRequest} canManage onReauthenticate={noop}/>;
  else if(view==='oauth')content=<TenantConnectedApps request={uxRequest}/>;
  else if(view==='governance')content=<TenantGovernance request={uxRequest} canManage/>;
  else if(view==='company')content=<CompanySettingsWorkspace initialSection="security" company={<p>Company</p>}
   domains={<p>Domains</p>} developer={<p>Developer</p>} usage={<p>Usage</p>} recovery={<p>Recovery</p>}
   mfa={<p>Security controls available</p>} emailRecovery={<p>Email recovery</p>} locks={<p>Locks</p>}
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
