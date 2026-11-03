import type {SqlPersistence} from '../system-files/sql-persistence.js';

/**
 * Explicit, revocable OCI deploy grant on the existing OneEngine permission set
 * for the canonical platform tenant only. Never grant platform operations to
 * customer tenant administrators or create a second permission set.
 */
export async function seedPlatformOneEngineDeploymentPermission(
 db:Pick<SqlPersistence,'query'>
):Promise<number>{
 const {rows}=await db.query<{tenant_id:string}>(`
  WITH granted AS (
   INSERT INTO md_permission_rules(tenant_id,permission_set_id,resource,action,effect)
   SELECT p.tenant_id,p.id,'PlatformOperations','manage','allow'
   FROM md_permission_sets p
   JOIN md_tenant_domains d ON d.tenant_id=p.tenant_id
   JOIN md_tenants t ON t.id=d.tenant_id
   WHERE p.api_name='OneEngine' AND d.domain='unesolutions.co.uk'
     AND t.status='ACTIVE'
   ON CONFLICT(tenant_id,permission_set_id,resource,action) DO NOTHING
   RETURNING tenant_id
  ), audited AS (
   INSERT INTO md_security_events(tenant_id,actor_user_id,action,details)
   SELECT tenant_id,NULL,'platform.oneengine-deploy-grant.seeded',
    '{"policy":"OneEngine","resource":"PlatformOperations","action":"manage"}'::jsonb
   FROM granted RETURNING tenant_id
  )
  SELECT tenant_id FROM audited`);
 return rows.length;
}
