-- Tenant-managed Object Manager metadata limits. Null = no configured limit.
-- The same trigger applies to APIs, builders, seeders and background operations.
CREATE TABLE IF NOT EXISTS md_object_metadata_limits (
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 max_fields integer CHECK (max_fields IS NULL OR max_fields BETWEEN 1 AND 100000),
 max_page_layouts integer CHECK (max_page_layouts IS NULL OR max_page_layouts BETWEEN 1 AND 100000),
 max_record_types integer CHECK (max_record_types IS NULL OR max_record_types BETWEEN 1 AND 100000),
 max_field_sets integer CHECK (max_field_sets IS NULL OR max_field_sets BETWEEN 1 AND 100000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,object_api),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION md_enforce_object_metadata_limit() RETURNS trigger
LANGUAGE plpgsql AS $md_limit$
DECLARE configured_limit integer;
DECLARE used_count bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('metadata-limit:' || NEW.tenant_id::text || ':' || NEW.object_api));
 SELECT CASE TG_TABLE_NAME
  WHEN 'md_field_definitions' THEN max_fields
  WHEN 'md_object_page_layouts' THEN max_page_layouts
  WHEN 'md_object_record_types' THEN max_record_types
  WHEN 'md_object_field_sets' THEN max_field_sets
 END INTO configured_limit
 FROM md_object_metadata_limits
 WHERE tenant_id=NEW.tenant_id AND object_api=NEW.object_api;
 IF configured_limit IS NULL THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='md_field_definitions' THEN
  SELECT COUNT(*) INTO used_count FROM md_field_definitions
   WHERE tenant_id=NEW.tenant_id AND object_api=NEW.object_api AND deleted_at IS NULL;
 ELSE
  EXECUTE format('SELECT COUNT(*) FROM %I WHERE tenant_id=$1 AND object_api=$2',TG_TABLE_NAME)
   INTO used_count USING NEW.tenant_id,NEW.object_api;
 END IF;
 IF used_count>configured_limit THEN
  RAISE EXCEPTION 'Object metadata limit exceeded for %: % > %',
    TG_TABLE_NAME,used_count,configured_limit USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$md_limit$;

DROP TRIGGER IF EXISTS md_limit_fields ON md_field_definitions;
CREATE TRIGGER md_limit_fields AFTER INSERT ON md_field_definitions
 FOR EACH ROW EXECUTE FUNCTION md_enforce_object_metadata_limit();
DROP TRIGGER IF EXISTS md_limit_page_layouts ON md_object_page_layouts;
CREATE TRIGGER md_limit_page_layouts AFTER INSERT ON md_object_page_layouts
 FOR EACH ROW EXECUTE FUNCTION md_enforce_object_metadata_limit();
DROP TRIGGER IF EXISTS md_limit_record_types ON md_object_record_types;
CREATE TRIGGER md_limit_record_types AFTER INSERT ON md_object_record_types
 FOR EACH ROW EXECUTE FUNCTION md_enforce_object_metadata_limit();
DROP TRIGGER IF EXISTS md_limit_field_sets ON md_object_field_sets;
CREATE TRIGGER md_limit_field_sets AFTER INSERT ON md_object_field_sets
 FOR EACH ROW EXECUTE FUNCTION md_enforce_object_metadata_limit();
