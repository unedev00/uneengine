-- Track the first explicitly-created master relationship for ownership.
-- Existing junction metadata chooses a deterministic legacy primary; all new
-- definitions use creation order rather than alphabetical API ordering.
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS is_primary_master boolean NOT NULL DEFAULT false;
UPDATE md_field_definitions f SET is_primary_master=true
FROM (
 SELECT tenant_id,object_api,api_name,
   row_number() OVER(PARTITION BY tenant_id,object_api ORDER BY api_name) AS position
 FROM md_field_definitions
 WHERE data_type='reference' AND relationship_type='Master-Detail' AND deleted_at IS NULL
) ranked
WHERE f.tenant_id=ranked.tenant_id AND f.object_api=ranked.object_api
 AND f.api_name=ranked.api_name AND ranked.position=1
 AND f.is_primary_master=false
 AND NOT EXISTS(SELECT 1 FROM md_field_definitions designated
  WHERE designated.tenant_id=f.tenant_id AND designated.object_api=f.object_api
   AND designated.is_primary_master=true);
CREATE UNIQUE INDEX IF NOT EXISTS md_master_detail_one_primary
 ON md_field_definitions(tenant_id,object_api)
 WHERE is_primary_master=true;

CREATE OR REPLACE FUNCTION md_assign_primary_master()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.data_type='reference' AND NEW.relationship_type='Master-Detail'
   AND NEW.deleted_at IS NULL THEN
  IF TG_OP='INSERT' THEN
   NEW.is_primary_master:=NOT EXISTS(
    SELECT 1 FROM md_field_definitions f WHERE f.tenant_id=NEW.tenant_id
      AND f.object_api=NEW.object_api AND f.is_primary_master=true
      AND f.deleted_at IS NULL);
  ELSIF NEW.is_primary_master IS NOT TRUE THEN
   NEW.is_primary_master:=NOT EXISTS(
    SELECT 1 FROM md_field_definitions f WHERE f.tenant_id=NEW.tenant_id
      AND f.object_api=NEW.object_api AND f.api_name<>NEW.api_name
      AND f.is_primary_master=true AND f.deleted_at IS NULL);
  END IF;
 ELSE NEW.is_primary_master:=false;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS md_assign_primary_master_before ON md_field_definitions;
CREATE TRIGGER md_assign_primary_master_before
 BEFORE INSERT OR UPDATE OF data_type,relationship_type,deleted_at
 ON md_field_definitions FOR EACH ROW EXECUTE FUNCTION md_assign_primary_master();

CREATE OR REPLACE FUNCTION md_reassign_primary_master()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.is_primary_master IS NOT TRUE THEN RETURN NULL; END IF;
 IF TG_OP='DELETE' THEN
  UPDATE md_field_definitions f SET is_primary_master=true
  WHERE f.id=(
   SELECT candidate.id FROM md_field_definitions candidate
   WHERE candidate.tenant_id=OLD.tenant_id AND candidate.object_api=OLD.object_api
     AND candidate.data_type='reference'
     AND candidate.relationship_type='Master-Detail'
     AND candidate.deleted_at IS NULL AND candidate.is_primary_master=false
   ORDER BY candidate.api_name LIMIT 1
  );
  RETURN NULL;
 END IF;
 IF NEW.is_primary_master IS FALSE THEN
  UPDATE md_field_definitions f SET is_primary_master=true
  WHERE f.id=(
   SELECT candidate.id FROM md_field_definitions candidate
   WHERE candidate.tenant_id=OLD.tenant_id AND candidate.object_api=OLD.object_api
     AND candidate.data_type='reference'
     AND candidate.relationship_type='Master-Detail'
     AND candidate.deleted_at IS NULL AND candidate.is_primary_master=false
   ORDER BY candidate.api_name LIMIT 1
  );
 END IF;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS md_reassign_primary_master_after ON md_field_definitions;
CREATE TRIGGER md_reassign_primary_master_after
 AFTER UPDATE OF data_type,relationship_type,deleted_at OR DELETE
 ON md_field_definitions FOR EACH ROW EXECUTE FUNCTION md_reassign_primary_master();

-- Phase 2C: A detail's owner follows its primary master. This is separate
-- from sharing grants: no detail can become independently visible by changing
-- its owner. Deterministic primary master = lowest active field API name.
CREATE OR REPLACE FUNCTION md_sync_master_detail_owner_from_reference()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE inherited_owner uuid; inherited_queue uuid;
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM md_field_definitions f
  WHERE f.tenant_id=NEW.tenant_id AND f.object_api=NEW.object_api
   AND f.api_name=NEW.field_api AND f.relationship_type='Master-Detail'
   AND f.data_type='reference' AND f.deleted_at IS NULL
 ) THEN RETURN NEW; END IF;
 SELECT parent.owner_id,parent.owner_queue_id INTO inherited_owner,inherited_queue
 FROM md_record_values v
 JOIN md_field_definitions f ON f.tenant_id=v.tenant_id
   AND f.object_api=v.object_api AND f.api_name=v.field_api
   AND f.data_type='reference' AND f.relationship_type='Master-Detail'
   AND f.deleted_at IS NULL
 JOIN md_records parent ON parent.tenant_id=v.tenant_id
   AND parent.id=v.reference_record_id AND parent.object_api=f.related_object
 WHERE v.tenant_id=NEW.tenant_id AND v.record_id=NEW.record_id
   AND v.object_api=NEW.object_api
 ORDER BY f.is_primary_master DESC,f.api_name LIMIT 1;
 IF FOUND THEN
  UPDATE md_records child
    SET owner_id=inherited_owner,owner_queue_id=inherited_queue
  WHERE child.tenant_id=NEW.tenant_id AND child.id=NEW.record_id
   AND child.object_api=NEW.object_api
   AND (child.owner_id IS DISTINCT FROM inherited_owner
     OR child.owner_queue_id IS DISTINCT FROM inherited_queue);
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS md_sync_master_detail_owner_reference ON md_record_values;
CREATE TRIGGER md_sync_master_detail_owner_reference
 AFTER INSERT OR UPDATE OF reference_record_id ON md_record_values
 FOR EACH ROW EXECUTE FUNCTION md_sync_master_detail_owner_from_reference();

-- Transfer of a master owner cascades down the active Master-Detail graph.
-- Explicit lookup links are not affected; they remain independently owned.
CREATE OR REPLACE FUNCTION md_sync_master_detail_owner_from_parent()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.owner_id IS NOT DISTINCT FROM OLD.owner_id AND
    NEW.owner_queue_id IS NOT DISTINCT FROM OLD.owner_queue_id THEN RETURN NEW; END IF;
 UPDATE md_records child SET owner_id=NEW.owner_id,owner_queue_id=NEW.owner_queue_id
 FROM md_record_values v
 JOIN md_field_definitions f ON f.tenant_id=v.tenant_id AND f.object_api=v.object_api
   AND f.api_name=v.field_api AND f.relationship_type='Master-Detail'
   AND f.data_type='reference' AND f.deleted_at IS NULL
 WHERE v.tenant_id=NEW.tenant_id AND v.reference_record_id=NEW.id
   AND f.related_object=NEW.object_api
   AND child.tenant_id=v.tenant_id AND child.id=v.record_id
   AND child.object_api=v.object_api
   AND f.is_primary_master=true
   AND (child.owner_id IS DISTINCT FROM NEW.owner_id
     OR child.owner_queue_id IS DISTINCT FROM NEW.owner_queue_id);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS md_sync_master_detail_owner_parent ON md_records;
CREATE TRIGGER md_sync_master_detail_owner_parent
 AFTER UPDATE OF owner_id,owner_queue_id ON md_records
 FOR EACH ROW EXECUTE FUNCTION md_sync_master_detail_owner_from_parent();

-- Backfill prior details after installing both triggers; parent transfers
-- propagate transitively and preserve soft-deleted record rows for restoration.
DO $backfill$
DECLARE affected integer;
BEGIN
 FOR pass IN 1..16 LOOP
  UPDATE md_records child SET owner_id=parent.owner_id,owner_queue_id=parent.owner_queue_id
  FROM md_record_values v
  JOIN md_field_definitions f ON f.tenant_id=v.tenant_id AND f.object_api=v.object_api
    AND f.api_name=v.field_api AND f.data_type='reference'
    AND f.relationship_type='Master-Detail' AND f.deleted_at IS NULL
  JOIN md_records parent ON parent.tenant_id=v.tenant_id
    AND parent.id=v.reference_record_id AND parent.object_api=f.related_object
  WHERE child.tenant_id=v.tenant_id AND child.id=v.record_id AND child.object_api=v.object_api
    AND f.is_primary_master=true
    AND (child.owner_id IS DISTINCT FROM parent.owner_id
      OR child.owner_queue_id IS DISTINCT FROM parent.owner_queue_id);
  GET DIAGNOSTICS affected=ROW_COUNT;
  EXIT WHEN affected=0;
 END LOOP;
END $backfill$;
