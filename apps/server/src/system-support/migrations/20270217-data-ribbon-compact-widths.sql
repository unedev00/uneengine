-- Presentation-only widths; persisted formulas and tenant business records are unchanged.
-- Existing 144px Data chips become 100px, the 150px non-formula boxes 105px.
-- Native ribbon horizontal overflow stays enabled and disappears when content fits.
UPDATE md_builder_shared_properties
SET design_width=CASE WHEN property_key IN ('defaultCheck','columnVisibility') THEN 105 ELSE 100 END,
    design_height=26,
    design_caption_width=0
WHERE tab='Data' AND section_group IN ('Values','Cart','Cart columns','Cart totals')
AND property_key IN (
'imageSource','textSource','label','badgeText','defaultValue','defaultCheck',
'column2Source','column3Source','column4Source','column5Source',
'subtotalValue','totalValue','taxValue','discountValue','columnVisibility'
);
