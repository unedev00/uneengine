-- Smart Table: enable only existing shared Builder properties, without
-- duplicating the Cart ribbon or changing customer-authored component values.
-- Source: @Object or TABLE(@Object,@Field,...) in existing textSource Formula Bar.
INSERT INTO md_builder_ribbon_components(component_api)
VALUES ('smart_table') ON CONFLICT(component_api) DO NOTHING;

WITH permitted(property_key) AS (
 VALUES
 -- Source objects, formula bindings and reusable column overrides
 ('objectApiName'),('objectApiName2'),('objectApiName3'),('textSource'),
 ('column2Source'),('column3Source'),('column4Source'),('column5Source'),
 -- Body
 ('backgroundColor'),('shadow'),('borderColor'),('radius'),
 -- Header
 ('wrapText'),('headerTextColor'),('headerAlignment'),('headerBodyColor'),
 ('headerBorderColor'),('headerBold'),
 -- Row, selection and summary
 ('rowBorderColor'),('rowRadius'),('rowHeight'),('rowLabelColor'),
 ('selectedRowColor'),('selectedRowBorderColor'),
 ('summaryBackgroundColor'),('summaryTextColor'),('summaryTextSize'),
 ('summaryBorderColor'),('summaryHeight'),('summaryTextWeight'),
 ('summaryRadius'),('summaryWidth'),('summaryShadow'),
 -- Table
 ('tableBackgroundColor'),('tableRadius'),('tableShadow'),('tableBorderColor'),
 -- Typography
 ('labelAlignment'),('defaultValueColor'),('textSize'),
 -- Shared canvas layout
 ('width'),('height'),('x'),('y')
)
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled)
SELECT 'smart_table',p.property_key,true
FROM permitted
JOIN md_builder_shared_properties p USING(property_key)
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;

-- Register an installed, platform-owned renderer for existing tenants.
-- Preserve tenant-owned component overrides and page instances.
INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled)
SELECT id,'smart_table','one-bundled:smart_table',true FROM md_tenants
ON CONFLICT(tenant_id,api_name) DO NOTHING;
