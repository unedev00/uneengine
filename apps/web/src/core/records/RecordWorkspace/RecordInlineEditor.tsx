import {useState,type ReactNode} from 'react';
import {RecordFormDialog} from '../RecordFormDialog/recordFormDialogView';
import type {FieldMetadata,ObjectMetadata} from '../../metadata/Definitions/metadata';
import type {RecordData} from './recordMetadataUtils';

/** Use the same compound, lookup, dependent-picklist and rich-text controls as CRUD. */
export default function RecordInlineEditor({field,object,objects,record,fieldAccess,userRoles,
  lookupRecords,searchLookupRecords,display,editable,onSave}: {
  field:FieldMetadata;object:ObjectMetadata;objects:ObjectMetadata[];record:RecordData;
  fieldAccess:Record<string,{read:boolean;edit:boolean}>;userRoles:Array<{id:string;name:string}>;
  lookupRecords:Record<string,RecordData[]>;searchLookupRecords:(object:string,term:string)=>Promise<RecordData[]>;
  display:ReactNode;editable:boolean;onSave:(patch:Record<string,unknown>)=>Promise<void>;
}) {
  const [editing,setEditing]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const [patch,setPatch]=useState<Record<string,unknown>>({});
  const names=new Set([field.apiName]);
  // Controller edits expose affected dependents so the user can fix required values before saving.
  for(let i=0;i<object.fields.length;i++)for(const candidate of object.fields)
    if(candidate.controllerFieldApiName&&names.has(candidate.controllerFieldApiName))names.add(candidate.apiName);
  const canEdit=editable&&!field.formula&&!field.rollup&&!/^Auto Number/.test(field.dataType);
  if(!editing)return <div className="record-inline-field"><span>{display}</span>{canEdit&&
    <button type="button" className="text-action" aria-label={'Edit '+field.label}
      onClick={()=>{setPatch({});setError('');setEditing(true);}}>Edit</button>}</div>;
  return <RecordFormDialog embedded object={object} objects={objects} activeRecordTypes={[]}
    selectedRecordTypeId={String(record.RecordTypeId??'')} profileId=""
    selectedLayout={{id:'inline',label:field.label,actions:['Edit'],relatedLists:[],sections:[{
      id:'inline',label:field.label,columns:1,fieldApiNames:[...names],
      requiredFieldApiNames:field.required?[field.apiName]:[]}]}}
    authoredDynamicFields fieldApiNames={[...names]} fieldAccess={fieldAccess} userRoles={userRoles}
    formValues={{...record,...patch}} recordId={record.Id} lookupRecords={lookupRecords}
    searchLookupRecords={searchLookupRecords} formError={error} saving={saving} editing actionAllowed={canEdit}
    onChange={(name,value)=>setPatch(current=>({...current,[name]:value}))}
    onClose={()=>setEditing(false)} onSubmit={event=>{
      event.preventDefault();setSaving(true);setError('');
      void onSave(patch).then(()=>setEditing(false)).catch(failure=>setError(
        failure instanceof Error?failure.message:'Unable to save field')).finally(()=>setSaving(false));
    }}/>;
}
