-- Source-owned UNE builder components: enable trusted renderers, not property inventory.
INSERT INTO md_component_definitions (tenant_id,api_name,renderer_key,enabled)
SELECT t.id,v.api_name,'one-bundled:'||v.api_name,true
FROM md_tenants t CROSS JOIN (VALUES
 ('une_button'),('une_toggle'),('une_lookup'),('une_tabs'),('une_input'),
 ('une_item_grid'),('une_image')
) AS v(api_name)
ON CONFLICT (tenant_id,api_name) DO UPDATE SET enabled=true
WHERE md_component_definitions.renderer_key=EXCLUDED.renderer_key;
-- Idempotently clear old SQL property contracts; retain all published pages, flows and instance values.
DELETE FROM md_component_library_contract_properties WHERE left(component_api,4)='une_';
