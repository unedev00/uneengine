-- Design 2 R0 C3/C4: reuse the global x/y canvas POSITION keys.
-- The same properties remain in Layout. Do not create duplicate values,
-- change R1-R3 SQL slots, or alter tenant page/instance data.
-- smart_input is listed in the approved table but is not in the current
-- bundled Smart component registry; its rule is conditional on registration.
WITH requested(component_api) AS (
 VALUES
 ('smart_button'),
 ('smart_calendar'),
 ('smart_card_grid'),
 ('smart_cart'),
 ('smart_container'),
 ('smart_icon'),
 ('smart_image'),
 ('smart_lookup'),
 ('smart_navigation'),
 ('smart_table'),
 ('smart_tabs'),
 ('smart_text'),
 ('smart_textbox'),
 ('smart_toggle'),
 ('smart_input')
)
INSERT INTO md_builder_ribbon_component_rules(component_api,property_key,enabled)
SELECT c.component_api,p.property_key,true
FROM requested r
JOIN md_builder_ribbon_components c ON c.component_api=r.component_api
JOIN md_builder_shared_properties p ON p.property_key IN ('x','y')
  AND p.control_kind='position'
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;
