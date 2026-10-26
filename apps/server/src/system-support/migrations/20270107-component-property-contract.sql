-- Additive version-owned relational property/event schemas. Existing definitions and pages remain intact.
CREATE TABLE IF NOT EXISTS md_component_library_contract_properties (
 tenant_id uuid NOT NULL,
 component_api text NOT NULL,
 version integer NOT NULL,
 property_path text NOT NULL,
 value_kind text NOT NULL CHECK (value_kind IN ('object','array','string','number','boolean','null')),
 value_text text,
 PRIMARY KEY (tenant_id,component_api,version,property_path),
 FOREIGN KEY (tenant_id,component_api,version)
  REFERENCES md_component_library_versions(tenant_id,component_api,version)
);
