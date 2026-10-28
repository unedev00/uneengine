-- Backfill four independently versioned layouts for existing tenant pages.
-- Never modify an existing variant, draft, published revision, node or tenant customization.
-- Run after 20261217-four-page-device-assignments.sql.
CREATE TEMP TABLE IF NOT EXISTS md_layout_backfill_targets AS
 SELECT d.tenant_id,d.page_id,v.variant
 FROM md_lightning_page_details d
 CROSS JOIN (VALUES ('Desktop'),('Mobile'),('Tablet'),('Custom')) v(variant)
 WHERE NOT EXISTS (
  SELECT 1 FROM md_page_layout_heads h
  WHERE h.tenant_id=d.tenant_id AND h.page_id=d.page_id AND h.variant=v.variant
 );

INSERT INTO md_page_layout_versions
 (tenant_id,page_id,variant,version,page_label,layout_mode,template,canvas_width,canvas_height)
SELECT t.tenant_id,t.page_id,t.variant,1,p.title,d.layout_mode,d.template,
 CASE t.variant WHEN 'Mobile' THEN 390 WHEN 'Tablet' THEN 1024 ELSE d.canvas_width END,
 CASE t.variant WHEN 'Mobile' THEN 844 WHEN 'Tablet' THEN 768 ELSE d.canvas_height END
FROM md_layout_backfill_targets t
JOIN md_lightning_page_details d ON d.tenant_id=t.tenant_id AND d.page_id=t.page_id
JOIN md_page_definitions p ON p.tenant_id=t.tenant_id AND p.id=t.page_id
ON CONFLICT DO NOTHING;

INSERT INTO md_page_layout_version_nodes
 (tenant_id,page_id,variant,version,component_key,component_type,label,region,visible,sort_order)
SELECT n.tenant_id,n.page_id,t.variant,1,n.component_key,n.component_type,n.label,n.region,n.visible,n.sort_order
FROM md_layout_backfill_targets t
JOIN md_lightning_page_nodes n ON n.tenant_id=t.tenant_id AND n.page_id=t.page_id
ON CONFLICT DO NOTHING;

INSERT INTO md_page_layout_version_properties
 (tenant_id,page_id,variant,version,component_key,property_path,value_kind,value_text)
SELECT n.tenant_id,n.page_id,t.variant,1,n.component_key,n.property_path,n.value_kind,n.value_text
FROM md_layout_backfill_targets t
JOIN md_lightning_page_node_properties n ON n.tenant_id=t.tenant_id AND n.page_id=t.page_id
ON CONFLICT DO NOTHING;

INSERT INTO md_page_layout_version_activation
 (tenant_id,page_id,variant,version,assignment_id,scope,app_api,profile_id,record_type_id,desktop,phone,tablet,custom,sort_order)
SELECT a.tenant_id,a.page_id,t.variant,1,a.assignment_id,a.scope,a.app_api,a.profile_id,
 a.record_type_id,a.desktop,a.phone,a.tablet,a.custom,a.sort_order
FROM md_layout_backfill_targets t
JOIN md_lightning_page_activation a ON a.tenant_id=t.tenant_id AND a.page_id=t.page_id
ON CONFLICT DO NOTHING;

INSERT INTO md_page_layout_heads
 (tenant_id,page_id,variant,draft_version,published_version)
SELECT t.tenant_id,t.page_id,t.variant,1,CASE WHEN d.status='Active' THEN 1 ELSE NULL END
FROM md_layout_backfill_targets t
JOIN md_lightning_page_details d ON d.tenant_id=t.tenant_id AND d.page_id=t.page_id
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS pg_temp.md_layout_backfill_targets;
