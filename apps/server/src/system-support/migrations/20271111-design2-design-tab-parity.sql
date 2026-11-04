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
