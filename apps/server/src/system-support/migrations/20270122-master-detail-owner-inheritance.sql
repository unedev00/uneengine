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
 ORDER BY f.api_name LIMIT 1;
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
   AND f.api_name=(
    SELECT min(primary_field.api_name)
    FROM md_field_definitions primary_field
    WHERE primary_field.tenant_id=v.tenant_id
      AND primary_field.object_api=v.object_api
      AND primary_field.relationship_type='Master-Detail'
      AND primary_field.data_type='reference'
      AND primary_field.deleted_at IS NULL
   )
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
    AND f.api_name=(SELECT min(a.api_name) FROM md_field_definitions a
      WHERE a.tenant_id=f.tenant_id AND a.object_api=f.object_api
        AND a.relationship_type='Master-Detail' AND a.data_type='reference'
        AND a.deleted_at IS NULL)
    AND (child.owner_id IS DISTINCT FROM parent.owner_id
      OR child.owner_queue_id IS DISTINCT FROM parent.owner_queue_id);
  GET DIAGNOSTICS affected=ROW_COUNT;
  EXIT WHEN affected=0;
 END LOOP;
END $backfill$;
