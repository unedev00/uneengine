-- One-time OCI platform-owner approval from the authenticated repository owner.
-- Selector is a SHA-256 digest of the explicitly supplied account identifier;
-- no plaintext user identifiers or runtime email bypass are introduced.
-- This does not change OneEngine or grant platform rights to other tenant users.
-- Platform runtime checks continue to require PlatformDeveloper + central RBAC.
-- The existing append-only receipt prevents silently restoring revoked grants.
DO $platform_owner$
DECLARE
 target_tenant uuid;
 target_user uuid;
 policy_id uuid;
 policy_effect text;
BEGIN
 IF EXISTS(SELECT 1 FROM md_platform_deployment_owner_receipts) THEN
  RAISE NOTICE 'Platform deployment owner already bootstrapped; no changes';
  RETURN;
 END IF;
 IF (SELECT count(*) FROM md_tenants) <> 1 THEN
  RAISE NOTICE 'Platform owner approval skipped: not a single-tenant OCI platform';
  RETURN;
 END IF;
 SELECT u.tenant_id,u.id INTO target_tenant,target_user
 FROM md_users u
 JOIN md_tenants t ON t.id=u.tenant_id
 JOIN md_tenant_domains d ON d.tenant_id=t.id
 WHERE d.domain='unesolutions.co.uk'
   AND t.status='ACTIVE' AND u.enabled=true AND u.user_type='internal'
   AND encode(sha256(convert_to(lower(u.email),'UTF8')),'hex')=
     '1aaeebc4119ff93bf2deadf59584c50f517633871c355fa05999429cc1479819'
   AND EXISTS (
    SELECT 1 FROM md_permission_assignments a
    JOIN md_permission_sets p ON p.tenant_id=a.tenant_id AND p.id=a.permission_set_id
    WHERE a.tenant_id=u.tenant_id AND a.user_id=u.id AND p.api_name='OneEngine')
   AND md_rbac_allowed(u.tenant_id,u.id,'Tenant','manage');
 IF target_user IS NULL THEN
  RAISE NOTICE 'Platform owner approval skipped: selected account not uniquely eligible';
  RETURN;
 END IF;
 -- Never overwrite an existing policy, explicit deny or tenant customisation.
 INSERT INTO md_permission_sets(tenant_id,api_name)
 VALUES(target_tenant,'PlatformDeveloper')
 ON CONFLICT(tenant_id,api_name) DO NOTHING;
 SELECT id INTO policy_id FROM md_permission_sets
 WHERE tenant_id=target_tenant AND api_name='PlatformDeveloper';
 INSERT INTO md_permission_rules(tenant_id,permission_set_id,resource,action,effect)
 VALUES(target_tenant,policy_id,'PlatformOperations','manage','allow')
 ON CONFLICT(tenant_id,permission_set_id,resource,action) DO NOTHING;
 SELECT effect INTO policy_effect FROM md_permission_rules
 WHERE tenant_id=target_tenant AND permission_set_id=policy_id
   AND resource='PlatformOperations' AND action='manage';
 IF policy_effect IS DISTINCT FROM 'allow' THEN
  RAISE NOTICE 'Platform owner approval skipped: existing policy denies operations';
  RETURN;
 END IF;
 INSERT INTO md_permission_assignments(tenant_id,user_id,permission_set_id)
 VALUES(target_tenant,target_user,policy_id)
 ON CONFLICT(tenant_id,user_id,permission_set_id) DO NOTHING;
 -- SQL is the source of truth. No email-based request bypass or hidden role.
 INSERT INTO md_platform_deployment_owner_receipts(tenant_id,user_id)
 VALUES(target_tenant,target_user);
 INSERT INTO md_security_events(tenant_id,actor_user_id,subject_user_id,action,details)
 VALUES(target_tenant,NULL,target_user,'platform.production-deploy.bootstrap-granted',
  '{"source":"approved-oci-owner-bootstrap","policy":"PlatformDeveloper","resource":"PlatformOperations","action":"manage"}'::jsonb);
 RAISE NOTICE 'Approved OCI platform owner policy granted; runtime RBAC remains authoritative';
END $platform_owner$;
