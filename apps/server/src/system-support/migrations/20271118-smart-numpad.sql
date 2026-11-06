-- Smart Numpad uses the shared SQL ribbon, shared Formula/Flow actions and
-- existing fixed Design areas. No tenant pages, records or authored values are rewritten.
INSERT INTO md_builder_ribbon_components(component_api)
VALUES ('smart_numpad') ON CONFLICT(component_api) DO NOTHING;

-- New keys only where a keypad, input or third button genuinely needs independent
-- settings. Existing Body, Header, Object Source, Text Source and buttons 1/2
-- reuse their established global definitions.
WITH specs(property_key,label,section_group,control_kind,default_json,choices,min_value,max_value) AS (
 VALUES
 ('numpadPadding','Padding','Body','number','10'::jsonb,'[]'::jsonb,0,80),
 ('numpadGap','Key gap','Body','number','8'::jsonb,'[]'::jsonb,0,48),
 ('numpadHeaderRadius','Input radius','Header','number','8'::jsonb,'[]'::jsonb,0,128),
 ('numpadHeaderShadow','Input shadow','Header','shadow','"none"'::jsonb,'["none","medium","large"]'::jsonb,NULL::integer,NULL::integer),
 ('numpadHeaderWidth','Input width (%)','Header','number','100'::jsonb,'[]'::jsonb,50,100),
 ('numpadInputMode','Input type','Header','choice','"integer"'::jsonb,'["integer","decimal","pin"]'::jsonb,NULL::integer,NULL::integer),
 ('numpadDecimalPlaces','Decimal places','Header','number','2'::jsonb,'[]'::jsonb,0,12),
 ('numpadMaxDigits','Maximum digits','Header','number','12'::jsonb,'[]'::jsonb,1,64),
 ('numpadMask','Mask value','Header','boolean','false'::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('numpadPlaceholder','Placeholder','Header','expression','"Enter number"'::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('numpadPrefix','Input prefix','Header','expression','""'::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('numpadSuffix','Input suffix','Header','expression','""'::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('numpadKeyFill','Key background','Button','color','"#f1f5f9"'::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('numpadKeyBorderColor','Key border','Button','color',NULL::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('numpadKeyRadius','Key radius','Button','number','9'::jsonb,'[]'::jsonb,0,128),
 ('numpadKeyShadow','Key shadow','Button','shadow','"none"'::jsonb,'["none","medium","large"]'::jsonb,NULL::integer,NULL::integer),
 ('numpadKeyWidth','Key width (%)','Button','number','100'::jsonb,'[]'::jsonb,20,100),
 ('numpadKeyHeight','Key height','Button','number','52'::jsonb,'[]'::jsonb,28,200),
 ('numpadKeyTextColor','Key text','Button','color',NULL::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('numpadKeyTextSize','Key text size','Button','number','20'::jsonb,'[]'::jsonb,10,96),
 ('numpadKeyBold','Key bold','Button','boolean','false'::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('numpadKeyAlignment','Key alignment','Button','align','"center"'::jsonb,'["left","center","right"]'::jsonb,NULL::integer,NULL::integer),
 ('numpadKeyShape','Key shape','Button','choice','"shape:round-rectangle"'::jsonb,'["shape:rectangle","shape:round-rectangle","shape:oval"]'::jsonb,NULL::integer,NULL::integer),
 ('numpadFocusedFill','Focused background','Focused','color','"#dbeafe"'::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('numpadFocusedBorderColor','Focused border','Focused','color','"#2563eb"'::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('numpadFocusedTextColor','Focused text','Focused','color','"#1d4ed8"'::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('numpadFocusedRadius','Focused radius','Focused','number','9'::jsonb,'[]'::jsonb,0,128),
 ('numpadFocusedShadow','Focused shadow','Focused','shadow','"none"'::jsonb,'["none","medium","large"]'::jsonb,NULL::integer,NULL::integer),
 ('numpadFocusedTextSize','Focused text size','Focused','number','20'::jsonb,'[]'::jsonb,10,96),
 ('numpadFocusedBold','Focused bold','Focused','boolean','false'::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('customButton3Label','Custom Button 3 label','Values','expression','"Submit"'::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('customButton3Fill','Custom 3 background','Button 4','color',NULL::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('customButton3BorderColor','Custom 3 border','Button 4','color',NULL::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('customButton3Radius','Custom 3 radius','Button 4','number','9'::jsonb,'[]'::jsonb,0,128),
 ('customButton3Width','Custom 3 width (%)','Button 4','number','100'::jsonb,'[]'::jsonb,20,100),
 ('customButton3Height','Custom 3 height','Button 4','number','52'::jsonb,'[]'::jsonb,28,200),
 ('customButton3TextColor','Custom 3 text','Button 4','color',NULL::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('customButton3TextSize','Custom 3 text size','Button 4','number','16'::jsonb,'[]'::jsonb,10,96),
 ('customButton3Alignment','Custom 3 alignment','Button 4','align','"center"'::jsonb,'["left","center","right"]'::jsonb,NULL::integer,NULL::integer),
 ('customButton3Bold','Custom 3 bold','Button 4','boolean','false'::jsonb,'[]'::jsonb,NULL::integer,NULL::integer),
 ('customButton3Shape','Custom 3 shape','Button 4','choice','"shape:round-rectangle"'::jsonb,'["shape:rectangle","shape:round-rectangle","shape:oval"]'::jsonb,NULL::integer,NULL::integer),
 ('customButton3Shadow','Custom 3 shadow','Button 4','shadow','"none"'::jsonb,'["none","medium","large"]'::jsonb,NULL::integer,NULL::integer),
 ('customButton1Shadow','Custom 1 shadow','Button 2','shadow','"none"'::jsonb,'["none","medium","large"]'::jsonb,NULL::integer,NULL::integer),
 ('customButton2Shadow','Custom 2 shadow','Button 3','shadow','"none"'::jsonb,'["none","medium","large"]'::jsonb,NULL::integer,NULL::integer)
), existing AS (SELECT COALESCE(MAX(sort_order),0) AS n FROM md_builder_shared_properties)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,
  choices,scope,min_value,max_value,field_select,design_row,design_order,
  design_width,design_height,design_caption_width,design_display)
SELECT s.property_key,s.label,
 CASE WHEN s.property_key='customButton3Label' THEN 'Data' ELSE 'Design2' END,
 s.section_group,s.control_kind,e.n+ROW_NUMBER() OVER(ORDER BY s.property_key),
 s.default_json,s.choices,'component',s.min_value,s.max_value,
 s.control_kind='expression',2,1,
 CASE WHEN s.control_kind='number' THEN 58 WHEN s.control_kind='choice' THEN 110
      WHEN s.control_kind='expression' THEN 150 WHEN s.control_kind='boolean' THEN 28 ELSE 40 END,
 26,0,CASE WHEN s.control_kind IN ('align','shadow') THEN 'dropdown' ELSE 'buttons' END
FROM specs s CROSS JOIN existing e
ON CONFLICT(property_key) DO NOTHING;

-- Existing global keys are referenced, never redefined or altered.
WITH keys(property_key) AS (VALUES
 ('backgroundColor'),('borderColor'),('radius'),('shadow'),('width'),('height'),('x'),('y'),
 ('textSource'),('objectApiName'),('objectApiName2'),
 ('headerBodyColor'),('headerBorderColor'),('headerTextColor'),('headerTextSize'),
 ('headerBoxHeight'),('headerAlignment'),('headerBold'),
 ('customButton1Label'),('customButton2Label'),
 ('customButton1Fill'),('customButton1BorderColor'),('customButton1Radius'),
 ('customButton1Width'),('customButton1Height'),('customButton1Shape'),
 ('customButton1TextColor'),('customButton1TextSize'),('customButton1Bold'),
 ('customButton1Alignment'),
 ('customButton2Fill'),('customButton2BorderColor'),('customButton2Radius'),
 ('customButton2Width'),('customButton2Height'),('customButton2Shape'),
 ('customButton2TextColor'),('customButton2TextSize'),('customButton2Bold'),
 ('customButton2Alignment')
), numpad_keys AS (
 SELECT property_key FROM keys
 UNION SELECT property_key FROM md_builder_shared_properties
 WHERE property_key LIKE 'numpad%' OR property_key LIKE 'customButton3%'
 OR property_key IN ('customButton1Shadow','customButton2Shadow')
)
INSERT INTO md_builder_ribbon_component_rules(component_api,property_key,enabled)
SELECT 'smart_numpad',k.property_key,true FROM numpad_keys k
JOIN md_builder_shared_properties p ON p.property_key=k.property_key
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;

-- Fixed Design cell mappings. Button means the twelve standard keys.
-- Button 2/3/4 mean the three independent custom buttons.
WITH design(area,slot_key,property_key) AS (VALUES
 ('Body','fill','backgroundColor'),('Body','border','borderColor'),
 ('Body','radius','radius'),('Body','shadow','shadow'),
 ('Body','width','width'),('Body','height','height'),
 ('Header','fill','headerBodyColor'),('Header','border','headerBorderColor'),
 ('Header','radius','numpadHeaderRadius'),('Header','shadow','numpadHeaderShadow'),
 ('Header','width','numpadHeaderWidth'),('Header','height','headerBoxHeight'),
 ('Header','text','headerTextColor'),('Header','alignment','headerAlignment'),
 ('Header','size','headerTextSize'),('Header','bold','headerBold'),
 ('Focused','fill','numpadFocusedFill'),('Focused','border','numpadFocusedBorderColor'),
 ('Focused','radius','numpadFocusedRadius'),('Focused','shadow','numpadFocusedShadow'),
 ('Focused','text','numpadFocusedTextColor'),('Focused','size','numpadFocusedTextSize'),
 ('Focused','bold','numpadFocusedBold'),
 ('Button','fill','numpadKeyFill'),('Button','border','numpadKeyBorderColor'),
 ('Button','radius','numpadKeyRadius'),('Button','shadow','numpadKeyShadow'),
 ('Button','width','numpadKeyWidth'),('Button','height','numpadKeyHeight'),
 ('Button','text','numpadKeyTextColor'),('Button','size','numpadKeyTextSize'),
 ('Button','bold','numpadKeyBold'),('Button','alignment','numpadKeyAlignment'),
 ('Button','shape','numpadKeyShape'),
 ('Button 2','fill','customButton1Fill'),('Button 2','border','customButton1BorderColor'),
 ('Button 2','radius','customButton1Radius'),('Button 2','shadow','customButton1Shadow'),
 ('Button 2','width','customButton1Width'),('Button 2','height','customButton1Height'),
 ('Button 2','text','customButton1TextColor'),('Button 2','size','customButton1TextSize'),
 ('Button 2','bold','customButton1Bold'),('Button 2','alignment','customButton1Alignment'),
 ('Button 2','shape','customButton1Shape'),
 ('Button 3','fill','customButton2Fill'),('Button 3','border','customButton2BorderColor'),
 ('Button 3','radius','customButton2Radius'),('Button 3','shadow','customButton2Shadow'),
 ('Button 3','width','customButton2Width'),('Button 3','height','customButton2Height'),
 ('Button 3','text','customButton2TextColor'),('Button 3','size','customButton2TextSize'),
 ('Button 3','bold','customButton2Bold'),('Button 3','alignment','customButton2Alignment'),
 ('Button 3','shape','customButton2Shape'),
 ('Button 4','fill','customButton3Fill'),('Button 4','border','customButton3BorderColor'),
 ('Button 4','radius','customButton3Radius'),('Button 4','shadow','customButton3Shadow'),
 ('Button 4','width','customButton3Width'),('Button 4','height','customButton3Height'),
 ('Button 4','text','customButton3TextColor'),('Button 4','size','customButton3TextSize'),
 ('Button 4','bold','customButton3Bold'),('Button 4','alignment','customButton3Alignment'),
 ('Button 4','shape','customButton3Shape')
)
INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
SELECT 'smart_numpad',d.area,d.slot_key,d.property_key FROM design d
JOIN md_builder_design2_slots s ON s.area=d.area AND s.slot_key=d.slot_key
JOIN md_builder_shared_properties p ON p.property_key=d.property_key
ON CONFLICT(component_api,area,slot_key) DO UPDATE SET property_key=EXCLUDED.property_key;

-- SQL-owned supplemental controls appear inside their section, not in another
-- properties tab. No new design engine, no hardcoded per-key renderer control.
WITH settings(area,property_key,ordinal) AS (VALUES
 ('Body','numpadPadding',1),('Body','numpadGap',2),
 ('Header','numpadInputMode',1),('Header','numpadDecimalPlaces',2),
 ('Header','numpadMaxDigits',3),('Header','numpadMask',4),
 ('Header','numpadPlaceholder',5),('Header','numpadPrefix',6),
 ('Header','numpadSuffix',7)
)
INSERT INTO md_builder_design2_slots
 (area,area_order,slot_key,row_no,order_no,width_px,height_px,property_key,fallback_key)
SELECT a.area,MIN(s.area_order),'extra_'||a.property_key,1,30+a.ordinal,
 CASE WHEN p.control_kind='choice' THEN 110
      WHEN p.control_kind='expression' THEN 150
      WHEN p.control_kind='number' THEN 58 ELSE 40 END,
 26,a.property_key,a.property_key
FROM settings a
JOIN md_builder_design2_slots s ON s.area=a.area
JOIN md_builder_shared_properties p ON p.property_key=a.property_key
GROUP BY a.area,a.property_key,a.ordinal,p.control_kind
ON CONFLICT(area,slot_key) DO NOTHING;

INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
SELECT 'smart_numpad',s.area,s.slot_key,s.property_key
FROM md_builder_design2_slots s
WHERE s.slot_key LIKE 'extra_numpad%'
ON CONFLICT(component_api,area,slot_key) DO UPDATE SET property_key=EXCLUDED.property_key;

-- Upgrade existing tenants, while fresh tenant metadata comes from the
-- independently versioned Smart component seeder.
INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled)
SELECT id,'smart_numpad','one-bundled:smart_numpad',true FROM md_tenants
ON CONFLICT(tenant_id,api_name) DO NOTHING;
