-- Transfer OCI deployment authority to the existing OneEngine permission set,
-- only in the canonical platform tenant. All other tenants are excluded.
-- Preserve existing explicit deny/customisation; no user assignments, records,
-- legacy permission sets or privileges are removed.
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
)
INSERT INTO md_security_events(tenant_id,actor_user_id,action,details)
SELECT tenant_id,NULL,'platform.oneengine-deploy-grant.migrated',
 '{"policy":"OneEngine","resource":"PlatformOperations","action":"manage"}'::jsonb
FROM granted;
