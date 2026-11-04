-- One execution per actor, workbook and object/matching mode. Prevent accidental duplicate
-- creates when an Excel upload is retried after a lost HTTP response.
CREATE TABLE IF NOT EXISTS md_data_loader_executions (
 tenant_id uuid NOT NULL,
 user_id uuid NOT NULL,
 operation text NOT NULL,
 workbook_digest text NOT NULL CHECK(length(workbook_digest)=64),
 status text NOT NULL CHECK(status IN ('running','completed')),
 report jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 PRIMARY KEY(tenant_id,user_id,operation,workbook_digest),
 FOREIGN KEY(tenant_id) REFERENCES md_tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_data_loader_executions_created
 ON md_data_loader_executions(tenant_id,created_at DESC);
