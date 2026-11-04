import type {SqlPersistence} from '../system-files/sql-persistence.js';
import type {RbacEngine} from '../system-files/rbac-engine.js';
import type {ObjectDefinitionService} from '../system-files/object-definition.js';
import type {RecordEngine} from '../system-files/record-engine.js';
import {requireLoaderSheet,loaderRows,type LoaderRow} from './universal-loader-common.js';
export type Actor={tenant_id:string;user_id:string};
export type ObjectDef=Awaited<ReturnType<ObjectDefinitionService['get']>>;
export type Field=ObjectDef['fields'][number];
export type Context={object:ObjectDef;writable:Map<string,Field>;matchField:string};
export const apiPattern=/^[A-Za-z][A-Za-z0-9_]*$/;
export const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const text=(v:unknown)=>v===null||v===undefined?'':String(v);
export const errorText=(e:unknown)=>e instanceof Error?e.message:String(e);
const calculated=(f:Field)=>/^(Formula(?:\(|$)|Roll-Up Summary|Auto ?Number)/i.test(f.dataType);
export const numeric=(type:string)=>/^(Number|Currency|Percent)(?:\(|$)/i.test(type);
export function convert(field:Field,raw:string):unknown{
 if(raw==='<CLEAR>')return null;
 if(/^(Checkbox|Boolean)$/i.test(field.dataType)){
  if(!/^(true|false)$/i.test(raw.trim()))throw Error(field.apiName+' must be TRUE or FALSE');
  return raw.trim().toLowerCase()==='true';
 }
 if(numeric(field.dataType)){
  if(!raw.trim()||!Number.isFinite(Number(raw)))throw Error(field.apiName+' must be a finite number');
  return Number(raw);
 }
 if(/^(Geolocation|Address)$/i.test(field.dataType)){
  let parsed:unknown;try{parsed=JSON.parse(raw);}catch{throw Error(field.apiName+' requires JSON');}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error(field.apiName+' requires a JSON object');
  return parsed;
 }
 if(/^(Date|Date\/Time|DateTime)$/i.test(field.dataType)&&!Number.isFinite(Date.parse(raw)))
  throw Error(field.apiName+' requires a valid date');
 if(field.dataType==='Picklist'&&field.picklistRestricted!==false&&Array.isArray(field.picklistValues)
  &&field.picklistValues.length&&!field.picklistValues.includes(raw))
  throw Error('Unknown picklist value: '+field.apiName);
 if(/^(Lookup|Master-Detail)(?:\(|$)/i.test(field.dataType)&&!uuid.test(raw))
  throw Error(field.apiName+' requires a related record ID');
 return raw;
}
export function payload(row:LoaderRow,ctx:Context){
 const values:Record<string,unknown>={};
 for(const [field,raw] of Object.entries(row.cells)){
  if(['Action','ObjectApiName','Id','LastModifiedDate','__excelRow'].includes(field)||!raw)continue;
  if(field==='RecordTypeId'){
   if(raw!=='<CLEAR>'&&!uuid.test(raw))throw Error('Invalid RecordTypeId');
   values.RecordTypeId=raw==='<CLEAR>'?null:raw;continue;
  }
  const def=ctx.writable.get(field);
  if(!def)throw Error('Field is not writable: '+field);
  values[field]=convert(def,raw);
 }
 return values;
}
export async function context(definitions:ObjectDefinitionService,rbac:RbacEngine,actor:Actor,
 objectApi:string,matchField:string):Promise<Context>{
 if(!apiPattern.test(objectApi)||['User','CashLedger'].includes(objectApi))
  throw Error('Object is not available for generic bulk record writes');
 await rbac.require(actor.tenant_id,actor.user_id,'ObjectDefinition','read');
 await rbac.require(actor.tenant_id,actor.user_id,objectApi,'read');
 const object=await definitions.get(actor.tenant_id,objectApi);
 const candidates=object.fields.filter(f=>!calculated(f));
 const grants=await rbac.allowedMany(actor.tenant_id,actor.user_id,candidates.flatMap(f=>[
  {resource:objectApi+'.'+f.apiName,action:'read'}, {resource:objectApi+'.'+f.apiName,action:'edit'}]));
 const writable=new Map(candidates.filter((_,i)=>grants[i*2]&&grants[i*2+1]).map(f=>[f.apiName,f]));
 if(matchField&&!object.fields.some(f=>f.apiName===matchField&&f.externalId&&writable.has(matchField)))
  throw Error('Matching field must be a readable and editable External ID');
 return {object,writable,matchField};
}
async function matchExternal(db:SqlPersistence,actor:Actor,ctx:Context,key:string){
 const field=ctx.object.fields.find(f=>f.apiName===ctx.matchField)!;
 const sensitive=field.caseSensitive||numeric(field.dataType);
 const {rows}=await db.query<{id:string}>(
  'SELECT r.id FROM md_records r JOIN md_record_values v ON v.tenant_id=r.tenant_id AND '+
  'v.object_api=r.object_api AND v.record_id=r.id WHERE r.tenant_id=$1 AND '+
  'r.object_api=$2 AND r.is_deleted=false AND v.field_api=$3 AND '+
  (sensitive?'v.value_text=$4':'lower(v.value_text)=lower($4)')+' LIMIT 2',
  [actor.tenant_id,ctx.object.apiName,ctx.matchField,key]);
 if(rows.length>1)throw Error('Multiple records match the External ID');
 return rows[0]?.id??null;
}
export async function validateRows(db:SqlPersistence,definitions:ObjectDefinitionService,
 rbac:RbacEngine,records:RecordEngine,actor:Actor,buffer:Buffer,objectApi:string,matchField:string){
 const ctx=await context(definitions,rbac,actor,objectApi,matchField);
 const sheet=requireLoaderSheet(buffer,'Records',['Action','ObjectApiName','Id']);
 for(const name of sheet.columns){
  if(['Action','ObjectApiName','Id','LastModifiedDate','RecordTypeId'].includes(name))continue;
  if(!ctx.writable.has(name))throw Error('Unknown or non-editable Excel column: '+name);
 }
 const rows=loaderRows(sheet),seen=new Map<string,LoaderRow>();
 for(const row of rows){
  try{
   const cells=row.cells,action=cells.Action?.trim(),id=cells.Id?.trim()??'';
   if(!['Upsert','Create','Update','Delete','Restore'].includes(action))throw Error('Invalid row Action');
   if(cells.ObjectApiName!==objectApi)throw Error('Incorrect ObjectApiName');
   if(id&&!uuid.test(id))throw Error('Invalid Id');
   if(['Update','Delete','Restore'].includes(action)&&!id)throw Error('Existing Id is required');
   if(action==='Create'&&id)throw Error('Create cannot supply an Id');
   const values=payload(row,ctx),externalKey=!id&&matchField?text(values[matchField]):'';
   if(!['Delete','Restore'].includes(action)&&!Object.keys(values).length)throw Error('No editable field values');
   const unique=id?'id:'+id.toLowerCase():externalKey?'external:'+matchField+':'+externalKey.toLowerCase():'';
   if(unique){
    const prev=seen.get(unique);
    if(prev){prev.status='Error';prev.message='Duplicate workbook identifier';throw Error('Duplicate workbook identifier');}
    seen.set(unique,row);
   }
   if(action==='Restore'){
    await rbac.require(actor.tenant_id,actor.user_id,objectApi,'create');
    await rbac.require(actor.tenant_id,actor.user_id,objectApi,'delete');
    row.result='Restore';row.message='Validated';continue;
   }
   const matchingId=id||externalKey&&matchField? id||await matchExternal(db,actor,ctx,externalKey):null;
   const prior=matchingId?await records.get(actor.tenant_id,actor.user_id,objectApi,matchingId):null;
   if(action==='Update'&&!prior)throw Error('Record not found');
   if(action==='Upsert'&&id&&!prior)throw Error('Id is missing; cannot create with arbitrary Id');
   if(action==='Create'&&prior)throw Error('External ID exists; use Upsert');
   if(action==='Delete'){
    if(!prior)throw Error('Record not found');
    await rbac.require(actor.tenant_id,actor.user_id,objectApi,'delete');
    await rbac.requireRecord(actor.tenant_id,actor.user_id,objectApi,id,'delete');
   }else{
    const updating=Boolean(prior);
    await rbac.require(actor.tenant_id,actor.user_id,objectApi,updating?'edit':'create');
    if(prior)await rbac.requireRecord(actor.tenant_id,actor.user_id,objectApi,text(prior.Id),'edit');
    const grants=await rbac.allowedMany(actor.tenant_id,actor.user_id,Object.keys(values)
     .filter(k=>k!=='RecordTypeId').map(k=>({resource:objectApi+'.'+k,action:updating?'edit':'create'})));
    if(grants.some(g=>!g))throw Error('Field-level write permission denied');
    if(!updating)for(const f of ctx.object.fields)
     if(f.required&&!calculated(f)&&f.defaultValue===undefined
      &&(values[f.apiName]===undefined||values[f.apiName]===null||values[f.apiName]===''))
      throw Error('Missing required field: '+f.apiName);
   }
   if(prior&&cells.LastModifiedDate){
    const updated=Date.parse(text(prior.LastModifiedDate)),expected=Date.parse(cells.LastModifiedDate);
    if(!Number.isFinite(updated)||!Number.isFinite(expected)||updated>expected+999)
     throw Error('Record changed since export');
   }
   row.result=action==='Delete'?'Delete':prior?'Update':'Create';row.message='Validated';
  }catch(e){row.status='Error';row.message=errorText(e);}
 }
 return {ctx,sheet,rows};
}
