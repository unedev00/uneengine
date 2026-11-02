-- Smart Tabs now obtain every tab (including index zero) from the same
-- authored Collection/Object source. Retire the three redundant synthetic-tab
-- controls. Preserve existing SQL metadata and customer-authored page values;
-- do not mutate published pages, objects, records or tenant customisations.
-- This also executes on fresh installs AFTER the original additive migrations.
UPDATE md_builder_ribbon_component_rules
SET enabled=false
WHERE component_api='smart_tabs'
  AND property_key IN ('firstTabCustom','firstTabCaption','firstTabValue');
