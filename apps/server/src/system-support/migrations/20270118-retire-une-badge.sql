-- Retire the system UNE Badge everywhere without deleting customer-authored
-- components that happen to share an API name with a different renderer.
-- Acetill's two badge headers are removed. Other saved system Badge instances
-- become display-only UNE Input so their content, layouts and bindings survive.
INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled)
SELECT id,'une_input','one-bundled:une_input',true FROM md_tenants
ON CONFLICT(tenant_id,api_name) DO NOTHING;

-- Remove the two Acetill badges from live and versioned Page Builder pages.
DELETE FROM md_lightning_page_nodes n USING md_page_definitions p,
 md_component_definitions d
WHERE n.tenant_id=p.tenant_id AND n.page_id=p.id
 AND p.api_name IN ('AcetillRegister','AcetillReceipt')
 AND n.component_type IN ('Custom:une_badge','Custom:OneBadge')
 AND d.tenant_id=n.tenant_id AND d.api_name='une_badge'
 AND d.renderer_key='one-bundled:une_badge';
DELETE FROM md_page_layout_version_nodes n USING md_page_definitions p,
 md_component_definitions d
WHERE n.tenant_id=p.tenant_id AND n.page_id=p.id
 AND p.api_name IN ('AcetillRegister','AcetillReceipt')
 AND n.component_type IN ('Custom:une_badge','Custom:OneBadge')
 AND d.tenant_id=n.tenant_id AND d.api_name='une_badge'
 AND d.renderer_key='one-bundled:une_badge';

-- Acetill legacy package pages use md_page_components. Drop dependent seed
-- bookkeeping first; md_page_component_properties cascade with each instance.
DELETE FROM md_app_seed_pages sp USING md_page_components c,md_page_definitions p,
 md_component_definitions d
WHERE sp.tenant_id=c.tenant_id AND sp.component_id=c.id
 AND p.tenant_id=c.tenant_id AND p.id=c.page_id
 AND p.api_name IN ('AcetillRegister','AcetillReceipt')
 AND c.component_api IN ('une_badge','OneBadge')
 AND d.tenant_id=c.tenant_id AND d.api_name=c.component_api
 AND d.renderer_key='one-bundled:'||c.component_api;
DELETE FROM md_page_components c USING md_page_definitions p,md_component_definitions d
WHERE p.tenant_id=c.tenant_id AND p.id=c.page_id
 AND p.api_name IN ('AcetillRegister','AcetillReceipt')
 AND c.component_api IN ('une_badge','OneBadge')
 AND d.tenant_id=c.tenant_id AND d.api_name=c.component_api
 AND d.renderer_key='one-bundled:'||c.component_api;

-- Other page instances preserve their identifiers, geometry, labels and bindings.
INSERT INTO md_lightning_page_node_properties
 (tenant_id,page_id,component_key,property_path,value_kind,value_text)
SELECT n.tenant_id,n.page_id,n.component_key,'/props/allowTyping','boolean','false'
FROM md_lightning_page_nodes n
JOIN md_component_definitions d ON d.tenant_id=n.tenant_id
 AND d.api_name='une_badge' AND d.renderer_key='one-bundled:une_badge'
WHERE n.component_type IN ('Custom:une_badge','Custom:OneBadge')
ON CONFLICT DO NOTHING;
UPDATE md_lightning_page_node_properties p SET property_path='/props/value'
WHERE p.property_path='/props/text'
 AND EXISTS (SELECT 1 FROM md_lightning_page_nodes n
 JOIN md_component_definitions d ON d.tenant_id=n.tenant_id
  AND d.api_name='une_badge' AND d.renderer_key='one-bundled:une_badge'
 WHERE n.tenant_id=p.tenant_id AND n.page_id=p.page_id
 AND n.component_key=p.component_key
 AND n.component_type IN ('Custom:une_badge','Custom:OneBadge'))
 AND NOT EXISTS (SELECT 1 FROM md_lightning_page_node_properties v
 WHERE v.tenant_id=p.tenant_id AND v.page_id=p.page_id
 AND v.component_key=p.component_key AND v.property_path='/props/value');
UPDATE md_lightning_page_node_properties p SET property_path='/props/stateBindings/value'
WHERE p.property_path='/props/stateBindings/text'
 AND EXISTS (SELECT 1 FROM md_lightning_page_nodes n
 JOIN md_component_definitions d ON d.tenant_id=n.tenant_id
  AND d.api_name='une_badge' AND d.renderer_key='one-bundled:une_badge'
 WHERE n.tenant_id=p.tenant_id AND n.page_id=p.page_id
 AND n.component_key=p.component_key
 AND n.component_type IN ('Custom:une_badge','Custom:OneBadge'))
 AND NOT EXISTS (SELECT 1 FROM md_lightning_page_node_properties v
 WHERE v.tenant_id=p.tenant_id AND v.page_id=p.page_id
 AND v.component_key=p.component_key AND v.property_path='/props/stateBindings/value');
UPDATE md_lightning_page_nodes n SET component_type='Custom:une_input'
FROM md_component_definitions d
WHERE d.tenant_id=n.tenant_id AND d.api_name='une_badge'
 AND d.renderer_key='one-bundled:une_badge'
 AND n.component_type IN ('Custom:une_badge','Custom:OneBadge');

INSERT INTO md_page_layout_version_properties
 (tenant_id,page_id,variant,version,component_key,property_path,value_kind,value_text)
SELECT n.tenant_id,n.page_id,n.variant,n.version,n.component_key,
 '/props/allowTyping','boolean','false'
FROM md_page_layout_version_nodes n
JOIN md_component_definitions d ON d.tenant_id=n.tenant_id
 AND d.api_name='une_badge' AND d.renderer_key='one-bundled:une_badge'
WHERE n.component_type IN ('Custom:une_badge','Custom:OneBadge')
ON CONFLICT DO NOTHING;
UPDATE md_page_layout_version_properties p SET property_path='/props/value'
WHERE p.property_path='/props/text'
 AND EXISTS (SELECT 1 FROM md_page_layout_version_nodes n
 JOIN md_component_definitions d ON d.tenant_id=n.tenant_id
  AND d.api_name='une_badge' AND d.renderer_key='one-bundled:une_badge'
 WHERE n.tenant_id=p.tenant_id AND n.page_id=p.page_id
 AND n.variant=p.variant AND n.version=p.version AND n.component_key=p.component_key
 AND n.component_type IN ('Custom:une_badge','Custom:OneBadge'))
 AND NOT EXISTS (SELECT 1 FROM md_page_layout_version_properties v
 WHERE v.tenant_id=p.tenant_id AND v.page_id=p.page_id
 AND v.variant=p.variant AND v.version=p.version
 AND v.component_key=p.component_key AND v.property_path='/props/value');
UPDATE md_page_layout_version_properties p SET property_path='/props/stateBindings/value'
WHERE p.property_path='/props/stateBindings/text'
 AND EXISTS (SELECT 1 FROM md_page_layout_version_nodes n
 JOIN md_component_definitions d ON d.tenant_id=n.tenant_id
  AND d.api_name='une_badge' AND d.renderer_key='one-bundled:une_badge'
 WHERE n.tenant_id=p.tenant_id AND n.page_id=p.page_id
 AND n.variant=p.variant AND n.version=p.version AND n.component_key=p.component_key
 AND n.component_type IN ('Custom:une_badge','Custom:OneBadge'))
 AND NOT EXISTS (SELECT 1 FROM md_page_layout_version_properties v
 WHERE v.tenant_id=p.tenant_id AND v.page_id=p.page_id
 AND v.variant=p.variant AND v.version=p.version
 AND v.component_key=p.component_key AND v.property_path='/props/stateBindings/value');
UPDATE md_page_layout_version_nodes n SET component_type='Custom:une_input'
FROM md_component_definitions d
WHERE d.tenant_id=n.tenant_id AND d.api_name='une_badge'
 AND d.renderer_key='one-bundled:une_badge'
 AND n.component_type IN ('Custom:une_badge','Custom:OneBadge');

-- Older package component properties have the same text/value contract.
INSERT INTO md_page_component_properties(tenant_id,component_id,property_path,value_text,data_type)
SELECT c.tenant_id,c.id,'allowTyping','false','boolean'
FROM md_page_components c
JOIN md_component_definitions d ON d.tenant_id=c.tenant_id
 AND d.api_name=c.component_api AND d.renderer_key='one-bundled:'||c.component_api
WHERE c.component_api IN ('une_badge','OneBadge')
ON CONFLICT DO NOTHING;
UPDATE md_page_component_properties p SET property_path='value'
WHERE p.property_path='text'
 AND EXISTS (SELECT 1 FROM md_page_components c
 JOIN md_component_definitions d ON d.tenant_id=c.tenant_id
  AND d.api_name=c.component_api AND d.renderer_key='one-bundled:'||c.component_api
 WHERE c.tenant_id=p.tenant_id AND c.id=p.component_id
 AND c.component_api IN ('une_badge','OneBadge'))
 AND NOT EXISTS (SELECT 1 FROM md_page_component_properties v
 WHERE v.tenant_id=p.tenant_id AND v.component_id=p.component_id
 AND v.property_path='value');
UPDATE md_page_components c SET component_api='une_input'
FROM md_component_definitions d
WHERE d.tenant_id=c.tenant_id AND d.api_name=c.component_api
 AND d.renderer_key='one-bundled:'||c.component_api
 AND c.component_api IN ('une_badge','OneBadge');

-- Remove Badge from every published Acetill package version and installation
-- template. Keep unrelated tenant-specific custom component registrations.
DELETE FROM md_app_package_page_property_templates
WHERE component_api='une_badge';
DELETE FROM md_app_package_page_component_templates
WHERE component_api='une_badge';
DELETE FROM md_app_package_resources
WHERE resource_type='Component' AND api_name='une_badge';
DELETE FROM md_app_package_component_templates
WHERE api_name='une_badge' AND renderer_key='one-bundled:une_badge';

-- Exact metadata references in Flow and quick actions remain operational as
-- display-only Input instead of pointing to a deleted renderer.
UPDATE md_flow_editor_values SET value_text='une_input'
WHERE value_kind='string' AND value_text='une_badge'
 AND property_path ~ '(^|/)(componentApiName|customComponentApiName|libraryComponentId)$';
UPDATE md_flow_node_properties SET value_text='une_input'
WHERE value_text='une_badge'
 AND api_name IN ('componentApiName','customComponentApiName','libraryComponentId');
UPDATE md_object_actions SET component_api_name='une_input'
WHERE component_api_name='une_badge';
UPDATE md_global_quick_actions SET component_api_name='une_input'
WHERE component_api_name='une_badge';

-- Explicitly retire platform-owned registrations; never delete a customer's
-- independently authored renderer or its component versions.
UPDATE md_component_definitions SET enabled=false
WHERE api_name='une_badge' AND renderer_key='one-bundled:une_badge';
