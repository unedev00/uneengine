-- Compact SQL-backed Page Builder Layout ribbon geometry.
-- Global presentation metadata only: preserves tenant pages, saved properties,
-- component applicability, version history and business records.
-- Safe to rerun: every target receives the same row/order/width.
WITH compact_layout(property_key, section_group, row_no, width_px) AS (
 VALUES
  ('x',               'Position',          1, 70),
  ('y',               'Position',          2, 70),
  ('cardsPerRow',     'Cards',             1, 70),
  ('cardsPerColumn',  'Cards',             2, 70),
  ('showDays',        'Calendar',          1, 60),
  ('firstDay',        'Calendar',          2, 84),
  ('supportingBoxHeight', 'Header Supporting', 1, 70)
)
UPDATE md_builder_shared_properties AS properties
SET design_row=compact_layout.row_no,
    design_order=1,
    design_width=compact_layout.width_px,
    design_height=26
FROM compact_layout
WHERE properties.tab='Layout'
  AND properties.section_group=compact_layout.section_group
  AND properties.property_key=compact_layout.property_key;
