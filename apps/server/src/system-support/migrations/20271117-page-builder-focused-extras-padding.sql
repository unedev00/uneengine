-- Reorganise EXISTING Page Builder Design 2 properties without changing tenant
-- page JSON, published layouts, property values, runtime keys or selection logic.
-- The existing 17 icons remain in their fixed R1-R3 positions. Unsupported
-- property cells are deliberately disabled rather than conditionally removed.

-- Focused sits immediately after Row; Extras follows it.
WITH wanted(area,sort_order) AS (VALUES
 ('Body',1),('Badge',2),('Image',3),('Header',4),('Header Supporting',5),
 ('Table',6),('Row',7),('Focused',8),('Extras',9),('Row Supporting',10),
 ('Summary',11),('Summary 2',12),('Footer',13),
 ('Button',14),('Button 2',15),('Button 3',16),('Button 4',17),('Button 5',18)
)
UPDATE md_builder_design2_slots s SET area_order=w.sort_order
FROM wanted w WHERE s.area=w.area AND s.area_order<>w.sort_order;

-- The new Focused section reuses the SAME icon geometry as Body. No new
-- styling keys are defined and no component gains runtime focused styling.
INSERT INTO md_builder_design2_slots
 (area,area_order,slot_key,row_no,order_no,width_px,height_px,property_key,fallback_key)
SELECT 'Focused',8,s.slot_key,s.row_no,s.order_no,s.width_px,s.height_px,
       s.property_key,s.fallback_key
FROM md_builder_design2_slots s
WHERE s.area='Body' AND s.row_no BETWEEN 1 AND 3
 AND s.slot_key NOT LIKE 'extra_%'
ON CONFLICT(area,slot_key) DO UPDATE SET
 area_order=EXCLUDED.area_order,row_no=EXCLUDED.row_no,order_no=EXCLUDED.order_no,
 width_px=EXCLUDED.width_px,height_px=EXCLUDED.height_px,
 property_key=EXCLUDED.property_key,fallback_key=EXCLUDED.fallback_key;

-- Move every EXISTING focused-colour binding out of legacy Body/Table/Row.
-- This includes selected card, selected row and selected tab colours when
-- already supported. Do not invent fill/shape/radius/padding overrides.
WITH focused_existing AS (
 SELECT DISTINCT ON(r.component_api) r.component_api,r.property_key
 FROM md_builder_design2_slot_rules r
 WHERE r.slot_key='focused' AND r.area<>'Focused'
 ORDER BY r.component_api,CASE WHEN r.area='Body' THEN 0 ELSE 1 END,r.area
)
INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
SELECT component_api,'Focused','fill',property_key FROM focused_existing
ON CONFLICT(component_api,area,slot_key)
 DO UPDATE SET property_key=EXCLUDED.property_key;

DELETE FROM md_builder_design2_slot_rules
WHERE slot_key='focused' AND area<>'Focused'
 AND EXISTS (
  SELECT 1 FROM md_builder_design2_slot_rules moved
  WHERE moved.component_api=md_builder_design2_slot_rules.component_api
    AND moved.area='Focused' AND moved.slot_key='fill'
    AND moved.property_key=md_builder_design2_slot_rules.property_key
 );

-- Reassign only the SEVEN already implemented Card Grid focused style keys.
-- Their existing values are still read unchanged by SmartRuntime.
WITH existing(slot_key,property_key) AS (VALUES
 ('width','focusedCardWidth'),('height','focusedCardHeight'),
 ('border','focusedCardBorderColor'),('shadow','focusedCardShadow'),
 ('text','focusedTextColor'),('bold','focusedTextBold'),
 ('size','focusedTextSize')
)
INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
SELECT 'smart_card_grid','Focused',e.slot_key,e.property_key
FROM existing e
JOIN md_builder_shared_properties p ON p.property_key=e.property_key
JOIN md_builder_ribbon_component_rules c ON c.component_api='smart_card_grid'
 AND c.property_key=e.property_key AND c.enabled=true
ON CONFLICT(component_api,area,slot_key)
 DO UPDATE SET property_key=EXCLUDED.property_key;

-- Card Gap and Selection Mode move into their own compact Extras section.
-- The two existing SQL slots/rules change AREA only; the property keys,
-- choice list and renderer behaviour do not change.
INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
SELECT component_api,'Extras',slot_key,property_key
FROM md_builder_design2_slot_rules
WHERE area='Body' AND component_api='smart_card_grid'
 AND slot_key IN ('extra_cardGap','extra_selectionMode')
ON CONFLICT(component_api,area,slot_key)
 DO UPDATE SET property_key=EXCLUDED.property_key;
DELETE FROM md_builder_design2_slot_rules
WHERE area='Body' AND component_api='smart_card_grid'
 AND slot_key IN ('extra_cardGap','extra_selectionMode');

-- A previously migrated Extras slot may already exist when the older
-- consolidation script is replayed. UPSERT instead of updating a primary key.
INSERT INTO md_builder_design2_slots
 (area,area_order,slot_key,row_no,order_no,width_px,height_px,property_key,fallback_key)
SELECT 'Extras',9,slot_key,row_no,order_no,width_px,height_px,property_key,fallback_key
FROM md_builder_design2_slots
WHERE area='Body' AND slot_key IN ('extra_cardGap','extra_selectionMode')
ON CONFLICT(area,slot_key) DO UPDATE SET
 area_order=EXCLUDED.area_order,row_no=EXCLUDED.row_no,order_no=EXCLUDED.order_no,
 width_px=EXCLUDED.width_px,height_px=EXCLUDED.height_px,
 property_key=EXCLUDED.property_key,fallback_key=EXCLUDED.fallback_key;
DELETE FROM md_builder_design2_slots
WHERE area='Body' AND slot_key IN ('extra_cardGap','extra_selectionMode');

-- Image border now uses Image > Appearance > Border (R1C2), not a second
-- dynamic picker. This colour still applies to the image, NOT its parent card.
INSERT INTO md_builder_design2_slots
 (area,area_order,slot_key,row_no,order_no,width_px,height_px,property_key,fallback_key)
SELECT 'Image',3,'border',s.row_no,s.order_no,s.width_px,s.height_px,
       'imageBorderColor',s.fallback_key
FROM md_builder_design2_slots s
WHERE s.area='Body' AND s.slot_key='border'
ON CONFLICT(area,slot_key) DO UPDATE SET
 area_order=EXCLUDED.area_order,row_no=EXCLUDED.row_no,order_no=EXCLUDED.order_no,
 width_px=EXCLUDED.width_px,height_px=EXCLUDED.height_px,
 property_key=EXCLUDED.property_key;

INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
SELECT 'smart_card_grid','Image','border',p.property_key
FROM md_builder_shared_properties p
JOIN md_builder_ribbon_component_rules c ON c.component_api='smart_card_grid'
 AND c.property_key=p.property_key AND c.enabled=true
WHERE p.property_key='imageBorderColor'
ON CONFLICT(component_api,area,slot_key)
 DO UPDATE SET property_key=EXCLUDED.property_key;

-- The shared numeric Position/Padding control edits existing cardPadding;
-- the Appearance selector edits existing tabIndex/showDays/firstDay. Remove
-- their old duplicate extra slots, and the seven moved focused editors.
DELETE FROM md_builder_design2_slot_rules
WHERE area='Body' AND slot_key IN (
 'extra_cardPadding','extra_tabIndex','extra_showDays','extra_firstDay',
 'extra_focusedCardWidth','extra_focusedCardHeight',
 'extra_focusedCardBorderColor','extra_focusedCardShadow',
 'extra_focusedTextColor','extra_focusedTextBold','extra_focusedTextSize'
);
DELETE FROM md_builder_design2_slots
WHERE area='Body' AND slot_key IN (
 'extra_cardPadding','extra_tabIndex','extra_showDays','extra_firstDay',
 'extra_focusedCardWidth','extra_focusedCardHeight',
 'extra_focusedCardBorderColor','extra_focusedCardShadow',
 'extra_focusedTextColor','extra_focusedTextBold','extra_focusedTextSize'
);
