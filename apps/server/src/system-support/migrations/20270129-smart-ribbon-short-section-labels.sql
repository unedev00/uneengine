-- Forward-only Smart Ribbon label polish for the approved Badge and Image layouts.
-- The section caption already supplies context; change metadata labels only,
-- not keys, values, component applicability, Home, or tenant customisations.
UPDATE md_builder_shared_properties
SET label=CASE property_key
  WHEN 'badgeAlignment' THEN 'Alignment'
  WHEN 'badgeVisible' THEN 'Visible'
  WHEN 'badgeTextSize' THEN 'Text Size'
  WHEN 'imagePlacement' THEN 'Placement'
  WHEN 'imageBorderColor' THEN 'Border'
  WHEN 'imageFill' THEN 'Fill'
  ELSE label
END
WHERE tab='Design' AND scope='component'
  AND (
    (section_group='Badge' AND property_key IN
      ('badgeAlignment','badgeVisible','badgeTextSize'))
    OR
    (section_group='Image' AND property_key IN
      ('imagePlacement','imageBorderColor','imageFill'))
  );
