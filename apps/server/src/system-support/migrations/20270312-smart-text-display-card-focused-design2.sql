-- Shared Smart component metadata only: no page, tenant records or app-specific behaviour.
-- Design2 reuses existing textSize, headerBold, wrapText, selectedCardColor and gap IDs.
-- Null focused values preserve the current unselected/selected card appearance.
WITH base AS (
  SELECT COALESCE(MAX(sort_order),0) AS n FROM md_builder_shared_properties
), specs(property_key,label,kind,default_value,choices,min_value,max_value,ordinal) AS (
  VALUES
  ('displayMode','Text Mode','choice','"input"'::jsonb,'["input","display"]'::jsonb,NULL::integer,NULL::integer,1),
  ('gap','Card Gap','number','12'::jsonb,'[]'::jsonb,0,160,2),
  ('cardPadding','Card Padding','number',NULL::jsonb,'[]'::jsonb,0,160,3),
  ('focusedCardWidth','Focused Width','number',NULL::jsonb,'[]'::jsonb,1,1200,4),
  ('focusedCardHeight','Focused Height','number',NULL::jsonb,'[]'::jsonb,1,1200,5),
  ('focusedTextColor','Focused Text Color','color',NULL::jsonb,'[]'::jsonb,NULL::integer,NULL::integer,6),
  ('focusedTextBold','Focused Bold','boolean',NULL::jsonb,'[]'::jsonb,NULL::integer,NULL::integer,7),
  ('focusedTextSize','Focused Text Size','number',NULL::jsonb,'[]'::jsonb,8,96,8)
), missing AS (
 SELECT specs.*,row_number() OVER(ORDER BY ordinal) AS position
 FROM specs WHERE NOT EXISTS (
  SELECT 1 FROM md_builder_shared_properties p WHERE p.property_key=specs.property_key
 )
)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,
  choices,scope,min_value,max_value,design_row,design_order,design_width,design_height,design_caption_width)
SELECT m.property_key,m.label,'Design2','Contextual',m.kind,
 b.n+m.position,m.default_value,m.choices,'component',m.min_value,m.max_value,
 3,1,CASE WHEN m.kind='number' THEN 58 WHEN m.kind='boolean' THEN 28
           WHEN m.kind='choice' THEN 94 ELSE 40 END,26,0
FROM missing m CROSS JOIN base b
ON CONFLICT(property_key) DO NOTHING;

-- The original Smart Input remains the default. Show display-only mode and
-- existing bold/wrap controls for Smart Text without duplicating the property engine.
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled)
SELECT rules.component_api,p.property_key,true
FROM (VALUES
 ('smart_text','displayMode'),('smart_text','headerBold'),('smart_text','wrapText'),
 ('smart_card_grid','textSize'),('smart_card_grid','gap'),('smart_card_grid','cardPadding'),
 ('smart_card_grid','focusedCardWidth'),('smart_card_grid','focusedCardHeight'),
 ('smart_card_grid','focusedTextColor'),('smart_card_grid','focusedTextBold'),
 ('smart_card_grid','focusedTextSize')
) AS rules(component_api,property_key)
JOIN md_builder_ribbon_components c ON c.component_api=rules.component_api
JOIN md_builder_shared_properties p ON p.property_key=rules.property_key
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;

-- Smart Text display headings default to normal weight; explicit bold is opt-in.
UPDATE md_builder_ribbon_component_rules
SET default_value_override='false'::jsonb
WHERE component_api='smart_text' AND property_key='headerBold'
  AND default_value_override IS NULL;

-- Reuse previously disabled Body icon slots; no additional toolbar engine.
UPDATE md_builder_design2_slots
SET property_key='headerBold'
WHERE area='Body' AND slot_key='bold' AND property_key IS NULL;
UPDATE md_builder_design2_slots
SET property_key='wrapText'
WHERE area='Body' AND slot_key='wrap' AND property_key IS NULL;

-- New contextual areas share the existing three-row SQL slot renderer.
INSERT INTO md_builder_design2_slots
 (area,area_order,slot_key,row_no,order_no,width_px,height_px,property_key,fallback_key)
VALUES
 ('Body',1,'textMode',3,6,94,26,'displayMode','displayMode'),
 ('Card Grid',9,'gap',2,1,58,26,'gap','gap'),
 ('Card Grid',9,'padding',2,2,58,26,'cardPadding','cardPadding'),
 ('Card Grid',9,'size',3,1,58,26,'textSize','textSize'),
 ('Focused',10,'fill',2,1,40,26,'selectedCardColor','selectedCardColor'),
 ('Focused',10,'height',2,2,58,26,'focusedCardHeight','focusedCardHeight'),
 ('Focused',10,'width',2,3,58,26,'focusedCardWidth','focusedCardWidth'),
 ('Focused',10,'text',3,1,40,26,'focusedTextColor','focusedTextColor'),
 ('Focused',10,'bold',3,2,28,26,'focusedTextBold','focusedTextBold'),
 ('Focused',10,'size',3,3,58,26,'focusedTextSize','focusedTextSize')
ON CONFLICT(area,slot_key) DO NOTHING;
