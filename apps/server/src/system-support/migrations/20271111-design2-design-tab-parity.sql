-- Design 2 parity before the legacy Design tab is retired.
-- Every property below is already defined, already enabled for the component
-- and already read by its renderer, but had no Design 2 cell. Each is placed
-- in an EXISTING fixed R/C slot of the matching dropdown; no slot moves, no new
-- property definitions, no tenant page or instance data changes.
INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
SELECT approved.component_api,approved.area,approved.slot_key,approved.property_key
FROM (VALUES
 -- Smart Table: Table dropdown
 ('smart_table','Table','fill','tableBackgroundColor'),
 ('smart_table','Table','border','tableBorderColor'),
 ('smart_table','Table','radius','tableRadius'),
 ('smart_table','Table','shadow','tableShadow'),
 ('smart_table','Table','focused','selectedRowColor'),
 -- Smart Table: Row and Footer (summary) corner radius / shadow
 ('smart_table','Row','radius','rowRadius'),
 ('smart_table','Footer','radius','summaryRadius'),
 ('smart_table','Footer','shadow','summaryShadow'),
 -- Smart Cart
 ('smart_cart','Row','radius','rowRadius'),
 ('smart_cart','Summary','radius','summaryRadius'),
 ('smart_cart','Summary','shadow','summaryShadow'),
 ('smart_cart','Table','shadow','tableShadow'),
 -- Smart Image: Header dropdown
 ('smart_image','Header','alignment','headerAlignment'),
 ('smart_image','Header','border','headerBorderColor')
) AS approved(component_api,area,slot_key,property_key)
JOIN md_builder_ribbon_components component
  ON component.component_api=approved.component_api
JOIN md_builder_shared_properties property
  ON property.property_key=approved.property_key
-- Never replace a cell that the approved matrix already assigned.
ON CONFLICT(component_api,area,slot_key) DO NOTHING;

-- Selected Row Border is retired for Smart Cart and Smart Table: the renderers
-- no longer read it (a selected row keeps its normal row border). The shared
-- definition and any saved values are kept; only applicability is switched off.
UPDATE md_builder_ribbon_component_rules
SET enabled=false
WHERE property_key='selectedRowBorderColor'
  AND component_api IN ('smart_cart','smart_table');

-- Per-component edit condition, alongside the global enabled_when.
ALTER TABLE md_builder_ribbon_component_rules
 ADD COLUMN IF NOT EXISTS enabled_when_override jsonb;

-- Smart Card Grid image size lives in the Image dropdown: Width R2C4 only for
-- left/right images, Height R2C3 only for top/bottom (unset = top).
-- Smart Image and Smart Cart keep using Image Height without a condition.
INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
SELECT 'smart_card_grid','Image',approved.slot_key,approved.property_key
FROM (VALUES ('width','imageWidth'),('height','imageHeight'))
  AS approved(slot_key,property_key)
JOIN md_builder_ribbon_components component ON component.component_api='smart_card_grid'
JOIN md_builder_shared_properties property ON property.property_key=approved.property_key
ON CONFLICT(component_api,area,slot_key) DO NOTHING;

UPDATE md_builder_ribbon_component_rules
SET enabled_when_override='{"property":"imagePlacement","in":["","top","bottom"]}'::jsonb
WHERE component_api='smart_card_grid' AND property_key='imageHeight';
