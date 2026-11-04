-- Approved Data-tab compact placement from the user-edited ribbon screenshot.
-- Geometry only: do not create component properties, alter per-component rules,
-- page values, formulas, filters, actions or tenant records. Safe to rerun.
-- The shared formula bar is rendered independently above these three rows.
-- Source width includes its existing 47px label + 3px gap + 115px selector.
WITH placement(property_key,group_name,row_no,col_no,width_px) AS (
 VALUES
 ('objectApiName','Source',1,1,165),
 ('objectApiName2','Source',2,1,165),
 ('objectApiName3','Source',3,1,165),
 -- Values: three controls, three controls, two controls.
 ('imageSource','Values',1,1,120),
 ('textSource','Values',1,2,120),
 ('label','Values',1,3,120),
 ('badgeText','Values',2,1,120),
 ('customButton1Label','Values',2,2,120),
 ('customButton2Label','Values',2,3,120),
 ('defaultValue','Values',3,1,120),
 ('defaultCheck','Values',3,2,120),
 -- Cart: the third row begins with the EXISTING inline Cart summary label.
 -- Its input is a presentation-only editor, not an invented metadata property.
 ('column2Source','Cart',1,1,120),
 ('column3Source','Cart',1,2,120),
 ('subtotalValue','Cart',1,3,120),
 ('taxValue','Cart',1,4,120),
 ('column4Source','Cart',2,1,120),
 ('rowSupportingSource','Cart',2,2,120),
 ('column5Source','Cart',2,3,120),
 ('totalValue','Cart',2,4,120),
 ('discountValue','Cart',3,2,120),
 ('columnVisibility','Cart',3,3,120),
 -- Card Grid: one control per row, not two side-by-side.
 ('cardDescription','Card Grid',1,1,120),
 ('cardButtonText','Card Grid',2,1,120),
 ('cardValue','Card Grid',3,1,120)
)
UPDATE md_builder_shared_properties AS p
SET section_group=v.group_name,
    design_row=v.row_no,
    design_order=v.col_no,
    design_width=v.width_px,
    design_height=26,
    design_caption_width=0
FROM placement AS v
WHERE p.tab='Data' AND p.property_key=v.property_key;
