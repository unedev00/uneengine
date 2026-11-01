-- Data tab field-chip geometry for the selected-field shared Formula bar.
-- Additive and idempotent: SQL remains the source of truth for layout;
-- no edits to records, Flows, data bindings, licenses or user-custom values.
-- The Source group remains three rows; all other groups use two rows.
WITH slots(property_key,group_name,row_no,col_no,width_px,caption) AS (
 VALUES
 -- Values row 1: image, text, label. Row 2: badge, default, checkbox.
 ('imageSource','Values',1,1,144,'Image'),
 ('textSource','Values',1,2,144,'Text'),
 ('label','Values',1,3,144,'Label'),
 ('badgeText','Values',2,1,144,'Badge text'),
 ('defaultValue','Values',2,2,144,'Default value'),
 ('defaultCheck','Values',2,3,150,'Default check'),
 -- Column 1 is the cart's existing Text binding; do not invent a parallel key.
 ('column2Source','Cart',1,1,144,'Column 2'),
 ('column3Source','Cart',1,2,144,'Column 3'),
 ('subtotalValue','Cart',1,3,144,'Summary 1'),
 ('taxValue','Cart',1,4,144,'Summary 3'),
 ('column4Source','Cart',2,1,144,'Column 4'),
 ('column5Source','Cart',2,2,144,'Column 5'),
 ('totalValue','Cart',2,3,144,'Summary 2'),
 ('discountValue','Cart',2,4,144,'Summary 4'),
 ('columnVisibility','Cart',2,5,150,'Visibility')
)
UPDATE md_builder_shared_properties p
SET section_group=slots.group_name,
    design_row=slots.row_no,
    design_order=slots.col_no,
    design_width=slots.width_px,
    design_height=26,
    design_caption=slots.caption,
    design_caption_width=0
FROM slots
WHERE p.tab='Data' AND p.property_key=slots.property_key;
