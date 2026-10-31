-- Phase 2C: inverse names are unique per target object, case-insensitively.
-- Enforce on NEW writes without rewriting any historical names that may already
-- be used by published reports, formulas, pages and external clients.
CREATE OR REPLACE FUNCTION md_validate_inverse_relationship_name()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.data_type='reference' AND NEW.related_object IS NOT NULL
   AND NEW.deleted_at IS NULL AND NEW.child_relationship_name IS NOT NULL THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.tenant_id::text,21103));
  IF EXISTS(
   SELECT 1 FROM md_field_definitions f
   WHERE f.tenant_id=NEW.tenant_id AND f.related_object=NEW.related_object
     AND f.data_type='reference' AND f.deleted_at IS NULL
     AND lower(f.child_relationship_name)=lower(NEW.child_relationship_name)
     AND f.id<>NEW.id
  ) THEN
   RAISE EXCEPTION 'Duplicate child relationship name: %',NEW.child_relationship_name
     USING ERRCODE='23505';
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS md_inverse_relationship_name_integrity ON md_field_definitions;
CREATE TRIGGER md_inverse_relationship_name_integrity
 BEFORE INSERT OR UPDATE OF data_type,related_object,child_relationship_name,deleted_at
 ON md_field_definitions FOR EACH ROW EXECUTE FUNCTION md_validate_inverse_relationship_name();
