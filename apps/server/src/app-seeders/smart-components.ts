import {createHash} from 'node:crypto';
import type {PoolClient} from 'pg';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
/** Independent, upgrade-safe Smart component registrations; no app data is altered. */
export const SMART_COMPONENTS=["smart_button","smart_toggle","smart_lookup","smart_tabs","smart_text","smart_card_grid","smart_image","smart_calendar","smart_navigation","smart_container","smart_cart","smart_icon"] as const;
export const SMART_COMPONENT_SEED_VERSION='core-smart-components-v3';
export async function seedFreshSmartComponents(client:Pick<PoolClient,'query'>,tenantId:string){
 for(const api of SMART_COMPONENTS)await client.query(
  'INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled) VALUES($1,$2,$3,true) ON CONFLICT(tenant_id,api_name) DO NOTHING',
  [tenantId,api,'one-bundled:'+api]);
}
export async function seedSmartComponentsForExistingTenants(db:SqlPersistence):Promise<number>{
 const checksum=createHash('sha256').update(JSON.stringify(SMART_COMPONENTS)).digest('hex');
 return db.transaction(async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['metadrive:system:migrations']);
   const found=await client.query<{checksum:string}>(
    'SELECT checksum FROM md_system_migrations WHERE version=$1',[SMART_COMPONENT_SEED_VERSION]);
   if(found.rows[0]&&found.rows[0].checksum!==checksum)throw Error('Smart component seeder checksum mismatch');
   const {rows}=await client.query<{id:string}>('SELECT id FROM md_tenants ORDER BY id');
   for(const tenant of rows)await seedFreshSmartComponents(client,tenant.id);
   if(!found.rows[0])await client.query(
    'INSERT INTO md_system_migrations(version,checksum) VALUES($1,$2)',[SMART_COMPONENT_SEED_VERSION,checksum]);
   return rows.length;
 });
}
