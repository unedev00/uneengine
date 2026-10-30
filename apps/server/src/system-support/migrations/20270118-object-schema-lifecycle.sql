-- 2A: reversible object definition lifecycle; keep all existing schema and records.
-- Retaining the row reserves its API name and keeps dependent FK identities stable.
ALTER TABLE md_object_definitions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS md_object_definitions_deleted
 ON md_object_definitions(tenant_id,deleted_at DESC)
 WHERE deleted_at IS NOT NULL;

-- A stale record editor or direct API cannot insert into a deleted definition.
-- The row lock serializes with ObjectSchemaLifecycle.delete's FOR UPDATE lock.
CREATE OR REPLACE FUNCTION md_require_live_object_for_record_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM md_object_definitions
  WHERE tenant_id=NEW.tenant_id AND api_name=NEW.object_api
    AND deleted_at IS NULL FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Object is unavailable for record creation: %', NEW.object_api
      USING ERRCODE='23503';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS md_guard_deleted_object_insert ON md_records;
CREATE TRIGGER md_guard_deleted_object_insert
 BEFORE INSERT ON md_records
 FOR EACH ROW EXECUTE FUNCTION md_require_live_object_for_record_insert();
