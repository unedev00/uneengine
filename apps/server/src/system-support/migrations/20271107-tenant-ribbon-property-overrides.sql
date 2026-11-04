-- Tenant-specific Smart Ribbon property applicability. Global definitions remain the baseline,
-- but an OneEngine admin cannot change what another tenant sees.
CREATE TABLE IF NOT EXISTS md_builder_ribbon_tenant_overrides (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
 component_api text NOT NULL REFERENCES md_builder_ribbon_components(component_api) ON DELETE CASCADE,
 property_key text NOT NULL REFERENCES md_builder_shared_properties(property_key) ON DELETE CASCADE,
 enabled boolean NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,component_api,property_key)
);
