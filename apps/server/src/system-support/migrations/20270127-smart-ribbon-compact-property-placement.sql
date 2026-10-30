-- Smart Page Builder ribbon finishing changes.
-- Metadata-only: leave saved page/component property values and tenant rules intact.
-- The shared property catalog owns both tab/section placement and displayed labels.
UPDATE md_builder_shared_properties
SET tab='Data', section_group='Values'
WHERE property_key='defaultCheck';

-- The Header caption already provides the context: don't repeat "Header" in its controls.
UPDATE md_builder_shared_properties
SET label=CASE property_key
  WHEN 'headerBorderColor' THEN 'Border'
  WHEN 'headerAlignment' THEN 'Alignment'
  ELSE label
END
WHERE property_key IN ('headerBorderColor','headerAlignment')
  AND tab='Design' AND section_group='Header';
