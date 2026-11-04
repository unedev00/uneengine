import type {Express,Request,Response,NextFunction} from 'express';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
import type {RbacEngine} from '../system-files/rbac-engine.js';
import {decodeLoaderWorkbook,digestWorkbook,requireLoaderSheet,loaderFile,loaderRows,
 loaderReport,loaderResult} from './universal-loader-common.js';

type Actor={tenant_id:string;user_id:string};
type Req=Request & {actor?:Actor};
type Rule={component_api:string;property_key:string;label:string;tab:string;section_group:string;
 control_kind:string;enabled:boolean;scope:string};
const keys=['ComponentApi','PropertyKey','Enabled','CurrentEnabled','PropertyLabel','Tab','Section','ControlKind'];
const boolean=(value:string)=>/^(true|false)$/i.test(value)?value.toLowerCase()==='true':null;
const identity=(r:{component_api:string;property_key:string})=>r.component_api+'|'+r.property_key;
const rowKey=(row:Record<string,string>)=>String(row.ComponentApi??'')+'|'+String(row.PropertyKey??'');
const errors=(e:unknown)=>e instanceof Error?e.message:String(e);
export function registerUniversalLoaderRibbonRoutes(app:Express,db:SqlPersistence,rbac:RbacEngine){
 const route=(fn:(req:Req,res:Response)=>Promise<void>)=>(req:Request,res:Response,next:NextFunction)=>
  void fn(req as Req,res).catch(next);
 const available=async()=> {
  const result=await db.query<Rule>(
   'SELECT c.component_api,p.property_key,p.label,p.tab,p.section_group,p.control_kind, '+
   'p.scope,COALESCE(r.enabled,false) AS enabled '+
   'FROM md_builder_ribbon_components c CROSS JOIN md_builder_shared_properties p '+
   'LEFT JOIN md_builder_ribbon_component_rules r '+
   'ON r.component_api=c.component_api AND r.property_key=p.property_key '+
   "WHERE p.scope='component' ORDER BY c.component_api,p.sort_order");
  return result.rows;
 };
 const access=async(actor:Actor,write=false)=>{
  await rbac.require(actor.tenant_id,actor.user_id,'PageDefinition','read');
  if(write)await rbac.require(actor.tenant_id,actor.user_id,'BuilderRibbon','manage');
 };
 const validate=async(actor:Actor,buffer:Buffer)=>{
  await access(actor,true);
  const sheet=requireLoaderSheet(buffer,'RibbonProperties',['ComponentApi','PropertyKey','Enabled','CurrentEnabled']);
  const existing=new Map((await available()).map(row=>[identity(row),row]));
  const rows=loaderRows(sheet),seen=new Set<string>();
  for(const row of rows){
   try{
    const c=row.cells,key=rowKey(c),rule=existing.get(key);
    if(!rule)throw Error('Unknown component/property pair; download current inventory');
    if(seen.has(key))throw Error('Duplicate component/property pair');seen.add(key);
    const expected=boolean(c.CurrentEnabled??''),next=boolean(c.Enabled??'');
    if(expected===null||next===null)throw Error('Enabled and CurrentEnabled must be TRUE or FALSE');
    if(expected!==rule.enabled)throw Error('Ribbon inventory changed since download; export again');
    const annotations:Record<string,string>={PropertyLabel:rule.label,Tab:rule.tab,
     Section:rule.section_group,ControlKind:rule.control_kind};
    for(const [k,v] of Object.entries(annotations))
     if(c[k]!==undefined&&c[k]!==v)throw Error(k+' is read-only; change only Enabled');
    row.result=next===rule.enabled?'Unchanged':next?'Enable':'Disable';
    row.message='Validated';
   }catch(e){row.status='Error';row.message=errors(e);}
  }
  return {sheet,rows};
 };
 app.post('/api/data-loader/ribbon/export',route(async(req,res)=>{
  const actor=req.actor!;await access(actor);
  const rules=await available();
  const rows=rules.map(row=>({
   ComponentApi:row.component_api,PropertyKey:row.property_key,
   Enabled:String(row.enabled).toUpperCase(),CurrentEnabled:String(row.enabled).toUpperCase(),
   PropertyLabel:row.label,Tab:row.tab,Section:row.section_group,ControlKind:row.control_kind
  }));
  res.setHeader('Cache-Control','private, no-store');
  res.json({workbook:loaderFile([{name:'RibbonProperties',columns:keys,rows}]),total:rows.length});
 }));
 app.post('/api/data-loader/ribbon/validate',route(async(req,res)=>{
  const actor=req.actor!,buffer=decodeLoaderWorkbook(req.body?.workbook);
  const {sheet,rows}=await validate(actor,buffer);
  res.setHeader('Cache-Control','private, no-store');
  res.json(loaderResult(rows,{digest:digestWorkbook(buffer),report:loaderReport(sheet,rows)}));
 }));
 app.post('/api/data-loader/ribbon/execute',route(async(req,res)=>{
  const actor=req.actor!,buffer=decodeLoaderWorkbook(req.body?.workbook);
  if(req.body?.digest!==digestWorkbook(buffer)||req.body?.confirmation!=='PROCEED_EXCLUDING_ERRORS')
   throw Error('Validate the exact workbook before proceeding');
  const {sheet,rows}=await validate(actor,buffer);
  for(const row of rows){
   if(row.status!=='Valid')continue;
   try{
    await access(actor,true);
    const c=row.cells,enabled=boolean(c.Enabled)!,expected=boolean(c.CurrentEnabled)!;
    if(enabled!==expected)await db.transaction(async client=>{
     const result=await client.query<{enabled:boolean}>(
      'SELECT enabled FROM md_builder_ribbon_component_rules '+
      'WHERE component_api=$1 AND property_key=$2 FOR UPDATE',[c.ComponentApi,c.PropertyKey]);
     if((result.rows[0]?.enabled??false)!==expected)
      throw Error('Ribbon rule changed after validation');
     if(result.rowCount){
      await client.query('UPDATE md_builder_ribbon_component_rules SET enabled=$3 '+
       'WHERE component_api=$1 AND property_key=$2',[c.ComponentApi,c.PropertyKey,enabled]);
     }else{
      await client.query('INSERT INTO md_builder_ribbon_component_rules(component_api,property_key,enabled) '+
       'VALUES($1,$2,$3)',[c.ComponentApi,c.PropertyKey,enabled]);
     }
    });
    row.status='Success';row.message='Applied';
   }catch(e){row.status='Error';row.message=errors(e);}
  }
  res.setHeader('Cache-Control','private, no-store');
  res.json(loaderResult(rows,{report:loaderReport(sheet,rows)}));
 }));
}
