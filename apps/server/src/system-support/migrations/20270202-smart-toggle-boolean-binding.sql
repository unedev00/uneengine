-- Enable the existing Text Source Boolean field picker for the reusable Smart Toggle.
-- Published pages and tenant records are preserved. The shared Record API enforces RBAC.
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
 VALUES ('smart_toggle','textSource',true,NULL,NULL,NULL,NULL)
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;
