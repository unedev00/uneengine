-- Versioned Smart-only property corrections. Do not mutate applied migration history.
-- Preserve Home and app-owned components and all tenant page records.
DELETE FROM md_builder_ribbon_component_rules
WHERE (component_api='smart_toggle' AND property_key IN
  ('label','labelAlignment','textSize','labelColor','defaultValue'))
 OR (component_api='smart_lookup' AND property_key IN ('defaultValue','defaultValueColor'))
 OR property_key='placeholderSize';
DELETE FROM md_builder_shared_properties WHERE property_key='placeholderSize' AND tab<>'Home';
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope)
 VALUES ('defaultCheck','Default Check','Design','Behaviour','choice',
 (SELECT COALESCE(MAX(sort_order),0)+1 FROM md_builder_shared_properties),'false'::jsonb,
 '["false","true"]'::jsonb,'component')
 ON CONFLICT(property_key) DO NOTHING;
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
 VALUES ('smart_toggle','defaultCheck',true,'choice',NULL,'false'::jsonb,'["false","true"]'::jsonb)
 ON CONFLICT(component_api,property_key) DO UPDATE
 SET enabled=true, control_kind_override='choice';
-- Lookup Label is the editable placeholder text, not its selected value.
UPDATE md_builder_ribbon_component_rules SET value_key='placeholder'
 WHERE component_api='smart_lookup' AND property_key='label';
