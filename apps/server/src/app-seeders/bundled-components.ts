import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { SqlPersistence } from '../system-files/sql-persistence.js';
import { UNE_COMPONENTS } from './une-components.js';

/** Versioned snapshot of the reviewed web One- descriptor index.
 * Test coverage rejects drift between this SQL seeder and the bundled manifest. */
export const BUNDLED_COMPONENTS = [
  "OneText",
  "OneBadge",
  "OneButton",
  "OneSearch",
  "OneCalendar",
  "OneItemGrid",
  "OneConversation",
  "OneShoppingCart",
] as const;
export const BUNDLED_COMPONENT_SEED_VERSION = 'core-bundled-components-v3';

export async function seedFreshBundledComponents(client: PoolClient, tenantId: string) {
  for (const apiName of BUNDLED_COMPONENTS) {
    await client.query(
      'INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled) VALUES($1,$2,$3,true) ON CONFLICT(tenant_id,api_name) DO NOTHING',
      [tenantId,apiName,'one-bundled:'+apiName]);
  }
}

/** Retired built-ins no longer have runtime assets. Deactivate only the
 * exact system-owned renderer registration; never delete the definition,
 * tenant-authored library versions, page references or any business data.
 * Tenant components with their own renderer keys remain untouched. */
export async function deactivateUnavailableBundledComponents(
  client: Pick<PoolClient,'query'>, tenantId: string
): Promise<void> {
  const reviewed: string[] = [...BUNDLED_COMPONENTS,...UNE_COMPONENTS];
  await client.query(`
    UPDATE md_component_definitions AS d SET enabled=false
    WHERE d.tenant_id=$1 AND d.enabled=true
      AND d.renderer_key='one-bundled:'||d.api_name
      AND NOT (d.api_name=ANY($2::text[]))
      AND NOT EXISTS (
        SELECT 1 FROM md_component_library_heads AS h
        WHERE h.tenant_id=d.tenant_id AND h.component_api=d.api_name
      )`,[tenantId,reviewed]);
}

/** Idempotent Core registry backfill; preserves customer definitions and data. */
export async function seedBundledComponentsForExistingTenants(db: SqlPersistence): Promise<number> {
  const checksum=createHash('sha256').update(JSON.stringify(BUNDLED_COMPONENTS)).digest('hex');
  return db.transaction(async client=>{
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['metadrive:system:migrations']);
    const applied=await client.query<{checksum:string}>(
      'SELECT checksum FROM md_system_migrations WHERE version=$1',[BUNDLED_COMPONENT_SEED_VERSION]);
    if(applied.rows[0]&&applied.rows[0].checksum!==checksum)
      throw Error('Bundled Core component seed changed after installation');
    const {rows}=await client.query<{id:string}>('SELECT id FROM md_tenants ORDER BY id');
    for(const tenant of rows){
      await seedFreshBundledComponents(client,tenant.id);
      await deactivateUnavailableBundledComponents(client,tenant.id);
    }
    if(!applied.rows[0])
      await client.query('INSERT INTO md_system_migrations(version,checksum) VALUES($1,$2)',
        [BUNDLED_COMPONENT_SEED_VERSION,checksum]);
    return rows.length;
  });
}
