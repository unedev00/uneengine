-- Universal Data ribbon Context selector for every registered data-bound component.
-- Definitions remain a single shared SQL property; only Object-binding components are eligible.
WITH position AS (SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM md_builder_shared_properties)
INSERT INTO md_builder_shared_properties
(property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope)
SELECT 'contextApiName','Context','Data','Source','choice',position.next,NULL,'[]'::jsonb,'component'
FROM position
ON CONFLICT(property_key) DO NOTHING;
INSERT INTO md_builder_ribbon_component_rules
(component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
SELECT r.component_api,'contextApiName',true,NULL,NULL,NULL,NULL
FROM md_builder_ribbon_component_rules r
JOIN md_builder_ribbon_components c ON c.component_api=r.component_api
WHERE r.property_key='objectApiName' AND r.enabled=true
ON CONFLICT(component_api,property_key) DO NOTHING;
