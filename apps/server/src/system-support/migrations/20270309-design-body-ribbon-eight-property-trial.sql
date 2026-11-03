-- Isolated eight-property Design ribbon trial (03 Nov 2026).
-- Only existing global shared property metadata is repositioned.
-- No component values, published pages, applicability, runtime logic, or tenant data change.
-- The submitted table assigns both Label Color and Label Alignment to Body R2/C1.
-- To keep both controls visible without overlap, this trial uses R2/C2 for Alignment.
--
-- Columns use design_order within each row (the shared renderer already supports this).
-- The remaining Design sections and properties are deliberately untouched.
WITH trial(property_key, final_group, row_no, col_no, width_px) AS (
 VALUES
 ('backgroundColor','Body',1,1,40),
 ('borderColor','Body',1,2,40),
 ('radius','Body',1,3,58),
 ('labelColor','Body',2,1,40),
 ('labelAlignment','Body',2,2,40),
 ('textSize','Body',2,3,58),
 ('shadow','Body',3,1,40),
 ('defaultValueColor','Typography',1,1,40)
)
UPDATE md_builder_shared_properties AS p
SET section_group=t.final_group,
    design_row=t.row_no,
    design_order=t.col_no,
    design_width=t.width_px,
    design_height=26,
    design_caption_width=0,
    design_display=CASE WHEN t.property_key='shadow' THEN 'dropdown'
                        WHEN t.property_key='labelAlignment' THEN 'dropdown'
                        ELSE p.design_display END
FROM trial AS t
WHERE p.tab='Design' AND p.property_key=t.property_key
  AND (
    (p.section_group,p.design_row,p.design_order,p.design_width,p.design_height,p.design_caption_width)
    IS DISTINCT FROM (t.final_group,t.row_no,t.col_no,t.width_px,26,0)
    OR (t.property_key IN ('shadow','labelAlignment') AND p.design_display IS DISTINCT FROM 'dropdown')
  );
