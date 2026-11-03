-- Shared Smart component extensions only. Re-runnable, additive and tenant-safe.
-- Existing pages, Flows, field rules, metadata values and component permissions stay untouched.
WITH base AS (SELECT COALESCE(MAX(sort_order),0) AS last_order FROM md_builder_shared_properties),
spec(property_key,label,tab,section_group,control_kind,ordinal,default_json,choice_json,row_no,col_no,width_px) AS (
 VALUES
 ('cardDescription','Description','Data','Card Grid','expression',1,NULL::text,'[]',1,1,144),
 ('cardValue','Value / Price','Data','Card Grid','expression',2,NULL::text,'[]',1,2,144),
 ('cardButtonText','Button Text','Data','Card Grid','expression',3,NULL::text,'[]',2,1,144),
 ('cardButtonFill','Button Fill','Design','Button','color',4,NULL::text,'[]',1,1,40),
 ('cardButtonBorderColor','Button Border','Design','Button','color',5,NULL::text,'[]',1,2,40),
 ('cardButtonShape','Button Shape','Design','Button','choice',6,'"rounded"','["square","rounded","pill"]',2,1,108),
 ('cardButtonTextSize','Button Text Size','Design','Button','number',7,'14','[]',2,2,58),
 ('cardButtonTextColor','Button Font Color','Design','Button','color',8,NULL::text,'[]',3,1,40),
 ('tabOrientation','Orientation','Layout','Tabs','choice',9,'"horizontal"','["horizontal","vertical"]',2,2,116)
)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope,
  field_select,design_row,design_order,design_width,design_height,design_caption_width)
SELECT s.property_key,s.label,s.tab,s.section_group,s.control_kind,
 base.last_order+s.ordinal,s.default_json::jsonb,s.choice_json::jsonb,'component',
 s.control_kind='expression',s.row_no,s.col_no,s.width_px,26,0
FROM spec s CROSS JOIN base
ON CONFLICT(property_key) DO NOTHING;

-- SQL owns the global ribbon inventory and per-component applicability.
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
SELECT v.component_api,v.property_key,true,NULL,NULL,NULL,NULL
FROM (VALUES
 ('smart_card_grid','cardDescription'),
 ('smart_card_grid','cardValue'),
 ('smart_card_grid','cardButtonText'),
 ('smart_card_grid','cardButtonFill'),
 ('smart_card_grid','cardButtonBorderColor'),
 ('smart_card_grid','cardButtonShape'),
 ('smart_card_grid','cardButtonTextSize'),
 ('smart_card_grid','cardButtonTextColor'),
 ('smart_card_grid','imageBackgroundColor'),
 ('smart_tabs','tabOrientation')
) AS v(component_api,property_key)
JOIN md_builder_ribbon_components c ON c.component_api=v.component_api
JOIN md_builder_shared_properties p ON p.property_key=v.property_key
ON CONFLICT(component_api,property_key) DO NOTHING;
