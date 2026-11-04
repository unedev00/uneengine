-- Correct the remaining six approved Smart Cart Button 5 cells and bind
-- Button / Button 2 / Button 3 / Button 4 / Button 5 to the EXACT
-- elements named in the 2026-11-04 specification:
-- Bin, selected-row +, selected-row -, Custom Button 1, Custom Button 2.
-- Never reuse a different button's styling just to make a slot enabled.
-- Unimplemented property definitions remain visible but disabled.
UPDATE md_builder_design2_slots
SET area_order=14 WHERE area='Image' AND area_order=13;

INSERT INTO md_builder_design2_slots
 (area,area_order,slot_key,row_no,order_no,width_px,height_px,property_key,fallback_key)
VALUES
 ('Button 5',13,'fill',1,1,40,26,'backgroundColor','backgroundColor'),
 ('Button 5',13,'border',1,2,40,26,'borderColor','borderColor'),
 ('Button 5',13,'shape',1,3,40,26,'shapeId','shapeId'),
 ('Button 5',13,'radius',1,5,80,26,'radius','radius'),
 ('Button 5',13,'height',2,3,80,26,'height','height'),
 ('Button 5',13,'width',2,4,80,26,'width','width')
ON CONFLICT(area,slot_key) DO UPDATE SET
 area_order=EXCLUDED.area_order,row_no=EXCLUDED.row_no,order_no=EXCLUDED.order_no,
 width_px=EXCLUDED.width_px,height_px=EXCLUDED.height_px;

WITH corrected(area,slot_key,property_key) AS (
 VALUES
 ('Button','fill','removeButtonFill'),
 ('Button','border','removeButtonBorderColor'),
 ('Button','radius','removeButtonRadius'),
 ('Button','height','removeButtonHeight'),
 ('Button','width','removeButtonWidth'),
 ('Button','shape','removeButtonShape'),
 ('Button','text','removeButtonTextColor'),
 ('Button','alignment','removeButtonAlignment'),
 ('Button','size','removeButtonTextSize'),
 ('Button','bold','removeButtonBold'),
 ('Button','wrap','removeButtonWrapText'),
 ('Button 2','fill','qtyIncreaseFill'),
 ('Button 2','border','qtyIncreaseBorderColor'),
 ('Button 2','radius','qtyIncreaseRadius'),
 ('Button 2','height','qtyIncreaseHeight'),
 ('Button 2','width','qtyIncreaseWidth'),
 ('Button 2','shape','qtyIncreaseShape'),
 ('Button 3','fill','qtyDecreaseFill'),
 ('Button 3','border','qtyDecreaseBorderColor'),
 ('Button 3','radius','qtyDecreaseRadius'),
 ('Button 3','height','qtyDecreaseHeight'),
 ('Button 3','width','qtyDecreaseWidth'),
 ('Button 3','shape','qtyDecreaseShape'),
 ('Button 4','fill','customButton1Fill'),
 ('Button 4','border','customButton1BorderColor'),
 ('Button 4','radius','customButton1Radius'),
 ('Button 4','height','customButton1Height'),
 ('Button 4','width','customButton1Width'),
 ('Button 4','shape','customButton1Shape'),
 ('Button 5','fill','customButton2Fill'),
 ('Button 5','border','customButton2BorderColor'),
 ('Button 5','radius','customButton2Radius'),
 ('Button 5','height','customButton2Height'),
 ('Button 5','width','customButton2Width'),
 ('Button 5','shape','customButton2Shape')
)
INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
SELECT 'smart_cart',area,slot_key,property_key FROM corrected
ON CONFLICT(component_api,area,slot_key) DO UPDATE SET
 property_key=EXCLUDED.property_key;

-- These are the supported CUSTOM buttons already implemented by the renderer.
-- Do not falsely enable Bin/+/- styling until their renderers use those keys.
INSERT INTO md_builder_ribbon_component_rules(component_api,property_key,enabled)
SELECT DISTINCT 'smart_cart',r.property_key,true
FROM md_builder_design2_slot_rules r
JOIN md_builder_shared_properties p ON p.property_key=r.property_key
WHERE r.component_api='smart_cart' AND r.area IN ('Button 4','Button 5')
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;
