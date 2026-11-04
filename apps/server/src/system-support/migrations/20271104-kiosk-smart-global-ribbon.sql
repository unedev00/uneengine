-- Shared, additive kiosk capabilities for every tenant: no page-specific values.
-- The existing metadata catalog, Actions eye toggles and Design 2 control icons
-- own the configuration. No new ribbon framework or component is introduced.
WITH specs(property_key,label,tab,section_group,control_kind,choices,min_value,max_value,ordinal) AS (
 VALUES
 ('selectionMode','Selection Mode','Design2','Focused','choice','["single","multiple"]'::jsonb,NULL::integer,NULL::integer,1),
 ('focusedCardBorderColor','Focused Border','Design2','Focused','color','[]'::jsonb,NULL::integer,NULL::integer,2),
 ('focusedCardShadow','Focused Shadow','Design2','Focused','shadow','["none","medium","large"]'::jsonb,NULL::integer,NULL::integer,3),
 ('rowSupportingSource','Row Supporting','Data','Cart','expression','[]'::jsonb,NULL::integer,NULL::integer,4),
 ('rowSupportingBackgroundColor','Body Color','Design2','Row Supporting','color','[]'::jsonb,NULL::integer,NULL::integer,5),
 ('rowSupportingBorderColor','Border','Design2','Row Supporting','color','[]'::jsonb,NULL::integer,NULL::integer,6),
 ('rowSupportingRadius','Radius','Design2','Row Supporting','number','[]'::jsonb,0::integer,128::integer,7),
 ('rowSupportingHeight','Height','Design2','Row Supporting','number','[]'::jsonb,0::integer,600::integer,8),
 ('rowSupportingShadow','Shadow','Design2','Row Supporting','shadow','[]'::jsonb,NULL::integer,NULL::integer,9),
 ('rowSupportingTextColor','Text Color','Design2','Row Supporting','color','[]'::jsonb,NULL::integer,NULL::integer,10),
 ('rowSupportingAlignment','Alignment','Design2','Row Supporting','align','[]'::jsonb,NULL::integer,NULL::integer,11),
 ('rowSupportingTextSize','Text Size','Design2','Row Supporting','number','[]'::jsonb,8::integer,96::integer,12),
 ('rowSupportingBold','Bold','Design2','Row Supporting','boolean','[]'::jsonb,NULL::integer,NULL::integer,13),
 ('rowSupportingWrapText','Wrap','Design2','Row Supporting','boolean','[]'::jsonb,NULL::integer,NULL::integer,14),
 ('customButton1Label','Custom Button 1 Text','Data','Values','expression','[]'::jsonb,NULL::integer,NULL::integer,15),
 ('customButton1Fill','Fill','Design2','Custom Button 1','color','[]'::jsonb,NULL::integer,NULL::integer,16),
 ('customButton1BorderColor','Border','Design2','Custom Button 1','color','[]'::jsonb,NULL::integer,NULL::integer,17),
 ('customButton1Shape','Shape','Design2','Custom Button 1','choice','["shape:rectangle","shape:round-rectangle","shape:oval"]'::jsonb,NULL::integer,NULL::integer,18),
 ('customButton1Width','Width','Design2','Custom Button 1','number','[]'::jsonb,0::integer,1200::integer,19),
 ('customButton1Height','Height','Design2','Custom Button 1','number','[]'::jsonb,24::integer,1200::integer,20),
 ('customButton1TextColor','Text Color','Design2','Custom Button 1','color','[]'::jsonb,NULL::integer,NULL::integer,21),
 ('customButton1Alignment','Alignment','Design2','Custom Button 1','align','[]'::jsonb,NULL::integer,NULL::integer,22),
 ('customButton1TextSize','Text Size','Design2','Custom Button 1','number','[]'::jsonb,8::integer,96::integer,23),
 ('customButton2Label','Custom Button 2 Text','Data','Values','expression','[]'::jsonb,NULL::integer,NULL::integer,24),
 ('customButton2Fill','Fill','Design2','Custom Button 2','color','[]'::jsonb,NULL::integer,NULL::integer,25),
 ('customButton2BorderColor','Border','Design2','Custom Button 2','color','[]'::jsonb,NULL::integer,NULL::integer,26),
 ('customButton2Shape','Shape','Design2','Custom Button 2','choice','["shape:rectangle","shape:round-rectangle","shape:oval"]'::jsonb,NULL::integer,NULL::integer,27),
 ('customButton2Width','Width','Design2','Custom Button 2','number','[]'::jsonb,0::integer,1200::integer,28),
 ('customButton2Height','Height','Design2','Custom Button 2','number','[]'::jsonb,24::integer,1200::integer,29),
 ('customButton2TextColor','Text Color','Design2','Custom Button 2','color','[]'::jsonb,NULL::integer,NULL::integer,30),
 ('customButton2Alignment','Alignment','Design2','Custom Button 2','align','[]'::jsonb,NULL::integer,NULL::integer,31),
 ('customButton2TextSize','Text Size','Design2','Custom Button 2','number','[]'::jsonb,8::integer,96::integer,32)
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
SELECT m.property_key,m.label,m.tab,m.section_group,m.control_kind,
 l.n+m.pos,NULL::jsonb,m.choices,'component',m.min_value,m.max_value,
 m.control_kind='expression',2,1,
 CASE WHEN m.control_kind='choice' THEN 116 WHEN m.control_kind='number' THEN 58
      WHEN m.control_kind='boolean' THEN 28 WHEN m.control_kind='shadow' THEN 35 ELSE 40 END,
 26,0,CASE WHEN m.control_kind IN ('align','shadow') THEN 'dropdown' ELSE 'buttons' END
FROM missing m CROSS JOIN last_order l
ON CONFLICT(property_key) DO NOTHING;

-- Both components share the exact property definitions and action slot names.
INSERT INTO md_builder_ribbon_component_rules(component_api,property_key,enabled)
SELECT rules.component_api,rules.property_key,true FROM (VALUES
 ('smart_card_grid','selectionMode'),
 ('smart_card_grid','focusedCardBorderColor'),
 ('smart_card_grid','focusedCardShadow'),
 ('smart_cart','rowSupportingSource'),
 ('smart_cart','rowSupportingBackgroundColor'),
 ('smart_cart','rowSupportingBorderColor'),
 ('smart_cart','rowSupportingRadius'),
 ('smart_cart','rowSupportingHeight'),
 ('smart_cart','rowSupportingShadow'),
 ('smart_cart','rowSupportingTextColor'),
 ('smart_cart','rowSupportingAlignment'),
 ('smart_cart','rowSupportingTextSize'),
 ('smart_cart','rowSupportingBold'),
 ('smart_cart','rowSupportingWrapText'),
 ('smart_cart','customButton1Label'),
 ('smart_card_grid','customButton1Label'),
 ('smart_cart','customButton1Fill'),
 ('smart_card_grid','customButton1Fill'),
 ('smart_cart','customButton1BorderColor'),
 ('smart_card_grid','customButton1BorderColor'),
 ('smart_cart','customButton1Shape'),
 ('smart_card_grid','customButton1Shape'),
 ('smart_cart','customButton1Width'),
 ('smart_card_grid','customButton1Width'),
 ('smart_cart','customButton1Height'),
 ('smart_card_grid','customButton1Height'),
 ('smart_cart','customButton1TextColor'),
 ('smart_card_grid','customButton1TextColor'),
 ('smart_cart','customButton1Alignment'),
 ('smart_card_grid','customButton1Alignment'),
 ('smart_cart','customButton1TextSize'),
 ('smart_card_grid','customButton1TextSize'),
 ('smart_cart','customButton2Label'),
 ('smart_card_grid','customButton2Label'),
 ('smart_cart','customButton2Fill'),
 ('smart_card_grid','customButton2Fill'),
 ('smart_cart','customButton2BorderColor'),
 ('smart_card_grid','customButton2BorderColor'),
 ('smart_cart','customButton2Shape'),
 ('smart_card_grid','customButton2Shape'),
 ('smart_cart','customButton2Width'),
 ('smart_card_grid','customButton2Width'),
 ('smart_cart','customButton2Height'),
 ('smart_card_grid','customButton2Height'),
 ('smart_cart','customButton2TextColor'),
 ('smart_card_grid','customButton2TextColor'),
 ('smart_cart','customButton2Alignment'),
 ('smart_card_grid','customButton2Alignment'),
 ('smart_cart','customButton2TextSize'),
 ('smart_card_grid','customButton2TextSize')
) AS rules(component_api,property_key)
JOIN md_builder_ribbon_components c ON c.component_api=rules.component_api
JOIN md_builder_shared_properties p ON p.property_key=rules.property_key
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;

-- Design 2 is a SQL-backed area dropdown; every slot reuses an existing editor.
INSERT INTO md_builder_design2_slots
 (area,area_order,slot_key,row_no,order_no,width_px,height_px,property_key,fallback_key)
VALUES
 ('Focused',10,'selection',2,4,116,26,'selectionMode','selectionMode'),
 ('Focused',10,'border',2,5,40,26,'focusedCardBorderColor','focusedCardBorderColor'),
 ('Focused',10,'shadow',2,6,45,26,'focusedCardShadow','focusedCardShadow'),
 ('Row Supporting',11,'fill',2,1,40,26,'rowSupportingBackgroundColor','rowSupportingBackgroundColor'),
 ('Row Supporting',11,'border',2,2,40,26,'rowSupportingBorderColor','rowSupportingBorderColor'),
 ('Row Supporting',11,'radius',2,3,58,26,'rowSupportingRadius','rowSupportingRadius'),
 ('Row Supporting',11,'height',2,4,58,26,'rowSupportingHeight','rowSupportingHeight'),
 ('Row Supporting',11,'shadow',2,5,35,26,'rowSupportingShadow','rowSupportingShadow'),
 ('Row Supporting',11,'text',3,1,40,26,'rowSupportingTextColor','rowSupportingTextColor'),
 ('Row Supporting',11,'alignment',3,2,35,26,'rowSupportingAlignment','rowSupportingAlignment'),
 ('Row Supporting',11,'size',3,3,58,26,'rowSupportingTextSize','rowSupportingTextSize'),
 ('Row Supporting',11,'bold',3,4,28,26,'rowSupportingBold','rowSupportingBold'),
 ('Row Supporting',11,'wrap',3,5,28,26,'rowSupportingWrapText','rowSupportingWrapText'),
 ('Custom Button 1',12,'fill',2,1,40,26,'customButton1Fill','customButton1Fill'),
 ('Custom Button 1',12,'border',2,2,40,26,'customButton1BorderColor','customButton1BorderColor'),
 ('Custom Button 1',12,'shape',2,3,94,26,'customButton1Shape','customButton1Shape'),
 ('Custom Button 1',12,'width',2,4,58,26,'customButton1Width','customButton1Width'),
 ('Custom Button 1',12,'height',2,5,58,26,'customButton1Height','customButton1Height'),
 ('Custom Button 1',12,'text',3,1,40,26,'customButton1TextColor','customButton1TextColor'),
 ('Custom Button 1',12,'alignment',3,2,35,26,'customButton1Alignment','customButton1Alignment'),
 ('Custom Button 1',12,'size',3,3,58,26,'customButton1TextSize','customButton1TextSize'),
 ('Custom Button 2',13,'fill',2,1,40,26,'customButton2Fill','customButton2Fill'),
 ('Custom Button 2',13,'border',2,2,40,26,'customButton2BorderColor','customButton2BorderColor'),
 ('Custom Button 2',13,'shape',2,3,94,26,'customButton2Shape','customButton2Shape'),
 ('Custom Button 2',13,'width',2,4,58,26,'customButton2Width','customButton2Width'),
 ('Custom Button 2',13,'height',2,5,58,26,'customButton2Height','customButton2Height'),
 ('Custom Button 2',13,'text',3,1,40,26,'customButton2TextColor','customButton2TextColor'),
 ('Custom Button 2',13,'alignment',3,2,35,26,'customButton2Alignment','customButton2Alignment'),
 ('Custom Button 2',13,'size',3,3,58,26,'customButton2TextSize','customButton2TextSize')
ON CONFLICT(area,slot_key) DO NOTHING;
