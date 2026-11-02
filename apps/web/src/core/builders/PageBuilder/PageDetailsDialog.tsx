import {useState} from 'react';
import type {LightningPageMetadata,LightningAppMetadata} from '../../metadata/Definitions/metadata';

/** Page identity and app placement, separate from the canvas draft editor. */
export default function PageDetailsDialog({page,apps,disabled,onClose,onSave}:{
 page:LightningPageMetadata;
 apps:readonly LightningAppMetadata[];
 disabled:boolean;
 onClose:()=>void;
 onSave:(apiName:string,label:string,appApiName:string|null,expectedLabel:string)=>Promise<boolean>;
}){
 const [label,setLabel]=useState(page.label);
 const existing=(page.activationAssignments??[]).find(a=>a.scope==='App Default'&&a.appId)?.appId??'';
 const [appApiName,setAppApiName]=useState(existing);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const valid=Boolean(label.trim()&&label.trim().length<=128&&
   (page.pageType!=='App Page'||apps.some(a=>a.apiName===appApiName)));
 const submit=async()=>{
  if(!valid||busy||disabled)return;
  setBusy(true);setError('');
  try{
   const succeeded=await onSave(page.apiName,label.trim(),
    page.pageType==='App Page'?appApiName:null,page.label);
   if(succeeded)onClose();
   else setError('Could not save page details. Review the message and retry.');
  }catch(e){setError(e instanceof Error?e.message:'Unable to update page');}
  finally{setBusy(false);}
 };
 return <div className="modal-backdrop" role="presentation">
  <section className="modal" role="dialog" aria-modal="true" aria-label="Edit page details"
   style={{width:'min(460px,95vw)'}}>
   <div className="modal-header">
    <h2>Edit page details</h2>
    <button type="button" className="icon-button" aria-label="Close page details" onClick={onClose} disabled={busy}>×</button>
   </div>
   <div className="modal-body" style={{display:'grid',gap:14,padding:18}}>
    <label className="form-label">Page name
     <input className="form-control" aria-label="Page name" value={label}
      maxLength={128} onChange={e=>setLabel(e.target.value)} autoFocus/>
    </label>
    <div><strong>API Name</strong><div><code>{page.apiName}</code></div>
     <small>Stable identifier retained so existing links, Flows and page layouts continue to work.</small>
    </div>
    {page.pageType==='App Page'&&<label className="form-label">Assign to application
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
    {error&&<div role="alert">{error}</div>}
   </div>
   <div className="office-ribbon-modal-actions">
    <button type="button" className="btn" disabled={busy} onClick={onClose}>Cancel</button>
    <button type="button" className="btn btn-brand" disabled={busy||disabled||!valid}
     onClick={()=>void submit()}>{busy?'Saving…':'Save details'}</button>
   </div>
  </section>
 </div>;
}
