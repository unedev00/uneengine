import {useEffect,useState} from 'react';
import {apiRequest} from '../../authentication/Client/authClient';
type IndexedField={fieldApi:string;label:string;enabled:boolean;revision:number};

/** Optional exact equality indexes use one tenant-scoped SQL projection, not
 * per-tenant physical index DDL. This editor is builder-only and lazy-loaded. */
export default function FieldExactIndexesPanel({objectApi}: {objectApi:string}){
 const [fields,setFields]=useState<IndexedField[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const url='/metadata/objects/'+encodeURIComponent(objectApi)+'/field-indexes';
 useEffect(()=>{
  let active=true;setLoading(true);setFields([]);setBusy('');setError('');
  void apiRequest<{indexes:IndexedField[]}>(url).then(data=>{
   if(active)setFields(data.indexes);
  }).catch(err=>{if(active)setError(err instanceof Error?err.message:'Unable to load indexes')})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[url]);
 const toggle=async(item:IndexedField)=>{
  setBusy(item.fieldApi);setError('');
  try{
   const result=await apiRequest<{enabled:boolean;revision:number}>(
    url+'/'+encodeURIComponent(item.fieldApi),{method:'PUT',
     body:JSON.stringify({enabled:!item.enabled,revision:item.revision})});
   setFields(previous=>previous.map(field=>field.fieldApi===item.fieldApi
    ?{...field,enabled:result.enabled,revision:result.revision}:field));
  }catch(err){setError(err instanceof Error?err.message:'Unable to save field index')}
  finally{setBusy('')}
 };
 return <div className="metadata-card">
  <h3>Exact-Match Indexes</h3>
  <p>Enable fast exact matching on selected text-like fields. Index entries are isolated
   by tenant and Object, refreshed on record changes and removed when disabled.
   The shared permissions and original value comparisons remain mandatory.
   Full-text Searchable Fields above are managed separately.</p>
  {loading&&<p>Loading field indexing preferences…</p>}
  {error&&<p role="alert">{error}</p>}
  {!loading&&fields.length===0&&<p>No eligible readable Text, Email, Phone, URL or Picklist fields.</p>}
  {fields.map(field=><label className="metadata-list-row" key={field.fieldApi}>
    <span>{field.label} <small>({field.fieldApi})</small></span>
    <span><input type="checkbox" disabled={!!busy} checked={field.enabled}
     onChange={()=>void toggle(field)} aria-label={'Exact index for '+field.label}/>
     {' '}{busy===field.fieldApi?'Updating…':field.enabled?'Enabled':'Disabled'}</span>
  </label>)}
 </div>;
}
