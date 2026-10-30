-- Approved Design two-row control geometry. SQL-owned, global, idempotent.
-- Dimensions include the icon INSIDE the shared 70px numbered border.
-- Multi-button align/shadow controls use 3 x 28px = 84px; no label added.
-- No changes to saved layouts, tenant data, component applicability or RBAC.
ALTER TABLE md_builder_shared_properties
 ADD COLUMN IF NOT EXISTS design_row smallint,
 ADD COLUMN IF NOT EXISTS design_width smallint,
 ADD COLUMN IF NOT EXISTS design_height smallint,
 ADD COLUMN IF NOT EXISTS design_order smallint;

WITH approved(property_key,row_no,width_px,order_no) AS (
 VALUES
 ('backgroundColor',1,40,1),
 ('borderColor',1,40,2),
 ('labelColor',1,40,3),
 ('shadow',2,84,1),
 ('radius',2,70,2),
 ('labelAlignment',1,84,1),
 ('defaultValueColor',2,40,1),
 ('textSize',2,70,2),
 ('tabCount',1,58,1),
 ('selectedTabColor',2,40,1),
 ('tabColor',2,40,2),
 ('wrapText',1,28,1),
 ('headerBorderColor',1,40,2),
 ('headerTextColor',1,40,3),
 ('headerAlignment',2,84,1),
 ('headerBold',2,28,2),
 ('imagePlacement',1,99,1),
 ('imageBorderColor',2,40,1),
 ('imageFill',2,70,2),
 ('badgeAlignment',1,90,1),
 ('badgeTextSize',1,70,2),
 ('badgeBold',2,28,1),
 ('badgeTextColor',2,40,2),
 ('badgeBodyColor',2,40,3),
 ('badgeVisible',2,40,4),
 ('supportingBorderColor',1,40,1),
 ('supportingTextColor',1,40,2),
 ('supportingBold',1,28,3),
 ('supportingAlignment',2,84,1),
 ('tableBackgroundColor',1,40,1),
 ('tableBorderColor',1,40,2),
 ('tableRadius',1,70,3),
 ('tableShadow',2,84,1),
 ('rowBorderColor',1,40,1),
 ('rowRadius',1,70,2),
 ('rowLabelColor',2,40,1),
 ('rowHeight',2,70,2),
 ('summaryBackgroundColor',1,40,1),
 ('summaryBorderColor',1,40,2),
 ('summaryTextColor',1,40,3),
 ('summaryRadius',1,70,4),
 ('summaryHeight',1,70,5),
 ('summaryShadow',2,84,1),
 ('summaryWidth',2,70,2),
 ('summaryTextSize',2,70,3),
 ('summaryTextWeight',2,28,4),
 ('summary2TextSize',1,70,1),
 ('summary2TextWeight',2,28,1),
 ('summary2TextColor',2,40,2),
 ('iconFillColor',1,40,1)
)
UPDATE md_builder_shared_properties AS p SET
 design_row=approved.row_no,
 design_width=approved.width_px,
 design_height=26,
 design_order=approved.order_no
FROM approved
WHERE p.property_key=approved.property_key AND p.tab='Design'
 AND (p.design_row IS DISTINCT FROM approved.row_no OR
      p.design_width IS DISTINCT FROM approved.width_px OR
      p.design_height IS DISTINCT FROM 26 OR
      p.design_order IS DISTINCT FROM approved.order_no);
-- Unmapped future Design controls remain visible; runtime places them
-- in a final row with safe fallback sizing, without losing editability.
