import type {Express,Request,Response,NextFunction} from 'express';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
import type {RbacEngine} from '../system-files/rbac-engine.js';
import type {ObjectDefinitionService} from '../system-files/object-definition.js';
import type {RecordEngine} from '../system-files/record-engine.js';
import type {ExternalIdUpsert} from '../system-files/external-id-upsert.js';
import {parseRecordCursor} from '../system-files/record-query.js';
import {decodeLoaderWorkbook,digestWorkbook,loaderFile,loaderReport,loaderResult}
 from './universal-loader-common.js';
import {context,validateRows,payload,apiPattern,text,uuid,type Actor}
 from './universal-loader-record-helpers.js';

type Req=Request & {actor?:Actor};
export function registerUniversalLoaderRecordRoutes(app:Express,db:SqlPersistence,rbac:RbacEngine,
 definitions:ObjectDefinitionService,records:RecordEngine,external:ExternalIdUpsert){
 const route=(fn:(req:Req,res:Response)=>Promise<void>)=>(req:Request,res:Response,next:NextFunction)=>
  void fn(req as Req,res).catch(next);
 const input=(req:Req)=>{
  const objectApi=String(req.body?.objectApi??''),matchField=String(req.body?.matchField??'');
  if(!apiPattern.test(objectApi)||matchField&&!apiPattern.test(matchField))
   throw Error('Invalid object or matching field');
  return {objectApi,matchField};
 };
 app.post('/api/data-loader/records/export',route(async(req,res)=>{
  const actor=req.actor!,{objectApi}=input(req);
  const ctx=await context(definitions,rbac,actor,objectApi,'');
  const pageSize=Number(req.body?.pageSize??500),offset=Number(req.body?.offset??0);
  if(!Number.isInteger(pageSize)||pageSize<1||pageSize>1000
   ||!Number.isInteger(offset)||offset<0||offset>1000000)
   throw Error('Export accepts a 1–1000 record page and a positive offset');
  const fields=[...ctx.writable.values()];
  const columns=['Action','ObjectApiName','Id','LastModifiedDate','RecordTypeId',...fields.map(f=>f.apiName)];
  const rows:Record<string,string>[]=[],seen=new Set<string>();let total=0;
  let cursor:string|undefined;
  while(rows.length<pageSize){
   const page=await records.list(actor.tenant_id,actor.user_id,objectApi,
    Math.min(100,pageSize-rows.length),cursor?0:offset,
    cursor?{cursor:parseRecordCursor(cursor),scope:'all'}:{scope:'all'});
   total=page.total;
   if(!page.records.length)break;
   for(const record of page.records){
    const id=text(record.Id);if(seen.has(id))throw Error('Paging changed; retry export');
    seen.add(id);
    rows.push(Object.fromEntries(columns.map(column=>[column,
     column==='Action'?'Upsert':column==='ObjectApiName'?objectApi:
      record[column] instanceof Date?(record[column] as Date).toISOString():
      typeof record[column]==='object'&&record[column]!==null?JSON.stringify(record[column]):text(record[column])])));
   }
   if(offset+rows.length>=total)break;
   if(!page.nextCursor)throw Error('Record cursor expired; retry export');
   cursor=page.nextCursor;
  }
  const guide:Record<string,string>[]=[];
  for(const field of ctx.object.fields){
   if(!await rbac.allowed(actor.tenant_id,actor.user_id,objectApi+'.'+field.apiName,'read'))continue;
   guide.push({FieldApiName:field.apiName,Label:field.label,DataType:field.dataType,
    Required:String(field.required),ExternalId:String(Boolean(field.externalId)),
    Writable:String(ctx.writable.has(field.apiName)),HelpText:field.helpText??''});
  }
  res.setHeader('Cache-Control','private, no-store');
  res.json({workbook:loaderFile([
   {name:'Records',columns,rows},
   {name:'FieldGuide',columns:['FieldApiName','Label','DataType','Required','ExternalId','Writable','HelpText'],rows:guide}
  ]),total,exported:rows.length,offset,nextOffset:offset+rows.length,hasMore:offset+rows.length<total});
 }));
 app.post('/api/data-loader/records/validate',route(async(req,res)=>{
  const actor=req.actor!,{objectApi,matchField}=input(req),buffer=decodeLoaderWorkbook(req.body?.workbook);
  const {sheet,rows}=await validateRows(db,definitions,rbac,records,actor,buffer,objectApi,matchField);
  res.setHeader('Cache-Control','private, no-store');
  res.json(loaderResult(rows,{digest:digestWorkbook(buffer),report:loaderReport(sheet,rows)}));
 }));
 app.post('/api/data-loader/records/execute',route(async(req,res)=>{
  const actor=req.actor!,{objectApi,matchField}=input(req),buffer=decodeLoaderWorkbook(req.body?.workbook);
  const digest=digestWorkbook(buffer);
  if(req.body?.digest!==digest||req.body?.confirmation!=='PROCEED_EXCLUDING_ERRORS')
   throw Error('Validate the exact workbook before execution');
  const operation='records:'+objectApi+':'+(matchField||'Id');
  const queryKeys=[actor.tenant_id,actor.user_id,operation,digest];
  const prior=await db.query<{status:string;report:unknown}>(
   'SELECT status,report FROM md_data_loader_executions WHERE tenant_id=$1 AND user_id=$2 '+
   'AND operation=$3 AND workbook_digest=$4',queryKeys);
  if(prior.rows[0]){
   if(prior.rows[0].status==='completed'){res.json(prior.rows[0].report);return;}
   throw Error('This workbook is already running; do not resubmit it unchanged');
  }
  const {ctx,sheet,rows}=await validateRows(db,definitions,rbac,records,actor,buffer,objectApi,matchField);
  const claim=await db.query(
   "INSERT INTO md_data_loader_executions(tenant_id,user_id,operation,workbook_digest,status) "+
   "VALUES($1,$2,$3,$4,'running') ON CONFLICT DO NOTHING RETURNING workbook_digest",queryKeys);
  if(!claim.rowCount)throw Error('Workbook is being processed or already completed');
  for(const row of rows){
   if(row.status!=='Valid')continue;
   const action=row.cells.Action?.trim(),id=(row.cells.Id??'').trim();
   try{
    const values=payload(row,ctx),version=row.cells.LastModifiedDate?.trim()||undefined;
    let resultId=id,created=false;
    if(action==='Restore')await records.restore(actor.tenant_id,actor.user_id,objectApi,id);
    else if(action==='Delete')await records.remove(actor.tenant_id,actor.user_id,objectApi,id,undefined,version);
    else if(action==='Create'){resultId=await records.create(actor.tenant_id,actor.user_id,objectApi,values);created=true;}
    else if(id)await records.update(actor.tenant_id,actor.user_id,objectApi,id,values,version,undefined,true);
    else if(matchField&&values[matchField]!==undefined&&values[matchField]!==null&&values[matchField]!==''){
     const saved=await external.execute(actor.tenant_id,actor.user_id,objectApi,matchField,String(values[matchField]),values);
     resultId=saved.id;created=saved.created;
    }else{
     if(action==='Update')throw Error('Update needs an Id or External ID');
     resultId=await records.create(actor.tenant_id,actor.user_id,objectApi,values);created=true;
    }
    row.status='Success';
    row.result=action==='Restore'?'Restored '+id:action==='Delete'?'Deleted '+id:
     (created?'Created ':'Updated ')+resultId;
    row.message='Executed';
   }catch(e){row.status='Error';row.message=e instanceof Error?e.message:String(e);}
  }
  const result=loaderResult(rows,{report:loaderReport(sheet,rows)});
  await db.query("UPDATE md_data_loader_executions SET status='completed',report=$5::jsonb,completed_at=now() "+
   'WHERE tenant_id=$1 AND user_id=$2 AND operation=$3 AND workbook_digest=$4',
   [...queryKeys,JSON.stringify(result)]);
  res.setHeader('Cache-Control','private, no-store');res.json(result);
 }));
}
