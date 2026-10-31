import TenantGovernance from './TenantGovernance';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Save, Trash2, Plus, Lock, Unlock } from 'lucide-react';
import {confirmDestructiveAction} from '../../components/ConfirmAction/confirmDestructiveAction';
import SettingsViewRow from '../SettingsViewRow/SettingsViewRow';
import TenantPasswordPolicy from './TenantPasswordPolicy';
import TenantMfaControls from './TenantMfaControls';
import TenantSessionControls from './TenantSessionControls';
import TenantFederationControls from './TenantFederationControls';
import {PlatformPageSlot} from '../../platform/Workspace/PlatformPageSlot';
import type { CurrencySettingsMetadata } from '../../metadata/Definitions/metadata';

type ApiRequest = <T>(path: string, init?: RequestInit) => Promise<T>;
type PageHeadingProps = { eyebrow?: string; title: string; description?: string; actions?: ReactNode };
export function createSettingsViews(apiRequest: ApiRequest, PageHeading: (props: PageHeadingProps) => ReactNode) {
type AutomationSettingsDraft = {
  autoRetryFailedFlows: boolean;
  maxRetryAttempts: number;
  conversationIdleMinutes: number;
  flowServiceUserId: string | null;
};

function AutomationSettingsWorkspace({ canManage }: { canManage: boolean }) {
  const [draft, setDraft] = useState<AutomationSettingsDraft>({
    autoRetryFailedFlows: false, maxRetryAttempts: 10, conversationIdleMinutes: 15,
    flowServiceUserId: null
  });
  const [serviceUsers,setServiceUsers]=useState<Array<{id:string;name:string;email:string;enabled:boolean}>>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const beforeEdit = useRef<AutomationSettingsDraft | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const settings=apiRequest<AutomationSettingsDraft>('/metadata/automation-settings');
    const users=canManage
      ?apiRequest<{users:Array<{id:string;name:string;email:string;enabled:boolean}>}>('/metadata/automation-service-users')
      :Promise.resolve({users:[]});
    void Promise.all([settings,users])
      .then(([result,userResult]) => { if (active) { setDraft(result); setServiceUsers(userResult.users); setLoaded(true); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : String(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canManage]);

  const startEdit = (field: string) => {
    if (!canManage || editingRow || loading) return;
    beforeEdit.current = { ...draft };
    setEditingRow(field);
    setNotice('');
    setError('');
  };
  const cancelEdit = () => {
    if (saving) return;
    if (beforeEdit.current) setDraft(beforeEdit.current);
    beforeEdit.current = null;
    setEditingRow(null);
    setError('');
  };
  const save = async () => {
    if (!canManage || !editingRow || saving) return;
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const result = await apiRequest<AutomationSettingsDraft>('/metadata/automation-settings', {
        method: 'PUT', body: JSON.stringify(draft)
      });
      setDraft(result);
      setEditingRow(null);
      beforeEdit.current = null;
      setNotice('Process automation settings saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const editable = (key: string) => canManage && !editingRow && !loading;
  const serviceUser=serviceUsers.find(user=>user.id===draft.flowServiceUserId);
  return <div className="connector-settings-page settings-read-first-page">
    <PageHeading eyebrow="Setup / Automation" title="Process Automation Settings"
      description="Review automation execution policies and the explicitly selected identity used for scheduled Flow triggers." />
    <section className="surface permission-section" style={{ maxWidth: 800 }}>
      {loading ? <p>Loading process automation settings…</p> : loaded ? <>
        <h2>Execution safety</h2>
        <div className="settings-read-first-section">
          {editingRow==='flowServiceUserId'
            ?<div className="settings-edit-row">
              <PlatformPageSlot slotKey="field-settings-04"><label className="form-label">Scheduled Flow service user
                <select className="form-control" value={draft.flowServiceUserId??''} onChange={event=>
                  setDraft(current=>({...current,flowServiceUserId:event.target.value||null}))}>
                  <option value="">Not configured (scheduled triggers remain disabled)</option>
                  {serviceUsers.map(user=><option key={user.id} value={user.id}>
                    {user.name} ({user.email}){user.enabled?'':' — disabled'}
                  </option>)}
                </select>
              </label></PlatformPageSlot>
            </div>
            :<SettingsViewRow label="Scheduled Flow service user"
              value={serviceUser?`${serviceUser.name} (${serviceUser.email})`
                :draft.flowServiceUserId??'Not configured'}
              canEdit={editable('flowServiceUserId')} onEdit={()=>startEdit('flowServiceUserId')} />}
          <p className="permission-help">No user is implicitly elevated. Tenant, Flow activation, app entitlement, and current OneEngine grants must still pass on every execution.</p>
          {editingRow === 'autoRetryFailedFlows'
            ? <div className="settings-edit-row">
                <PlatformPageSlot slotKey="field-settings-01"><label className="checkbox-row">
                  <input type="checkbox" checked={draft.autoRetryFailedFlows}
                    onChange={(event) => setDraft((current) => ({ ...current, autoRetryFailedFlows: event.target.checked }))} />
                  Automatically retry failed flow executions
                </label></PlatformPageSlot>
              </div>
            : <SettingsViewRow label="Automatically retry failed flow executions"
                value={draft.autoRetryFailedFlows ? 'On' : 'Off'}
                canEdit={editable('autoRetryFailedFlows')} onEdit={() => startEdit('autoRetryFailedFlows')} />}
          <p className="permission-help">Off by default. Disabled retries are logged; new scheduled occurrences can still run.</p>
          {editingRow === 'maxRetryAttempts'
            ? <div className="settings-edit-row">
                <PlatformPageSlot slotKey="field-settings-02"><label className="form-label">Maximum failed attempts
                  <input className="form-control" type="number" min="1" max="20" step="1"
                    value={draft.maxRetryAttempts} onChange={(event) =>
                      setDraft((current) => ({ ...current, maxRetryAttempts: Number(event.target.value) }))} />
                </label></PlatformPageSlot>
              </div>
            : <SettingsViewRow label="Maximum failed attempts" value={String(draft.maxRetryAttempts)}
                canEdit={editable('maxRetryAttempts')} onEdit={() => startEdit('maxRetryAttempts')} />}
          <p className="permission-help">Default: 10. Exhausted deliveries are recorded as failed or dead-lettered.</p>
        </div>
        <h2>Conversation inactivity</h2>
        <div className="settings-read-first-section">
          {editingRow === 'conversationIdleMinutes'
            ? <div className="settings-edit-row">
                <PlatformPageSlot slotKey="field-settings-03"><label className="form-label">Expire inactive conversations after (minutes)
                  <input className="form-control" type="number" min="1" max="1440" step="1"
                    value={draft.conversationIdleMinutes} onChange={(event) =>
                      setDraft((current) => ({ ...current, conversationIdleMinutes: Number(event.target.value) }))} />
                </label></PlatformPageSlot>
              </div>
            : <SettingsViewRow label="Conversation idle timeout"
                value={`${draft.conversationIdleMinutes} minutes`}
                canEdit={editable('conversationIdleMinutes')} onEdit={() => startEdit('conversationIdleMinutes')} />}
          <p className="permission-help">Default: 15 minutes. Existing message records are retained after inactivity.</p>
        </div>
        {editingRow && canManage && <div className="settings-read-first-toolbar">
          <button className="btn" type="button" disabled={saving} onClick={cancelEdit}>Cancel</button>
          <button className="btn btn-brand" type="button" onClick={() => void save()}
            disabled={saving || !Number.isInteger(draft.maxRetryAttempts) || draft.maxRetryAttempts < 1 || draft.maxRetryAttempts > 20
              || !Number.isInteger(draft.conversationIdleMinutes) || draft.conversationIdleMinutes < 1 || draft.conversationIdleMinutes > 1440}>
            <Save size={14} />{saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>}
      </> : null}
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-success" role="status">{notice}</p>}
    </section>
  </div>;
}

type TenantMfaMode = 'Off' | 'Optional' | 'Required';

type RecoveryChannel='sms'|'whatsapp';
type RecoveryAction={channel:RecoveryChannel;enabled:boolean;flowServiceUserId:string|null;
 credentialId:string|null;calloutPath:string;calloutBody:string;messageTemplate:string};
type RecoveryFlow={method:'OTP'|'LINK';otpLength:4|6;expiryMinutes:number;maxAttempts:number;
 emailSubject:string;emailTemplate:string;channels:Record<RecoveryChannel,RecoveryAction>};
type RecoverySettings={flow:RecoveryFlow;revision:number;fromEmail:string;deliveryReady:boolean;linkReady:boolean};
function TenantEmailRecoverySettings({canManage}:{canManage:boolean}){
 const [flow,setFlow]=useState<RecoveryFlow|null>(null);
 const [revision,setRevision]=useState(0),[deliveryReady,setDeliveryReady]=useState(false);
 const [linkReady,setLinkReady]=useState(false),[fromEmail,setFromEmail]=useState('');
 const [credentials,setCredentials]=useState<Array<{id:string;name:string;protocol:string;enabled:boolean}>>([]);
 const [serviceUsers,setServiceUsers]=useState<Array<{id:string;email:string;enabled:boolean}>>([]);
 const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const snapshot=useRef<RecoveryFlow|null>(null);
 useEffect(()=>{
  let active=true;
  void apiRequest<RecoverySettings>('/auth/password-recovery/settings')
   .then(r=>{if(active){setFlow(r.flow);setRevision(r.revision);setDeliveryReady(r.deliveryReady);
    setLinkReady(r.linkReady);setFromEmail(r.fromEmail);}}).catch(()=>{});
  void apiRequest<{credentials:typeof credentials}>('/named-credentials')
   .then(r=>{if(active)setCredentials(r.credentials.filter(item=>item.protocol==='HTTPS'&&item.enabled));}).catch(()=>{});
  void apiRequest<{users:typeof serviceUsers}>('/metadata/automation-service-users')
   .then(r=>{if(active)setServiceUsers(r.users.filter(user=>user.enabled));}).catch(()=>{});
  return()=>{active=false;};
 },[]);
 if(!flow)return null;
 const change=(patch:Partial<RecoveryFlow>)=>setFlow(value=>value?{...value,...patch}:value);
 const changeChannel=(channel:RecoveryChannel,patch:Partial<RecoveryAction>)=>
  setFlow(value=>value?{...value,channels:{...value.channels,
   [channel]:{...value.channels[channel],...patch}}}:value);
 const begin=()=>{if(canManage&&!busy){snapshot.current=JSON.parse(JSON.stringify(flow)) as RecoveryFlow;
  setEditing(true);setMessage('');}};
 const cancel=()=>{if(busy)return;if(snapshot.current)setFlow(snapshot.current);
  snapshot.current=null;setEditing(false);setMessage('');};
 const save=async()=>{
  if(!canManage||!editing||busy)return;
  setBusy(true);setMessage('');
  try{const result=await apiRequest<RecoverySettings>('/auth/password-recovery/settings',{
   method:'PUT',body:JSON.stringify({flow,revision})
  });setFlow(result.flow);setRevision(result.revision);setEditing(false);snapshot.current=null;
   setMessage('Password recovery Flow saved.');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to save recovery Flow');}
  finally{setBusy(false);}
 };
 return <section className="surface permission-section">
  <TenantPasswordPolicy request={apiRequest} canManage={canManage}/>
  <h2>Password Recovery Flow</h2>
  <p>Recovery button → Find tenant user → Generate OTP → Email / WhatsApp / SMS action → Verify → Reset password.</p>
  <p>Security-critical verification is enforced by Core; templates and HTTP Callout actions are editable here without code.</p>
  {!deliveryReady&&<p role="alert" className="permission-help">Platform recovery email is not configured.</p>}
  {flow.method==='LINK'&&!linkReady&&<p role="alert">Configure a trusted HTTPS reset link origin.</p>}
  {editing?<div className="settings-read-first-section">
   <h3>Generate OTP</h3>
   <label className="form-label">Recovery method<select className="form-control" value={flow.method}
    onChange={event=>change({method:event.target.value as 'OTP'|'LINK'})}>
    <option value="OTP">Numeric code</option><option value="LINK">Email reset link (legacy)</option>
   </select></label>
   <label className="form-label">Code length<select className="form-control" value={flow.otpLength}
    onChange={event=>{const length=Number(event.target.value) as 4|6;
     change({otpLength:length,expiryMinutes:length===4?5:10,maxAttempts:length===4?3:5});}}>
    <option value={6}>6 digits (recommended)</option><option value={4}>4 digits</option>
   </select></label>
   <label className="form-label">Expiry (minutes)<input className="form-control" type="number"
    min={5} max={flow.otpLength===4?5:15} value={flow.expiryMinutes}
    onChange={event=>change({expiryMinutes:Number(event.target.value)})}/></label>
   <label className="form-label">Maximum attempts<input className="form-control" type="number"
    min={3} max={flow.otpLength===4?3:5} value={flow.maxAttempts}
    onChange={event=>change({maxAttempts:Number(event.target.value)})}/></label>
   <h3>Email action</h3>
   <p>Sender: {fromEmail||'noreply@unesolutions.co.uk (configure platform mail transport)'}</p>
   <label className="form-label">Subject template<input className="form-control"
    value={flow.emailSubject} onChange={event=>change({emailSubject:event.target.value})}/></label>
   <label className="form-label">Email template<textarea className="form-control" rows={4}
    value={flow.emailTemplate} onChange={event=>change({emailTemplate:event.target.value})}/></label>
   {(['whatsapp','sms'] as const).map(channel=>{
    const action=flow.channels[channel];
    return <div key={channel} className="settings-read-first-section">
     <h3>{channel==='whatsapp'?'WhatsApp':'SMSGate'} HTTP Callout</h3>
     <label className="checkbox-row"><input type="checkbox" checked={action.enabled}
      disabled={flow.method==='LINK'}
      onChange={event=>changeChannel(channel,{enabled:event.target.checked})}/>
      Enable {channel==='whatsapp'?'WhatsApp':'SMS'} recovery</label>
     <label className="form-label">Service user
      <select className="form-control" value={action.flowServiceUserId??''}
       onChange={event=>changeChannel(channel,{flowServiceUserId:event.target.value||null})}>
       <option value="">Select later</option>
       {serviceUsers.map(user=><option key={user.id} value={user.id}>{user.email}</option>)}
      </select></label>
     <label className="form-label">HTTPS Named Credential
      <select className="form-control" value={action.credentialId??''}
       onChange={event=>changeChannel(channel,{credentialId:event.target.value||null})}>
       <option value="">Select later</option>
       {credentials.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
     <label className="form-label">Message template<textarea className="form-control" rows={3}
      value={action.messageTemplate}
      onChange={event=>changeChannel(channel,{messageTemplate:event.target.value})}/></label>
     <details><summary>HTTP Callout mapping (advanced)</summary>
      <label className="form-label">Relative endpoint<input className="form-control"
       value={action.calloutPath}
       onChange={event=>changeChannel(channel,{calloutPath:event.target.value})}/></label>
      <label className="form-label">JSON request template<textarea className="form-control" rows={5}
       value={action.calloutBody}
       onChange={event=>changeChannel(channel,{calloutBody:event.target.value})}/></label>
     </details>
     <p>Requires verified account phone, authorized service user and configured Named Credential.</p>
    </div>;
   })}
  </div>:<div className="settings-read-first-section">
   <SettingsViewRow label="Flow revision" value={String(revision)} canEdit={false} onEdit={()=>undefined}/>
   <SettingsViewRow label="OTP length" value={flow.otpLength+' digits'} canEdit={canManage} onEdit={begin}/>
   <SettingsViewRow label="Expiry" value={flow.expiryMinutes+' minutes'} canEdit={canManage} onEdit={begin}/>
   <SettingsViewRow label="Platform email" value={deliveryReady?'Configured':'Not configured'} canEdit={canManage} onEdit={begin}/>
   <SettingsViewRow label="WhatsApp HTTP Callout" value={flow.channels.whatsapp.enabled?'Enabled':'Not configured'} canEdit={canManage} onEdit={begin}/>
   <SettingsViewRow label="SMSGate HTTP Callout" value={flow.channels.sms.enabled?'Enabled':'Not configured'} canEdit={canManage} onEdit={begin}/>
  </div>}
  {editing&&canManage&&<div className="settings-read-first-toolbar">
   <button className="btn" type="button" disabled={busy} onClick={cancel}>Cancel</button>
   <button className="btn btn-brand" type="button" disabled={busy} onClick={()=>void save()}>
    <Save size={14}/>{busy?'Saving…':'Save Flow'}
   </button>
  </div>}
  {message&&<p role="status">{message}</p>}
 </section>;
}

function TenantUserLockSettings() {
  return null;
}

function AccountSessionSecurity({ onReauthenticate }: { onReauthenticate: () => void }) {
  const [sessions, setSessions] = useState<Array<{ familyId: string; expiresAt: number; mfaVerified: boolean }>>([]);
  const [password, setPassword] = useState('');
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void apiRequest<{ sessions: Array<{ familyId: string; expiresAt: number; mfaVerified: boolean }> }>('/auth/sessions')
      .then((response) => { if (active) setSessions(response.sessions); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => { active = false; };
  }, []);
  const revokeAll = async () => {
    setBusy(true); setError('');
    try {
      await apiRequest('/auth/sessions/revoke-all', {
        method: 'POST', body: JSON.stringify({ currentPassword: password })
      });
      setPassword(''); setConfirmingRevoke(false);
      onReauthenticate();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to revoke sessions');
    } finally { setBusy(false); }
  };
  return <section className="surface permission-section">
    <h2>Active sessions</h2>
    <p>Active refresh sessions for your account. Revoking all sessions immediately invalidates existing access tokens on every device.</p>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <p>{sessions.length} active {sessions.length === 1 ? 'session' : 'sessions'}</p>
    {sessions.length > 0 && <ul>{sessions.slice(0, 10).map((session) =>
      <li key={session.familyId}>Expires {new Date(session.expiresAt * 1000).toLocaleString()}
        {session.mfaVerified ? ' · MFA verified' : ''}</li>
    )}</ul>}
    {!confirmingRevoke && <button type="button" className="btn"
      onClick={() => setConfirmingRevoke(true)}>Sign out on all devices</button>}
    {confirmingRevoke && <div className="settings-edit-row">
      <PlatformPageSlot slotKey="field-settings-09"><label className="form-label" htmlFor="sessions-revoke-password">Confirm current password
        <input className="form-control" id="sessions-revoke-password" type="password"
          autoComplete="current-password" value={password}
          onChange={(event) => setPassword(event.target.value)} />
      </label></PlatformPageSlot>
      <div className="settings-read-first-toolbar">
        <button type="button" className="btn" disabled={busy}
          onClick={() => { setPassword(''); setConfirmingRevoke(false); }}>Cancel</button>
        <button type="button" className="btn btn-brand" disabled={busy || !password}
          onClick={() => void revokeAll()}>{busy ? 'Revoking…' : 'Confirm sign out on all devices'}</button>
      </div>
    </div>}
  </section>;
}

function TenantSecurityAudit() {
  const [events, setEvents] = useState<Array<{ id: string; at: string; actorUserId: string | null; action: string; loginIdentifier?: string; sourceIp?: string; details?: Record<string, string> }>>([]);
  const [permitted, setPermitted] = useState(false);
  useEffect(() => {
    let active = true;
    void apiRequest<{ events: Array<{ id: string; at: string; actorUserId: string | null; action: string; loginIdentifier?: string; sourceIp?: string; details?: Record<string, string> }> }>('/auth/security-events?limit=50')
      .then((response) => { if (active) { setEvents(response.events); setPermitted(true); } })
      .catch(() => { if (active) setPermitted(false); });
    return () => { active = false; };
  }, []);
  if (!permitted) return null;
  return <section className="surface permission-section">
    <h2>Login history and security activity</h2>
    <p>Recent tenant security events. Only authorized security administrators can view this history.</p>
    {!events.length ? <p>No security activity recorded.</p> :
      <ul>{events.map((event) => <li key={event.id}>
        <strong>{event.action}</strong> · {new Date(event.at).toLocaleString()}
        {event.loginIdentifier ? ` · ${event.loginIdentifier}` : ''}
        {event.sourceIp ? ` · ${event.sourceIp}` : ''}
        {event.details?.from && event.details?.to ? ' · ' + event.details.from + ' → ' + event.details.to : ''}
      </li>)}</ul>}
  </section>;
}

function TenantMfaSettings({ onReauthenticate, canManage, governanceTab, governanceFocus }: { onReauthenticate: () => void; canManage: boolean; governanceTab?: string; governanceFocus?: boolean }) {
  return <><TenantMfaControls request={apiRequest} canManage={canManage} onReauthenticate={onReauthenticate}/>
    <TenantSessionControls request={apiRequest} canManage={canManage}/>
    <TenantFederationControls request={apiRequest} canManage={canManage}/><TenantGovernance request={apiRequest} canManage={canManage} initialTab={governanceTab} focusOnMount={governanceFocus}/></>;
}

type CompanyProfile = {logoUrl?:string;legalName:string;tradingName:string;website:string;phone:string;email:string;addressLine1:string;addressLine2:string;city:string;postcode:string;country:string;timezone:string;locale:string;description:string};
const blankCompanyProfile:CompanyProfile={logoUrl:'',legalName:'',tradingName:'',website:'',phone:'',email:'',addressLine1:'',addressLine2:'',city:'',postcode:'',country:'',timezone:'Europe/London',locale:'en-GB',description:''};
const companyFields:ReadonlyArray<{key:keyof CompanyProfile;label:string}>= [
{key:'legalName',label:'Legal company name'},{key:'tradingName',label:'Trading name'},
{key:'description',label:'Description'},{key:'website',label:'Website'},
{key:'email',label:'Contact email'},{key:'phone',label:'Contact phone'},
{key:'addressLine1',label:'Address line 1'},{key:'addressLine2',label:'Address line 2'},
{key:'city',label:'Town / City'},{key:'postcode',label:'Postcode'},
{key:'country',label:'Country'},{key:'timezone',label:'Time zone'},{key:'locale',label:'Locale'}];

function CompanySettings({ canManage, section = 'general' }: { canManage: boolean; section?: string }) {
  const sectionTitle = section === 'branding' ? 'Company branding' : section === 'contacts' ? 'Contact details' : 'Company details';
  const [company,setCompany]=useState<CompanyProfile>(blankCompanyProfile);
  const [companyBeforeEdit,setCompanyBeforeEdit]=useState<CompanyProfile|null>(null);
  const [companyEditing,setCompanyEditing]=useState(false);
  const [companyLoading,setCompanyLoading]=useState(true);
  const [companySaving,setCompanySaving]=useState(false);
  const [companyError,setCompanyError]=useState('');
  const [companyNotice,setCompanyNotice]=useState('');
  const [logoReading,setLogoReading]=useState(false);
  const selectCompanyLogo=async(file?:File)=>{
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setCompanyError('Choose a PNG, JPG or WebP image.');return;}
    if(file.size>128*1024){setCompanyError('Logo must be 128 KB or smaller.');return;}
    setLogoReading(true);setCompanyError('');
    try{
      const encoded=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Unable to read selected logo'));reader.readAsDataURL(file)});
      setCompany(previous=>({...previous,logoUrl:encoded}));
    }catch(error){setCompanyError(error instanceof Error?error.message:String(error));}
    finally{setLogoReading(false)}
  };
  useEffect(()=>{let active=true;void apiRequest<{profile:CompanyProfile|null}>('/tenant/company-profile')
   .then(value=>{if(active)setCompany({...blankCompanyProfile,...(value.profile??{})});})
   .catch(error=>{if(active)setCompanyError(error instanceof Error?error.message:String(error));})
   .finally(()=>{if(active)setCompanyLoading(false)});return()=>{active=false}},[]);
  const saveCompany=async()=>{if(!canManage||companySaving||logoReading)return;
    setCompanySaving(true);setCompanyError('');setCompanyNotice('');
    try{const saved=await apiRequest<{profile:CompanyProfile}>('/tenant/company-profile',{method:'PUT',body:JSON.stringify(company)});
      setCompany(saved.profile);setCompanyEditing(false);setCompanyBeforeEdit(null);setCompanyNotice('Company details saved.');}
    catch(error){setCompanyError(error instanceof Error?error.message:String(error));}
    finally{setCompanySaving(false)}
  };
  const [draft, setDraft] = useState<CurrencySettingsMetadata>({
    corporateCurrency: 'USD',
    standardVatRate: 20,
    currencies: [{ currencyIsoCode: 'USD', conversionRate: 1 }]
  });
  const [corporateCode, setCorporateCode] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const previousValue = useRef<{ draft: CurrencySettingsMetadata; corporateCode: string } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    void apiRequest<CurrencySettingsMetadata>('/metadata/currencies')
      .then((settings) => {
        if (active) {
          setDraft(settings);
          setCorporateCode(settings.corporateCurrency);
          setLoaded(true);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : String(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const beginEdit = (row: string) => {
    if (!canManage || saving || loading || editingRow) return;
    previousValue.current = { draft, corporateCode };
    setEditingRow(row);
    setError('');
    setNotice('');
  };
  const cancelEdit = () => {
    if (saving) return;
    if (previousValue.current) {
      setDraft(previousValue.current.draft);
      setCorporateCode(previousValue.current.corporateCode);
    }
    previousValue.current = null;
    setEditingRow(null);
    setError('');
  };
  const setCorporateCurrency = () => {
    const normalized = corporateCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) {
      setError('Corporate currency must be a three-letter ISO 4217 code.');
      return;
    }
    setDraft((current) => {
      const hasCorporate = current.currencies.some((currency) => currency.currencyIsoCode === normalized);
      return {
        ...current,
        corporateCurrency: normalized,
        currencies: hasCorporate
          ? current.currencies.map((currency) => currency.currencyIsoCode === normalized
            ? { ...currency, conversionRate: 1 } : currency)
          : [...current.currencies, { currencyIsoCode: normalized, conversionRate: 1 }]
      };
    });
    setError('');
    setNotice('');
  };

  const save = async () => {
    if (!canManage || !editingRow || saving) return;
    const normalizedCorporateCode = corporateCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalizedCorporateCode)) {
      setError('Corporate currency must be a three-letter ISO 4217 code.');
      return;
    }
    if (!Number.isFinite(draft.standardVatRate) || draft.standardVatRate < 0 || draft.standardVatRate > 100) {
      setError('Standard VAT rate must be between 0 and 100 percent.');
      return;
    }
    const hasCorporateCurrency = draft.currencies.some((currency) => currency.currencyIsoCode === normalizedCorporateCode);
    const settings: CurrencySettingsMetadata = {
      corporateCurrency: normalizedCorporateCode,
      standardVatRate: draft.standardVatRate,
      currencies: hasCorporateCurrency
        ? draft.currencies.map((currency) => currency.currencyIsoCode === normalizedCorporateCode
          ? { ...currency, conversionRate: 1 } : currency)
        : [...draft.currencies, { currencyIsoCode: normalizedCorporateCode, conversionRate: 1 }]
    };
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await apiRequest<CurrencySettingsMetadata>('/metadata/currencies', {
        method: 'PUT', body: JSON.stringify(settings)
      });
      setDraft(saved);
      setCorporateCode(saved.corporateCurrency);
      previousValue.current = null;
      setEditingRow(null);
      setNotice('Company currency settings saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const addCurrency = () => {
    if (!canManage || editingRow || loading) return;
    const index = draft.currencies.length;
    beginEdit(`currency-${index}`);
    setDraft((current) => ({
      ...current, currencies: [...current.currencies, { currencyIsoCode: '', conversionRate: 1 }]
    }));
  };

  return <div className="home-content settings-read-first-page company-settings-page">
    <PageHeading eyebrow="Company Settings" title="Company Settings"
      description="Manage your organisation settings, base currency, VAT and exchange rates in one workspace." />
    <section className="surface permission-section company-profile-section" aria-label={sectionTitle}>
      <div className="section-toolbar"><div><h2>{sectionTitle}</h2><p>Organisation, contact and regional information.</p></div>
      {canManage&&!companyEditing&&!companyLoading&&<button type="button" className="btn" onClick={()=>{setCompanyBeforeEdit({...company});setCompanyEditing(true);}}>{section === 'branding' ? 'Edit logo' : section === 'contacts' ? 'Edit contacts' : 'Edit details'}</button>}</div>
      {companyLoading?<p>Loading company details…</p>:<><div className="company-profile-logo">{(company.logoUrl?.startsWith("data:image/")||company.logoUrl?.startsWith("https://"))?<img src={company.logoUrl} alt="Company logo" />:<span aria-label="No logo configured">No logo</span>}</div><div className="company-profile-grid">{companyEditing&&<div className="company-profile-field" data-company-field="logoUrl"><label htmlFor="company-logo-upload">Company logo</label><input id="company-logo-upload" type="file" accept="image/png,image/jpeg,image/webp" disabled={companySaving||logoReading} onChange={event=>{void selectCompanyLogo(event.target.files?.[0]);event.target.value='';}}/><small>PNG, JPG or WebP · maximum 128 KB</small>{company.logoUrl&&<button className="btn" type="button" disabled={companySaving||logoReading} onClick={()=>{ if (!confirmDestructiveAction('Remove','company logo','Save company settings to apply the removal.')) return; setCompany(previous=>({...previous,logoUrl:''})); }}>Remove logo</button>}</div>}
      {companyFields.map(field=><div className="company-profile-field" data-company-field={field.key} key={field.key}><label htmlFor={'company-'+field.key}>{field.label}</label>
        {companyEditing?<input id={'company-'+field.key} className="form-control" value={company[field.key]}
          onChange={event=>setCompany(previous=>({...previous,[field.key]:event.target.value}))}/>
        :<p>{company[field.key]||'Not provided'}</p>}</div> )}</div></>}
      {companyEditing&&<div className="settings-read-first-toolbar">
        <button type="button" className="btn" disabled={companySaving} onClick={()=>{setCompany(companyBeforeEdit??blankCompanyProfile);setCompanyEditing(false);setCompanyBeforeEdit(null);}}>Cancel</button>
        <button type="button" className="btn btn-brand" disabled={companySaving||logoReading} onClick={()=>void saveCompany()}>{companySaving?'Saving…':'Save details'}</button></div>}
      {companyError&&<p className="form-error" role="alert">{companyError}</p>}
      {companyNotice&&<p className="form-success" role="status">{companyNotice}</p>}
    </section>
    <section className="surface permission-section">
      <div className="section-toolbar">
        <div><h2>Currency & Tax</h2>
          <p>Rates express units of corporate currency per one unit of the active currency.</p></div>
      </div>
      {loading ? <p className="permission-help">Loading currency settings…</p> : loaded ? <>
        <div className="settings-read-first-section">
          {editingRow === 'corporate'
            ? <div className="settings-edit-row">
                <PlatformPageSlot slotKey="field-settings-15"><label className="form-label">Corporate Currency (ISO 4217)
                  <input autoFocus className="form-control" value={corporateCode} maxLength={3}
                    onChange={(event) => { setCorporateCode(event.target.value.toUpperCase()); setError(''); }}
                    onBlur={setCorporateCurrency} />
                </label></PlatformPageSlot>
              </div>
            : <SettingsViewRow label="Corporate Currency (ISO 4217)" value={draft.corporateCurrency}
                canEdit={canManage && !editingRow} onEdit={() => beginEdit('corporate')} />}
        </div>
        <div className="settings-read-first-section">
          {editingRow === 'standard-vat-rate'
            ? <div className="settings-edit-row">
                <PlatformPageSlot slotKey="field-settings-17"><label className="form-label">Standard VAT rate (%)
                  <input autoFocus className="form-control" type="number" min="0" max="100" step="0.01"
                    value={draft.standardVatRate}
                    onChange={(event) => setDraft((current) => ({
                      ...current, standardVatRate: Number(event.target.value)
                    }))} />
                </label></PlatformPageSlot>
              </div>
            : <SettingsViewRow label="Standard VAT rate" value={`${draft.standardVatRate}%`}
                canEdit={canManage && !editingRow} onEdit={() => beginEdit('standard-vat-rate')} />}
        </div>
        <h3 className="permission-section-heading">Active Currencies</h3>
        <div className="settings-read-first-section">
          {draft.currencies.map((currency, index) => (
            editingRow === `currency-${index}`
              ? <div className="settings-edit-row" key={`currency-edit-${index}`}>
                  <div className="settings-edit-row-grid">
                    <PlatformPageSlot slotKey="field-settings-16"><label className="form-label">Currency Code
                      <input autoFocus className="form-control" value={currency.currencyIsoCode} maxLength={3}
                        disabled={currency.currencyIsoCode === draft.corporateCurrency}
                        onChange={(event) => {
                          const currencyIsoCode = event.target.value.toUpperCase();
                          setDraft((current) => ({
                            ...current, currencies: current.currencies.map((item, itemIndex) => itemIndex === index
                              ? { ...item, currencyIsoCode } : item)
                          }));
                        }} />
                    </label></PlatformPageSlot>
                    <PlatformPageSlot slotKey="field-settings-17"><label className="form-label">Conversion Rate
                      <input className="form-control" type="number" min="0" step="any"
                        value={currency.currencyIsoCode === draft.corporateCurrency ? 1 : currency.conversionRate}
                        disabled={currency.currencyIsoCode === draft.corporateCurrency}
                        onChange={(event) => {
                          const conversionRate = Number(event.target.value);
                          setDraft((current) => ({
                            ...current, currencies: current.currencies.map((item, itemIndex) => itemIndex === index
                              ? { ...item, conversionRate } : item)
                          }));
                        }} />
                    </label></PlatformPageSlot>
                  </div>
                  {currency.currencyIsoCode !== draft.corporateCurrency && <div className="settings-read-first-toolbar">
                    <button type="button" className="btn" onClick={() => {
                      if (!confirmDestructiveAction('Remove','currency "'+currency.currencyIsoCode+'"','Save settings to apply this removal.')) return;
                      setDraft((current) => ({
                        ...current, currencies: current.currencies.filter((_item, itemIndex) => itemIndex !== index)
                      }));
                      setEditingRow('removed-currency');
                    }}><Trash2 size={14} />Remove Currency</button>
                  </div>}
                </div>
              : <SettingsViewRow key={`currency-view-${index}`}
                  label={currency.currencyIsoCode || 'New currency'}
                  value={`Conversion rate: ${currency.currencyIsoCode === draft.corporateCurrency ? 1 : currency.conversionRate}`}
                  canEdit={canManage && !editingRow && currency.currencyIsoCode !== draft.corporateCurrency}
                  onEdit={() => beginEdit(`currency-${index}`)} />
          ))}
        </div>
        {canManage && !editingRow && <button className="btn" type="button" onClick={addCurrency}>
          <Plus size={14} />Add Currency
        </button>}
        {canManage && editingRow && <div className="settings-read-first-toolbar">
          <button className="btn" type="button" disabled={saving} onClick={cancelEdit}>Cancel</button>
          <button className="btn btn-brand" type="button" onClick={() => void save()} disabled={saving}>
            <Save size={14} />{saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>}
      </> : null}
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-success" role="status">{notice}</p>}
    </section>
  </div>;
}


return { AutomationSettingsWorkspace, TenantEmailRecoverySettings, TenantUserLockSettings, AccountSessionSecurity, TenantSecurityAudit, TenantMfaSettings, CompanySettings };
}
