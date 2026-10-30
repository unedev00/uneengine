import {createHash} from 'node:crypto';
import type {PoolClient} from 'pg';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
/** Saved-instance compatibility keys only; the Core never seeds these globally. */
export const UNE_COMPONENTS=[
  "ui_image",
  "ui_calendar",
  "ui_button",
  "ui_card",
  "ui_input",
  "ui_toggle",
  "ui_stack",
  "ui_tabs",
  "ui_container",
  "ui_grid",
  "ui_split_pane",
  "ui_navigation",
  "ui_menu",
  "ui_modal",
  "ui_drawer",
  "ui_item_grid",
  "ui_repeater",
  "ui_record_list",
  "ui_search",
  "ui_lookup",
  "ui_choice",
  "ui_cart",
  "ui_conversation",
  "ui_form",
  "ui_table",
  "ui_line_items",
  "ui_date_picker",
  "ui_slot_picker",
  "ui_metric",
  "ui_alert",
  "ui_progress",
  "ui_document_viewer",
  "ui_chart",
  "ui_option_groups"
] as const;
export const UNE_SEED_VERSION='core-une-components-v6';
/** Legacy compatibility identifiers; no new platform-wide registrations. */
export async function seedFreshUneComponents(_client:Pick<PoolClient,'query'>,_tenantId:string){
 // App-owned renderers are installed by each application's own seeder.
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
