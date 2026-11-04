import {useEffect,useMemo,useState,type ChangeEvent} from 'react';
import {Database,Table2,SlidersHorizontal,Download,Upload,AlertTriangle,CheckCircle2} from 'lucide-react';
import type {ObjectMetadata} from '../../metadata/Definitions/metadata';
import UniversalMetadataLoader from './UniversalMetadataLoader';

type Props={apiRequest:<T>(path:string,init?:RequestInit)=>Promise<T>;objects:ObjectMetadata[];onChanged?:()=>void};
type Mode='metadata'|'records'|'ribbon';
type Report={digest?:string;report:string;summary:{total:number;valid:number;success:number;error:number;skipped:number};
 rows:Array<{sheet:string;excelRow:number;objectApi?:string;fieldApi?:string;action:string;status:string;message:string;result?:string}>};
const request=(body:unknown):RequestInit=>({method:'POST',body:JSON.stringify(body)});
function saveXlsx(base64:string,filename:string){
 const binary=atob(base64),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
 const link=document.createElement('a');link.href=url;link.download=filename;
 document.body.appendChild(link);link.click();link.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function useExcelUpload(){
 const [workbook,setWorkbook]=useState(''),[fileName,setFileName]=useState('');
 const select=async(event:ChangeEvent<HTMLInputElement>)=>{
  const file=event.target.files?.[0];setWorkbook('');setFileName('');
  if(!file)return;
  if(!/\.xlsx$/i.test(file.name)||file.size>10_000_000)throw Error('Select an XLSX file up to 10MB');
  const encoded=await new Promise<string>((resolve,reject)=>{
   const reader=new FileReader();
   reader.onerror=()=>reject(Error('Cannot read Excel file'));
   reader.onload=()=>resolve(String(reader.result).split(',')[1]??'');
   reader.readAsDataURL(file);
  });
  setWorkbook(encoded);setFileName(file.name);
 };
 return {workbook,fileName,select};
}
export default function UniversalDataLoaderPage({apiRequest,objects,onChanged}:Props){
 const [mode,setMode]=useState<Mode>('records');
 const [objectApi,setObjectApi]=useState(objects[0]?.apiName??'');
 const [matchField,setMatchField]=useState('');
 const [offset,setOffset]=useState(0);
 const [ribbonComponent,setRibbonComponent]=useState('');
 const [ribbonComponents,setRibbonComponents]=useState<string[]>([]);
 const [report,setReport]=useState<Report|null>(null),[executed,setExecuted]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[exportInfo,setExportInfo]=useState('');
 const {workbook,fileName,select}=useExcelUpload();
 const object=objects.find(item=>item.apiName===objectApi)??objects[0];
 const externalIds=useMemo(()=>object?.fields.filter(field=>field.externalId)??[],[object]);
 useEffect(()=>{if(!objects.some(o=>o.apiName===objectApi))setObjectApi(objects[0]?.apiName??'');},[objects,objectApi]);
 useEffect(()=>{setMatchField('');setOffset(0);setReport(null);setExecuted(false);},[objectApi]);
 useEffect(()=>{void apiRequest<{components:string[]}>('/metadata/builder-ribbon')
  .then(result=>setRibbonComponents((result.components??[]).filter(api=>api.startsWith('smart_'))))
  .catch(()=>setRibbonComponents([]));},[apiRequest]);
 const chooseMode=(next:Mode)=>{setMode(next);setReport(null);setExecuted(false);setError('');setExportInfo('');};
 const scope=mode==='records'?{objectApi:object?.apiName??'',matchField}: {componentApi:ribbonComponent};
 const endpoint=mode==='records'?'/data-loader/records/':'/data-loader/ribbon/';
 const saveExport=async()=>{
  setBusy(true);setError('');setReport(null);
  try{
   const result=await apiRequest<{workbook:string;total?:number;exported?:number;nextOffset?:number;hasMore?:boolean}>(
    endpoint+'export',request(mode==='records'?{objectApi:object?.apiName,pageSize:1000,offset}:{componentApi:ribbonComponent}));
   saveXlsx(result.workbook,mode==='records'?'Records_'+objectApi+'_'+offset+'.xlsx':
    'Smart_Ribbon_Property_Library.xlsx');
   setExportInfo(mode==='records'?
    'Exported '+result.exported+' of '+result.total+' accessible records'+
     (result.hasMore?'. More records available from offset '+result.nextOffset+'.':'.'):
    'Property rules exported. Change only the Enabled column; keep CurrentEnabled unchanged.');
  }catch(e){setError(e instanceof Error?e.message:'Excel export failed');}
  finally{setBusy(false);}
 };
 const validate=async()=>{
  if(!workbook)return;
  setBusy(true);setError('');setReport(null);setExecuted(false);
  try{setReport(await apiRequest<Report>(endpoint+'validate',request({...scope,workbook})));}
  catch(e){setError(e instanceof Error?e.message:'Validation failed');}
  finally{setBusy(false);}
 };
 const execute=async()=>{
  if(!report?.digest)return;
  setBusy(true);setError('');
  try{
   const result=await apiRequest<Report>(endpoint+'execute',request({
    ...scope,workbook,digest:report.digest,confirmation:'PROCEED_EXCLUDING_ERRORS'
   }));
   setReport(result);setExecuted(true);onChanged?.();
  }catch(e){setError(e instanceof Error?e.message:'Execution failed');}
  finally{setBusy(false);}
 };
 return <section className="surface object-setting-surface" aria-label="Universal Data Loader"
  style={{padding:24,maxWidth:1180,margin:'0 auto'}}>
  <div className="section-toolbar">
   <div><h1>Universal Data Loader</h1>
    <p>Download the live configuration or data, edit Excel, validate, and apply only valid rows.</p></div>
  </div>
  <div role="tablist" aria-label="Data Loader sections" style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:18}}>
   {([['metadata','Objects & Fields',Database],['records','Records',Table2],
     ['ribbon','Smart Component Property Library',SlidersHorizontal]] as const).map(([id,label,Icon])=>
    <button key={id} role="tab" aria-selected={mode===id}
     className={mode===id?'btn btn-brand':'btn'} onClick={()=>chooseMode(id)} type="button">
     <Icon size={16}/> {label}</button>)}
  </div>
  {mode==='metadata'&&<>
   <label style={{display:'block',marginBottom:12}}>Object to export <select className="form-control"
    value={object?.apiName??''} onChange={event=>setObjectApi(event.target.value)}>
    {objects.map(o=><option key={o.apiName} value={o.apiName}>{o.label} ({o.apiName})</option>)}
   </select></label>
   <UniversalMetadataLoader embedded apiRequest={apiRequest}
    currentObject={object?.apiName??''} onClose={()=>chooseMode('records')}
    onChanged={()=>onChanged?.()}/></>}
  {mode!=='metadata'&&<>
   <section className="metadata-card" style={{marginBottom:16,padding:16}}>
    <h2>{mode==='records'?'Record Excel export':'Shared ribbon property export'}</h2>
    {mode==='records'?<div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
     <label>Object <select className="form-control" value={object?.apiName??''}
      onChange={event=>setObjectApi(event.target.value)}>
      {objects.map(o=><option key={o.apiName} value={o.apiName}>{o.label} ({o.apiName})</option>)}
     </select></label>
     <label>Match blank IDs by External ID <select className="form-control" value={matchField}
      onChange={event=>{setMatchField(event.target.value);setReport(null);}}>
      <option value="">None — create rows without Id</option>
      {externalIds.map(f=><option value={f.apiName} key={f.apiName}>{f.label} ({f.apiName})</option>)}
     </select></label>
     <label>Starting record offset <input className="form-control" type="number" min={0} max={1000000}
      value={offset} onChange={e=>setOffset(Math.max(0,Number(e.target.value)||0))}/></label>
    </div>:<div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
     <label>Smart component <select className="form-control" value={ribbonComponent}
      onChange={e=>setRibbonComponent(e.target.value)}>
      <option value="">All Smart Components</option>
      {ribbonComponents.map(c=><option key={c} value={c}>{c}</option>)}
     </select></label>
    </div>}
    <div style={{marginTop:14}}>
     <button className="btn" disabled={busy||(mode==='records'&&!object)} onClick={()=>void saveExport()}>
      <Download size={16}/> Download editable Excel</button>
    </div>
    {exportInfo&&<p role="status">{exportInfo}</p>}
    <p className="properties-help">{mode==='records'?
     'Existing records include Id and LastModifiedDate. Keep Id to update; append new rows with a blank Id. A blank field leaves existing data unchanged; <CLEAR> explicitly clears a nullable field.':
     'Each row uses the actual component/property keys. For example smart_cart / rowBorderColor / FALSE disables its ribbon control. Existing component values are not overwritten.'}</p>
   </section>
   <section className="metadata-card" style={{padding:16}}>
    <h2><Upload size={16}/> Upload and validate</h2>
    <input type="file" accept=".xlsx" aria-label="Upload Excel workbook"
     onChange={event=>{setReport(null);setExecuted(false);void select(event).catch(e=>setError(e.message));}}/>
    <span style={{marginLeft:12}}>{fileName}</span>
    <div style={{marginTop:12}}>
     <button className="btn btn-brand" disabled={busy||!workbook||(mode==='records'&&!object)}
      type="button" onClick={()=>void validate()}>1. Validate first</button>
    </div>
    {error&&<p role="alert" style={{color:'var(--color-danger,#c5221f)'}}>
     <AlertTriangle size={16}/> {error}</p>}
    {report&&<>
     <div style={{display:'flex',gap:18,flexWrap:'wrap',margin:'16px 0'}}>
      <strong>Total {report.summary.total}</strong><span>Valid {report.summary.valid}</span>
      <span>Success {report.summary.success}</span><span>Errors {report.summary.error}</span>
      <span>Skipped {report.summary.skipped}</span>
     </div>
     <div className="table-scroll" style={{maxHeight:350,overflow:'auto'}}>
      <table className="slds-table"><thead><tr><th>Excel row</th><th>Action</th><th>Status</th>
       <th>Result / reason</th></tr></thead><tbody>
       {report.rows.slice(0,150).map((row,i)=><tr key={row.sheet+'-'+row.excelRow+'-'+i}>
        <td>{row.excelRow}</td><td>{row.action}</td><td>{row.status}</td>
        <td>{row.message}{row.result?' — '+row.result:''}</td>
       </tr>)}
      </tbody></table>
     </div>
     {report.rows.length>150&&<p>First 150 rows shown. Excel report contains all rows.</p>}
     <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:16}}>
      {!executed&&<button type="button" className="btn btn-brand" disabled={busy||!report.summary.valid}
       onClick={()=>void execute()}><CheckCircle2 size={15}/> 2. Proceed excluding error rows</button>}
      <button type="button" className="btn" onClick={()=>{
       saveXlsx(report.report,executed?'Data_Loader_Execution_Report.xlsx':'Data_Loader_Validation_Errors.xlsx');
       if(!executed)setReport(null);
      }}><Download size={15}/>{executed?'Download final execution report':'Cancel and download error report'}</button>
      {!executed&&<button type="button" className="btn" onClick={()=>setReport(null)}>Cancel</button>}
     </div>
    </>}
   </section>
   <p className="properties-help">{mode==='ribbon'?
    'Changes use global SQL applicability and require BuilderRibbon / manage permission. Reload Page Builder to see the updated controls.':
    'Record operations include Create, Update, Upsert, Delete, and Restore. All writes use OneEngine record and field permissions; this screen does not permit hard deletion.'}</p>
  </>}
 </section>;
}
