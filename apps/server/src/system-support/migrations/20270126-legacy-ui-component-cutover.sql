-- Exact-key runtime cutover after ui_* renderer assets are deployed.
-- Preserve historical immutable layouts, tenant-authored libraries and
-- historical published package definitions. They resolve via read-only
-- compatibility aliases until their own version lifecycle retires them.
-- Every mutation is tenant-scoped and gated by the system-owned renderer key.
CREATE TABLE IF NOT EXISTS md_component_key_cutover_audit (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 surface text NOT NULL,
 reference_key text NOT NULL,
 old_api text NOT NULL,
 new_api text NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,surface,reference_key,old_api)
);

-- A tenant-written definition with the ui_* name is never commandeered.
INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled)
SELECT legacy.tenant_id,
 'ui_'||substring(legacy.api_name from 5),
 'one-bundled:ui_'||substring(legacy.api_name from 5),true
FROM md_component_definitions legacy
WHERE legacy.api_name LIKE 'une\_%' ESCAPE '\'
  AND legacy.renderer_key='one-bundled:'||legacy.api_name
ON CONFLICT(tenant_id,api_name) DO NOTHING;

WITH eligible AS (
 SELECT old.tenant_id,old.api_name AS old_api,modern.api_name AS new_api
 FROM md_component_definitions old
 JOIN md_component_definitions modern ON modern.tenant_id=old.tenant_id
   AND modern.api_name='ui_'||substring(old.api_name from 5)
   AND modern.renderer_key='one-bundled:'||modern.api_name
   AND modern.enabled=true
 WHERE old.api_name LIKE 'une\_%' ESCAPE '\'
   AND old.renderer_key='one-bundled:'||old.api_name
), replaced AS (
 UPDATE md_page_components p SET component_api=e.new_api
 FROM eligible e
 WHERE p.tenant_id=e.tenant_id AND p.component_api=e.old_api
 RETURNING p.tenant_id,p.id::text AS reference_key,e.old_api,e.new_api
)
INSERT INTO md_component_key_cutover_audit(tenant_id,surface,reference_key,old_api,new_api)
SELECT tenant_id,'page-component',reference_key,old_api,new_api FROM replaced
ON CONFLICT DO NOTHING;

WITH eligible AS (
 SELECT old.tenant_id,old.api_name AS old_api,modern.api_name AS new_api
 FROM md_component_definitions old
 JOIN md_component_definitions modern ON modern.tenant_id=old.tenant_id
   AND modern.api_name='ui_'||substring(old.api_name from 5)
   AND modern.renderer_key='one-bundled:'||modern.api_name
   AND modern.enabled=true
 WHERE old.api_name LIKE 'une\_%' ESCAPE '\'
   AND old.renderer_key='one-bundled:'||old.api_name
), replaced AS (
 UPDATE md_lightning_page_nodes n SET component_type='Custom:'||e.new_api
 FROM eligible e
 WHERE n.tenant_id=e.tenant_id AND n.component_type='Custom:'||e.old_api
 RETURNING n.tenant_id,n.page_id::text||':'||n.component_key AS reference_key,e.old_api,e.new_api
)
INSERT INTO md_component_key_cutover_audit(tenant_id,surface,reference_key,old_api,new_api)
SELECT tenant_id,'lightning-node',reference_key,old_api,new_api FROM replaced
ON CONFLICT DO NOTHING;

-- Supported typed Flow/action references only; no substring rewrites of
-- arbitrary tenant text, JSON metadata, authored expressions or business rows.
WITH eligible AS (
 SELECT old.tenant_id,old.api_name AS old_api,modern.api_name AS new_api
 FROM md_component_definitions old
 JOIN md_component_definitions modern ON modern.tenant_id=old.tenant_id
   AND modern.api_name='ui_'||substring(old.api_name from 5)
   AND modern.renderer_key='one-bundled:'||modern.api_name
   AND modern.enabled=true
 WHERE old.api_name LIKE 'une\_%' ESCAPE '\'
   AND old.renderer_key='one-bundled:'||old.api_name
)
UPDATE md_flow_node_properties p SET value_text=e.new_api
FROM eligible e
WHERE p.tenant_id=e.tenant_id
  AND p.api_name IN ('componentApiName','customComponentApiName','libraryComponentId')
  AND p.value_text=e.old_api;

WITH eligible AS (
 SELECT old.tenant_id,old.api_name AS old_api,modern.api_name AS new_api
 FROM md_component_definitions old
 JOIN md_component_definitions modern ON modern.tenant_id=old.tenant_id
   AND modern.api_name='ui_'||substring(old.api_name from 5)
   AND modern.renderer_key='one-bundled:'||modern.api_name
   AND modern.enabled=true
 WHERE old.api_name LIKE 'une\_%' ESCAPE '\'
   AND old.renderer_key='one-bundled:'||old.api_name
)
UPDATE md_flow_editor_values v SET value_text=e.new_api
FROM eligible e
WHERE v.tenant_id=e.tenant_id AND v.value_text=e.old_api
  AND v.property_path ~ '(^|\.)(componentApiName|customComponentApiName|libraryComponentId)$';

WITH eligible AS (
 SELECT old.tenant_id,old.api_name AS old_api,modern.api_name AS new_api
 FROM md_component_definitions old
 JOIN md_component_definitions modern ON modern.tenant_id=old.tenant_id
   AND modern.api_name='ui_'||substring(old.api_name from 5)
   AND modern.renderer_key='one-bundled:'||modern.api_name
   AND modern.enabled=true
 WHERE old.api_name LIKE 'une\_%' ESCAPE '\'
   AND old.renderer_key='one-bundled:'||old.api_name
)
UPDATE md_object_actions a SET component_api_name=e.new_api FROM eligible e
WHERE a.tenant_id=e.tenant_id AND a.component_api_name=e.old_api;

WITH eligible AS (
 SELECT old.tenant_id,old.api_name AS old_api,modern.api_name AS new_api
 FROM md_component_definitions old
 JOIN md_component_definitions modern ON modern.tenant_id=old.tenant_id
   AND modern.api_name='ui_'||substring(old.api_name from 5)
   AND modern.renderer_key='one-bundled:'||modern.api_name
   AND modern.enabled=true
 WHERE old.api_name LIKE 'une\_%' ESCAPE '\'
   AND old.renderer_key='one-bundled:'||old.api_name
)
UPDATE md_global_quick_actions a SET component_api_name=e.new_api FROM eligible e
WHERE a.tenant_id=e.tenant_id AND a.component_api_name=e.old_api;

-- Never delete old SQL identities if any immutable version, user library,
-- old installed package, dashboard, Flow or other reference still needs them.
UPDATE md_component_definitions old SET enabled=false
WHERE old.enabled=true AND old.api_name LIKE 'une\_%' ESCAPE '\'
 AND old.renderer_key='one-bundled:'||old.api_name
 AND NOT EXISTS (SELECT 1 FROM md_page_components p
   WHERE p.tenant_id=old.tenant_id AND p.component_api=old.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_lightning_page_nodes n
   WHERE n.tenant_id=old.tenant_id AND n.component_type='Custom:'||old.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_page_layout_version_nodes n
   WHERE n.tenant_id=old.tenant_id AND n.component_type='Custom:'||old.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_component_library_versions v
   WHERE v.tenant_id=old.tenant_id AND v.component_api=old.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_component_library_heads h
   WHERE h.tenant_id=old.tenant_id AND h.component_api=old.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_flow_node_properties p
   WHERE p.tenant_id=old.tenant_id AND p.value_text=old.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_flow_editor_values p
   WHERE p.tenant_id=old.tenant_id AND p.value_text=old.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_object_actions a
   WHERE a.tenant_id=old.tenant_id AND a.component_api_name=old.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_global_quick_actions a
   WHERE a.tenant_id=old.tenant_id AND a.component_api_name=old.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_tenant_app_installed_versions i
   JOIN md_app_package_component_templates t ON t.app_id=i.app_id AND t.version=i.version
   WHERE i.tenant_id=old.tenant_id AND t.api_name=old.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_tenant_app_installed_versions i
   JOIN md_app_package_page_component_templates t ON t.app_id=i.app_id AND t.version=i.version
   WHERE i.tenant_id=old.tenant_id AND t.component_api=old.api_name);
