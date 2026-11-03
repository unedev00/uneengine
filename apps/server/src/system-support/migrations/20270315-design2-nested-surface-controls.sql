-- Design 2 ONLY nested surface extensions. Do not modify existing Design metadata.
-- Existing component instances retain their appearance until a property is set.
-- The remove/bin icon is not yet a registered Cart runtime action; its 11 style
-- controls remain deliberately disabled rather than changing unrelated buttons.
WITH specifications(property_key,label,kind,ordinal) AS (
 VALUES
 ('headerWidth','header Width','number',1),
 ('badgeBorderColor','badge Border Color','color',2),
 ('badgeRadius','badge Radius','number',3),
 ('badgeHeight','badge Height','number',4),
 ('badgeWidth','badge Width','number',5),
 ('supportingRadius','supporting Radius','number',6),
 ('supportingWidth','supporting Width','number',7),
 ('rowBackgroundColor','row Background Color','color',8),
 ('rowWidth','row Width','number',9),
 ('footerBackgroundColor','footer Background Color','color',10),
 ('footerBorderColor','footer Border Color','color',11),
 ('footerHeight','footer Height','number',12),
 ('footerWidth','footer Width','number',13),
 ('cartButton2BackgroundColor','cart Button2Background Color','color',14),
 ('cartButton2BorderColor','cart Button2Border Color','color',15),
 ('cartButton2Radius','cart Button2Radius','number',16),
 ('cartButton2Height','cart Button2Height','number',17),
 ('cartButton2Width','cart Button2Width','number',18),
 ('cartButton2ShapeId','cart Button2Shape Id','choice',19),
 ('cartButton3BackgroundColor','cart Button3Background Color','color',20),
 ('cartButton3BorderColor','cart Button3Border Color','color',21),
 ('cartButton3Radius','cart Button3Radius','number',22),
 ('cartButton3Height','cart Button3Height','number',23),
 ('cartButton3Width','cart Button3Width','number',24),
 ('cartButton3ShapeId','cart Button3Shape Id','choice',25),
 ('cartButton4BackgroundColor','cart Button4Background Color','color',26),
 ('cartButton4BorderColor','cart Button4Border Color','color',27),
 ('cartButton4Radius','cart Button4Radius','number',28),
 ('cartButton4Height','cart Button4Height','number',29),
 ('cartButton4Width','cart Button4Width','number',30),
 ('cartButton4ShapeId','cart Button4Shape Id','choice',31),
 ('cartButton5BackgroundColor','cart Button5Background Color','color',32),
 ('cartButton5BorderColor','cart Button5Border Color','color',33),
 ('cartButton5Radius','cart Button5Radius','number',34),
 ('cartButton5Height','cart Button5Height','number',35),
 ('cartButton5Width','cart Button5Width','number',36),
 ('cartButton5ShapeId','cart Button5Shape Id','choice',37)
), missing AS (
 SELECT s.* FROM specifications s
 WHERE NOT EXISTS(SELECT 1 FROM md_builder_shared_properties p WHERE p.property_key=s.property_key)
), base AS (SELECT COALESCE(MAX(sort_order),0) n FROM md_builder_shared_properties)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,
  choices,scope,min_value,max_value,design_row,design_order,design_width,design_height,design_caption_width)
SELECT m.property_key,m.label,'Design2','Contextual',m.kind,base.n+m.ordinal,NULL,
 CASE WHEN m.kind='choice' THEN '["shape:rectangle","shape:round-rectangle","shape:oval"]'::jsonb ELSE '[]'::jsonb END,
 'component',
 CASE WHEN m.kind='number' THEN 0 ELSE NULL END,
 CASE WHEN m.kind='number' THEN 1200 ELSE NULL END,
 2,1,CASE WHEN m.kind='number' THEN 80 ELSE 40 END,26,0
FROM missing m CROSS JOIN base
ON CONFLICT(property_key) DO NOTHING;

WITH placements(component_api,area,slot_key,property_key) AS (
 VALUES
 ('smart_textbox','Header','Width','headerWidth'),
 ('smart_card_grid','Header','Width','headerWidth'),
 ('smart_card_grid','Badge','Border color','badgeBorderColor'),
 ('smart_card_grid','Badge','Corner Radius','badgeRadius'),
 ('smart_card_grid','Badge','Height','badgeHeight'),
 ('smart_card_grid','Badge','Width','badgeWidth'),
 ('smart_image','Badge','Border color','badgeBorderColor'),
 ('smart_image','Badge','Corner Radius','badgeRadius'),
 ('smart_image','Badge','Height','badgeHeight'),
 ('smart_image','Badge','Width','badgeWidth'),
 ('smart_cart','Header','Width','headerWidth'),
 ('smart_cart','Header Supporting','Corner Radius','supportingRadius'),
 ('smart_cart','Header Supporting','Width','supportingWidth'),
 ('smart_cart','Row','Body Color','rowBackgroundColor'),
 ('smart_cart','Row','Width','rowWidth'),
 ('smart_cart','Footer','Body Color','footerBackgroundColor'),
 ('smart_cart','Footer','Border color','footerBorderColor'),
 ('smart_cart','Footer','Height','footerHeight'),
 ('smart_cart','Footer','Width','footerWidth'),
 ('smart_table','Header','Width','headerWidth'),
 ('smart_table','Row','Body Color','rowBackgroundColor'),
 ('smart_table','Row','Width','rowWidth'),
 ('smart_cart','Button 2','Body Color','cartButton2BackgroundColor'),
 ('smart_cart','Button 2','Border color','cartButton2BorderColor'),
 ('smart_cart','Button 2','Corner Radius','cartButton2Radius'),
 ('smart_cart','Button 2','Height','cartButton2Height'),
 ('smart_cart','Button 2','Width','cartButton2Width'),
 ('smart_cart','Button 2','Shape','cartButton2ShapeId'),
 ('smart_cart','Button 3','Body Color','cartButton3BackgroundColor'),
 ('smart_cart','Button 3','Border color','cartButton3BorderColor'),
 ('smart_cart','Button 3','Corner Radius','cartButton3Radius'),
 ('smart_cart','Button 3','Height','cartButton3Height'),
 ('smart_cart','Button 3','Width','cartButton3Width'),
 ('smart_cart','Button 3','Shape','cartButton3ShapeId'),
 ('smart_cart','Button 4','Body Color','cartButton4BackgroundColor'),
 ('smart_cart','Button 4','Border color','cartButton4BorderColor'),
 ('smart_cart','Button 4','Corner Radius','cartButton4Radius'),
 ('smart_cart','Button 4','Height','cartButton4Height'),
 ('smart_cart','Button 4','Width','cartButton4Width'),
 ('smart_cart','Button 4','Shape','cartButton4ShapeId'),
 ('smart_cart','Button 5','Body Color','cartButton5BackgroundColor'),
 ('smart_cart','Button 5','Border color','cartButton5BorderColor'),
 ('smart_cart','Button 5','Corner Radius','cartButton5Radius'),
 ('smart_cart','Button 5','Height','cartButton5Height'),
 ('smart_cart','Button 5','Width','cartButton5Width'),
 ('smart_cart','Button 5','Shape','cartButton5ShapeId')
), allowed AS (
 SELECT DISTINCT component_api,property_key FROM placements
)
INSERT INTO md_builder_ribbon_component_rules(component_api,property_key,enabled)
SELECT a.component_api,a.property_key,true FROM allowed a
 JOIN md_builder_ribbon_components c ON c.component_api=a.component_api
 JOIN md_builder_shared_properties p ON p.property_key=a.property_key
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;

WITH placements(component_api,area,slot_key,property_key) AS (
 VALUES
 ('smart_textbox','Header','Width','headerWidth'),
 ('smart_card_grid','Header','Width','headerWidth'),
 ('smart_card_grid','Badge','Border color','badgeBorderColor'),
 ('smart_card_grid','Badge','Corner Radius','badgeRadius'),
 ('smart_card_grid','Badge','Height','badgeHeight'),
 ('smart_card_grid','Badge','Width','badgeWidth'),
 ('smart_image','Badge','Border color','badgeBorderColor'),
 ('smart_image','Badge','Corner Radius','badgeRadius'),
 ('smart_image','Badge','Height','badgeHeight'),
 ('smart_image','Badge','Width','badgeWidth'),
 ('smart_cart','Header','Width','headerWidth'),
 ('smart_cart','Header Supporting','Corner Radius','supportingRadius'),
 ('smart_cart','Header Supporting','Width','supportingWidth'),
 ('smart_cart','Row','Body Color','rowBackgroundColor'),
 ('smart_cart','Row','Width','rowWidth'),
 ('smart_cart','Footer','Body Color','footerBackgroundColor'),
 ('smart_cart','Footer','Border color','footerBorderColor'),
 ('smart_cart','Footer','Height','footerHeight'),
 ('smart_cart','Footer','Width','footerWidth'),
 ('smart_table','Header','Width','headerWidth'),
 ('smart_table','Row','Body Color','rowBackgroundColor'),
 ('smart_table','Row','Width','rowWidth'),
 ('smart_cart','Button 2','Body Color','cartButton2BackgroundColor'),
 ('smart_cart','Button 2','Border color','cartButton2BorderColor'),
 ('smart_cart','Button 2','Corner Radius','cartButton2Radius'),
 ('smart_cart','Button 2','Height','cartButton2Height'),
 ('smart_cart','Button 2','Width','cartButton2Width'),
 ('smart_cart','Button 2','Shape','cartButton2ShapeId'),
 ('smart_cart','Button 3','Body Color','cartButton3BackgroundColor'),
 ('smart_cart','Button 3','Border color','cartButton3BorderColor'),
 ('smart_cart','Button 3','Corner Radius','cartButton3Radius'),
 ('smart_cart','Button 3','Height','cartButton3Height'),
 ('smart_cart','Button 3','Width','cartButton3Width'),
 ('smart_cart','Button 3','Shape','cartButton3ShapeId'),
 ('smart_cart','Button 4','Body Color','cartButton4BackgroundColor'),
 ('smart_cart','Button 4','Border color','cartButton4BorderColor'),
 ('smart_cart','Button 4','Corner Radius','cartButton4Radius'),
 ('smart_cart','Button 4','Height','cartButton4Height'),
 ('smart_cart','Button 4','Width','cartButton4Width'),
 ('smart_cart','Button 4','Shape','cartButton4ShapeId'),
 ('smart_cart','Button 5','Body Color','cartButton5BackgroundColor'),
 ('smart_cart','Button 5','Border color','cartButton5BorderColor'),
 ('smart_cart','Button 5','Corner Radius','cartButton5Radius'),
 ('smart_cart','Button 5','Height','cartButton5Height'),
 ('smart_cart','Button 5','Width','cartButton5Width'),
 ('smart_cart','Button 5','Shape','cartButton5ShapeId')
)
UPDATE md_builder_design2_component_slots s
SET property_key=p.property_key
FROM placements p
JOIN md_builder_shared_properties metadata ON metadata.property_key=p.property_key
WHERE s.component_api=p.component_api AND s.area=p.area AND s.slot_key=p.slot_key
 AND s.property_key IS DISTINCT FROM p.property_key;
