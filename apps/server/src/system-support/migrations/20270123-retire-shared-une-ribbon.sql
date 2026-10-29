-- Retire shared UNE ribbon rules without changing the shared Home property list.
-- App-owned and legacy page instances retain their authorised runtime assets.
DELETE FROM md_builder_ribbon_components WHERE component_api ~ '^une_';
DELETE FROM md_component_library_contract_properties
 WHERE component_api ~ '^une_';
