-- Shared Smart Card Grid appearance: one SQL-backed property catalog, no app logic.
-- Existing saved components, tenant overrides and Card Grid layouts are preserved.
ALTER TABLE md_builder_shared_properties
 ADD COLUMN IF NOT EXISTS enabled_when jsonb;

WITH base AS (
 SELECT COALESCE(MAX(sort_order),0) AS last_order FROM md_builder_shared_properties
), specs(property_key,label,kind,ordinal,min_value,max_value,enabled_when,design_row,design_order,design_width) AS (
 VALUES
 ('selectedCardColor','Selected Card Color','color',1,NULL::integer,NULL::integer,
   NULL::jsonb,2,1,40),
 ('imageWidth','Image Width','number',2,0,1200,
   '{"property":"imagePlacement","in":["left","right"]}'::jsonb,2,2,58)
)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,
  choices,scope,min_value,max_value,enabled_when,
  design_row,design_order,design_width,design_height,design_caption_width)
SELECT s.property_key,s.label,'Design','Card Grid',s.kind,
 b.last_order+s.ordinal,NULL,'[]'::jsonb,'component',s.min_value,s.max_value,
 s.enabled_when,s.design_row,s.design_order,s.design_width,26,0
FROM specs s CROSS JOIN base b
ON CONFLICT(property_key) DO NOTHING;

INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled)
SELECT 'smart_card_grid',p.property_key,true
FROM md_builder_shared_properties p
JOIN md_builder_ribbon_components c ON c.component_api='smart_card_grid'
WHERE p.property_key IN ('selectedCardColor','imageWidth')
ON CONFLICT(component_api,property_key) DO NOTHING;
