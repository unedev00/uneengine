-- One SQL-owned Layout Shape property, disabled unless a component opts in.
-- The same existing Shape/Icons gallery is reused. Only Button offers icons.
-- Historical smart_icon registrations and saved page instances remain readable.
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope,
  design_row,design_order,design_width,design_height,design_caption,design_caption_width)
VALUES
 ('shapeId','Shape','Layout','Shape','choice',
  (SELECT COALESCE(MAX(sort_order),0)+1 FROM md_builder_shared_properties),
  '"shape:rectangle"'::jsonb,'["shapes"]'::jsonb,'component',
  1,1,102,26,'Shape',0)
ON CONFLICT(property_key) DO NOTHING;

INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
SELECT c.component_api,'shapeId',true,NULL,NULL,NULL,
 CASE WHEN c.component_api='smart_button' THEN '["shapes","icons"]'::jsonb
 ELSE '["shapes"]'::jsonb END
FROM (VALUES ('smart_button'),('smart_container'),('smart_text'),('smart_toggle'),('smart_lookup'))
  AS c(component_api)
JOIN md_builder_ribbon_components r ON r.component_api=c.component_api
ON CONFLICT(component_api,property_key)
DO UPDATE SET enabled=true, choices_override=EXCLUDED.choices_override;

-- The existing icon glyph colour is now also available on Button.
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
SELECT 'smart_button','iconFillColor',true,NULL,NULL,NULL,NULL
WHERE EXISTS (SELECT 1 FROM md_builder_ribbon_components WHERE component_api='smart_button')
  AND EXISTS (SELECT 1 FROM md_builder_shared_properties WHERE property_key='iconFillColor')
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;
