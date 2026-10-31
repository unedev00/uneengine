-- Shared, optional active-record scoping for any Object-bound component.
-- Smart Cart defaults to active scoping in the shared runtime, without a
-- customer-authored filter; other components opt in using the Data ribbon.
-- No existing page data, metadata versions or tenant customisations are changed.
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope)
SELECT 'autoRecordScope','Automatically use active record','Data','Records','boolean',
 COALESCE((SELECT MAX(sort_order) FROM md_builder_shared_properties),0)+1,
 'false'::jsonb,'[]'::jsonb,'component'
WHERE NOT EXISTS (
 SELECT 1 FROM md_builder_shared_properties WHERE property_key='autoRecordScope'
);

-- Reuse existing component Object source applicability as the authoritative list.
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
SELECT component_api,'autoRecordScope',true,NULL,NULL,
 CASE WHEN component_api='smart_cart' THEN 'true'::jsonb ELSE NULL END,NULL
FROM md_builder_ribbon_component_rules
WHERE property_key='objectApiName' AND enabled=true
ON CONFLICT(component_api,property_key) DO NOTHING;
