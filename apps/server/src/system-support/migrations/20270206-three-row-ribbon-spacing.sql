-- Follow-up to the approved SQL-backed three-row Design ribbon.
-- Widen only the currently default-sized icon dropdowns, preserving tenant
-- customisations and all published component property values.
UPDATE md_builder_shared_properties
SET design_width = 35
WHERE tab = 'Design'
  AND design_display = 'dropdown'
  AND property_key IN ('shadow', 'labelAlignment', 'headerAlignment', 'supportingAlignment')
  AND design_width = 28;
