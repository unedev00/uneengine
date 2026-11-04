-- Retire Layout only when every known component Layout property has a Design 2
-- editor or an explicitly requested removal. Preserve keys, rules and saved values.
-- Fail safely if future/unreviewed Layout properties exist.
DO $$
DECLARE unexpected text;
BEGIN
 SELECT string_agg(property_key, ', ' ORDER BY property_key) INTO unexpected
 FROM md_builder_shared_properties
 WHERE tab='Layout' AND scope='component'
   AND property_key NOT IN (
     'width','height','x','y',
     'tabWidth','tabHeight','tabCount','tabIndex','tabOrientation',
     'cardsPerRow','cardsPerColumn',
     'imageHeight','headerBoxHeight','supportingBoxHeight',
     'navigationDirection','showDays','firstDay',
     'imageFill','imagePlacement','imageBorderColor','imageBackgroundColor',
     'iconFillColor','badgeVisible',
     'defaultCheck','columnVisibility'
   );
 IF unexpected IS NOT NULL THEN
   RAISE EXCEPTION 'Layout cannot retire: unmapped component properties: %', unexpected;
 END IF;
END $$;

-- Explicitly retire the two unwanted controls from ALL component ribbon
-- applicability rules. Keep definitions and saved values for runtime compatibility.
UPDATE md_builder_ribbon_component_rules
SET enabled=false
WHERE property_key IN ('defaultCheck','columnVisibility');

-- Move remaining component metadata without deleting or renaming properties.
-- Design 2 owns canonical shared keys, component enablement, and current values.
UPDATE md_builder_shared_properties
SET tab='Design2'
WHERE tab='Layout' AND scope='component';

-- Verify Layout is empty before the retired navigation is allowed to ship.
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM md_builder_shared_properties
           WHERE tab='Layout' AND scope='component') THEN
   RAISE EXCEPTION 'Layout retirement failed: component metadata remains';
 END IF;
END $$;
