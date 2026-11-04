-- Complete the actual Design 2 R3C2 alignment controls, reusing the
-- renderer's existing footer keys rather than creating inactive aliases.
-- This changes only shared metadata; it does not mutate tenant pages.
INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
VALUES
 ('smart_cart','Footer','alignment','summary2Alignment'),
 ('smart_table','Footer','alignment','summaryAlignment')
ON CONFLICT(component_api,area,slot_key) DO UPDATE SET
 property_key=EXCLUDED.property_key;

-- Smart Card Grid's button text needs its own alignment property (the
-- existing Body/Header alignment keys style different parts of the card).
WITH next_order AS (SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM md_builder_shared_properties)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,
  choices,scope,design_row,design_order,design_width,design_height,
  design_caption_width,design_display)
SELECT 'cardButtonAlignment','Button Alignment','Design2','Button','align',
 n,NULL::jsonb,'[]'::jsonb,'component',3,2,40,26,0,'dropdown'
FROM next_order
ON CONFLICT(property_key) DO NOTHING;

INSERT INTO md_builder_ribbon_component_rules(component_api,property_key,enabled)
SELECT c.component_api,p.property_key,true
FROM md_builder_ribbon_components c
JOIN md_builder_shared_properties p ON p.property_key='cardButtonAlignment'
WHERE c.component_api='smart_card_grid'
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;
