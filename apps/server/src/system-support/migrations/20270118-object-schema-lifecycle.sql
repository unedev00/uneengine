-- 2A: reversible object definition lifecycle; keep all existing schema and records.
-- Retaining the row reserves its API name and keeps dependent FK identities stable.
ALTER TABLE md_object_definitions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS md_object_definitions_deleted
 ON md_object_definitions(tenant_id,deleted_at DESC)
 WHERE deleted_at IS NOT NULL;
