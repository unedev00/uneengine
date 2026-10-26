-- A provider status callback may advance only the status projection of an
-- existing outbound Communication record. The message content stays immutable.
CREATE OR REPLACE FUNCTION md_communication_append_only_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target text;
BEGIN
 IF TG_OP='DELETE' THEN target:=OLD.object_api;
 ELSE target:=NEW.object_api; END IF;
 IF target='Communication' THEN
  IF TG_OP='INSERT' AND current_setting('metadrive.communication_writer',true)='on'
   THEN RETURN NEW; END IF;
  -- PostgreSQL PL/pgSQL can evaluate a record field even when an earlier
  -- AND predicate is false. Branch first because md_records lacks field_api.
  IF TG_TABLE_NAME='md_record_values' THEN
   IF TG_OP IN ('INSERT','UPDATE')
      AND current_setting('metadrive.communication_status_writer',true)='on' THEN
    IF NEW.field_api IN ('Status','DeliveredAt') THEN
     IF TG_OP='INSERT' THEN RETURN NEW; END IF;
     IF OLD.tenant_id=NEW.tenant_id AND OLD.record_id=NEW.record_id
        AND OLD.object_api=NEW.object_api AND OLD.field_api=NEW.field_api
      THEN RETURN NEW; END IF;
    END IF;
   END IF;
  END IF;
  RAISE EXCEPTION 'System Communication records are append-only'
   USING ERRCODE='42501';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
-- Existing triggers use CREATE OR REPLACE function and need no recreation.
