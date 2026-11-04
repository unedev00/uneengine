import {apiRequest} from '../../authentication/Client/authClient';
import type {FlowDefinitionMetadata} from '../../metadata/Definitions/metadata';
import {flowGraphDiagnostics} from './flowGraphOperations.mjs';

// Excel 2003 XML is a real multi-sheet Excel format with no third-party runtime.
// The workbook is deliberately scoped to an existing flow and never contains an API to create one.
type Row=string[];
type Sheet={name:string;rows:Row[]};
const columns={
  Manifest:['Flow API','Flow Version','Snapshot','Format'],
  Nodes:['Action','Node ID','Type','Label'],
  Inputs:['Action','Node ID','Property','Value (JSON)'],
  Connections:['Action','Connection ID','From Node','To Node','Label','Kind','Scheduled Path (JSON)'],
  Resources:['Action','Name','Label','Type','Data Type','Collection','Input','Output','Value (JSON)']
};
type SheetName=keyof typeof columns;
const stable=(flow:FlowDefinitionMetadata)=>JSON.stringify({
  apiName:flow.apiName,versionNumber:flow.versionNumber,
  elements:flow.elements,connectors:flow.connectors,resources:flow.resources
});
function digest(source:string) {
  let value=2166136261;
  for(let i=0;i<source.length;i++) {value^=source.charCodeAt(i);value=Math.imul(value,16777619);}
  return (value>>>0).toString(16).padStart(8,'0');
}
function makeSheets(flow:FlowDefinitionMetadata):Sheet[] {
  const data:Record<SheetName,Row[]>={
    Manifest:[[flow.apiName,String(flow.versionNumber),digest(stable(flow)),'FlowExcelV1']],
    Nodes:flow.elements.map(node=>['UPSERT',String(node.id),node.type,node.label]),
    Inputs:flow.elements.flatMap(node=>Object.entries(node.config??{}).map(([key,value])=>['UPSERT',String(node.id),key,JSON.stringify(value)??'null'])),
    Connections:flow.connectors.map(edge=>['UPSERT',edge.id,String(edge.from),String(edge.to),edge.label,edge.kind,edge.scheduledPath?JSON.stringify(edge.scheduledPath):'']),
    Resources:flow.resources.map(r=>['UPSERT',r.name,r.label,r.type,r.dataType,String(r.isCollection),String(r.availableForInput),String(r.availableForOutput),r.value===undefined?'':JSON.stringify(r.value)])
  };
  return (Object.keys(columns) as SheetName[]).map(name=>({name,rows:[columns[name],...data[name]]}));
}
export type FlowWorkbookTable={name:string;columns:string[];rows:Record<string,string>[]};
export function flowWorkbookTables(flow:FlowDefinitionMetadata):FlowWorkbookTable[]{
 return makeSheets(flow).map(sheet=>({name:sheet.name,columns:sheet.rows[0],
  rows:sheet.rows.slice(1).map(row=>Object.fromEntries(sheet.rows[0].map((heading,index)=>[heading,row[index]??''])))}));
}
export function decodeFlowWorkbook(base64:string):Uint8Array {
 const raw=atob(base64);const bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 return bytes;
}
export async function encodeFlowWorkbook(file:File):Promise<string>{
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(bytes.length>5_000_000)throw Error('Excel exceeds 5 MB');
 let result='';for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(result);
}
export async function downloadFlowExcel(flow:FlowDefinitionMetadata) {
 const result=await apiRequest<{workbook:string}>('/metadata/loader/flow-excel/write',{
  method:'POST',body:JSON.stringify({tables:flowWorkbookTables(flow)})});
 const bytes=decodeFlowWorkbook(result.workbook);
 const url=URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
 const anchor=document.createElement('a');anchor.href=url;anchor.download=flow.apiName+'_nodes.xlsx';anchor.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function readFlowExcel(file:File):Promise<FlowWorkbookTable[]> {
 if(!/\\.xlsx$/i.test(file.name))throw Error('Only .xlsx files downloaded from Flow Builder are supported.');
 const result=await apiRequest<{tables:FlowWorkbookTable[]}>('/metadata/loader/flow-excel/read',{
  method:'POST',body:JSON.stringify({workbook:await encodeFlowWorkbook(file)})});
 return result.tables;
}
function parseSheets(tables:FlowWorkbookTable[]):Map<string,Row[]>{
 const result=new Map<string,Row[]>();
 for(const table of tables) {
  if(result.has(table.name))throw Error('Duplicate worksheet: '+table.name);
  result.set(table.name,[table.columns,...table.rows.map(row=>table.columns.map(heading=>row[heading]??''))]);
 }
 return result;
}
const bool=(value:string)=>{if(value!=='true'&&value!=='false')throw Error('Expected true or false, got '+value);return value==='true';};
const parseJson=(value:string)=>{try{return JSON.parse(value);}catch{throw Error('Invalid JSON value: '+value.slice(0,50));}};
function numericId(value:string){
  const number=Number(value);
  if(!Number.isSafeInteger(number)||number<0)throw Error('Invalid numeric node ID: '+value);
  return number;
}
export type FlowImportPreview={draft:FlowDefinitionMetadata;changes:string[];errors:string[]};
export function previewFlowExcel(tables:FlowWorkbookTable[],original:FlowDefinitionMetadata,allowedTypes:string[]):FlowImportPreview {
  const errors:string[]=[];const changes:string[]=[];
  const sheets=parseSheets(tables);
  const manifest=sheets.get('Manifest');
  if(!manifest||manifest.length<2||manifest[1][3]!=='FlowExcelV1')throw Error('Invalid or unsupported Flow Excel template.');
  if(manifest[1][0]!==original.apiName)throw Error('Workbook belongs to another flow. Open that flow instead.');
  if(Number(manifest[1][1])!==original.versionNumber||manifest[1][2]!==digest(stable(original)))
    throw Error('The flow changed since download. Download a fresh workbook to avoid overwriting edits.');
  const rows=(name:SheetName):Row[]=>{
    const sheet=sheets.get(name);
    if(!sheet||JSON.stringify(sheet[0])!==JSON.stringify(columns[name]))throw Error(name+' columns were changed. Restore the original template.');
    return sheet.slice(1).filter(row=>row.some(value=>value.trim()));
  };
  const draft:FlowDefinitionMetadata={...original,elements:original.elements.map(n=>({...n,config:{...n.config}})),
    connectors:original.connectors.map(e=>({...e})),resources:original.resources.map(r=>({...r})),status:'Draft'};
  const aliases=new Map<string,number>();
  let newId=Math.max(0,...draft.elements.map(node=>node.id));
  const resolve=(value:string)=>aliases.get(value)??numericId(value);
  const seenNodes=new Set<string>();
  rows('Nodes').forEach((r,i)=>{try{
    const [action,id,type,label]=r; if(!id)throw Error('Node ID is required.');
    if(seenNodes.has(id))throw Error('Duplicate node row: '+id);seenNodes.add(id);
    if(!['UPSERT','DELETE'].includes(action))throw Error('Action must be UPSERT or DELETE.');
    let node=draft.elements.find(n=>String(n.id)===id);
    if(action==='DELETE'){
      if(!node)throw Error('Node not found: '+id);
      if(node.type==='Start'||node.type==='End')throw Error('Start and End cannot be deleted.');
      if(draft.connectors.some(e=>e.from===node!.id||e.to===node!.id))
        throw Error('Disconnect all connections before deleting '+id);
      draft.elements=draft.elements.filter(n=>n.id!==node!.id);changes.push('Delete node '+id);return;
    }
    if(node){if(type!==node.type)throw Error('Existing node type cannot change.');node.label=label;changes.push('Update node '+id);}
    else {
      if(!id.startsWith('NEW_'))throw Error('New nodes require IDs starting NEW_.');
      if(!allowedTypes.includes(type))throw Error('Node type not enabled: '+type);
      const allocated=++newId;aliases.set(id,allocated);
      draft.elements.push({id:allocated,type,label,config:{}});changes.push('Create node '+id+' (#'+allocated+')');
    }
  }catch(e){errors.push('Nodes row '+(i+2)+': '+String(e instanceof Error?e.message:e));}});
  rows('Inputs').forEach((r,i)=>{try{
    const [action,id,key,raw]=r;const node=draft.elements.find(n=>n.id===resolve(id));
    if(!node)throw Error('Node not found: '+id);
    if(!key||['__proto__','constructor','prototype'].includes(key))throw Error('Invalid config property.');
    if(action==='DELETE'){delete node.config[key];changes.push('Delete input '+id+'.'+key);}
    else if(action==='UPSERT'){node.config[key]=parseJson(raw);changes.push('Upsert input '+id+'.'+key);}
    else throw Error('Action must be UPSERT or DELETE.');
  }catch(e){errors.push('Inputs row '+(i+2)+': '+String(e instanceof Error?e.message:e));}});
  const seenEdges=new Set<string>();
  rows('Connections').forEach((r,i)=>{try{
    const [action,id,from,to,label,kind,scheduled]=r;
    if(!id)throw Error('Connection ID is required.');
    if(seenEdges.has(id))throw Error('Duplicate connection ID');seenEdges.add(id);
    const existing=draft.connectors.find(e=>e.id===id);
    if(action==='DELETE'){if(!existing)throw Error('Connection not found.');draft.connectors=draft.connectors.filter(e=>e.id!==id);changes.push('Delete connection '+id);return;}
    if(action!=='UPSERT')throw Error('Action must be UPSERT or DELETE.');
    if(!['normal','fault','scheduled','async'].includes(kind))throw Error('Invalid connector kind.');
    const fromId=resolve(from),toId=resolve(to);
    if(!draft.elements.some(n=>n.id===fromId)||!draft.elements.some(n=>n.id===toId))throw Error('Connection references missing node.');
    const path=scheduled?parseJson(scheduled):undefined;
    const updated={id,from:fromId,to:toId,label,kind:kind as 'normal'|'fault'|'scheduled'|'async',...(path?{scheduledPath:path}:{})};
    if(existing)Object.assign(existing,updated);else draft.connectors.push(updated);
    changes.push((existing?'Update':'Add')+' connection '+id);
  }catch(e){errors.push('Connections row '+(i+2)+': '+String(e instanceof Error?e.message:e));}});
  const seenResources=new Set<string>();
  rows('Resources').forEach((r,i)=>{try{
    const [action,name,label,type,dataType,collection,input,output,value]=r;
    if(!name)throw Error('Resource name required.');
    if(seenResources.has(name))throw Error('Duplicate resource name.');seenResources.add(name);
    const existing=draft.resources.find(x=>x.name===name);
    if(action==='DELETE'){draft.resources=draft.resources.filter(x=>x.name!==name);changes.push('Delete resource '+name);return;}
    if(action!=='UPSERT')throw Error('Action must be UPSERT or DELETE.');
    const next={name,label,type:type as FlowDefinitionMetadata['resources'][number]['type'],dataType,
      isCollection:bool(collection),availableForInput:bool(input),availableForOutput:bool(output),
      ...(value?{value:parseJson(value)}:{})};
    if(existing)Object.assign(existing,next);else draft.resources.push(next);
    changes.push((existing?'Update':'Create')+' resource '+name);
  }catch(e){errors.push('Resources row '+(i+2)+': '+String(e instanceof Error?e.message:e));}});
  for(const p of flowGraphDiagnostics(draft))errors.push('Graph: '+p.description);
  if(draft.elements.filter(node=>node.type==='Start').length!==1)errors.push('Graph must have exactly one Start node.');
  if(draft.elements.some(node=>node.type!=='Start'&&node.type!=='End'&&!allowedTypes.includes(node.type)))errors.push('Flow contains node types unavailable in current capability catalogue.');
  return {draft,changes,errors};
}
