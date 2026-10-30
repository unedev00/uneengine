-- Smart Icon: the existing SQL ribbon remains the source of truth.
-- Only the nine approved properties are enabled; every other shared slot stays visible but disabled.
-- Icon selection is handled by the contextual Icons tab and saved as component.properties.iconId.
INSERT INTO md_builder_ribbon_components(component_api) VALUES ('smart_icon')
ON CONFLICT DO NOTHING;

INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope)
VALUES ('iconFillColor','Icon Fill Color','Design','Icon','color',
 (SELECT COALESCE(MAX(sort_order),0)+1 FROM md_builder_shared_properties),
 '"#000000"'::jsonb,'[]'::jsonb,'component')
ON CONFLICT(property_key) DO UPDATE SET
 label=EXCLUDED.label,tab=EXCLUDED.tab,section_group=EXCLUDED.section_group,
 control_kind=EXCLUDED.control_kind,default_value=EXCLUDED.default_value;

INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
SELECT 'smart_icon',p.property_key,true,NULL,NULL,NULL,NULL
FROM md_builder_shared_properties p
WHERE p.property_key IN
 ('backgroundColor','borderColor','shadow','radius','width','height','x','y','iconFillColor')
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;
