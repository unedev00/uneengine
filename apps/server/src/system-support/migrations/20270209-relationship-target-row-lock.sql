-- Forward-only follow-up to 20270120-relationship-target-integrity.sql.
-- Never modify the original migration after production has recorded its checksum.
-- Refresh only the existing trigger function to lock the referenced record against
-- concurrent delete while validating a relationship target; retain trigger/indexes.
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
   FOR SHARE
 ) THEN RAISE EXCEPTION 'Invalid relationship target for field %',NEW.field_api
   USING ERRCODE='23503';
 END IF;
 RETURN NEW;
END $$;
