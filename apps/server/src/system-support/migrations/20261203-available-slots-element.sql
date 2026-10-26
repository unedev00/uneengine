-- Reusable no-code slot discovery: constrained to app-installed, authorised Flow execution.
-- This only extends the shared element registry. No existing Flow versions are modified.
INSERT INTO md_flow_capability_elements
 (element_type,display_group,display_icon,sort_order,builder_enabled,before_save_allowed,
  config_schema_key,validator_key,runtime_handler_key,debug_behavior)
VALUES ('Get Available Slots','Data','◷',125,true,false,
 'flow:Get Available Slots','Get Available Slots','Get Available Slots','unsupported')
ON CONFLICT(element_type) DO NOTHING;

INSERT INTO md_flow_capability_element_flows(element_type,flow_type,builder_allowed)
SELECT 'Get Available Slots',flow_type,true FROM md_flow_capability_flow_types
WHERE flow_type IN ('Autolaunched Flow','Record-Triggered Flow','Screen Flow')
ON CONFLICT(element_type,flow_type) DO NOTHING;

INSERT INTO md_flow_capability_properties(element_type,property_name,value_type,required,sort_order)
VALUES
 ('Get Available Slots','mode','text',true,10),
 ('Get Available Slots','date','resource',true,20),
 ('Get Available Slots','staffId','resource',true,30),
 ('Get Available Slots','durationMinutes','number',true,40),
 ('Get Available Slots','appointmentObject','text',true,50),
 ('Get Available Slots','scheduleObject','text',true,60),
 ('Get Available Slots','availabilityGuard','object',true,70),
 ('Get Available Slots','overlapGuard','object',true,80),
 ('Get Available Slots','outputVariable','resource',false,90),
 ('Get Available Slots','allowedVariable','resource',false,100),
 ('Get Available Slots','availableVariable','resource',false,110),
 ('Get Available Slots','selectedTime','resource',false,120),
 ('Get Available Slots','allowedSlots','resource',false,130),
 ('Get Available Slots','startVariable','resource',false,140),
 ('Get Available Slots','endVariable','resource',false,150),
 ('Get Available Slots','validVariable','resource',false,160)
ON CONFLICT(element_type,property_name) DO NOTHING;
