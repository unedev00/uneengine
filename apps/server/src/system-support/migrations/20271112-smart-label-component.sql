-- Smart Label: a read-only Smart Input Box. It reuses the ONE shared property
-- inventory, the Smart Input Box renderer path and its data binding
-- (label/textSource/object sources). Only the Text Mode switch is omitted,
-- because a Smart Label is always display-only. Shared catalog only: no
-- tenant page, component instance or business record is modified.
INSERT INTO md_builder_ribbon_components(component_api)
VALUES ('smart_label') ON CONFLICT(component_api) DO NOTHING;

-- Same enabled ribbon properties and overrides as smart_text (e.g. Bold
-- defaults to false), except displayMode.
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,
  default_value_override,choices_override)
SELECT 'smart_label',r.property_key,r.enabled,r.control_kind_override,r.value_key,
 r.default_value_override,r.choices_override
FROM md_builder_ribbon_component_rules r
WHERE r.component_api='smart_text' AND r.property_key<>'displayMode'
ON CONFLICT(component_api,property_key) DO NOTHING;

-- Same Design 2 slot support (fixed positions are shared by every component).
INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
SELECT 'smart_label',s.area,s.slot_key,s.property_key
FROM md_builder_design2_slot_rules s
WHERE s.component_api='smart_text' AND s.property_key<>'displayMode'
ON CONFLICT(component_api,area,slot_key) DO NOTHING;

-- Fresh tenants use the shared Smart component seeder. Existing tenants gain
-- the same registration without overwriting custom component metadata.
INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled)
SELECT id,'smart_label','one-bundled:smart_label',true FROM md_tenants
ON CONFLICT(tenant_id,api_name) DO NOTHING;
