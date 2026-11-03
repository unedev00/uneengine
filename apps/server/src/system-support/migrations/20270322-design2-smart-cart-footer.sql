-- Design 2 only: Footer means the grand-total line, not the whole Summary panel.
-- Retain all legacy Design tab properties, including Summary 2 typography.
WITH specs(property_key,label,kind,choices,min_value,max_value,ord) AS (
 VALUES
 ('footerBodyColor','Footer Body Color','color','[]'::jsonb,NULL::integer,NULL::integer,1),
 ('footerBorderColor','Footer Border Color','color','[]'::jsonb,NULL::integer,NULL::integer,2),
 ('footerRadius','Footer Corner Radius','number','[]'::jsonb,0,128,3),
 ('footerHeight','Footer Height','number','[]'::jsonb,0,1200,4),
 ('footerWidth','Footer Width','number','[]'::jsonb,0,1200,5),
 ('footerShape','Footer Shape','choice','["shape:rectangle","shape:round-rectangle","shape:oval"]'::jsonb,NULL::integer,NULL::integer,6),
 ('footerShapeFill','Footer Shape Fill','color','[]'::jsonb,NULL::integer,NULL::integer,7),
 ('footerWrapText','Footer Wrap Text','boolean','[]'::jsonb,NULL::integer,NULL::integer,8)
), last_order AS (SELECT COALESCE(MAX(sort_order),0) AS n FROM md_builder_shared_properties)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope,
 min_value,max_value,design_row,design_order,design_width,design_height,design_caption_width)
SELECT specs.property_key,specs.label,'Design2','Contextual',specs.kind,
 last_order.n+specs.ord,NULL::jsonb,specs.choices,'component',specs.min_value,specs.max_value,
 3,1,CASE WHEN specs.kind='number' THEN 80 ELSE 40 END,26,0
FROM specs CROSS JOIN last_order
ON CONFLICT(property_key) DO NOTHING;

INSERT INTO md_builder_ribbon_component_rules(component_api,property_key,enabled)
SELECT 'smart_cart',p.property_key,true
FROM md_builder_shared_properties p
WHERE p.property_key IN ('footerBodyColor','footerBorderColor','footerRadius','footerHeight',
 'footerWidth','footerShape','footerShapeFill','footerWrapText')
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;

UPDATE md_builder_design2_component_slots
SET property_key=CASE
 WHEN slot_key='body_color_1_1' THEN 'footerBodyColor'
 WHEN slot_key='border_color_1_2' THEN 'footerBorderColor'
 WHEN slot_key='corner_radius_1_5' THEN 'footerRadius'
 WHEN slot_key='height_2_3' THEN 'footerHeight'
 WHEN slot_key='width_2_4' THEN 'footerWidth'
 WHEN slot_key='shape_1_3' THEN 'footerShape'
 WHEN slot_key='shape_fill_1_4' THEN 'footerShapeFill'
 WHEN slot_key='wrap_text_3_4' THEN 'footerWrapText'
 ELSE property_key END
WHERE component_api='smart_cart' AND area='Footer';
