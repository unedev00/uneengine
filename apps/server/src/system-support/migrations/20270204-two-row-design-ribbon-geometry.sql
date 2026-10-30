-- Approved Page Builder Design ribbon geometry, 2 rows at 26px per control.
-- Global reusable metadata; no application, user layout, permission or business data changes.
-- A 3-button align/shadow group consumes 3x28=84px; inline SVG is INCLUDED
-- in the 70px numbered field, not added to its width.
ALTER TABLE md_builder_shared_properties
 ADD COLUMN IF NOT EXISTS design_row smallint,
 ADD COLUMN IF NOT EXISTS design_width smallint,
 ADD COLUMN IF NOT EXISTS design_height smallint;

-- A global SQL property appears even for an unsupported component. Only
-- applicability rules determine whether the existing control is disabled.
WITH placement(property_key, row_no, width_px) AS (
 VALUES
 ('backgroundColor',1,40),
 ('borderColor',1,40),
 ('labelColor',1,40),
 ('shadow',2,84),
 ('radius',2,70),
 ('labelAlignment',1,84),
 ('defaultValueColor',2,40),
 ('textSize',2,70),
 ('tabCount',1,58),
 ('selectedTabColor',2,40),
 ('tabColor',2,40),
 ('wrapText',1,28),
 ('headerBorderColor',1,40),
 ('headerTextColor',1,40),
 ('headerAlignment',2,84),
 ('headerBold',2,28),
 ('imagePlacement',1,99),
 ('imageBorderColor',2,40),
 ('imageFill',2,70),
 ('badgeAlignment',1,90),
 ('badgeTextSize',1,70),
 ('badgeBold',2,28),
 ('badgeTextColor',2,40),
 ('badgeBodyColor',2,40),
 ('badgeVisible',2,40),
 ('supportingBorderColor',1,40),
 ('supportingTextColor',1,40),
 ('supportingBold',1,28),
 ('supportingAlignment',2,84),
 ('tableBackgroundColor',1,40),
 ('tableBorderColor',1,40),
 ('tableRadius',1,70),
 ('tableShadow',2,84),
 ('rowBorderColor',1,40),
 ('rowRadius',1,70),
 ('rowLabelColor',2,40),
 ('rowHeight',2,70),
 ('summaryBackgroundColor',1,40),
 ('summaryBorderColor',1,40),
 ('summaryTextColor',1,40),
 ('summaryRadius',1,70),
 ('summaryHeight',1,70),
 ('summaryShadow',2,84),
 ('summaryWidth',2,70),
 ('summaryTextSize',2,70),
 ('summaryTextWeight',2,28),
 ('summary2TextSize',1,70),
 ('summary2TextWeight',2,28),
 ('summary2TextColor',2,40),
 ('iconFillColor',1,40)
)
UPDATE md_builder_shared_properties AS p SET
 design_row=placement.row_no,
 design_width=placement.width_px,
 design_height=26
FROM placement
WHERE p.property_key=placement.property_key
 AND p.tab='Design'
 AND (p.design_row IS DISTINCT FROM placement.row_no
   OR p.design_width IS DISTINCT FROM placement.width_px
   OR p.design_height IS DISTINCT FROM 26);

-- Any future Design property remains visible with a safe row 2 fallback.
