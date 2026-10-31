-- Place the existing Smart ribbon commands into the approved compact rows.
-- Geometry only: no component defaults, rendered colours, tenant values or Flows change.
-- The three-row editor remains SQL-driven and this update is safe to reapply.
WITH placement(tab_name,property_key,section_group,row_no,order_no) AS (
 VALUES
 -- Design: align, text colour and type size each have their own row.
 ('Design','labelAlignment','Typography',1,1),
 ('Design','defaultValueColor','Typography',2,1),
 ('Design','textSize','Typography',3,1),
 -- The two tab palettes are stacked rather than reserving a wide single row.
 ('Design','selectedTabColor','Tabs',1,1),
 ('Design','tabColor','Tabs',2,1),
 -- Table: colour palettes, radius, and shadow are three distinct rows.
 ('Design','tableBackgroundColor','Table',1,1),
 ('Design','tableBorderColor','Table',1,2),
 ('Design','tableRadius','Table',2,1),
 ('Design','tableShadow','Table',3,1),
 -- Row: colours first, radius second, height third.
 ('Design','rowBorderColor','Row',1,1),
 ('Design','rowLabelColor','Row',1,2),
 ('Design','rowRadius','Row',2,1),
 ('Design','rowHeight','Row',3,1),
 -- Layout: keep each tab dimension on its own row.
 ('Layout','tabWidth','Tabs',1,1),
 ('Layout','tabCount','Tabs',2,1),
 ('Layout','tabHeight','Tabs',3,1),
 -- Calendar: weekdays selector above first-day selector.
 ('Layout','showDays','Calendar',1,1),
 ('Layout','firstDay','Calendar',2,1)
)
UPDATE md_builder_shared_properties AS p
SET design_row=placement.row_no,design_order=placement.order_no
FROM placement
WHERE p.tab=placement.tab_name
 AND p.property_key=placement.property_key
 AND p.section_group=placement.section_group
 AND (p.design_row,p.design_order) IS DISTINCT FROM
     (placement.row_no,placement.order_no);
