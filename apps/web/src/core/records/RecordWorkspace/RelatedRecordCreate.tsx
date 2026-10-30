import {useState} from 'react';
import {RecordFormDialog} from '../RecordFormDialog/recordFormDialogView';
import {recordEditPageLayout} from './recordEditPageLayout';
import {pageLayoutForRecord,type RecordData} from './recordMetadataUtils';
import {applyRequiredLayoutDefaults,filterLayoutWritableValues,missingLayoutRequiredFields} from './layoutWritableValues';
import type {LightningPageMetadata,ObjectMetadata} from '../../metadata/Definitions/metadata';
import type {LayoutDevice} from '../../pages/TemplatePageRuntime/pageComponentLayout';
export default function RelatedRecordCreate({object,objects,parentId,relationshipField,request,fieldAccess,
  profileId,device,appId,onSaved,lookupRecords,searchLookupRecords,userRoles,recordTypeAccess}: {
  object:ObjectMetadata;objects:ObjectMetadata[];parentId:string;relationshipField:string;
  request:<T>(path:string,init?:RequestInit)=>Promise<T>;fieldAccess:Record<string,{read:boolean;edit:boolean}>;
  profileId:string;device:LayoutDevice;appId:string;onSaved:()=>void;
  lookupRecords:Record<string,RecordData[]>;searchLookupRecords:(object:string,term:string)=>Promise<RecordData[]>;
  userRoles:Array<{id:string;name:string}>;recordTypeAccess:Record<string,boolean>;
}){
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [values,setValues]=useState<Record<string,unknown>>({}),[page,setPage]=useState<LightningPageMetadata|null>(null);
  const [allowed,setAllowed]=useState(false);
  const types=(object.recordTypes??[]).filter(type=>type.active&&recordTypeAccess[object.apiName+'.'+type.id]!==false);
  const path='/records/'+encodeURIComponent(object.apiName);
  const resolve=async(typeId:string)=>{
    setBusy(true);setAllowed(false);setError('');setPage(null);
    try{
      const payload=await request<{editLightningPage?:LightningPageMetadata;recordPermissions:{Create:boolean}}>(path+'/create-layout?'+new URLSearchParams({
        appId,recordTypeId:typeId,formFactor:new URLSearchParams(window.location.search).get('pageLayout')==='Custom'?'Custom':device==='Phone'?'Mobile':device}));
      setPage(payload.editLightningPage??null);setAllowed(payload.recordPermissions.Create);
    }catch(failure){setError(failure instanceof Error?failure.message:'Creation is unavailable');}
    finally{setBusy(false);}
  };
  const context={formFactor:device,record:values,fields:object.fields,profileId,
    recordPermissions:new Set<'Create'|'Edit'|'Delete'>(allowed?['Create']:[]),
    readableFieldApiNames:new Set(object.fields.filter(field=>fieldAccess[object.apiName+'.'+field.apiName]?.read).map(field=>field.apiName))};
  const dynamic=Boolean(page?.components.some(component=>['Record Field','Field Section'].includes(component.type)));
  const layout=recordEditPageLayout(page,pageLayoutForRecord(object,String(values.RecordTypeId??''),profileId),context);
  return <><button type="button" className="btn" onClick={()=>{
    const type=types.find(item=>item.isDefault)?.id??types[0]?.id??'';
    setValues({[relationshipField]:parentId,...(type?{RecordTypeId:type}:{})});setOpen(true);void resolve(type);
  }}>New</button>{open&&(busy&&!allowed?<div role="status">Loading creation layout…</div>:!allowed?<div role="alert">{error||'Create permission is required.'}<button type="button" onClick={()=>setOpen(false)}>Close</button></div>:
    <RecordFormDialog object={object} objects={objects} activeRecordTypes={types}
      selectedRecordTypeId={String(values.RecordTypeId??'')} profileId={profileId} selectedLayout={layout}
      authoredDynamicFields={dynamic} dynamicPage={page} visibilityContext={context} layoutDevice={device}
      fieldAccess={{...fieldAccess,[object.apiName+'.'+relationshipField]:{read:fieldAccess[object.apiName+'.'+relationshipField]?.read===true,edit:false}}} userRoles={userRoles} formValues={values} lookupRecords={lookupRecords}
      searchLookupRecords={searchLookupRecords} formError={error} saving={busy} editing={false} actionAllowed={allowed}
      onChange={(name,value)=>{setValues(previous=>({...previous,[name]:value}));if(name==='RecordTypeId')void resolve(String(value));}}
      onClose={()=>setOpen(false)} onSubmit={event=>{event.preventDefault();setBusy(true);setError('');
        void(async()=>{
          const writable=new Set(object.fields.filter(field=>fieldAccess[object.apiName+'.'+field.apiName]?.edit&&!field.formula&&!field.rollup).map(field=>field.apiName));
          const defaults=Object.fromEntries(object.fields.filter(field=>writable.has(field.apiName)&&field.defaultValue!==undefined).map(field=>[field.apiName,field.defaultValue]));
          const input=applyRequiredLayoutDefaults({...defaults,...values},layout,object.fields,writable);
          const missing=missingLayoutRequiredFields(input,layout,writable);
          if(missing.length)throw new Error('Complete required fields: '+missing.join(', '));
          const body=filterLayoutWritableValues(Object.fromEntries(Object.entries(input).filter(([name])=>name==='RecordTypeId'||writable.has(name))),layout,
            new Set(object.fields.filter(field=>field.required).map(field=>field.apiName)),dynamic);
          // Parent scope is fixed even if a user changes or hides the lookup in the form.
          body[relationshipField]=parentId;
          await request(path,{method:'POST',body:JSON.stringify(body)});setOpen(false);onSaved();
        })().catch(failure=>setError(failure instanceof Error?failure.message:'Unable to create record')).finally(()=>setBusy(false));
      }}/>)}</>;
}
