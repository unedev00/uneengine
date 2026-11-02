-- Optional first tab for Smart Tabs, using the global SQL-owned property inventory.
-- Does not create an Object record or alter existing category tabs, tenant values, or other apps.
WITH specs(property_key,label,control_kind,default_value,design_row,design_order,design_width,design_caption_width) AS (
 VALUES
 ('firstTabCustom','Custom First Tab','boolean','false'::jsonb,1,2,28,98),
 ('firstTabCaption','First Tab Caption','expression',NULL::jsonb,2,2,180,105)
), missing AS (
 SELECT specs.*,row_number() OVER (ORDER BY design_row) AS pos
 FROM specs WHERE NOT EXISTS (
   SELECT 1 FROM md_builder_shared_properties p WHERE p.property_key=specs.property_key)
), last_order AS (
 SELECT COALESCE(MAX(sort_order),0) AS last_sort FROM md_builder_shared_properties
)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope,
  design_row,design_order,design_width,design_height,design_caption,design_caption_width)
SELECT property_key,label,'Design','Tabs',control_kind,last_sort+pos,default_value,'[]'::jsonb,'component',
 design_row,design_order,design_width,26,label,design_caption_width
FROM missing CROSS JOIN last_order
ON CONFLICT(property_key) DO NOTHING;

INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
SELECT 'smart_tabs',p.property_key,true,NULL,NULL,NULL,NULL
FROM md_builder_shared_properties p
WHERE p.property_key IN ('firstTabCustom','firstTabCaption')
ON CONFLICT(component_api,property_key) DO NOTHING;
