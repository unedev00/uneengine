-- Forward-only correction: undo the Data ribbon three-row geometry from
-- 20271110 and 20271111. Restore the 114px shared ribbon and two display rows.
-- Reuse the same 24 global SQL property keys; retain all new kiosk capabilities,
-- component rule applicability and published tenant values.
-- Safe and idempotent: visual SQL metadata only, no tenant data edits.
WITH placement(property_key,group_name,row_no,col_no,width_px,caption_px) AS (
 VALUES
 ('objectApiName','Source',1,1,150,52),
 ('objectApiName2','Source',2,1,150,52),
 ('objectApiName3','Source',3,1,150,52),
 ('imageSource','Values',1,1,144,0),
 ('textSource','Values',1,2,144,0),
 ('label','Values',1,3,144,0),
 ('badgeText','Values',2,1,144,0),
 ('defaultValue','Values',2,2,144,0),
 ('defaultCheck','Values',2,3,150,0),
 ('customButton1Label','Values',2,4,144,0),
 ('customButton2Label','Values',2,5,144,0),
 ('column2Source','Cart',1,1,144,0),
 ('column3Source','Cart',1,2,144,0),
 ('subtotalValue','Cart',1,3,144,0),
 ('taxValue','Cart',1,4,144,0),
 ('column4Source','Cart',2,1,144,0),
 ('column5Source','Cart',2,2,144,0),
 ('totalValue','Cart',2,3,144,0),
 ('discountValue','Cart',2,4,144,0),
 ('columnVisibility','Cart',2,5,150,0),
 ('rowSupportingSource','Cart',2,6,144,0),
 ('cardDescription','Card Grid',1,1,144,0),
 ('cardValue','Card Grid',1,2,144,0),
 ('cardButtonText','Card Grid',2,1,144,0)
)
UPDATE md_builder_shared_properties AS p
SET section_group=v.group_name,
    design_row=v.row_no,
    design_order=v.col_no,
    design_width=v.width_px,
    design_height=26,
    design_caption_width=v.caption_px
FROM placement AS v
WHERE p.tab='Data' AND p.property_key=v.property_key;
