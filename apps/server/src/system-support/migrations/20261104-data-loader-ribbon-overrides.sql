-- Tenant-scoped ribbon visibility: preserve global property definitions, rendering and saved component properties.
CREATE TABLE IF NOT EXISTS md_data_loader_ribbon_visibility (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
 component_api text NOT NULL,
 property_key text NOT NULL,
 enabled boolean NOT NULL,
 changed_by uuid,
 changed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (tenant_id,component_api,property_key),
 FOREIGN KEY (component_api,property_key)
   REFERENCES md_builder_ribbon_component_rules(component_api,property_key) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_data_loader_ribbon_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
 actor_user_id uuid NOT NULL,
 component_api text NOT NULL,
 property_key text NOT NULL,
 previous_enabled boolean NOT NULL,
 enabled boolean NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS md_data_loader_ribbon_audit_tenant_date
 ON md_data_loader_ribbon_audit (tenant_id,changed_at DESC);
