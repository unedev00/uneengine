CREATE TABLE IF NOT EXISTS md_app_seed_page_versions (
 tenant_id uuid NOT NULL,
 page_id uuid NOT NULL,
 seed_key text NOT NULL CHECK(length(seed_key) BETWEEN 1 AND 128),
 version integer NOT NULL CHECK(version>0),
 applied_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,seed_key),
 FOREIGN KEY(tenant_id,page_id)
  REFERENCES md_lightning_page_details(tenant_id,page_id) ON DELETE CASCADE
);
