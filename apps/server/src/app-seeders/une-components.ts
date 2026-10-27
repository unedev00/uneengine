import {createHash} from 'node:crypto';
import type {PoolClient} from 'pg';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
/** Canonical system component catalogue; legacy One references resolve through UNE compatibility. */
export const UNE_COMPONENTS=[
  "une_text",
  "une_image",
  "une_calendar",
  "une_button",
  "une_card",
  "une_input",
  "une_toggle",
  "une_badge",
  "une_stack",
  "une_tabs",
  "une_container",
  "une_grid",
  "une_split_pane",
  "une_navigation",
  "une_menu",
  "une_modal",
  "une_drawer",
  "une_item_grid",
  "une_repeater",
  "une_record_list",
  "une_search",
  "une_lookup",
  "une_choice",
  "une_cart",
  "une_conversation",
  "une_form",
  "une_table",
  "une_line_items",
  "une_date_picker",
  "une_slot_picker",
  "une_metric",
  "une_alert",
  "une_progress",
  "une_document_viewer",
  "une_chart",
  "une_option_groups"
] as const;
export const UNE_SEED_VERSION='core-une-components-v3';
export async function seedFreshUneComponents(client:Pick<PoolClient,'query'>,tenantId:string){
 for(const apiName of UNE_COMPONENTS)await client.query(
 'INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled) VALUES($1,$2,$3,true) ON CONFLICT(tenant_id,api_name) DO NOTHING',
 [tenantId,apiName,'one-bundled:'+apiName]);
}
export async function seedUneComponentsForExistingTenants(db:SqlPersistence):Promise<number>{
 const checksum=createHash('sha256').update(JSON.stringify(UNE_COMPONENTS)).digest('hex');
 return db.transaction(async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['metadrive:system:migrations']);
  const exists=await client.query<{checksum:string}>('SELECT checksum FROM md_system_migrations WHERE version=$1',[UNE_SEED_VERSION]);
  if(exists.rows[0]&&exists.rows[0].checksum!==checksum)throw Error('UNE seeder checksum mismatch');
  const {rows}=await client.query<{id:string}>('SELECT id FROM md_tenants ORDER BY id');
  for(const tenant of rows)await seedFreshUneComponents(client,tenant.id);
  if(!exists.rows[0])await client.query('INSERT INTO md_system_migrations(version,checksum) VALUES($1,$2)',[UNE_SEED_VERSION,checksum]);
  return rows.length;
 });
}
