-- Design 2 inspector consolidation. Shared SQL catalog only; do NOT rewrite
-- tenant pages, instances, published layouts, actionFlows or business records.
-- Retain every existing property key and the original 17-cell icon geometry.

-- Presentation order (the dock adds blank-line gaps between logical groups).
WITH wanted(area,sort_order) AS (VALUES
 ('Body',1),('Badge',2),('Image',3),
 ('Header',4),('Header Supporting',5),
 ('Table',6),('Row',7),('Row Supporting',8),
 ('Summary',9),('Summary 2',10),('Footer',11),
 ('Button',12),('Button 2',13),('Button 3',14),
 ('Button 4',15),('Button 5',16)
)
UPDATE md_builder_design2_slots s SET area_order=w.sort_order
FROM wanted w WHERE s.area=w.area AND s.area_order<>w.sort_order;

-- Tabs has one Body, but three DIFFERENT colours: overall container fill,
-- inactive tab fill and selected tab fill. Never alias these saved properties.
INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
SELECT 'smart_tabs','Body',v.slot_key,v.property_key
FROM (VALUES
 ('fill','backgroundColor'),('shapeFill','tabColor'),('focused','selectedTabColor'),
 ('width','tabWidth'),('height','tabHeight'),('orientation','tabOrientation')
) v(slot_key,property_key)
JOIN md_builder_shared_properties p ON p.property_key=v.property_key
ON CONFLICT(component_api,area,slot_key) DO UPDATE SET property_key=EXCLUDED.property_key;

-- No new component buttons: retain existing keys and action/Flow references.
-- Cart Button/2/3/4/5 -> Custom 1 / Custom 2 / Bin / Plus / Minus.
-- Card Grid Button/2/3 -> Custom 1 / Custom 2 / Native card action.
DELETE FROM md_builder_design2_slot_rules
WHERE component_api IN ('smart_cart','smart_card_grid')
 AND area IN ('Button','Button 2','Button 3','Button 4','Button 5');

WITH buttons(component_api,area,prefix) AS (VALUES
 ('smart_cart','Button','customButton1'),
 ('smart_cart','Button 2','customButton2'),
 ('smart_cart','Button 3','removeButton'),
 ('smart_cart','Button 4','qtyIncrease'),
 ('smart_cart','Button 5','qtyDecrease'),
 ('smart_card_grid','Button','customButton1'),
 ('smart_card_grid','Button 2','customButton2'),
 ('smart_card_grid','Button 3','cardButton')
), suffixes(slot_key,suffix) AS (VALUES
 ('fill','Fill'),('border','BorderColor'),('shape','Shape'),
 ('radius','Radius'),('width','Width'),('height','Height'),
 ('text','TextColor'),('alignment','Alignment'),('size','TextSize'),
 ('bold','Bold'),('wrap','WrapText')
)
INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
SELECT b.component_api,b.area,s.slot_key,b.prefix||s.suffix
FROM buttons b CROSS JOIN suffixes s
JOIN md_builder_shared_properties p ON p.property_key=b.prefix||s.suffix
JOIN md_builder_design2_slots slot ON slot.area=b.area AND slot.slot_key=s.slot_key
ON CONFLICT(component_api,area,slot_key) DO UPDATE SET property_key=EXCLUDED.property_key;

-- Extra controls formerly under Card Grid / Focused, plus tab default index
-- and calendar display settings, are embedded in Body below its unchanged
-- 17 shared icons. Only registered property definitions can appear.
-- Order_no >=20 avoids the fixed R1-R3 unique(row_no,order_no) cells.
WITH extras(component_api,slot_key,property_key,pos) AS (VALUES
 ('smart_card_grid','extra_cardGap','gap',20),
 ('smart_card_grid','extra_cardPadding','cardPadding',21),
 ('smart_card_grid','extra_selectionMode','selectionMode',22),
 ('smart_card_grid','extra_focusedCardWidth','focusedCardWidth',23),
 ('smart_card_grid','extra_focusedCardHeight','focusedCardHeight',24),
 ('smart_card_grid','extra_focusedCardBorderColor','focusedCardBorderColor',25),
 ('smart_card_grid','extra_focusedCardShadow','focusedCardShadow',26),
 ('smart_card_grid','extra_focusedTextColor','focusedTextColor',27),
 ('smart_card_grid','extra_focusedTextBold','focusedTextBold',28),
 ('smart_card_grid','extra_focusedTextSize','focusedTextSize',29),
 ('smart_tabs','extra_tabIndex','tabIndex',30),
 ('smart_calendar','extra_showDays','showDays',31),
 ('smart_calendar','extra_firstDay','firstDay',32)
)
INSERT INTO md_builder_design2_slots
 (area,area_order,slot_key,row_no,order_no,width_px,height_px,property_key,fallback_key)
SELECT 'Body',1,e.slot_key,1,e.pos,
 CASE WHEN p.control_kind='choice' THEN 94
      WHEN p.control_kind='number' THEN 58
      WHEN p.control_kind='boolean' THEN 28 ELSE 40 END,
 26,p.property_key,p.property_key
FROM extras e JOIN md_builder_shared_properties p ON p.property_key=e.property_key
ON CONFLICT(area,slot_key) DO NOTHING;

WITH extras(component_api,slot_key,property_key) AS (VALUES
 ('smart_card_grid','extra_cardGap','gap'),
 ('smart_card_grid','extra_cardPadding','cardPadding'),
 ('smart_card_grid','extra_selectionMode','selectionMode'),
 ('smart_card_grid','extra_focusedCardWidth','focusedCardWidth'),
 ('smart_card_grid','extra_focusedCardHeight','focusedCardHeight'),
 ('smart_card_grid','extra_focusedCardBorderColor','focusedCardBorderColor'),
 ('smart_card_grid','extra_focusedCardShadow','focusedCardShadow'),
 ('smart_card_grid','extra_focusedTextColor','focusedTextColor'),
 ('smart_card_grid','extra_focusedTextBold','focusedTextBold'),
 ('smart_card_grid','extra_focusedTextSize','focusedTextSize'),
 ('smart_tabs','extra_tabIndex','tabIndex'),
 ('smart_calendar','extra_showDays','showDays'),
 ('smart_calendar','extra_firstDay','firstDay')
)
INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
SELECT e.component_api,'Body',e.slot_key,e.property_key
FROM extras e
JOIN md_builder_design2_slots s ON s.area='Body' AND s.slot_key=e.slot_key
JOIN md_builder_ribbon_components c ON c.component_api=e.component_api
ON CONFLICT(component_api,area,slot_key) DO UPDATE SET property_key=EXCLUDED.property_key;

-- These renderer-owned properties are already implemented. Restore their
-- applicability if older shared catalogs lack the enablement record.
INSERT INTO md_builder_ribbon_component_rules(component_api,property_key,enabled)
SELECT v.component_api,p.property_key,true
FROM (VALUES ('smart_tabs','tabIndex'),('smart_calendar','showDays'),
 ('smart_calendar','firstDay'),('smart_tabs','tabColor'),
 ('smart_tabs','selectedTabColor')) v(component_api,property_key)
JOIN md_builder_shared_properties p ON p.property_key=v.property_key
JOIN md_builder_ribbon_components c ON c.component_api=v.component_api
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;

-- Remove only obsolete SHARED presentation slots, never saved values.
DELETE FROM md_builder_design2_slot_rules
WHERE area IN ('Tabs','Card Grid','Focused','Custom Button 1','Custom Button 2','Calendar');
DELETE FROM md_builder_design2_slots
WHERE area IN ('Tabs','Card Grid','Focused','Custom Button 1','Custom Button 2','Calendar');

-- One property -> one primary editing area for each component. Old duplicate
-- aliases in Body/Header/Row/Footer become disabled icons, preserving exact
-- position and the canonical existing value. No schema or page data changes.
WITH duplicates AS (
 SELECT r.component_api,r.area,r.slot_key,
  ROW_NUMBER() OVER(PARTITION BY r.component_api,r.property_key
    ORDER BY s.area_order,s.row_no,s.order_no,r.slot_key) AS occurrence
 FROM md_builder_design2_slot_rules r
 JOIN md_builder_design2_slots s ON s.area=r.area AND s.slot_key=r.slot_key
)
DELETE FROM md_builder_design2_slot_rules r USING duplicates d
WHERE r.component_api=d.component_api AND r.area=d.area
 AND r.slot_key=d.slot_key AND d.occurrence>1;
