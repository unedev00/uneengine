import type {SqlPersistence} from '../system-files/sql-persistence.js';

/** A distinct AppExchange UI. The original AceChatter app and its Flow ownership stay intact. */
export const UNE_ACECHATTER_APP=Object.freeze({
 apiName:'UNEAceChatter',
 label:'UNE AceChatter',
 version:1,
 description:'Page Builder editable AceChatter interface powered by reusable UNE components and existing AceChatter Flows',
 brandColor:'#128C7E',
 pages:{
  desktop:'UNEAceChatterDesktop',tablet:'UNEAceChatterTablet',
  phone:'UNEAceChatterMobile',custom:'UNEAceChatterCustom'
 }
});

export async function seedUneAceChatterCatalog(db:Pick<SqlPersistence,'transaction'>):Promise<void>{
 await db.transaction(async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['metadrive:app-catalog:UNEAceChatter']);
  await client.query(`INSERT INTO md_apps(api_name,label,enabled,tenant_owner_id)
    VALUES($1,$2,true,NULL)
    ON CONFLICT(api_name) DO NOTHING`,[UNE_ACECHATTER_APP.apiName,UNE_ACECHATTER_APP.label]);
  const {rows}=await client.query<{id:string}>(`SELECT id FROM md_apps
    WHERE api_name=$1 AND enabled=true AND tenant_owner_id IS NULL`,[UNE_ACECHATTER_APP.apiName]);
  if(!rows[0])throw Error('UNE AceChatter catalog registration conflict');
  await client.query(`INSERT INTO md_app_package_versions
    (app_id,version,published,description,brand_color)
    VALUES($1,$2,true,$3,$4) ON CONFLICT(app_id,version) DO NOTHING`,
    [rows[0].id,UNE_ACECHATTER_APP.version,UNE_ACECHATTER_APP.description,UNE_ACECHATTER_APP.brandColor]);
  // Installing the new UI never auto-installs AceChatter. It needs the existing Flow owner.
  const {rows:source}=await client.query<{id:string}>(`SELECT id FROM md_apps
    WHERE api_name='AceChatter' AND enabled=true AND tenant_owner_id IS NULL`);
  if(!source[0])throw Error('Existing AceChatter catalog dependency is unavailable');
  await client.query(`INSERT INTO md_app_package_dependencies
    (app_id,version,required_app_id,minimum_version)
    VALUES($1,$2,$3,1)
    ON CONFLICT(app_id,version,required_app_id) DO NOTHING`,
    [rows[0].id,UNE_ACECHATTER_APP.version,source[0].id]);
 });
}
