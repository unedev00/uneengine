import type {SqlPersistence} from '../system-files/sql-persistence.js';

type Config={
 METADRIVE_BOOTSTRAP_TENANT_ID?:string;
 METADRIVE_BOOTSTRAP_DOMAIN?:string;
 METADRIVE_BOOTSTRAP_ADMIN_EMAIL?:string;
 METADRIVE_PLATFORM_CANONICAL_DOMAIN?:string;
};
type Outcome='not-configured'|'already-provisioned'|'identity-not-found'|'granted';

/**
 * Provision the initial *platform owner* with a separate, minimal deployment
 * policy. OCI's existing protected bootstrap environment selects the identity.
 *
 * This is NOT an email-based runtime permission bypass: subsequent requests
 * use the normal SQL permission set assignment and OneEngine RBAC checks.
 * Once granted, never reassign or recreate a revoked assignment at startup.
 */
export async function seedPlatformDeploymentOwner(
 db:Pick<SqlPersistence,'transaction'>,env:Config=process.env
):Promise<Outcome>{
 const slug=env.METADRIVE_BOOTSTRAP_TENANT_ID?.trim().toLowerCase();
 const legacyDomain=env.METADRIVE_BOOTSTRAP_DOMAIN?.trim().toLowerCase();
 const email=env.METADRIVE_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
 // OCI may no longer retain temporary initial-login credentials. Its own
 // root-installed service configuration is the stable platform trust anchor.
 const platformDomain=env.METADRIVE_PLATFORM_CANONICAL_DOMAIN?.trim().toLowerCase();
 const exact=Boolean(slug&&legacyDomain&&email);
 if(!exact&&!platformDomain)return 'not-configured';
 if(exact&&(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug!)
  ||!/^[a-z0-9.-]+$/.test(legacyDomain!)||!legacyDomain!.includes('.')
  ||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email!)))
  throw Error('Invalid trusted platform bootstrap identity configuration');
 if(platformDomain&&(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(platformDomain)
   ||platformDomain.startsWith('api.')))
  throw Error('Invalid root-installed OCI canonical domain');
 return db.transaction(async client=>{
  // At most one automatically granted platform owner, across all tenants.
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['metadrive:platform:deployment-owner']);
  const receipt=await client.query('SELECT tenant_id,user_id FROM md_platform_deployment_owner_receipts LIMIT 1');
  if(receipt.rows.length)return 'already-provisioned';

  // Prefer the exact original provisioned identity. Where bootstrap variables
  // were removed, use the OCI-root-installed canonical domain and a unique
  // original-role holder OR directly assigned OneEngine owner with effective
  // Tenant:manage. No email or UI-supplied claim can influence this selection.
  // Ambiguity fails closed and grants remain one-time and revocable.
  let {rows:identities}=exact
   ?await client.query<{tenant_id:string;user_id:string}>(`
     SELECT u.tenant_id,u.id AS user_id FROM md_users u
     JOIN md_tenants t ON t.id=u.tenant_id
     JOIN md_tenant_domains d ON d.tenant_id=t.id
     WHERE t.slug=$1 AND d.domain=$2 AND lower(u.email)=$3
       AND u.enabled=true AND t.status='ACTIVE'
       AND (
        EXISTS (SELECT 1 FROM md_permission_assignments a
         JOIN md_permission_sets p ON p.tenant_id=a.tenant_id AND p.id=a.permission_set_id
         WHERE a.tenant_id=u.tenant_id AND a.user_id=u.id AND p.api_name='OneEngine')
        OR EXISTS (SELECT 1 FROM md_user_roles ur
         JOIN md_role_permission_sets rp ON rp.tenant_id=ur.tenant_id AND rp.role_id=ur.role_id
         JOIN md_permission_sets p ON p.tenant_id=rp.tenant_id AND p.id=rp.permission_set_id
         WHERE ur.tenant_id=u.tenant_id AND ur.user_id=u.id AND p.api_name='OneEngine')
       )`,[slug,legacyDomain,email])
   :await client.query<{tenant_id:string;user_id:string}>(`
     SELECT DISTINCT u.tenant_id,u.id AS user_id FROM md_users u
     JOIN md_tenants t ON t.id=u.tenant_id
     JOIN md_tenant_domains d ON d.tenant_id=t.id
     JOIN md_user_roles ur ON ur.tenant_id=u.tenant_id AND ur.user_id=u.id
     JOIN md_roles r ON r.tenant_id=ur.tenant_id AND r.id=ur.role_id
     JOIN md_role_permission_sets rp ON rp.tenant_id=ur.tenant_id AND rp.role_id=ur.role_id
     JOIN md_permission_sets p ON p.tenant_id=rp.tenant_id AND p.id=rp.permission_set_id
     WHERE d.domain=$1 AND t.status='ACTIVE' AND u.enabled=true
       AND r.api_name='TenantDeveloper' AND p.api_name='OneEngine'
       AND u.user_type='internal'
    `,[platformDomain]);
  if(!exact && platformDomain && identities.length===0) {
   // Legacy platform owners may have OneEngine assigned directly in Users,
   // without the seeded TenantDeveloper role. The root-installed canonical
   // domain is an independent trust anchor; require exactly one such enabled
   // user with effective Tenant:manage. Never pick the first of multiple users.
   const direct=await client.query<{tenant_id:string;user_id:string}>(`
    SELECT DISTINCT u.tenant_id,u.id AS user_id FROM md_users u
    JOIN md_tenants t ON t.id=u.tenant_id
    JOIN md_tenant_domains d ON d.tenant_id=t.id
    JOIN md_permission_assignments a ON a.tenant_id=u.tenant_id AND a.user_id=u.id
    JOIN md_permission_sets p ON p.tenant_id=a.tenant_id AND p.id=a.permission_set_id
    WHERE d.domain=$1 AND t.status='ACTIVE' AND u.enabled=true AND u.user_type='internal'
      AND p.api_name='OneEngine'
      AND md_rbac_allowed(u.tenant_id,u.id,'Tenant','manage')
   `,[platformDomain]);
   identities=direct.rows;
  }
  if(!exact && platformDomain && identities.length===0) {
   // Some original platform installations registered a different tenant
   // domain from the public web hostname. Recover only in a strictly isolated
   // one-tenant OCI platform, with a unique enabled original admin role.
   // This is NOT enabled on multi-tenant deployments or by OneEngine alone.
   const {rows:counts}=await client.query<{tenant_count:number}>(
    'SELECT count(*)::integer AS tenant_count FROM md_tenants');
   if(counts[0]?.tenant_count===1) {
    const original=await client.query<{tenant_id:string;user_id:string}>(`
     SELECT DISTINCT u.tenant_id,u.id AS user_id FROM md_users u
     JOIN md_tenants t ON t.id=u.tenant_id
     JOIN md_user_roles ur ON ur.tenant_id=u.tenant_id AND ur.user_id=u.id
     JOIN md_roles r ON r.tenant_id=ur.tenant_id AND r.id=ur.role_id
     JOIN md_role_permission_sets rp ON rp.tenant_id=ur.tenant_id AND rp.role_id=ur.role_id
     JOIN md_permission_sets p ON p.tenant_id=rp.tenant_id AND p.id=rp.permission_set_id
     WHERE t.status='ACTIVE' AND u.enabled=true AND u.user_type='internal'
       AND r.api_name='TenantDeveloper' AND p.api_name='OneEngine'
       AND EXISTS(SELECT 1 FROM md_tenants HAVING count(*)=1)
    `);
    identities=original.rows;
    if(identities.length===0) {
     // Historic single-tenant setup may have only a direct OneEngine grant,
     // with no TenantDeveloper role. Never infer an owner if two users qualify.
     const direct=await client.query<{tenant_id:string;user_id:string}>(`
      SELECT DISTINCT u.tenant_id,u.id AS user_id FROM md_users u
      JOIN md_tenants t ON t.id=u.tenant_id
      JOIN md_permission_assignments a ON a.tenant_id=u.tenant_id AND a.user_id=u.id
      JOIN md_permission_sets p ON p.tenant_id=a.tenant_id AND p.id=a.permission_set_id
      WHERE t.status='ACTIVE' AND u.enabled=true AND u.user_type='internal'
        AND p.api_name='OneEngine'
        AND md_rbac_allowed(u.tenant_id,u.id,'Tenant','manage')
        AND (SELECT count(*) FROM md_tenants)=1
     `);
     identities=direct.rows;
    }
   }
  }
  if(identities.length!==1){
   if(platformDomain) {
    // Read-only diagnostic counts. Never log names, emails, identifiers,
    // passwords or business records; operators need to know *which guard*
    // failed before considering any privileged bootstrap.
    const {rows}=await client.query<{
     tenants:number;canonical_domains:number;active_internal:number;
     direct_oneengine:number;direct_oneengine_manage:number;
     root_direct_oneengine:number;root_direct_manage:number
    }>(`
     SELECT
      (SELECT count(*)::int FROM md_tenants) AS tenants,
      (SELECT count(*)::int FROM md_tenant_domains WHERE domain=$1) AS canonical_domains,
      (SELECT count(*)::int FROM md_users u JOIN md_tenants t ON t.id=u.tenant_id
       WHERE t.status='ACTIVE' AND u.enabled AND u.user_type='internal') AS active_internal,
      (SELECT count(*)::int FROM md_users u JOIN md_tenants t ON t.id=u.tenant_id
       WHERE t.status='ACTIVE' AND u.enabled AND u.user_type='internal'
       AND EXISTS(SELECT 1 FROM md_permission_assignments a
        JOIN md_permission_sets p ON p.tenant_id=a.tenant_id AND p.id=a.permission_set_id
        WHERE a.tenant_id=u.tenant_id AND a.user_id=u.id AND p.api_name='OneEngine')) AS direct_oneengine,
      (SELECT count(*)::int FROM md_users u JOIN md_tenants t ON t.id=u.tenant_id
       WHERE t.status='ACTIVE' AND u.enabled AND u.user_type='internal'
       AND EXISTS(SELECT 1 FROM md_permission_assignments a
        JOIN md_permission_sets p ON p.tenant_id=a.tenant_id AND p.id=a.permission_set_id
        WHERE a.tenant_id=u.tenant_id AND a.user_id=u.id AND p.api_name='OneEngine')
       AND md_rbac_allowed(u.tenant_id,u.id,'Tenant','manage')) AS direct_oneengine_manage,
      (SELECT count(*)::int FROM md_users u JOIN md_tenants t ON t.id=u.tenant_id
       JOIN md_tenant_domains d ON d.tenant_id=t.id
       WHERE d.domain=$1 AND t.status='ACTIVE' AND u.enabled AND u.user_type='internal'
       AND EXISTS(SELECT 1 FROM md_permission_assignments a
        JOIN md_permission_sets p ON p.tenant_id=a.tenant_id AND p.id=a.permission_set_id
        WHERE a.tenant_id=u.tenant_id AND a.user_id=u.id AND p.api_name='OneEngine')) AS root_direct_oneengine,
      (SELECT count(*)::int FROM md_users u JOIN md_tenants t ON t.id=u.tenant_id
       JOIN md_tenant_domains d ON d.tenant_id=t.id
       WHERE d.domain=$1 AND t.status='ACTIVE' AND u.enabled AND u.user_type='internal'
       AND EXISTS(SELECT 1 FROM md_permission_assignments a
        JOIN md_permission_sets p ON p.tenant_id=a.tenant_id AND p.id=a.permission_set_id
        WHERE a.tenant_id=u.tenant_id AND a.user_id=u.id AND p.api_name='OneEngine')
       AND md_rbac_allowed(u.tenant_id,u.id,'Tenant','manage')) AS root_direct_manage
    `,[platformDomain]);
    console.info('Platform owner eligibility counts:',JSON.stringify(rows[0]??{}));
   }
   return 'identity-not-found';
  }
  const {tenant_id:tenant,user_id:user}=identities[0];

  // Never replace an existing platform policy or its explicit deny overrides.
  await client.query(`INSERT INTO md_permission_sets(tenant_id,api_name)
    VALUES($1,'PlatformDeveloper') ON CONFLICT(tenant_id,api_name) DO NOTHING`,[tenant]);
  await client.query(`INSERT INTO md_permission_rules(tenant_id,permission_set_id,resource,action,effect)
    SELECT $1,p.id,'PlatformOperations','manage','allow'
    FROM md_permission_sets p WHERE p.tenant_id=$1 AND p.api_name='PlatformDeveloper'
    ON CONFLICT(tenant_id,permission_set_id,resource,action) DO NOTHING`,[tenant]);
  await client.query(`INSERT INTO md_permission_assignments(tenant_id,user_id,permission_set_id)
    SELECT $1,$2,p.id FROM md_permission_sets p
    WHERE p.tenant_id=$1 AND p.api_name='PlatformDeveloper'
    ON CONFLICT(tenant_id,user_id,permission_set_id) DO NOTHING`,[tenant,user]);
  await client.query(`INSERT INTO md_platform_deployment_owner_receipts(tenant_id,user_id)
    VALUES($1,$2)`,[tenant,user]);
  await client.query(`INSERT INTO md_security_events
    (tenant_id,actor_user_id,subject_user_id,action,details)
    VALUES($1,NULL,$2,'platform.production-deploy.bootstrap-granted',
     '{"source":"oci-platform-owner","policy":"PlatformDeveloper","resource":"PlatformOperations","action":"manage"}'::jsonb)`,
    [tenant,user]);
  return 'granted';
 });
}
