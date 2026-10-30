import {useState} from 'react';
import {RecordFormDialog} from '../RecordFormDialog/recordFormDialogView';
import {recordEditPageLayout} from './recordEditPageLayout';
import {pageLayoutForRecord,type RecordData} from './recordMetadataUtils';
import {filterLayoutWritableValues,missingLayoutRequiredFields} from './layoutWritableValues';
import type {LightningPageMetadata,ObjectMetadata} from '../../metadata/Definitions/metadata';
import type {LayoutDevice} from '../../pages/TemplatePageRuntime/pageComponentLayout';

type Snapshot={record:RecordData;editLightningPage?:LightningPageMetadata;recordPermissions:{Edit:boolean;Delete:boolean;Create:boolean}};
export default function RelatedRecordActions({object,objects,record,request,fieldAccess,profileId,
  device,appId,onView,onSaved,lookupRecords,searchLookupRecords,userRoles}: {
  object:ObjectMetadata;objects:ObjectMetadata[];record:RecordData;
  request:<T>(path:string,init?:RequestInit)=>Promise<T>;
  fieldAccess:Record<string,{read:boolean;edit:boolean}>;profileId:string;device:LayoutDevice;appId:string;
  onView:()=>void;onSaved:()=>void;lookupRecords:Record<string,RecordData[]>;
  searchLookupRecords:(object:string,term:string)=>Promise<RecordData[]>;userRoles:Array<{id:string;name:string}>;
}){
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[open,setOpen]=useState(false);
  const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [patch,setPatch]=useState<Record<string,unknown>>({});
  const path=`/records/${encodeURIComponent(object.apiName)}/${encodeURIComponent(record.Id)}`;
  const load=async()=>{
    setBusy(true);setError('');setSnapshot(null);
    try {setSnapshot(await request<Snapshot>(path+'?'+new URLSearchParams({appId,formFactor:new URLSearchParams(window.location.search).get('pageLayout')==='Custom'?'Custom':device==='Phone'?'Mobile':device})));}
    catch(failure){setError(failure instanceof Error?failure.message:'Unable to load record permissions');}
    finally{setBusy(false);}
  };
  const values={...(snapshot?.record??record),...patch};
  const permissions=new Set<'Create'|'Edit'|'Delete'>((['Create','Edit','Delete'] as const).filter(name=>snapshot?.recordPermissions[name]));
  const context={formFactor:device,record:values,fields:object.fields,profileId,
    recordPermissions:permissions,readableFieldApiNames:new Set(object.fields.filter(field=>fieldAccess[`${object.apiName}.${field.apiName}`]?.read).map(field=>field.apiName))};
  const page=snapshot?.editLightningPage;
  const dynamic=Boolean(page?.components.some(component=>['Record Field','Field Section'].includes(component.type)));
  const layout=recordEditPageLayout(page,pageLayoutForRecord(object,String(values.RecordTypeId??''),profileId),context);
  const mutate=async(task:()=>Promise<void>)=>{
    setBusy(true);setError('');
    try{await task();setEditing(false);setOpen(false);onSaved();}
    catch(failure){setError(failure instanceof Error?failure.message:'Unable to save related record');}
    finally{setBusy(false);}
  };
  return <div><button type="button" className="btn" aria-expanded={open} onClick={()=>{
    setOpen(previous=>!previous);if(!open)void load();
  }}>Actions</button>{open&&<div aria-label="Related record actions">
    <button type="button" className="btn" onClick={onView}>View</button>
    {busy&&<span role="status">Loading…</span>}
    {snapshot?.recordPermissions.Edit&&<button type="button" className="btn" disabled={busy}
      onClick={()=>{setPatch({});setEditing(true);}}>Edit</button>}
    {snapshot?.recordPermissions.Delete&&<button type="button" className="btn btn-danger" disabled={busy}
      onClick={()=>{if(window.confirm('Delete this related record? It can be restored from the Recycle Bin.'))void mutate(async()=>{
        await request(path,{method:'DELETE',headers:typeof snapshot.record.LastModifiedDate==='string'?{'If-Unmodified-Since':snapshot.record.LastModifiedDate}:{}});
      });}}>Delete</button>}
  </div>}{error&&!editing&&<p role="alert">{error}</p>}
  {editing&&snapshot&&<RecordFormDialog object={object} objects={objects} activeRecordTypes={[]}
    selectedRecordTypeId={String(values.RecordTypeId??'')} profileId={profileId} selectedLayout={layout}
    authoredDynamicFields={dynamic} dynamicPage={page} visibilityContext={context} layoutDevice={device}
    fieldAccess={fieldAccess} userRoles={userRoles} formValues={values} recordId={record.Id}
    lookupRecords={lookupRecords} searchLookupRecords={searchLookupRecords} formError={error} saving={busy}
    editing actionAllowed={snapshot.recordPermissions.Edit} onChange={(name,value)=>setPatch(previous=>({...previous,[name]:value}))}
    onClose={()=>setEditing(false)} onSubmit={event=>{event.preventDefault();void mutate(async()=>{
      const writable=new Set(object.fields.filter(field=>fieldAccess[`${object.apiName}.${field.apiName}`]?.edit&&!field.formula&&!field.rollup).map(field=>field.apiName));
      const missing=missingLayoutRequiredFields(values,layout,writable);
      if(missing.length)throw new Error('Complete required fields: '+missing.join(', '));
      const allowed=filterLayoutWritableValues(patch,layout,new Set(object.fields.filter(field=>field.required).map(field=>field.apiName)),dynamic);
      const body=Object.fromEntries(Object.entries(allowed).filter(([name])=>writable.has(name)));
      if(Object.keys(body).length)await request(path,{method:'PUT',body:JSON.stringify(body),
        headers:typeof snapshot.record.LastModifiedDate==='string'?{'If-Unmodified-Since':snapshot.record.LastModifiedDate}:{}});
    });}}/>}</div>;
}
