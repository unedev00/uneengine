-- Reset the builder to its existing Home-only shared property inventory.
-- Saved component values, authored page versions and app business data are untouched.
DELETE FROM md_builder_shared_properties WHERE tab <> 'Home';
-- Legacy UNE contract rows are not the retained app-owned runtime values.
DELETE FROM md_component_library_contract_properties WHERE left(component_api,4)='une_';

-- Acetill installs and owns the Cart identity, preserving the old shared renderer
-- for other already-saved pages. Never change the component instance ID or props.
INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled)
SELECT i.tenant_id,'acetill_cart','one-bundled:acetill_cart',true
FROM md_app_installations i
JOIN md_apps a ON a.id=i.app_id AND a.api_name='Acetill'
ON CONFLICT(tenant_id,api_name) DO NOTHING;

-- Migrate only Acetill's two Cart placements, not other tenant pages.
UPDATE md_page_components c SET component_api='acetill_cart'
FROM md_page_definitions p, md_app_installations i, md_apps a
WHERE c.tenant_id=p.tenant_id AND c.page_id=p.id
  AND i.tenant_id=p.tenant_id AND i.app_id=a.id AND a.api_name='Acetill'
  AND p.api_name IN ('AcetillSale','AcetillCheckout') AND c.component_api='une_cart';

UPDATE md_lightning_page_nodes n SET component_type='Custom:acetill_cart'
FROM md_page_definitions p, md_app_installations i, md_apps a
WHERE n.tenant_id=p.tenant_id AND n.page_id=p.id
  AND i.tenant_id=p.tenant_id AND i.app_id=a.id AND a.api_name='Acetill'
  AND p.api_name IN ('AcetillSale','AcetillCheckout') AND n.component_type='Custom:une_cart';

UPDATE md_page_layout_version_nodes n SET component_type='Custom:acetill_cart'
FROM md_page_definitions p, md_app_installations i, md_apps a
WHERE n.tenant_id=p.tenant_id AND n.page_id=p.id
  AND i.tenant_id=p.tenant_id AND i.app_id=a.id AND a.api_name='Acetill'
  AND p.api_name IN ('AcetillSale','AcetillCheckout') AND n.component_type='Custom:une_cart';
