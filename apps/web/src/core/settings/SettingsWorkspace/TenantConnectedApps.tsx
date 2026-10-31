import {useEffect,useState} from 'react';
import './TenantConnectedApps.css';
type Request=<T>(path:string,init?:RequestInit)=>Promise<T>;
type Client={id?:string;label:string;enabled:boolean;client_type:'public'|'confidential';require_mfa:boolean;redirects:string[];scopes:string[];users:string[]};
type Scope={scope:string;label:string;description:string;risk:string;assignable:boolean};
type ScopeGroup={key:string;label:string;scopes:Scope[]};
type Data={clients:Client[];users:{id:string;email:string}[];scopes:string[];scopeGroups?:ScopeGroup[]};
const fresh=():Client=>({label:'',enabled:false,client_type:'public',require_mfa:true,redirects:[],scopes:['records:read'],users:[]});
export default function TenantConnectedApps({request}:{request:Request}){
 const [data,setData]=useState<Data|null>(null),[draft,setDraft]=useState<Client>(fresh),[message,setMessage]=useState(''),[secret,setSecret]=useState(''),[busy,setBusy]=useState(false),[scopeSearch,setScopeSearch]=useState('');
 const load=()=>request<Data>('/security/connected-apps').then(setData);
 useEffect(()=>{void load().catch(e=>setMessage(String(e)));},[]);
 const toggle=(key:'scopes'|'users',v:string)=>setDraft(prev=>({...prev,
  [key]:prev[key].includes(v)?prev[key].filter(x=>x!==v):[...prev[key],v]}));
 const groups:ScopeGroup[]=data?.scopeGroups??[{key:'legacy',label:'Connection permissions',
  scopes:(data?.scopes??[]).map(scope=>({scope,label:scope,description:'Legacy OAuth scope',risk:'standard',assignable:true}))}];
 const setGroup=(group:ScopeGroup,enable:boolean)=>{
  const allowed=(groups.find(item=>item.key===group.key)??group).scopes
   .filter(s=>s.assignable).map(s=>s.scope);
  setDraft(prev=>({...prev,scopes:enable
   ?[...new Set([...prev.scopes,...allowed])]
   :prev.scopes.filter(s=>!allowed.includes(s))}));
 };
 const search=scopeSearch.trim().toLocaleLowerCase();
 const visibleGroups=groups.map(group=>({...group,
  scopes:group.scopes.filter(s=>!search||[s.scope,s.label,s.description,group.label]
   .some(v=>v.toLocaleLowerCase().includes(search)))
 })).filter(group=>group.scopes.length>0);
 const selectedTotal=draft.scopes.length;
 return <section className="surface permission-section"><h2>Connected Apps</h2><p>OAuth authorization code with PKCE (S256), explicit user consent and rotating refresh tokens. Editing an app revokes existing consents. Secret values are shown once.</p>
  {message&&<p role="status">{message}</p>}{secret&&<p role="status">Save this client secret now: <code>{secret}</code> <button className="btn" onClick={()=>setSecret('')}>Dismiss</button></p>}
  {data&&<><label className="form-label">Application<select className="form-control" value={draft.id??''} onChange={e=>{setDraft(data.clients.find(c=>c.id===e.target.value)??fresh());setSecret('');}}><option value="">New connected app</option>{data.clients.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
  {draft.id&&<p>Client ID: <code>{draft.id}</code></p>}
  {draft.id&&draft.client_type==='confidential'&&<button className="btn" disabled={busy} onClick={()=>{setBusy(true);void request<{clientSecret:string}>('/security/connected-apps/rotate-secret',{method:'POST',body:JSON.stringify({id:draft.id})}).then(r=>{setSecret(r.clientSecret);setMessage('Secret rotated; existing consents revoked.');}).catch(e=>setMessage(String(e))).finally(()=>setBusy(false));}}>Rotate client secret and revoke consents</button>}
  <label className="form-label">Name<input className="form-control" value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})}/></label>
  <label className="form-label">Client type<select className="form-control" disabled={Boolean(draft.id)} value={draft.client_type} onChange={e=>setDraft({...draft,client_type:e.target.value as Client['client_type']})}><option value="public">Public (browser or native app)</option><option value="confidential">Confidential (server stores a secret)</option></select></label>
  <label className="form-label">Exact HTTPS redirect URLs, one per line<textarea className="form-control" value={draft.redirects.join('\n')} onChange={e=>setDraft({...draft,redirects:e.target.value.split('\n')})}/></label>
  <label className="checkbox-row"><input type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/>Enabled</label>
  <label className="checkbox-row"><input type="checkbox" checked={draft.require_mfa} onChange={e=>setDraft({...draft,require_mfa:e.target.checked})}/>Require MFA at consent</label>
  <section className="oauth-scope-selector" aria-label="Allowed OAuth scopes">
   <div className="oauth-scope-heading">
    <div><h3>Allowed OAuth scopes</h3><p>Choose the smallest permissions this application needs. OneEngine RBAC is enforced separately.</p></div>
    <span className="oauth-scope-count">{selectedTotal} selected</span>
   </div>
   <label className="form-label">Find a permission
    <input className="form-control" type="search" placeholder="Search groups, capabilities or scope names"
     value={scopeSearch} onChange={event=>setScopeSearch(event.target.value)}/>
   </label>
   <div className="oauth-scope-groups">
    {visibleGroups.map(group=>{
     const enabled=(groups.find(item=>item.key===group.key)??group).scopes.filter(s=>s.assignable);
     const totalSelected=enabled.filter(s=>draft.scopes.includes(s.scope)).length;
     return <details key={group.key} className="oauth-scope-group" open={scopeSearch?true:undefined}>
      <summary><strong>{group.label}</strong><span>{totalSelected}/{enabled.length} selected</span></summary>
      <div className="oauth-scope-group-body">
       <div className="oauth-scope-group-actions">
        <button type="button" className="btn" disabled={enabled.length===0||totalSelected===enabled.length}
         onClick={()=>setGroup(group,true)}>Select entire group</button>
        <button type="button" className="btn" disabled={totalSelected===0}
         onClick={()=>setGroup(group,false)}>Clear group</button>
       </div>
       {group.scopes.map(item=><label className={'oauth-scope-option'+(!item.assignable?' oauth-scope-reserved':'')} key={item.scope}>
        <input type="checkbox" checked={draft.scopes.includes(item.scope)} disabled={!item.assignable}
         onChange={()=>toggle('scopes',item.scope)}/>
        <span><strong>{item.label}</strong><code>{item.scope}</code>
         <small>{item.description}</small></span>
        <em>{!item.assignable?'Reserved':item.risk==='critical'?'Sensitive':item.risk==='elevated'?'Elevated':''}</em>
       </label>)}
      </div>
     </details>;
    })}
   </div>
   {visibleGroups.length===0&&<p role="status">No matching permissions.</p>}
   <p className="oauth-scope-help">Reserved entries are visible for future applications but cannot be granted until supported by an authorised API or MCP operation. Saving changes revokes existing consent; connected users must reauthorise.</p>
  </section>
  <fieldset><legend>Allowed users</legend>{data.users.map(u=><label className="checkbox-row" key={u.id}><input type="checkbox" checked={draft.users.includes(u.id)} onChange={()=>toggle('users',u.id)}/>{u.email}</label>)}</fieldset>
  <button className="btn btn-brand" disabled={busy} onClick={()=>{setBusy(true);setMessage('');void request<{id:string;clientSecret?:string}>('/security/connected-apps',{method:'PUT',body:JSON.stringify(draft)}).then(async r=>{setDraft({...draft,id:r.id});setSecret(r.clientSecret??'');setMessage('Saved');await load();}).catch(e=>setMessage(String(e))).finally(()=>setBusy(false));}}>Save connected app</button></>}
 </section>;
}
