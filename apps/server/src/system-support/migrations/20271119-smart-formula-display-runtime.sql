-- Formula-bound Smart Text renders by its runtime content source, not by a
-- user-configurable Design 2/Text Mode property. Existing instance properties
-- are preserved for legacy display pages; no tenant data is rewritten.
-- Forward-only and repeatable: remove the obsolete property from the shared
-- metadata catalog, the ribbon applicability matrix, and Design 2 slots.
DELETE FROM md_builder_design2_slot_rules
WHERE property_key='displayMode';

DELETE FROM md_builder_design2_slots
WHERE area='Body' AND slot_key='textMode' AND property_key='displayMode';

DELETE FROM md_builder_ribbon_component_rules
WHERE property_key='displayMode';

DELETE FROM md_builder_shared_properties
WHERE property_key='displayMode';
