-- Shared Smart ribbon extensions for kiosk pages. Catalog only: no tenant page,
-- component instance or business record is modified. Fixed Design 2 positions
-- are reused; only the Button 2-5 dropdowns gain the R3C1 Text cell that the
-- Button dropdown already has.

-- 1. Missing shared definitions: Smart Cart quantity -/+ buttons and the
--    custom-button radius cells already placed in Design 2 Button 4/5.
WITH specs(property_key,label,section_group,control_kind,choices,min_value,max_value,ordinal) AS (
 VALUES
 ('qtyIncreaseFill','Fill','Qty Increase','color','[]'::jsonb,NULL::integer,NULL::integer,1),
 ('qtyIncreaseBorderColor','Border','Qty Increase','color','[]'::jsonb,NULL,NULL,2),
 ('qtyIncreaseShape','Shape','Qty Increase','choice','["shape:rectangle","shape:round-rectangle","shape:oval"]'::jsonb,NULL,NULL,3),
 ('qtyIncreaseRadius','Radius','Qty Increase','number','[]'::jsonb,0,600,4),
 ('qtyIncreaseWidth','Width','Qty Increase','number','[]'::jsonb,0,1200,5),
 ('qtyIncreaseHeight','Height','Qty Increase','number','[]'::jsonb,24,1200,6),
 ('qtyIncreaseTextColor','Text Color','Qty Increase','color','[]'::jsonb,NULL,NULL,7),
 ('qtyDecreaseFill','Fill','Qty Decrease','color','[]'::jsonb,NULL,NULL,8),
 ('qtyDecreaseBorderColor','Border','Qty Decrease','color','[]'::jsonb,NULL,NULL,9),
 ('qtyDecreaseShape','Shape','Qty Decrease','choice','["shape:rectangle","shape:round-rectangle","shape:oval"]'::jsonb,NULL,NULL,10),
 ('qtyDecreaseRadius','Radius','Qty Decrease','number','[]'::jsonb,0,600,11),
 ('qtyDecreaseWidth','Width','Qty Decrease','number','[]'::jsonb,0,1200,12),
 ('qtyDecreaseHeight','Height','Qty Decrease','number','[]'::jsonb,24,1200,13),
 ('qtyDecreaseTextColor','Text Color','Qty Decrease','color','[]'::jsonb,NULL,NULL,14),
 ('customButton1Radius','Radius','Custom Button 1','number','[]'::jsonb,0,600,15),
 ('customButton2Radius','Radius','Custom Button 2','number','[]'::jsonb,0,600,16)
), missing AS (
 SELECT s.*,ROW_NUMBER() OVER(ORDER BY s.ordinal) AS pos FROM specs s
 WHERE NOT EXISTS(SELECT 1 FROM md_builder_shared_properties p WHERE p.property_key=s.property_key)
), last_order AS (
 SELECT COALESCE(MAX(sort_order),0) AS n FROM md_builder_shared_properties
)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,
  choices,scope,min_value,max_value,field_select,design_row,design_order,
  design_width,design_height,design_caption_width,design_display)
SELECT m.property_key,m.label,'Design2',m.section_group,m.control_kind,
 l.n+m.pos,NULL::jsonb,m.choices,'component',m.min_value,m.max_value,false,2,1,
 CASE WHEN m.control_kind='choice' THEN 116 WHEN m.control_kind='number' THEN 58 ELSE 40 END,
 26,0,'buttons'
FROM missing m CROSS JOIN last_order l
ON CONFLICT(property_key) DO NOTHING;

-- 2. Applicability. Card Grid description = Header Supporting text; price
--    (card value) = Footer text. Button gains Bold. Cart gains its qty buttons.
INSERT INTO md_builder_ribbon_component_rules(component_api,property_key,enabled)
SELECT rules.component_api,rules.property_key,true FROM (VALUES
 ('smart_card_grid','supportingTextColor'),('smart_card_grid','supportingBold'),
 ('smart_card_grid','supportingAlignment'),('smart_card_grid','supportingTextSize'),
 ('smart_card_grid','footerTextColor'),('smart_card_grid','footerBold'),
 ('smart_card_grid','footerTextSize'),
 ('smart_button','headerBold'),
 ('smart_cart','qtyIncreaseFill'),('smart_cart','qtyIncreaseBorderColor'),
 ('smart_cart','qtyIncreaseShape'),('smart_cart','qtyIncreaseRadius'),
 ('smart_cart','qtyIncreaseWidth'),('smart_cart','qtyIncreaseHeight'),
 ('smart_cart','qtyIncreaseTextColor'),
 ('smart_cart','qtyDecreaseFill'),('smart_cart','qtyDecreaseBorderColor'),
 ('smart_cart','qtyDecreaseShape'),('smart_cart','qtyDecreaseRadius'),
 ('smart_cart','qtyDecreaseWidth'),('smart_cart','qtyDecreaseHeight'),
 ('smart_cart','qtyDecreaseTextColor'),
 ('smart_cart','customButton1Radius'),('smart_cart','customButton2Radius'),
 ('smart_card_grid','customButton1Radius'),('smart_card_grid','customButton2Radius')
) AS rules(component_api,property_key)
JOIN md_builder_ribbon_components c ON c.component_api=rules.component_api
JOIN md_builder_shared_properties p ON p.property_key=rules.property_key
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;

-- Defaults shown in the ribbon match what renders when nothing is saved:
-- Button text is normal weight; a Card Grid price is bold.
UPDATE md_builder_ribbon_component_rules SET default_value_override='false'::jsonb
WHERE component_api='smart_button' AND property_key='headerBold' AND default_value_override IS NULL;
UPDATE md_builder_ribbon_component_rules SET default_value_override='true'::jsonb
WHERE component_api='smart_card_grid' AND property_key='footerBold' AND default_value_override IS NULL;

-- 3. Button 2-5 dropdowns get the same R3C1 Text cell as Button.
INSERT INTO md_builder_design2_slots
 (area,area_order,slot_key,row_no,order_no,width_px,height_px,property_key,fallback_key)
SELECT s.area,s.area_order,'text',3,1,40,26,'labelColor','labelColor'
FROM (SELECT DISTINCT area,area_order FROM md_builder_design2_slots
      WHERE area IN ('Button 2','Button 3','Button 4','Button 5')) s
ON CONFLICT(area,slot_key) DO NOTHING;

-- 4. Design 2 cells (fixed positions, per-component property).
INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
SELECT approved.component_api,approved.area,approved.slot_key,approved.property_key
FROM (VALUES
 ('smart_card_grid','Header Supporting','text','supportingTextColor'),
 ('smart_card_grid','Header Supporting','alignment','supportingAlignment'),
 ('smart_card_grid','Header Supporting','bold','supportingBold'),
 ('smart_card_grid','Header Supporting','size','supportingTextSize'),
 ('smart_card_grid','Footer','text','footerTextColor'),
 ('smart_card_grid','Footer','bold','footerBold'),
 ('smart_card_grid','Footer','size','footerTextSize'),
 ('smart_button','Body','bold','headerBold'),
 ('smart_cart','Button 2','text','qtyIncreaseTextColor'),
 ('smart_cart','Button 3','text','qtyDecreaseTextColor'),
 ('smart_cart','Button 4','text','customButton1TextColor'),
 ('smart_cart','Button 5','text','customButton2TextColor')
) AS approved(component_api,area,slot_key,property_key)
JOIN md_builder_ribbon_components component ON component.component_api=approved.component_api
JOIN md_builder_shared_properties property ON property.property_key=approved.property_key
JOIN md_builder_design2_slots slot ON slot.area=approved.area AND slot.slot_key=approved.slot_key
ON CONFLICT(component_api,area,slot_key) DO NOTHING;
