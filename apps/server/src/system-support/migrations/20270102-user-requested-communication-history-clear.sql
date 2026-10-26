-- One-time, owner-requested reset of the currently visible Communication history.
-- Scoped to the tenant owning the independently verified example record and to
-- events existing when the request was made (25-Oct-2026 08:14 UTC).
-- Future messages and every other tenant remain untouched. Data is archived
-- in full; ordinary append-only protections are reinstated in this transaction.
--
-- This is not a reusable delete API or a change to normal Communication CRUD.
CREATE TABLE IF NOT EXISTS md_communication_user_clear_archive (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 record_id uuid NOT NULL,
 source_created_at timestamptz NOT NULL,
 archived_at timestamptz NOT NULL DEFAULT now(),
 reason text NOT NULL DEFAULT 'owner_requested_2026_10_25',
 record_snapshot jsonb NOT NULL,
 field_snapshots jsonb NOT NULL,
 PRIMARY KEY (tenant_id,record_id)
);

-- Resolve the intended tenant from a real, known Communication UUID rather than
-- a name/email/global tenant sweep. The timestamp excludes all future traffic.
CREATE TEMP TABLE md_communication_clear_batch ON COMMIT DROP AS
SELECT record.tenant_id,record.id
FROM md_records record
WHERE record.object_api='Communication'
 AND record.is_deleted=false
 AND record.created_at < TIMESTAMPTZ '2026-10-25 08:15:00+00'
 AND EXISTS (
  SELECT 1 FROM md_records anchor
  WHERE anchor.tenant_id=record.tenant_id
   AND anchor.object_api='Communication'
   AND anchor.id='7214c626-0f66-4f40-b815-675f10b901b3'::uuid
 );

-- Each record and every typed field value is backed up before it is hidden.
-- The archive intentionally has no FK to md_records, so later recycle-bin
-- retention cannot silently destroy the only recoverable snapshot.
INSERT INTO md_communication_user_clear_archive
 (tenant_id,record_id,source_created_at,record_snapshot,field_snapshots)
SELECT record.tenant_id,record.id,record.created_at,to_jsonb(record),
 COALESCE((
  SELECT jsonb_agg(to_jsonb(value) ORDER BY value.field_api)
  FROM md_record_values value
  WHERE value.tenant_id=record.tenant_id
   AND value.record_id=record.id AND value.object_api='Communication'
 ),'[]'::jsonb)
FROM md_records record
JOIN md_communication_clear_batch batch
 ON batch.tenant_id=record.tenant_id AND batch.id=record.id
ON CONFLICT(tenant_id,record_id) DO NOTHING;

-- No unarchived row can ever be hidden.
DO $$
BEGIN
 IF EXISTS (
  SELECT 1 FROM md_communication_clear_batch batch
  LEFT JOIN md_communication_user_clear_archive archive
   ON archive.tenant_id=batch.tenant_id AND archive.record_id=batch.id
  WHERE archive.record_id IS NULL
 ) THEN
  RAISE EXCEPTION 'Communication history backup incomplete; clearing aborted';
 END IF;
END $$;

-- Only the migration runner may perform this audited, atomic maintenance
-- operation; the normal API, Flows and ordinary users remain append-only.
-- The migration transaction holds DDL locks until both triggers are restored.
DROP TRIGGER md_communication_values_append_only ON md_record_values;
DROP TRIGGER md_communication_records_append_only ON md_records;

UPDATE md_record_values value
 SET record_is_deleted=true
FROM md_communication_clear_batch batch
WHERE value.tenant_id=batch.tenant_id AND value.record_id=batch.id
 AND value.object_api='Communication' AND value.record_is_deleted=false;

UPDATE md_records record
 SET is_deleted=true,deleted_at=now(),deleted_by=NULL
FROM md_communication_clear_batch batch
WHERE record.tenant_id=batch.tenant_id AND record.id=batch.id
 AND record.object_api='Communication' AND record.is_deleted=false;

CREATE TRIGGER md_communication_records_append_only
 BEFORE INSERT OR UPDATE OR DELETE ON md_records
 FOR EACH ROW EXECUTE FUNCTION md_communication_append_only_guard();
CREATE TRIGGER md_communication_values_append_only
 BEFORE INSERT OR UPDATE OR DELETE ON md_record_values
 FOR EACH ROW EXECUTE FUNCTION md_communication_append_only_guard();

-- System event is tenant scoped. It records counts and cutoff, never message
-- content or provider credentials.
INSERT INTO md_security_events(tenant_id,action,details)
SELECT batch.tenant_id,'communication.history_cleared_by_owner',
 jsonb_build_object(
  'hiddenRecords',count(*),
  'cutoffUtc','2026-10-25T08:15:00Z',
  'recoveryTable','md_communication_user_clear_archive',
  'source','owner_request')
FROM md_communication_clear_batch batch
GROUP BY batch.tenant_id;
