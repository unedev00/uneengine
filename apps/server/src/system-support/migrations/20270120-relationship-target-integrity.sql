-- Phase 2C: enforce relationship target object and active-record integrity at storage.
-- Existing tenant FK alone prevents cross-tenant IDs but not same-tenant wrong-object IDs.
CREATE OR REPLACE FUNCTION md_validate_relationship_record_target()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_object text;
BEGIN
 IF NEW.reference_record_id IS NULL THEN RETURN NEW; END IF;
 SELECT f.related_object INTO target_object
 FROM md_field_definitions f
 WHERE f.tenant_id=NEW.tenant_id AND f.object_api=NEW.object_api
   AND f.api_name=NEW.field_api AND f.data_type='reference' AND f.deleted_at IS NULL;
 IF target_object IS NULL OR NOT EXISTS(
   SELECT 1 FROM md_records r
   WHERE r.tenant_id=NEW.tenant_id AND r.object_api=target_object
     AND r.id=NEW.reference_record_id AND r.is_deleted=false
 ) THEN RAISE EXCEPTION 'Invalid relationship target for field %',NEW.field_api
   USING ERRCODE='23503';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS md_validate_relationship_target_record ON md_record_values;
CREATE TRIGGER md_validate_relationship_target_record
 BEFORE INSERT OR UPDATE OF reference_record_id,object_api,field_api
 ON md_record_values FOR EACH ROW
 EXECUTE FUNCTION md_validate_relationship_record_target();
