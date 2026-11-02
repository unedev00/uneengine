-- Universal selected-value property for custom leading tabs.
-- Existing custom tabs continue using "*" unless an explicit ID or expression is supplied.
WITH spec AS (
 SELECT COALESCE(MAX(sort_order),0)+1 AS sort FROM md_builder_shared_properties
)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope,
  design_row,design_order,design_width,design_height,design_caption,design_caption_width)
SELECT 'firstTabValue','First Tab ID','Design','Tabs','text',spec.sort,'"*"'::jsonb,
 '[]'::jsonb,'component',3,2,160,26,'ID',42 FROM spec
ON CONFLICT(property_key) DO NOTHING;

INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
SELECT 'smart_tabs','firstTabValue',true,NULL,NULL,NULL,NULL
ON CONFLICT(component_api,property_key) DO NOTHING;
