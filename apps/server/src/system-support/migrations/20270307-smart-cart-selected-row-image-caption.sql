-- Extend Smart Cart selection and the existing Smart Image caption typography.
-- This is forward-only builder metadata: no tenant page, record, or Flow edits.
-- Unset selected-row values retain the existing renderer colours.
WITH specs(property_key,label,row_no,col_no) AS (
 VALUES
 ('selectedRowColor','Selected Row Color',2,2),
 ('selectedRowBorderColor','Selected Row Border',3,2)
), missing AS (
 SELECT s.*,row_number() OVER (ORDER BY row_no) AS position
 FROM specs s
 WHERE NOT EXISTS (
  SELECT 1 FROM md_builder_shared_properties p WHERE p.property_key=s.property_key
 )
), last_order AS (
 SELECT COALESCE(MAX(sort_order),0) AS final_order FROM md_builder_shared_properties
)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,
  choices,scope,design_row,design_order,design_width,design_height,design_caption_width)
SELECT property_key,label,'Design','Row','color',last_order.final_order+missing.position,
       NULL,'[]'::jsonb,'component',row_no,col_no,40,26,0
FROM missing CROSS JOIN last_order
ON CONFLICT(property_key) DO NOTHING;

-- Smart Image already renders a caption from textSource; enable the existing
-- global label controls instead of introducing duplicate Image-only properties.
-- Controls keep their original placement: Body R2/C1; Typography R1/C1, R3/C1.
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled)
SELECT supported.component_api,supported.property_key,true
FROM (VALUES
 ('smart_cart','selectedRowColor'),
 ('smart_cart','selectedRowBorderColor'),
 ('smart_image','labelColor'),
 ('smart_image','labelAlignment'),
 ('smart_image','textSize')
) AS supported(component_api,property_key)
JOIN md_builder_ribbon_components c ON c.component_api=supported.component_api
JOIN md_builder_shared_properties p ON p.property_key=supported.property_key
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;
