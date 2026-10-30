-- New Smart Cart is a reusable visual component, not an AceTill modification.
-- Forward-only migration: no changes to published pages or tenant business records.
INSERT INTO md_builder_ribbon_components(component_api) VALUES ('smart_cart') ON CONFLICT DO NOTHING;
WITH specs(n,property_key,label,tab,section_group,control_kind,default_value) AS (
 VALUES
 (1,'headerTextColor','Header Text Color','Design','Header','color',NULL::jsonb),
 (2,'supportingBoxHeight','Box Height','Layout','Header Supporting','number','36'::jsonb),
 (3,'supportingBorderColor','Border','Design','Header Supporting','color',NULL::jsonb),
 (4,'supportingAlignment','Alignment','Design','Header Supporting','align',NULL::jsonb),
 (5,'supportingBold','Bold','Design','Header Supporting','boolean','false'::jsonb),
 (6,'supportingTextColor','Text Color','Design','Header Supporting','color',NULL::jsonb),
 (7,'tableBackgroundColor','Body Color','Design','Table','color',NULL::jsonb),
 (8,'tableBorderColor','Border color','Design','Table','color',NULL::jsonb),
 (9,'tableShadow','Shadow','Design','Table','shadow',NULL::jsonb),
 (10,'tableRadius','Corner Radius','Design','Table','number','8'::jsonb),
 (11,'rowBorderColor','Border color','Design','Row','color',NULL::jsonb),
 (12,'rowLabelColor','Label Color','Design','Row','color',NULL::jsonb),
 (13,'rowRadius','Corner Radius','Design','Row','number','4'::jsonb),
 (14,'rowHeight','Height','Design','Row','number','64'::jsonb),
 (15,'summaryBackgroundColor','Body Color','Design','Summary','color',NULL::jsonb),
 (16,'summaryBorderColor','Border color','Design','Summary','color',NULL::jsonb),
 (17,'summaryShadow','Shadow','Design','Summary','shadow',NULL::jsonb),
 (18,'summaryRadius','Corner Radius','Design','Summary','number','8'::jsonb),
 (19,'summaryHeight','Height','Design','Summary','number','148'::jsonb),
 (20,'summaryWidth','Width','Design','Summary','number',NULL::jsonb),
 (21,'summaryTextSize','Summary text Size','Design','Summary','number','14'::jsonb),
 (22,'summaryTextWeight','Summary text Weight','Design','Summary','boolean','false'::jsonb),
 (23,'summaryTextColor','Summary text Color','Design','Summary','color',NULL::jsonb),
 (24,'summary2TextSize','Summary 2 text Size','Design','Summary','number','18'::jsonb),
 (25,'summary2TextWeight','Summary 2 text Weight','Design','Summary','boolean','true'::jsonb),
 (26,'summary2TextColor','Summary 2 text Color','Design','Summary','color',NULL::jsonb)
), missing AS (
 SELECT specs.*,row_number() OVER (ORDER BY n) AS pos FROM specs
 WHERE NOT EXISTS (SELECT 1 FROM md_builder_shared_properties p WHERE p.property_key=specs.property_key)
), last_order AS (SELECT COALESCE(MAX(sort_order),0) AS last_sort FROM md_builder_shared_properties)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope)
SELECT property_key,label,tab,section_group,control_kind,last_sort+pos,default_value,'[]'::jsonb,'component'
FROM missing CROSS JOIN last_order
ON CONFLICT(property_key) DO NOTHING;

-- Explicit applicability. Properties marked No remain disabled for Smart Cart.
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
SELECT 'smart_cart', keys.property_key,true,NULL,NULL,
 CASE keys.property_key WHEN 'imageHeight' THEN '44'::jsonb
  WHEN 'headerBoxHeight' THEN '52'::jsonb
  WHEN 'imagePlacement' THEN '"left"'::jsonb ELSE NULL END,
 CASE WHEN keys.property_key='imagePlacement' THEN '["left","right"]'::jsonb ELSE NULL END
FROM (VALUES
 ('objectApiName'),
 ('imageSource'),
 ('textSource'),
 ('backgroundColor'),
 ('borderColor'),
 ('shadow'),
 ('radius'),
 ('imagePlacement'),
 ('imageHeight'),
 ('imageBorderColor'),
 ('imageFill'),
 ('headerBoxHeight'),
 ('headerBorderColor'),
 ('headerAlignment'),
 ('headerBold'),
 ('headerTextColor'),
 ('width'),
 ('height'),
 ('x'),
 ('y'),
 ('headerTextColor'),
 ('supportingBoxHeight'),
 ('supportingBorderColor'),
 ('supportingAlignment'),
 ('supportingBold'),
 ('supportingTextColor'),
 ('tableBackgroundColor'),
 ('tableBorderColor'),
 ('tableShadow'),
 ('tableRadius'),
 ('rowBorderColor'),
 ('rowLabelColor'),
 ('rowRadius'),
 ('rowHeight'),
 ('summaryBackgroundColor'),
 ('summaryBorderColor'),
 ('summaryShadow'),
 ('summaryRadius'),
 ('summaryHeight'),
 ('summaryWidth'),
 ('summaryTextSize'),
 ('summaryTextWeight'),
 ('summaryTextColor'),
 ('summary2TextSize'),
 ('summary2TextWeight'),
 ('summary2TextColor')
) AS keys(property_key)
JOIN md_builder_shared_properties p ON p.property_key=keys.property_key
ON CONFLICT(component_api,property_key) DO UPDATE SET
 enabled=EXCLUDED.enabled,default_value_override=EXCLUDED.default_value_override,
 choices_override=EXCLUDED.choices_override;

-- Register renderer for existing tenants without overwriting custom tenant components.
INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled)
SELECT id,'smart_cart','one-bundled:smart_cart',true FROM md_tenants
ON CONFLICT(tenant_id,api_name) DO NOTHING;
