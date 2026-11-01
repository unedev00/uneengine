-- Universal, tenant-owned business context metadata and per-user active record.
CREATE TABLE IF NOT EXISTS md_context_definitions(
 tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 label text NOT NULL CHECK(length(trim(label)) BETWEEN 1 AND 200),
 object_api text NOT NULL,
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,api_name)
);
CREATE TABLE IF NOT EXISTS md_user_context_selections(
 tenant_id uuid NOT NULL,
 user_id uuid NOT NULL,
 context_api text NOT NULL,
 record_id uuid NOT NULL,
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,record_id) REFERENCES md_records(tenant_id,id) ON DELETE CASCADE,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,user_id,context_api),
 FOREIGN KEY(tenant_id,context_api) REFERENCES md_context_definitions(tenant_id,api_name) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_user_context_selections_record_idx
 ON md_user_context_selections(tenant_id,record_id);
