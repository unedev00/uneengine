-- Smart Textbox uses the ONE global property inventory and the existing
-- shared component renderer. Only the "Yes" controls from the approved
-- Smart Textbox table are enabled; Arrange, View and Advanced are generic
-- Page Builder commands, not duplicate SQL component properties.
-- Remarks:
-- label = caption (left); textSource = textbox value (right);
-- backgroundColor/labelColor/labelAlignment = left;
-- shadow/borderColor/radius/textSize = overall;
-- wrapText/headerTextColor/headerAlignment/headerBodyColor/headerBold = right;
-- supportingBorderColor/supportingBold/supportingTextColor/supportingAlignment
-- = right textbox's inner supporting/value presentation.
INSERT INTO md_builder_ribbon_components(component_api)
VALUES ('smart_textbox') ON CONFLICT(component_api) DO NOTHING;

WITH allowed(property_key) AS (
 VALUES
 ('label'),('textSource'),
 ('backgroundColor'),('labelColor'),('shadow'),('borderColor'),('radius'),
 ('wrapText'),('headerTextColor'),('headerAlignment'),('headerBodyColor'),('headerBold'),
 ('supportingBorderColor'),('supportingBold'),('supportingTextColor'),('supportingAlignment'),
 ('labelAlignment'),('textSize'),
 ('width'),('height'),('x'),('y')
)
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled)
SELECT 'smart_textbox',p.property_key,true
FROM allowed JOIN md_builder_shared_properties p USING(property_key)
ON CONFLICT(component_api,property_key) DO NOTHING;

-- Fresh tenants use the shared component seeder. Pre-existing tenants gain the
-- same enabled bundle without overwriting custom component metadata or pages.
INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled)
SELECT id,'smart_textbox','one-bundled:smart_textbox',true FROM md_tenants
ON CONFLICT(tenant_id,api_name) DO NOTHING;
