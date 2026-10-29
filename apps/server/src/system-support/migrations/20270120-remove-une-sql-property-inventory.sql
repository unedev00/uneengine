-- UNE components are app-owned renderers. Their SQL registry identities remain
-- available so saved pages and flows continue to resolve the same component.
-- Only the metadata property inventory is retired. Do not delete pages,
-- component registrations, authored instance values, tenant objects or flows.
DELETE FROM md_component_library_contract_properties
 WHERE left(component_api,4)='une_';
