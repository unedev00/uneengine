-- Tenant-configured equality indexes use one reusable physical structure instead
-- of DDL per tenant. The indexed data is disposable and rebuildable from records.
CREATE TABLE IF NOT EXISTS md_field_exact_indexes(
 tenant_id uuid NOT NULL,object_api text NOT NULL,field_api text NOT NULL,
 enabled boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,object_api,field_api),
 FOREIGN KEY(tenant_id,object_api,field_api)
  REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_field_exact_index_entries(
 tenant_id uuid NOT NULL,object_api text NOT NULL,field_api text NOT NULL,
 record_id uuid NOT NULL,
 value_hash text NOT NULL CHECK(length(value_hash)=32),
 folded_hash text NOT NULL CHECK(length(folded_hash)=32),
 PRIMARY KEY(tenant_id,object_api,field_api,record_id),
 FOREIGN KEY(tenant_id,object_api,field_api)
  REFERENCES md_field_exact_indexes(tenant_id,object_api,field_api) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,record_id,object_api)
  REFERENCES md_records(tenant_id,id,object_api) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_field_exact_entries_cs
 ON md_field_exact_index_entries(tenant_id,object_api,field_api,value_hash,record_id);
CREATE INDEX IF NOT EXISTS md_field_exact_entries_ci
 ON md_field_exact_index_entries(tenant_id,object_api,field_api,folded_hash,record_id);

CREATE OR REPLACE FUNCTION md_sync_field_exact_entry(
 t uuid,obj text,f text,rid uuid,raw text,is_deleted boolean
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF raw IS NULL OR is_deleted
   OR NOT EXISTS(SELECT 1 FROM md_field_exact_indexes
     WHERE tenant_id=t AND object_api=obj AND field_api=f AND enabled) THEN
  DELETE FROM md_field_exact_index_entries
   WHERE tenant_id=t AND object_api=obj AND field_api=f AND record_id=rid;
  RETURN;
 END IF;
 INSERT INTO md_field_exact_index_entries
  (tenant_id,object_api,field_api,record_id,value_hash,folded_hash)
 VALUES(t,obj,f,rid,md5(raw),md5(lower(raw)))
 ON CONFLICT(tenant_id,object_api,field_api,record_id) DO UPDATE
 SET value_hash=EXCLUDED.value_hash,folded_hash=EXCLUDED.folded_hash;
END $$;

CREATE OR REPLACE FUNCTION md_sync_field_exact_record_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  DELETE FROM md_field_exact_index_entries WHERE tenant_id=OLD.tenant_id
   AND object_api=OLD.object_api AND field_api=OLD.field_api AND record_id=OLD.record_id;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND
  (OLD.object_api,OLD.field_api,OLD.record_id) IS DISTINCT FROM
  (NEW.object_api,NEW.field_api,NEW.record_id) THEN
  DELETE FROM md_field_exact_index_entries WHERE tenant_id=OLD.tenant_id
   AND object_api=OLD.object_api AND field_api=OLD.field_api AND record_id=OLD.record_id;
 END IF;
 PERFORM md_sync_field_exact_entry(
  NEW.tenant_id,NEW.object_api,NEW.field_api,NEW.record_id,
  NEW.value_text,NEW.record_is_deleted);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS md_sync_field_exact_record ON md_record_values;
CREATE TRIGGER md_sync_field_exact_record
 AFTER INSERT OR UPDATE OR DELETE ON md_record_values
 FOR EACH ROW EXECUTE FUNCTION md_sync_field_exact_record_trigger();

CREATE OR REPLACE FUNCTION md_rebuild_field_exact_index_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 DELETE FROM md_field_exact_index_entries
  WHERE tenant_id=NEW.tenant_id AND object_api=NEW.object_api AND field_api=NEW.field_api;
 IF NEW.enabled THEN
  INSERT INTO md_field_exact_index_entries
   (tenant_id,object_api,field_api,record_id,value_hash,folded_hash)
  SELECT v.tenant_id,v.object_api,v.field_api,v.record_id,
   md5(v.value_text),md5(lower(v.value_text))
  FROM md_record_values v
  WHERE v.tenant_id=NEW.tenant_id AND v.object_api=NEW.object_api
   AND v.field_api=NEW.field_api AND v.value_text IS NOT NULL
   AND v.record_is_deleted=false;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS md_rebuild_field_exact_index ON md_field_exact_indexes;
CREATE TRIGGER md_rebuild_field_exact_index
 AFTER INSERT OR UPDATE OF enabled ON md_field_exact_indexes
 FOR EACH ROW EXECUTE FUNCTION md_rebuild_field_exact_index_trigger();


CREATE TABLE IF NOT EXISTS md_field_exact_index_history(
 tenant_id uuid NOT NULL,object_api text NOT NULL,field_api text NOT NULL,
 revision integer NOT NULL CHECK(revision>0),enabled boolean NOT NULL,
 actor_user_id uuid NOT NULL,changed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,object_api,field_api,revision),
 FOREIGN KEY(tenant_id,object_api,field_api)
  REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,actor_user_id) REFERENCES md_users(tenant_id,id)
);

-- Previously configured objects have no equality-index enrollment.
-- Migration replay preserves all tenant preferences and business records.
