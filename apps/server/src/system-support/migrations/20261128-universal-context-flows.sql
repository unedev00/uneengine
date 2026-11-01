-- Metadata-only registration: reuse the shared Flow runtime and SQL user contexts.
INSERT INTO md_flow_capability_elements
(element_type,display_group,display_icon,sort_order,builder_enabled,before_save_allowed,
 config_schema_key,validator_key,runtime_handler_key,debug_behavior,registry_version)
VALUES('Get Context','Data','C',166,true,false,'flow:Get Context','Get Context','Get Context','simulate',1),
 ('Set Context','Data','C',167,true,false,'flow:Set Context','Set Context','Set Context','simulate',1),
 ('Clear Context','Data','C',168,true,false,'flow:Clear Context','Clear Context','Clear Context','simulate',1)
ON CONFLICT(element_type) DO NOTHING;
INSERT INTO md_flow_capability_element_flows(element_type,flow_type,builder_allowed)
SELECT e.element_type,f.flow_type,true FROM md_flow_capability_elements e
CROSS JOIN md_flow_capability_flow_types f
WHERE e.element_type IN('Get Context','Set Context','Clear Context')
 AND f.flow_type IN('Autolaunched Flow','Screen Flow','In-Screen Flow','Record-Triggered Flow')
ON CONFLICT(element_type,flow_type) DO NOTHING;
INSERT INTO md_flow_capability_properties(element_type,property_name,value_type,required,sort_order)
VALUES('Get Context','contextApiName','text',true,10),
 ('Get Context','outputVariable','resource',true,20),
 ('Set Context','contextApiName','text',true,10),
 ('Set Context','recordId','resource',true,20),
 ('Clear Context','contextApiName','text',true,10)
ON CONFLICT(element_type,property_name) DO NOTHING;
