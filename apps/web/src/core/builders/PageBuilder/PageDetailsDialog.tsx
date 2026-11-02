import {useEffect,useState} from 'react';
import type {LightningPageMetadata,LightningAppMetadata} from '../../metadata/Definitions/metadata';

type Variant='Desktop'|'Tablet'|'Mobile'|'Custom';
type Version={version:number;createdAt:string;published:boolean;draft:boolean};
const variants:Variant[]=['Desktop','Tablet','Mobile','Custom'];

/** Page metadata and immutable version history are separate from canvas editing.
 * Historical snapshots are read-only; restoring one changes only the draft head. */
export default function PageDetailsDialog({page,apps,disabled,request,onClose,onSave,onOpenDesign,onReload}:{
 page:LightningPageMetadata;
 apps:readonly LightningAppMetadata[];
 disabled:boolean;
 request:<T>(path:string,init?:RequestInit)=>Promise<T>;
 onClose:()=>void;
 onSave:(apiName:string,label:string,appApiName:string|null,expectedLabel:string)=>Promise<boolean>;
 onOpenDesign:(apiName:string)=>void;
 onReload:(page:LightningPageMetadata)=>void;
}){
 const [tab,setTab]=useState<'details'|'versions'>('details');
 const [label,setLabel]=useState(page.label);
 const existing=(page.activationAssignments??[]).find(a=>a.scope==='App Default'&&a.appId)?.appId
   ??apps.find(app=>app.navigationPageApiNames.includes(page.apiName))?.apiName??'';
 const [appApiName,setAppApiName]=useState(existing);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [variant,setVariant]=useState<Variant>(page.layoutVariant??'Desktop');
 const [versions,setVersions]=useState<Version[]>([]);
 const [loading,setLoading]=useState(false);
 const [preview,setPreview]=useState<{version:number;page:LightningPageMetadata}|null>(null);
 const valid=Boolean(label.trim()&&label.trim().length<=128&&
  (page.pageType!=='App Page'||apps.some(a=>a.apiName===appApiName)));
 const base=`/metadata/pages/${encodeURIComponent(page.apiName)}/layouts/${variant}`;
 useEffect(()=>{
  if(tab!=='versions')return;
  let active=true;
  setLoading(true);setPreview(null);setError('');
  request<{versions:Version[]}>(base+'/history')
   .then(result=>{if(active)setVersions(result.versions)})
   .catch(err=>{if(active)setError(err instanceof Error?err.message:'Unable to load versions')})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[page.apiName,variant,tab]);
 const submit=async()=>{
  if(!valid||busy||disabled)return;
  setBusy(true);setError('');
  try{
   const succeeded=await onSave(page.apiName,label.trim(),
    page.pageType==='App Page'?appApiName:null,page.label);
   if(succeeded)onClose();
   else setError('Could not save page details. Review the message and retry.');
  }catch(e){setError(e instanceof Error?e.message:'Unable to update page');}
  finally{setBusy(false)}
 };
 const viewVersion=async(version:number)=>{
  if(busy)return;
  setBusy(true);setError('');
  try{
   const response=await request<{page:LightningPageMetadata}>(base+'/versions/'+version);
   setPreview({version,page:response.page});
  }catch(e){setError(e instanceof Error?e.message:'Unable to open version')}
  finally{setBusy(false)}
 };
 const restoreVersion=async(version:number)=>{
  if(busy||disabled||!window.confirm(
   'Restore version '+version+' to the editable draft? The published page will stay unchanged until you publish.'))return;
  setBusy(true);setError('');
  try{
   const response=await request<{page:LightningPageMetadata}>(base+'/restore',{
    method:'POST',body:JSON.stringify({version})
   });
   onReload(response.page);
   onClose();
   onOpenDesign(page.apiName);
  }catch(e){setError(e instanceof Error?e.message:'Unable to restore version')}
  finally{setBusy(false)}
 };
 return <div className="modal-backdrop" role="presentation">
  <section className="modal page-details-dialog" role="dialog" aria-modal="true"
   aria-label="Edit page properties and versions"
   style={{width:'min(920px,96vw)',maxHeight:'90vh',overflowY:'auto'}}>
   <div className="modal-header">
    <h2>Edit Page — {page.label}</h2>
    <button type="button" className="icon-button" aria-label="Close page details"
     onClick={onClose} disabled={busy}>×</button>
   </div>
   <div role="tablist" aria-label="Page details sections"
    style={{display:'flex',gap:12,padding:'12px 20px',borderBottom:'1px solid #dde4ec'}}>
    <button type="button" role="tab" aria-selected={tab==='details'}
     className={tab==='details'?'btn btn-brand':'btn'}
     onClick={()=>setTab('details')}>Page properties</button>
    <button type="button" role="tab" aria-selected={tab==='versions'}
     className={tab==='versions'?'btn btn-brand':'btn'}
     onClick={()=>setTab('versions')}>Versions</button>
   </div>
   {tab==='details'?<div className="modal-body" style={{display:'grid',gap:16,padding:20}}>
    <label className="form-label">Page name
     <input className="form-control" aria-label="Page name" value={label}
      maxLength={128} onChange={e=>setLabel(e.target.value)} autoFocus/>
    </label>
    <label className="form-label">API name
     <input className="form-control" aria-label="Page API name" value={page.apiName} readOnly/>
     <small>Stable identity. Renaming an existing API name requires a separate reference-safe metadata migration; display names can be edited here.</small>
    </label>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14}}>
     <div><strong>Page type</strong><div>{page.pageType}</div></div>
     <div><strong>Status</strong><div>{page.status}</div></div>
     <div><strong>Object</strong><div>{page.targetObject||'Not object-specific'}</div></div>
     <div><strong>Current layout</strong><div>{page.layoutVariant??'Desktop'}</div></div>
    </div>
    {page.pageType==='App Page'&&<label className="form-label">Assigned application
     <select className="form-control" aria-label="Assign page to app" value={appApiName}
      onChange={e=>setAppApiName(e.target.value)}>
      <option value="">Select installed app…</option>
      {apps.map(app=><option key={app.apiName} value={app.apiName}>{app.label} ({app.apiName})</option>)}
     </select>
    </label>}
    {page.pageType==='App Page'&&<small>
     {page.status==='Active'?'An active page appears in the selected app navigation.':
      'A draft page is assigned now; activate it to show it in the app navigation.'}
    </small>}
    <p className="properties-help">Canvas dimensions, component positions, nested components and appearance remain in Design. Page identity, placement and historical versions are managed here.</p>
   </div>:<div style={{padding:20}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,flexWrap:'wrap'}}>
     <label className="form-label">Layout version
      <select className="form-control" value={variant} aria-label="Version layout"
       onChange={e=>setVariant(e.target.value as Variant)}>
       {variants.map(v=><option key={v}>{v}</option>)}
      </select>
     </label>
     <small>Historical versions are immutable. Restore to draft before editing.</small>
    </div>
    <div style={{overflowX:'auto'}}>
     <table className="records-table" aria-label="Page version history">
      <thead><tr><th>Version</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{versions.map(v=><tr key={v.version}>
       <td>v{v.version}</td>
       <td>{new Date(v.createdAt).toLocaleString()}</td>
       <td>{v.published?'Published':v.draft?'Current draft':'Historical'}</td>
       <td style={{whiteSpace:'nowrap'}}>
        <button type="button" className="btn btn-small" disabled={busy} onClick={()=>void viewVersion(v.version)}>View</button>{' '}
        <button type="button" className="btn btn-small" disabled={busy||disabled||v.draft}
         title="Restore to a draft; never edit a historical version in place"
         onClick={()=>void restoreVersion(v.version)}>Restore as draft &amp; Design</button>{' '}
        <button type="button" className="btn btn-small" disabled
         title="Immutable version retained for recovery">Delete</button>
       </td>
      </tr>)}</tbody>
     </table>
     {!loading&&!versions.length&&<p>No saved versions for this layout.</p>}
     {loading&&<p role="status">Loading versions…</p>}
    </div>
    {preview&&<section aria-label="Read-only version preview" style={{marginTop:18,padding:12,border:'1px solid #d6e0ec',borderRadius:8}}>
     <strong>Version v{preview.version} — read-only</strong>
     <p>Layout: {preview.page.layoutMode} · Canvas: {preview.page.canvasWidth} × {preview.page.canvasHeight} · Components: {preview.page.components.length}</p>
     <div style={{maxHeight:140,overflowY:'auto'}}>
      {preview.page.components.map(c=><div key={c.id}>{c.label||c.type} · {c.type}</div>)}
     </div>
    </section>}
   </div>}
   {error&&<p role="alert" style={{padding:'0 20px',color:'#b91c1c'}}>{error}</p>}
   <div className="office-ribbon-modal-actions">
    <button type="button" className="btn" disabled={busy} onClick={onClose}>Close</button>
    {tab==='details'?<>
     <button type="button" className="btn" disabled={busy} onClick={()=>{
      onClose();onOpenDesign(page.apiName);
     }}>Open Design</button>
     <button type="button" className="btn btn-brand" disabled={busy||disabled||!valid}
      onClick={()=>void submit()}>{busy?'Saving…':'Save page properties'}</button>
    </>:<button type="button" className="btn btn-brand" disabled={busy} onClick={()=>{
     onClose();onOpenDesign(page.apiName);
    }}>Design latest draft</button>}
   </div>
  </section>
 </div>;
}
