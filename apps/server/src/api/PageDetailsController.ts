import {randomUUID} from 'node:crypto';
import type {Express} from 'express';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
import type {RbacEngine} from '../system-files/rbac-engine.js';
import {PageRuntime} from '../system-files/page-runtime.js';
import {authenticated,wrap,api} from './ApiAuthenticationGuard.js';

/** Rename a page and change its App Page placement without touching canvas
 * drafts, immutable published layouts, or the page's stable API identity.
 * SQL ownership/activation and OneEngine are authoritative. */
export function registerPageDetailsController(app:Express,db:SqlPersistence,rbac:RbacEngine){
 app.patch('/api/metadata/pages/:apiName/details',wrap(async(req,res)=>{
  const actor=authenticated(req),pageApi=req.params.apiName;
  if(!api.test(pageApi))throw new Error('Invalid Page API name');
  const body=req.body;
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Invalid Page details');
  const label=body.label,appApiName=body.appApiName,expectedLabel=body.expectedLabel;
  if(typeof label!=='string'||!label.trim()||label.trim().length>128
    ||typeof expectedLabel!=='string'||!expectedLabel.trim()||expectedLabel.length>128
    ||appApiName!==null&&(typeof appApiName!=='string'||!api.test(appApiName)))
    throw new Error('Invalid Page details');
  await rbac.require(actor.tenant_id,actor.user_id,'PageDefinition','manage');
  const current=await db.query<{id:string;title:string;page_type:string}>(`
   SELECT p.id,p.title,d.page_type FROM md_page_definitions p
   JOIN md_lightning_page_details d ON d.tenant_id=p.tenant_id AND d.page_id=p.id
   WHERE p.tenant_id=$1 AND p.api_name=$2 AND p.enabled=true
  `,[actor.tenant_id,pageApi]);
  const page=current.rows[0];if(!page)throw new Error('Page not found');
  if(page.page_type!=='App Page'&&appApiName!==null)
   throw new Error('App assignments are available for App Pages only');
  // A page provisioned by AppExchange is managed by that package's lifecycle.
  const managed=await db.query(`SELECT 1 FROM md_app_seed_pages WHERE tenant_id=$1
   AND page_id=$2 LIMIT 1`,[actor.tenant_id,page.id]);
  if(managed.rowCount)throw new Error('App-owned Page must be managed through AppExchange');
  const known=await db.query<{api_name:string}>(`
   SELECT DISTINCT COALESCE(m.api_name,a.api_name) AS api_name
   FROM md_apps a
   JOIN md_app_installations i ON i.app_id=a.id AND i.tenant_id=$1
   LEFT JOIN md_tenant_app_metadata m ON m.tenant_id=$1 AND m.app_id=a.id
   WHERE a.enabled=true AND (a.tenant_owner_id IS NULL OR a.tenant_owner_id=$1)
     AND (EXISTS (SELECT 1 FROM md_lightning_page_activation x
       WHERE x.tenant_id=$1 AND x.page_id=$2 AND x.app_api=COALESCE(m.api_name,a.api_name))
      OR EXISTS (SELECT 1 FROM md_tenant_app_navigation n
       WHERE n.tenant_id=$1 AND n.app_id=a.id AND n.entry_type='App Page' AND n.api_name=$3))
  `,[actor.tenant_id,page.id,pageApi]);
  const existingAppNames=known.rows.map(row=>row.api_name);
  const appChanged=page.page_type==='App Page'&&
    (existingAppNames.length!==1||existingAppNames[0]!==appApiName);
  if(appChanged){
   await rbac.require(actor.tenant_id,actor.user_id,'AppExchange','manage');
   for(const appName of new Set([...existingAppNames,...(appApiName?[appApiName]:[])]))
    await rbac.require(actor.tenant_id,actor.user_id,'App:'+appName,'manage');
  }
  await db.transaction(async client=>{
   const locked=await client.query<{id:string;title:string;page_type:string;status:string}>(`
    SELECT p.id,p.title,d.page_type,d.status FROM md_page_definitions p
    JOIN md_lightning_page_details d ON d.tenant_id=p.tenant_id AND d.page_id=p.id
    WHERE p.tenant_id=$1 AND p.api_name=$2 AND p.enabled=true
    FOR UPDATE OF p,d`,[actor.tenant_id,pageApi]);
   const row=locked.rows[0];
   if(!row||row.id!==page.id||row.title!==expectedLabel||row.page_type!==page.page_type)
    throw new Error('Page details changed. Reload before saving.');
   if(page.page_type==='App Page'){
    if(!appApiName)throw new Error('Choose an installed application');
    const appRecord=await client.query<{id:string}>(`
     SELECT a.id FROM md_apps a
     JOIN md_app_installations i ON i.app_id=a.id AND i.tenant_id=$1
     JOIN md_app_entitlements e ON e.app_id=a.id AND e.tenant_id=$1
     LEFT JOIN md_tenant_app_metadata m ON m.tenant_id=$1 AND m.app_id=a.id
     WHERE COALESCE(m.api_name,a.api_name)=$2
      AND (a.tenant_owner_id IS NULL OR a.tenant_owner_id=$1)
      AND a.enabled=true AND e.active=true AND (e.expires_at IS NULL OR e.expires_at>now())
     FOR UPDATE OF a`,[actor.tenant_id,appApiName]);
    if(appRecord.rows.length!==1)throw new Error('App not installed or licensed');
    if(appChanged){
     await client.query(`DELETE FROM md_lightning_page_activation
      WHERE tenant_id=$1 AND page_id=$2 AND scope='App Default'`,
      [actor.tenant_id,page.id]);
     await client.query(`INSERT INTO md_lightning_page_activation
      (tenant_id,page_id,assignment_id,scope,app_api,desktop,phone,tablet,custom,sort_order)
      SELECT $1,$2,$3,'App Default',$4,
        'Desktop'=ANY(d.devices),'Phone'=ANY(d.devices),
        false,false,0
      FROM md_lightning_page_details d WHERE d.tenant_id=$1 AND d.page_id=$2`,
      [actor.tenant_id,page.id,randomUUID(),appApiName]);
     await client.query(`DELETE FROM md_tenant_app_navigation
      WHERE tenant_id=$1 AND entry_type='App Page' AND api_name=$2`,
      [actor.tenant_id,pageApi]);
     if(row.status==='Active'){
      await client.query(`INSERT INTO md_tenant_app_navigation
       (tenant_id,app_id,entry_type,api_name,sort_order)
       SELECT $1,$2,'App Page',$3,
        COALESCE((SELECT MAX(sort_order)+1 FROM md_tenant_app_navigation
          WHERE tenant_id=$1 AND app_id=$2),0)
       WHERE NOT EXISTS (SELECT 1 FROM md_tenant_app_navigation
        WHERE tenant_id=$1 AND app_id=$2 AND entry_type='App Page' AND api_name=$3)`,
       [actor.tenant_id,appRecord.rows[0].id,pageApi]);
     }
    }
   }
   if(label.trim()!==row.title){
    await client.query(`UPDATE md_page_definitions SET title=$3
      WHERE tenant_id=$1 AND id=$2`,[actor.tenant_id,row.id,label.trim()]);
   }
   if(label.trim()!==row.title||appChanged)
    await client.query(`UPDATE md_lightning_page_details SET updated_at=now()
     WHERE tenant_id=$1 AND page_id=$2`,[actor.tenant_id,row.id]);
   // The existing SQL Setup Audit triggers record the tenant, actor, old/new
   // page title and app navigation/activation changes.
  });
  res.setHeader('Cache-Control','private, no-store');
  res.json({page:await new PageRuntime(db).metadata(actor.tenant_id,pageApi)});
 }));
}
