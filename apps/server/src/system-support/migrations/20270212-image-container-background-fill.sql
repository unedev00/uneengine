-- Add independent image/container background fill without changing existing body colours.
-- The shared fill palette offers No fill (transparent), theme colours and custom HEX.
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope,
  design_row,design_order,design_width,design_height,design_caption_width)
VALUES
 ('imageBackgroundColor','Background','Layout','Image','color',
  (SELECT COALESCE(MAX(sort_order),0)+1 FROM md_builder_shared_properties),
  NULL::jsonb,'[]'::jsonb,'component',3,2,40,26,0)
ON CONFLICT(property_key) DO UPDATE SET
 label='Background',tab='Layout',section_group='Image',control_kind='color',
 design_row=3,design_order=2,design_width=40,design_height=26,design_caption_width=0;
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
SELECT c.component_api,'imageBackgroundColor',true,NULL,NULL,NULL,NULL
FROM (VALUES ('smart_image'),('smart_container')) AS c(component_api)
JOIN md_builder_ribbon_components rc ON rc.component_api=c.component_api
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;
