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
  ||!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email!)))
  throw Error('Invalid trusted platform bootstrap identity configuration');
 if(platformDomain&&(!/^[a-z0-9-]+(?:\\.[a-z0-9-]+)+$/.test(platformDomain)
   ||platformDomain.startsWith('api.')))
  throw Error('Invalid root-installed OCI canonical domain');
 return db.transaction(async client=>{
  // At most one automatically granted platform owner, across all tenants.
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['metadrive:platform:deployment-owner']);
  const receipt=await client.query('SELECT tenant_id,user_id FROM md_platform_deployment_owner_receipts LIMIT 1');
  if(receipt.rows.length)return 'already-provisioned';

  // Prefer the exact original provisioned identity. Where the one-time
  // bootstrap variables were removed, require the OCI-root-installed canonical
  // platform domain AND exactly one active *original developer role* holder
  // with OneEngine. No email, arbitrary tenant, or UI-supplied claim can
  // influence this selection. Ambiguity fails closed.
  const {rows:identities}=exact
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
  if(identities.length!==1)return 'identity-not-found';
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
