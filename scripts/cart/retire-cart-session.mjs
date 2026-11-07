/**
 * Final CartSession retirement gate. Does not silently destroy historical data.
 * Requires CartLine parent-copy, active Flow upgrades and published page edits.
 * --apply soft-deletes legacy Object/field metadata (recycle-bin safe).
 */
import assert from 'node:assert/strict';
import {SqlPersistence} from '../../apps/server/dist-system/system-files/sql-persistence.js';
import {PageRuntime} from '../../apps/server/dist-system/system-files/page-runtime.js';

const conn=process.env.DATABASE_URL??process.env.METADRIVE_DATABASE_URL;
if(!conn)throw Error('DATABASE_URL is required');
const apply=process.argv.includes('--apply');
const db=new SqlPersistence(conn),runtime=new PageRuntime(db);
const variants=['Desktop','Tablet','Mobile','Custom'];
try{
 const tenants=await db.query(`
  SELECT tenant_id FROM md_object_definitions
  WHERE api_name='CartSession' AND deleted_at IS NULL ORDER BY tenant_id`);
 const reports=[];
 for(const {tenant_id:tenant} of tenants.rows){
  const checks=[];
  const exists=await db.query("SELECT to_regclass('md_cart_session_migration_map') AS name");
  if(!exists.rows[0]?.name)checks.push('CartSession copy has not run');
  if(exists.rows[0]?.name){
   const missing=await db.query(`
    SELECT COUNT(*)::int AS total FROM md_records r LEFT JOIN md_cart_session_migration_map m
     ON m.tenant_id=r.tenant_id AND m.legacy_session_id=r.id
    WHERE r.tenant_id=$1 AND r.object_api='CartSession' AND m.cart_id IS NULL`,[tenant]);
   if(missing.rows[0].total)checks.push(missing.rows[0].total+' sessions have no Cart copy');
   const badLines=await db.query(`
    SELECT COUNT(*)::int AS total FROM md_record_values old
    JOIN md_cart_session_migration_map m ON m.tenant_id=old.tenant_id
     AND m.legacy_session_id=old.reference_record_id
    LEFT JOIN md_record_values newer ON newer.tenant_id=old.tenant_id
     AND newer.record_id=old.record_id AND newer.object_api='CartLine' AND newer.field_api='Cart'
    WHERE old.tenant_id=$1 AND old.object_api='CartLine'
     AND old.field_api='CartSession'
     AND newer.reference_record_id IS DISTINCT FROM m.cart_id`,[tenant]);
   if(badLines.rows[0].total)checks.push(badLines.rows[0].total+' CartLines not migrated');
  }
  const otherLinks=await db.query(`
   SELECT object_api,api_name FROM md_field_definitions
   WHERE tenant_id=$1 AND related_object='CartSession' AND deleted_at IS NULL
     AND NOT (object_api='CartLine' AND api_name='CartSession')`,[tenant]);
  if(otherLinks.rows.length)checks.push('other active CartSession relationship fields: '+
    otherLinks.rows.map(r=>r.object_api+'.'+r.api_name).join(','));
  const activeFlows=await db.query(`
   SELECT DISTINCT f.api_name FROM md_flow_definitions f JOIN md_flow_editor_values v
    ON v.tenant_id=f.tenant_id AND v.flow_id=f.id
   WHERE f.tenant_id=$1 AND f.active=true AND f.archived=false
    AND (v.value_text LIKE '%CartSession%' OR v.value_text LIKE '%cartSessionId%')`,[tenant]);
  if(activeFlows.rows.length)checks.push('active legacy Flows: '+
    activeFlows.rows.map(f=>f.api_name).join(','));
  const pages=await db.query(`
   SELECT DISTINCT p.api_name FROM md_page_definitions p
   JOIN md_lightning_page_details d ON d.tenant_id=p.tenant_id AND d.page_id=p.id
   WHERE p.tenant_id=$1 AND p.enabled=true`,[tenant]);
  for(const {api_name:pageName} of pages.rows){
   for(const variant of variants){
    let loaded;
    try{loaded=await runtime.load(tenant,pageName,variant);}catch(error){
     if(error instanceof Error&&/not found|not configured/i.test(error.message))continue;
     throw error;
    }
    const page=loaded?.page;
    if(!page||!Array.isArray(page.components))continue;
    const offenders=page.components.filter(c=>JSON.stringify(c.properties??{}).includes('CartSession')
      ||JSON.stringify(c.properties??{}).includes('cartSessionId'));
    if(offenders.length)checks.push(pageName+' '+variant+': '+offenders.length+' published legacy components');
   }
  }
  reports.push({tenant,ready:checks.length===0,checks});
  if(!apply||checks.length)continue;
  await db.transaction(async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['cart-session-retirement:'+tenant]);
   await client.query(`
    UPDATE md_field_definitions SET deleted_at=now()
    WHERE tenant_id=$1 AND object_api='CartLine' AND api_name='CartSession'
      AND deleted_at IS NULL`,[tenant]);
   await client.query(`
    UPDATE md_object_definitions SET deleted_at=now()
    WHERE tenant_id=$1 AND api_name='CartSession' AND deleted_at IS NULL`,[tenant]);
  });
 }
 if(apply&&reports.some(r=>!r.ready))
  throw Error('CartSession retirement blocked. '+JSON.stringify(reports));
 console.log(JSON.stringify({mode:apply?'retired':'preflight',reports},null,2));
}finally{await db.close();}
