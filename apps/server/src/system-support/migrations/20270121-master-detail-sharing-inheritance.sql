-- Phase 2C: Master-Detail record access is controlled by every active
-- master, rather than a separately owned detail record. Preserve all existing
-- direct-access rules for ordinary records and fall back for historical deletes.
CREATE OR REPLACE FUNCTION md_record_access_direct(t uuid,u uuid,rid uuid,act text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT COALESCE((
 SELECT
 -- Object/record denies and restrictions also narrow ownership and broad grants.
 (NOT rec.is_deleted OR act='delete')
 AND NOT (SELECT deny_granted FROM md_rbac_decision(t,u,'Record:'||rec.id::text,act))
 AND md_rbac_allowed(t,u,rec.object_api,act)
 AND (rec.record_type_id IS NULL OR md_rbac_allowed(t,u,'RecordType:'||rec.object_api||'.'||rec.record_type_id,'read'))
 AND NOT EXISTS(SELECT 1 FROM md_record_policies rp WHERE rp.tenant_id=t AND rp.object_api=rec.object_api
  AND rp.kind='restriction' AND rp.enabled
  AND (rp.subject_type='all' OR (rp.subject_type='external' AND usr.user_type='external')
   OR (rp.subject_type='user' AND rp.subject_id=u) OR (rp.subject_type='role' AND EXISTS(
    SELECT 1 FROM md_user_roles ur WHERE ur.tenant_id=t AND ur.user_id=u AND ur.role_id=rp.subject_id)))
  AND NOT md_policy_matches(t,rp.id,rec.id))
 AND (usr.user_type='external'
      OR md_effective_reporting_scope(t,u,rec.object_api) IS NULL
      OR md_effective_reporting_scope(t,u,rec.object_api)='all'
      OR (rec.owner_id IS NOT NULL AND md_reporting_scope(t,u,rec.owner_id,
           md_effective_reporting_scope(t,u,rec.object_api))))
 AND (CASE WHEN usr.user_type='external' THEN act='read' AND COALESCE(setting.portal_enabled,false)
   AND usr.external_account_id IS NOT NULL
   AND md_record_field(t,rec.id,setting.portal_account_field)=usr.external_account_id::text
 ELSE
 (md_effective_reporting_scope(t,u,rec.object_api) IS NOT NULL
  AND (md_effective_reporting_scope(t,u,rec.object_api)='all'
    OR (rec.owner_id IS NOT NULL AND md_reporting_scope(t,u,rec.owner_id,
       md_effective_reporting_scope(t,u,rec.object_api)))))
 OR rec.owner_id=u OR (rec.owner_queue_id IS NOT NULL AND md_access_member(t,u,rec.owner_queue_id))
 OR md_rbac_allowed(t,u,'Record:'||rec.id::text,act)
 OR md_rbac_allowed(t,u,rec.object_api,'modifyAll') OR md_rbac_allowed(t,u,'Record','modifyAll')
 OR (act='read' AND (md_rbac_allowed(t,u,rec.object_api,'viewAll') OR md_rbac_allowed(t,u,'Record','viewAll')))
 OR (act='read' AND setting.default_access IN ('Public Read Only','Public Read/Write'))
 OR (act='edit' AND setting.default_access='Public Read/Write')
 OR (COALESCE(setting.use_hierarchy,true) AND EXISTS(
   SELECT 1 FROM md_user_role_tree(t,rec.owner_id) ancestor
   JOIN md_user_roles ur ON ur.tenant_id=t AND ur.user_id=u AND ur.role_id=ancestor.role_id
   WHERE NOT EXISTS(SELECT 1 FROM md_user_roles own WHERE own.tenant_id=t AND own.user_id=rec.owner_id AND own.role_id=ancestor.role_id)))
 OR (act IN ('read','edit') AND EXISTS(SELECT 1 FROM md_record_policies rp
  WHERE rp.tenant_id=t AND rp.object_api=rec.object_api AND rp.kind='share' AND rp.enabled
   AND (act='read' OR rp.access_level='Edit')
   AND (CASE rp.target_type WHEN 'User' THEN rp.target_id=u
    WHEN 'PublicGroup' THEN md_access_member(t,u,rp.target_id)
    WHEN 'Role' THEN EXISTS(SELECT 1 FROM md_user_roles ur WHERE ur.tenant_id=t AND ur.user_id=u AND ur.role_id=rp.target_id)
    WHEN 'RoleAndSubordinates' THEN rp.target_id IN(SELECT role_id FROM md_user_role_tree(t,u)) ELSE false END)
   AND (CASE rp.rule_type WHEN 'OwnerBased' THEN EXISTS(
    SELECT 1 FROM md_policy_owner_roles por JOIN md_user_roles own
     ON own.tenant_id=por.tenant_id AND own.role_id=por.role_id AND own.user_id=rec.owner_id
     WHERE por.tenant_id=t AND por.policy_id=rp.id)
    WHEN 'CriteriaBased' THEN md_policy_matches(t,rp.id,rec.id) ELSE false END)))
 END)
 FROM md_records rec JOIN md_users usr ON usr.tenant_id=t AND usr.id=u AND usr.enabled
 LEFT JOIN md_sharing_settings setting ON setting.tenant_id=t AND setting.object_api=rec.object_api
 WHERE rec.tenant_id=t AND rec.id=rid
 ),false)
$$;

CREATE OR REPLACE FUNCTION md_master_detail_parent_access(t uuid,u uuid,rid uuid,act text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT COALESCE(bool_and(
   v.reference_record_id IS NOT NULL
   AND md_record_access(t,u,v.reference_record_id,
     CASE WHEN act='delete' THEN 'edit' ELSE act END)
 ),false)
 FROM md_records child
 JOIN md_field_definitions f ON f.tenant_id=child.tenant_id
   AND f.object_api=child.object_api AND f.data_type='reference'
   AND f.relationship_type='Master-Detail' AND f.deleted_at IS NULL
 LEFT JOIN md_record_values v ON v.tenant_id=child.tenant_id
   AND v.object_api=child.object_api AND v.record_id=child.id
   AND v.field_api=f.api_name
 WHERE child.tenant_id=t AND child.id=rid
$$;

-- Denies, restriction policies, object permissions and record-type gates still
-- apply to detail records. The parent grant replaces only independent owner/
-- sharing membership; a junction detail needs access through both masters.
CREATE OR REPLACE FUNCTION md_record_access(t uuid,u uuid,rid uuid,act text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT COALESCE((
  SELECT CASE WHEN rec.is_deleted AND act='delete' THEN
    md_record_access_direct(t,u,rid,act)
   WHEN NOT EXISTS(
    SELECT 1 FROM md_field_definitions f WHERE f.tenant_id=t
      AND f.object_api=rec.object_api AND f.data_type='reference'
      AND f.relationship_type='Master-Detail' AND f.deleted_at IS NULL
   ) THEN md_record_access_direct(t,u,rid,act)
   ELSE
    NOT rec.is_deleted
    AND EXISTS(SELECT 1 FROM md_users usr WHERE usr.tenant_id=t AND usr.id=u AND usr.enabled)
    AND md_rbac_allowed(t,u,rec.object_api,act)
    AND NOT (SELECT deny_granted FROM md_rbac_decision(t,u,'Record:'||rid::text,act))
    AND (rec.record_type_id IS NULL
      OR md_rbac_allowed(t,u,'RecordType:'||rec.object_api||'.'||rec.record_type_id,'read'))
    AND NOT EXISTS(
      SELECT 1 FROM md_record_policies rp
      JOIN md_users usr ON usr.tenant_id=t AND usr.id=u
      WHERE rp.tenant_id=t AND rp.object_api=rec.object_api
       AND rp.kind='restriction' AND rp.enabled
       AND (rp.subject_type='all'
        OR (rp.subject_type='external' AND usr.user_type='external')
        OR (rp.subject_type='user' AND rp.subject_id=u)
        OR (rp.subject_type='role' AND EXISTS(
         SELECT 1 FROM md_user_roles ur WHERE ur.tenant_id=t
          AND ur.user_id=u AND ur.role_id=rp.subject_id)))
       AND NOT md_policy_matches(t,rp.id,rec.id)
    )
    AND md_master_detail_parent_access(t,u,rid,act)
   END
  FROM md_records rec WHERE rec.tenant_id=t AND rec.id=rid
 ),false)
$$;
