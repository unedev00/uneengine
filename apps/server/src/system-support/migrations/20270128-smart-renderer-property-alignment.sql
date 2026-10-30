-- Align enabled Smart ribbon controls with their actual metadata-driven renderer contracts.
-- Keep the global property inventory visible; unsupported controls are disabled.
-- Additive upgrade: preserve authored page values, published pages, tenant data and Home.
UPDATE md_builder_ribbon_component_rules
SET enabled=false
WHERE (component_api='smart_toggle' AND property_key='radius')
   OR (component_api='smart_card_grid' AND property_key IN
  ('label','labelAlignment','defaultValueColor','textSize'))
   OR (component_api='smart_calendar' AND property_key IN
  ('label','labelAlignment'))
   OR (component_api='smart_container' AND property_key IN
  ('label','labelAlignment','labelColor','textSize','objectApiName',
   'imageSource','textSource','badgeText','badgeAlignment','badgeTextSize',
   'badgeBold','badgeTextColor','badgeVisible','badgeBodyColor','imageFill'));
