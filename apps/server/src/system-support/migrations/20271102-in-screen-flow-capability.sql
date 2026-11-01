-- In-screen Flow is a distinct metadata type sharing the existing Screen Flow interview runtime.
INSERT INTO md_flow_capability_flow_types
(flow_type,description,sort_order,create_enabled,validate_enabled,debug_enabled)
VALUES('In-Screen Flow','Run a Screen Flow inside an in-screen window.',5,true,true,true)
ON CONFLICT(flow_type) DO NOTHING;
INSERT INTO md_flow_capability_element_flows(element_type,flow_type,builder_allowed)
SELECT element_type,'In-Screen Flow',builder_allowed FROM md_flow_capability_element_flows
WHERE flow_type='Screen Flow'
ON CONFLICT(element_type,flow_type) DO NOTHING;
