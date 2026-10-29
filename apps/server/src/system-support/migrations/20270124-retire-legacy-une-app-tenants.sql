-- Follow-up to PR #131. Exact app-owned references only; no broad string substitutions.
-- The original published layout snapshots and app package versions remain immutable.
-- PostgreSQL migration runner executes each file once with checksum tracking.
CREATE TABLE IF NOT EXISTS md_legacy_une_component_replacements (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 page_id uuid NOT NULL,
 surface text NOT NULL CHECK(surface IN ('page-component','lightning-node')),
 component_key text NOT NULL,
 old_api text NOT NULL,
 new_api text NOT NULL,
 replaced_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (tenant_id,page_id,surface,component_key,old_api)
);
-- Register private components for existing INSTALLED and currently ENTITLED apps.
-- Never seize a tenant-owned API identity: ON CONFLICT DO NOTHING, and subsequent
-- changes require the exact matching built-in renderer key.
INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled)
SELECT DISTINCT i.tenant_id,m.new_api,'one-bundled:'||m.new_api,true
FROM md_app_installations i
JOIN md_apps a ON a.id=i.app_id AND a.tenant_owner_id IS NULL
JOIN md_app_entitlements e ON e.tenant_id=i.tenant_id AND e.app_id=i.app_id
 AND e.active=true AND (e.expires_at IS NULL OR e.expires_at>now())
JOIN (VALUES ('Acetill','une_input','acetill_input'),('Acetill','une_search','acetill_search'),
('Acetill','une_item_grid','acetill_item_grid'),('Acetill','une_button','acetill_button'),
('Acetill','une_cart','acetill_cart'),
('AceAssist','une_input','aceassist_input'),('AceAssist','une_calendar','aceassist_calendar'),
('OneChatter','une_input','onechatter_input'),('OneChatter','une_conversation','onechatter_conversation'),
('UNEAceChatter','une_input','uneacechatter_input'),
('UNEAceChatter','une_conversation','uneacechatter_conversation'),
('UNEAceChatter','une_modal','uneacechatter_modal'),
('UNEAceChatter','une_tabs','uneacechatter_tabs'),
('UNEAceChatter','une_stack','uneacechatter_stack'),
('UNEAceChatter','une_lookup','uneacechatter_lookup'),
('UNEAceChatter','une_button','uneacechatter_button'),
('UNEAceChatter','une_search','uneacechatter_search')) AS m(app_api,old_api,new_api) ON m.app_api=a.api_name
ON CONFLICT(tenant_id,api_name) DO NOTHING;

-- Convert legacy package-based component instances of *owned, seeded* app pages.
-- Keep component IDs, slots, sort order, authored property rows, Flows and receipts.
WITH app_pages(app_api,page_api) AS (VALUES ('Acetill','AcetillRegister'),('Acetill','AcetillSale'),('Acetill','AcetillCheckout'),('Acetill','AcetillReceipt'),
('AceAssist','AceAssist_Calendar'),('OneChatter','OneChatterInbox'),
('UNEAceChatter','UNEAceChatterDesktop'),('UNEAceChatter','UNEAceChatterTablet'),
('UNEAceChatter','UNEAceChatterMobile'),('UNEAceChatter','UNEAceChatterCustom')),
component_map(app_api,old_api,new_api) AS (VALUES ('Acetill','une_input','acetill_input'),('Acetill','une_search','acetill_search'),
('Acetill','une_item_grid','acetill_item_grid'),('Acetill','une_button','acetill_button'),
('Acetill','une_cart','acetill_cart'),
('AceAssist','une_input','aceassist_input'),('AceAssist','une_calendar','aceassist_calendar'),
('OneChatter','une_input','onechatter_input'),('OneChatter','une_conversation','onechatter_conversation'),
('UNEAceChatter','une_input','uneacechatter_input'),
('UNEAceChatter','une_conversation','uneacechatter_conversation'),
('UNEAceChatter','une_modal','uneacechatter_modal'),
('UNEAceChatter','une_tabs','uneacechatter_tabs'),
('UNEAceChatter','une_stack','uneacechatter_stack'),
('UNEAceChatter','une_lookup','uneacechatter_lookup'),
('UNEAceChatter','une_button','uneacechatter_button'),
('UNEAceChatter','une_search','uneacechatter_search')),
eligible AS (
 SELECT p.tenant_id,p.id AS page_id,a.id AS app_id,m.old_api,m.new_api
 FROM md_page_definitions p
 JOIN app_pages ap ON ap.page_api=p.api_name
 JOIN md_apps a ON a.api_name=ap.app_api AND a.tenant_owner_id IS NULL
 JOIN md_app_installations i ON i.app_id=a.id AND i.tenant_id=p.tenant_id
 JOIN md_app_entitlements e ON e.app_id=a.id AND e.tenant_id=p.tenant_id
    AND e.active=true AND (e.expires_at IS NULL OR e.expires_at>now())
 JOIN component_map m ON m.app_api=ap.app_api
 JOIN md_component_definitions target ON target.tenant_id=p.tenant_id
    AND target.api_name=m.new_api AND target.renderer_key='one-bundled:'||m.new_api
    AND target.enabled=true
 JOIN md_component_definitions legacy ON legacy.tenant_id=p.tenant_id
    AND legacy.api_name=m.old_api AND legacy.renderer_key='one-bundled:'||m.old_api
 WHERE p.enabled=true
),
updated AS (
 UPDATE md_page_components c SET component_api=e.new_api
 FROM eligible e
 WHERE c.tenant_id=e.tenant_id AND c.page_id=e.page_id AND c.component_api=e.old_api
   AND EXISTS (
    SELECT 1 FROM md_app_package_seed_receipts r
    WHERE r.tenant_id=e.tenant_id AND r.app_id=e.app_id
      AND r.resource_type='App Page' AND r.parent_api=''
      AND r.api_name=(SELECT p.api_name FROM md_page_definitions p
        WHERE p.tenant_id=e.tenant_id AND p.id=e.page_id)
   )
 RETURNING c.tenant_id,c.page_id,c.id::text AS component_key,e.old_api,e.new_api
)
INSERT INTO md_legacy_une_component_replacements
  (tenant_id,page_id,surface,component_key,old_api,new_api)
SELECT tenant_id,page_id,'page-component',component_key,old_api,new_api FROM updated
ON CONFLICT DO NOTHING;

-- Convert only untouched, first-revision seeded Lightning app pages.
-- Any independently drafted/published layout version or revision >1 is skipped
-- rather than modifying immutable snapshots or overriding tenant customisation.
WITH app_pages(app_api,page_api) AS (VALUES ('Acetill','AcetillRegister'),('Acetill','AcetillSale'),('Acetill','AcetillCheckout'),('Acetill','AcetillReceipt'),
('AceAssist','AceAssist_Calendar'),('OneChatter','OneChatterInbox'),
('UNEAceChatter','UNEAceChatterDesktop'),('UNEAceChatter','UNEAceChatterTablet'),
('UNEAceChatter','UNEAceChatterMobile'),('UNEAceChatter','UNEAceChatterCustom')),
component_map(app_api,old_api,new_api) AS (VALUES ('Acetill','une_input','acetill_input'),('Acetill','une_search','acetill_search'),
('Acetill','une_item_grid','acetill_item_grid'),('Acetill','une_button','acetill_button'),
('Acetill','une_cart','acetill_cart'),
('AceAssist','une_input','aceassist_input'),('AceAssist','une_calendar','aceassist_calendar'),
('OneChatter','une_input','onechatter_input'),('OneChatter','une_conversation','onechatter_conversation'),
('UNEAceChatter','une_input','uneacechatter_input'),
('UNEAceChatter','une_conversation','uneacechatter_conversation'),
('UNEAceChatter','une_modal','uneacechatter_modal'),
('UNEAceChatter','une_tabs','uneacechatter_tabs'),
('UNEAceChatter','une_stack','uneacechatter_stack'),
('UNEAceChatter','une_lookup','uneacechatter_lookup'),
('UNEAceChatter','une_button','uneacechatter_button'),
('UNEAceChatter','une_search','uneacechatter_search')),
eligible AS (
 SELECT p.tenant_id,p.id AS page_id,a.id AS app_id,m.old_api,m.new_api
 FROM md_page_definitions p
 JOIN app_pages ap ON ap.page_api=p.api_name
 JOIN md_apps a ON a.api_name=ap.app_api AND a.tenant_owner_id IS NULL
 JOIN md_app_installations i ON i.app_id=a.id AND i.tenant_id=p.tenant_id
 JOIN md_app_entitlements e ON e.app_id=a.id AND e.tenant_id=p.tenant_id
    AND e.active=true AND (e.expires_at IS NULL OR e.expires_at>now())
 JOIN component_map m ON m.app_api=ap.app_api
 JOIN md_component_definitions target ON target.tenant_id=p.tenant_id
    AND target.api_name=m.new_api AND target.renderer_key='one-bundled:'||m.new_api
    AND target.enabled=true
 JOIN md_component_definitions legacy ON legacy.tenant_id=p.tenant_id
    AND legacy.api_name=m.old_api AND legacy.renderer_key='one-bundled:'||m.old_api
 WHERE p.enabled=true
),
updated AS (
 UPDATE md_lightning_page_nodes n SET component_type='Custom:'||e.new_api
 FROM eligible e,md_lightning_page_details d
 WHERE n.tenant_id=e.tenant_id AND n.page_id=e.page_id
   AND n.component_type='Custom:'||e.old_api
   AND d.tenant_id=n.tenant_id AND d.page_id=n.page_id
   AND d.page_type='App Page' AND d.revision=1
   AND NOT EXISTS (SELECT 1 FROM md_page_layout_versions v
       WHERE v.tenant_id=n.tenant_id AND v.page_id=n.page_id)
   AND NOT EXISTS (SELECT 1 FROM md_page_layout_audit audit
       WHERE audit.tenant_id=n.tenant_id AND audit.page_id=n.page_id)
   AND EXISTS (SELECT 1 FROM md_lightning_page_activation act
       JOIN md_apps owner_app ON owner_app.id=e.app_id
       WHERE act.tenant_id=n.tenant_id AND act.page_id=n.page_id
         AND act.scope='App Default' AND act.app_api=owner_app.api_name)
 RETURNING n.tenant_id,n.page_id,n.component_key,e.old_api,e.new_api
)
INSERT INTO md_legacy_une_component_replacements
  (tenant_id,page_id,surface,component_key,old_api,new_api)
SELECT tenant_id,page_id,'lightning-node',component_key,old_api,new_api FROM updated
ON CONFLICT DO NOTHING;

-- Legacy registrations remain in SQL for rollback and FK/history safety.
-- Disable only exact system-owned renderers with NO tenant runtime/version,
-- Flow/action, tenant-authored library, or installed old-package dependencies.
-- We cannot safely delete these definitions or their renderer assets while a
-- tenant's immutable published snapshot may still refer to them.
UPDATE md_component_definitions d SET enabled=false
WHERE d.enabled=true AND d.api_name LIKE 'une\_%' ESCAPE '\'
 AND d.renderer_key='one-bundled:'||d.api_name
 AND NOT EXISTS (SELECT 1 FROM md_page_components c
    WHERE c.tenant_id=d.tenant_id AND c.component_api=d.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_lightning_page_nodes n
    WHERE n.tenant_id=d.tenant_id AND n.component_type='Custom:'||d.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_page_layout_version_nodes n
    WHERE n.tenant_id=d.tenant_id AND n.component_type='Custom:'||d.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_component_library_versions v
    WHERE v.tenant_id=d.tenant_id AND v.component_api=d.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_component_properties cp
    WHERE cp.tenant_id=d.tenant_id AND cp.component_id=d.id)
 AND NOT EXISTS (SELECT 1 FROM md_metadata_package_components pkg
    WHERE pkg.tenant_id=d.tenant_id AND pkg.component_type='component'
      AND pkg.component_api=d.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_dashboard_snapshots snap
    WHERE snap.tenant_id=d.tenant_id
      AND position(d.api_name in snap.content::text)>0)
 -- Conservative on purpose: flattened and structured Flow metadata may both
 -- hold old component IDs; avoid disabling a renderer for either representation.
 AND NOT EXISTS (SELECT 1 FROM md_flow_node_properties f
    WHERE f.tenant_id=d.tenant_id AND position(d.api_name in COALESCE(f.value_text,''))>0)
 AND NOT EXISTS (SELECT 1 FROM md_flow_editor_values f
    WHERE f.tenant_id=d.tenant_id AND position(d.api_name in COALESCE(f.value_text,''))>0)
 AND NOT EXISTS (SELECT 1 FROM md_object_actions a
    WHERE a.tenant_id=d.tenant_id AND a.component_api_name=d.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_global_quick_actions a
    WHERE a.tenant_id=d.tenant_id AND a.component_api_name=d.api_name)
 AND NOT EXISTS (SELECT 1 FROM md_system_definitions s
    WHERE s.tenant_id=d.tenant_id AND position(d.api_name in s.properties::text)>0)
 AND NOT EXISTS (
   SELECT 1 FROM md_tenant_app_installed_versions installed
   JOIN md_app_package_component_templates template
     ON template.app_id=installed.app_id AND template.version=installed.version
   WHERE installed.tenant_id=d.tenant_id AND template.api_name=d.api_name
 )
 AND NOT EXISTS (SELECT 1 FROM md_tenant_app_installed_versions installed
   JOIN md_app_package_page_component_templates t
     ON t.app_id=installed.app_id AND t.version=installed.version
   WHERE installed.tenant_id=d.tenant_id AND t.component_api=d.api_name
 );

-- Saved page props, versioned layout nodes and business data have not been deleted.
-- See docs/app-owned-component-retirement-20261029.md for pre/post audit SQL.
