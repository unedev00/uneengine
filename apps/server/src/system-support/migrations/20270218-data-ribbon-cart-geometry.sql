-- Additive Data-tab geometry correction. Metadata placement is SQL-owned.
-- 100px expression chips => 110px; 105px Default Check => 116px.
-- Column Visibility previously occupied a 105px SQL slot while its actual
-- multiselect control rendered at 155px. Give it a 171px matching track.
-- Do not mutate customer pages, saved formulas, selection or record data.
UPDATE md_builder_shared_properties
SET design_width=CASE
  WHEN property_key='columnVisibility' THEN 171
  WHEN property_key='defaultCheck' THEN 116
  ELSE 110
END
WHERE tab='Data'
  AND section_group IN ('Values','Cart','Cart columns','Cart totals')
  AND property_key IN (
    'imageSource','textSource','label','badgeText','defaultValue','defaultCheck',
    'column2Source','column3Source','column4Source','column5Source',
    'subtotalValue','totalValue','taxValue','discountValue','columnVisibility'
  );
