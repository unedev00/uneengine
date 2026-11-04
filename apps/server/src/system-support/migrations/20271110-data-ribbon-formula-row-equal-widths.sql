-- Data tab geometry: formula occupies the entire first row in the browser.
-- The Source, Values and Cart sections render below it on metadata-driven rows.
-- Keep existing property mappings, component applicability and user data intact.
-- Equal text/formula chip widths prevent neighboring controls from overlapping.
UPDATE md_builder_shared_properties
SET design_width=210, design_height=26
WHERE tab='Data' AND section_group='Source'
  AND property_key IN ('objectApiName','objectApiName2','objectApiName3');

UPDATE md_builder_shared_properties
SET design_width=160, design_height=26, design_caption_width=0
WHERE tab='Data' AND section_group='Values'
  AND property_key IN (
    'imageSource','textSource','label','badgeText','defaultValue','defaultCheck'
  );

UPDATE md_builder_shared_properties
SET design_width=CASE WHEN property_key='columnVisibility' THEN 171 ELSE 160 END,
    design_height=26, design_caption_width=0
WHERE tab='Data' AND section_group='Cart'
  AND property_key IN (
    'column2Source','column3Source','column4Source','column5Source',
    'subtotalValue','totalValue','taxValue','discountValue','columnVisibility'
  );
