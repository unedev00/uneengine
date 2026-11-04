-- Badge Visible is a layout option, not a colour/design option.
-- Shared property inventory is the single source of truth; both Smart Card
-- Grid and Smart Image already use this property and its existing enabled rules.
-- Keep the Badge visibility button in the Design 2 context row unchanged.
UPDATE md_builder_shared_properties
SET tab='Layout',section_group='Badge'
WHERE property_key='badgeVisible' AND tab<>'Home';
