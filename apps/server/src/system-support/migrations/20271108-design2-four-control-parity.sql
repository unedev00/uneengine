-- Reuse the four approved Design 2 control slots for their existing
-- component properties. No slot position, visual control or tenant page changes.
-- Body Focus uses the existing Focus Color palette icon (R2 C1); Image Fit
-- uses the existing image Fill/Fit/Stretch icon dropdown (R3 C6).
--
-- All four target properties already have native renderer hooks and original
-- Design/Layout ribbon definitions. Never introduce dead alias properties.
INSERT INTO md_builder_design2_slot_rules
 (component_api,area,slot_key,property_key)
VALUES
 ('smart_calendar','Body','focused','defaultValueColor'),
 ('smart_card_grid','Body','wrap','wrapText'),
 ('smart_navigation','Image','imageFill','imageFill'),
 ('smart_toggle','Body','shape','shapeId')
ON CONFLICT(component_api,area,slot_key)
DO UPDATE SET property_key=EXCLUDED.property_key;

-- Respect the global shared-property catalogue and existing per-component
-- overrides. Re-enable only these exact approved component/property pairs.
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled)
SELECT approved.component_api,approved.property_key,true
FROM (VALUES
 ('smart_calendar','defaultValueColor'),
 ('smart_card_grid','wrapText'),
 ('smart_navigation','imageFill'),
 ('smart_toggle','shapeId')
) AS approved(component_api,property_key)
JOIN md_builder_ribbon_components component
  ON component.component_api=approved.component_api
JOIN md_builder_shared_properties property
  ON property.property_key=approved.property_key
ON CONFLICT(component_api,property_key)
DO UPDATE SET enabled=true;
