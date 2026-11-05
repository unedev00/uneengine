-- Image area size is orientation-specific for the shared Smart Image and
-- Smart Card Grid renderers. Only metadata/ribbon rules change; existing
-- tenant-authored values, installed apps and records are never rewritten.
-- The shared imageWidth definition already exists (20270311).
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled)
SELECT 'smart_image',p.property_key,true
FROM md_builder_shared_properties p
JOIN md_builder_ribbon_components c ON c.component_api='smart_image'
WHERE p.property_key='imageWidth'
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;

-- Bind both dimensions to the Image dropdown instead of component frame size.
-- Preserve any other component's existing Image slots.
INSERT INTO md_builder_design2_slot_rules
 (component_api,area,slot_key,property_key)
SELECT c.component_api,'Image',v.slot_key,v.property_key
FROM (VALUES ('smart_image'),('smart_card_grid')) AS c(component_api)
JOIN (VALUES ('height','imageHeight'),('width','imageWidth')) AS v(slot_key,property_key)
  ON true
JOIN md_builder_ribbon_components component
  ON component.component_api=c.component_api
JOIN md_builder_shared_properties property
  ON property.property_key=v.property_key
ON CONFLICT(component_api,area,slot_key)
 DO UPDATE SET property_key=EXCLUDED.property_key;

-- Width edits are meaningful only for left/right image placement; height
-- edits only for top/bottom (including the historical default/empty value).
UPDATE md_builder_ribbon_component_rules
SET enabled_when_override='{"property":"imagePlacement","in":["left","right"]}'::jsonb
WHERE component_api IN ('smart_image','smart_card_grid')
  AND property_key='imageWidth';

UPDATE md_builder_ribbon_component_rules
SET enabled_when_override='{"property":"imagePlacement","in":["","top","bottom"]}'::jsonb
WHERE component_api IN ('smart_image','smart_card_grid')
  AND property_key='imageHeight';
