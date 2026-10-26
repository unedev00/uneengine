-- Central integration transport diagnostics are structured metadata, never
-- human message content. Install additive fields for existing tenants; fresh
-- tenants receive the same fields through the Core Communication seeder.
INSERT INTO md_field_definitions
 (tenant_id,object_api,api_name,label,data_type,max_length,required)
SELECT o.tenant_id,'Communication',f.api_name,f.label,f.data_type,f.max_length,false
FROM md_object_definitions o
CROSS JOIN (VALUES
 ('Transport','Transport','text',20),
 ('Endpoint','Endpoint','text',2048),
 ('RequestMethod','Request Method','text',20),
 ('ResponseStatusCode','HTTP Status Code','number',NULL::integer),
 ('Outcome','Integration Outcome','text',40),
 ('DurationMs','Duration (ms)','number',NULL::integer),
 ('RequestBytes','Request Bytes','number',NULL::integer),
 ('ResponseBytes','Response Bytes','number',NULL::integer),
 ('OccurredAt','Integration Occurred At','datetime',NULL::integer)
) AS f(api_name,label,data_type,max_length)
WHERE o.api_name='Communication'
ON CONFLICT(tenant_id,object_api,api_name) DO NOTHING;

-- Mirror existing subject read grants only. Explicit denies and revocations
-- remain authoritative; no global access or new app entitlement is granted.
INSERT INTO md_permission_rules(tenant_id,permission_set_id,resource,action,effect)
SELECT grant_rule.tenant_id,grant_rule.permission_set_id,
 'Communication.'||field.api_name,'read','allow'
FROM md_permission_rules grant_rule
JOIN md_field_definitions field
 ON field.tenant_id=grant_rule.tenant_id AND field.object_api='Communication'
 AND field.api_name IN
 ('Transport','Endpoint','RequestMethod','ResponseStatusCode','Outcome',
  'DurationMs','RequestBytes','ResponseBytes','OccurredAt')
 AND field.deleted_at IS NULL
WHERE grant_rule.resource='Communication.Subject'
 AND grant_rule.action='read' AND grant_rule.effect='allow'
ON CONFLICT DO NOTHING;

-- Back up only machine-generated API execution JSON, not customer messages.
-- The append-only runtime remains protected; this one-time system migration
-- is atomic and auditable, and original content remains recoverable in SQL.
CREATE TABLE IF NOT EXISTS md_communication_legacy_api_body_archive (
 tenant_id uuid NOT NULL,
 record_id uuid NOT NULL,
 original_body text NOT NULL,
 migrated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,record_id),
 FOREIGN KEY(tenant_id,record_id) REFERENCES md_records(tenant_id,id)
);

CREATE FUNCTION md_try_legacy_integration_log(source text) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE decoded jsonb;
BEGIN
 decoded:=source::jsonb;
 IF jsonb_typeof(decoded)='object'
    AND decoded->>'type'='IntegrationApiCall'
    AND decoded ? 'method' AND decoded ? 'endpoint'
    AND decoded ? 'occurredAt' THEN
  RETURN decoded;
 END IF;
 RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE TEMP TABLE md_communication_legacy_log_targets ON COMMIT DROP AS
SELECT old.tenant_id,old.record_id,old.value_text AS original_body,
 md_try_legacy_integration_log(old.value_text) AS payload
FROM md_record_values old
JOIN md_record_values relation
 ON relation.tenant_id=old.tenant_id AND relation.record_id=old.record_id
 AND relation.object_api='Communication'
 AND relation.field_api='RelatedObject'
 AND relation.value_text='IntegrationApiCall'
WHERE old.object_api='Communication'
 AND old.field_api='Body'
 AND old.value_text LIKE '{"type":"IntegrationApiCall",%';

DROP FUNCTION md_try_legacy_integration_log(text);

DELETE FROM md_communication_legacy_log_targets WHERE payload IS NULL;

INSERT INTO md_communication_legacy_api_body_archive
 (tenant_id,record_id,original_body)
SELECT tenant_id,record_id,original_body FROM md_communication_legacy_log_targets
ON CONFLICT(tenant_id,record_id) DO NOTHING;

-- Backfill the same typed metadata as new requests. Existing customised
-- values win; never replace a tenant's field configuration or record value.
SELECT set_config('metadrive.communication_writer','on',true);
INSERT INTO md_record_values
 (tenant_id,record_id,object_api,field_api,value_text)
SELECT targets.tenant_id,targets.record_id,'Communication',diagnostic.field_api,
 diagnostic.value_text
FROM md_communication_legacy_log_targets targets
CROSS JOIN LATERAL (VALUES
 ('Transport',targets.payload->>'transport'),
 ('Endpoint',targets.payload->>'endpoint'),
 ('RequestMethod',targets.payload->>'method'),
 ('ResponseStatusCode',targets.payload->>'statusCode'),
 ('Outcome',targets.payload->>'outcome'),
 ('DurationMs',targets.payload->>'durationMs'),
 ('RequestBytes',targets.payload->>'requestBytes'),
 ('ResponseBytes',targets.payload->>'responseBytes'),
 ('OccurredAt',targets.payload->>'occurredAt')
) AS diagnostic(field_api,value_text)
JOIN md_field_definitions f
 ON f.tenant_id=targets.tenant_id AND f.object_api='Communication'
 AND f.api_name=diagnostic.field_api AND f.deleted_at IS NULL
WHERE diagnostic.value_text IS NOT NULL
 AND (diagnostic.field_api NOT IN
   ('ResponseStatusCode','DurationMs','RequestBytes','ResponseBytes')
   OR diagnostic.value_text ~ '^[0-9]{1,10}$')
 AND (diagnostic.field_api<>'OccurredAt'
   OR md_try_record_datetime(diagnostic.value_text) IS NOT NULL)
ON CONFLICT(tenant_id,record_id,field_api) DO NOTHING;

-- Authorised one-time UPDATE of known archived machine-generated bodies only.
-- DDL and DML happen inside the migration runner's single SQL transaction;
-- the normal append-only guard is restored before commit.
DROP TRIGGER md_communication_values_append_only ON md_record_values;
UPDATE md_record_values body
 SET value_text=NULL
FROM md_communication_legacy_log_targets target
JOIN md_communication_legacy_api_body_archive archive
 ON archive.tenant_id=target.tenant_id
 AND archive.record_id=target.record_id
 AND archive.original_body=target.original_body
WHERE body.tenant_id=target.tenant_id
 AND body.record_id=target.record_id
 AND body.object_api='Communication' AND body.field_api='Body'
 AND body.value_text=target.original_body;
CREATE TRIGGER md_communication_values_append_only
 BEFORE INSERT OR UPDATE OR DELETE ON md_record_values
 FOR EACH ROW EXECUTE FUNCTION md_communication_append_only_guard();

-- Return the transaction-local privileged insert flag to its default.
SELECT set_config('metadrive.communication_writer','off',true);

INSERT INTO md_security_events(tenant_id,action,details)
SELECT tenant_id,'communication.legacy_api_body_normalized',
 jsonb_build_object('archivedRecords',count(*))
FROM md_communication_legacy_log_targets
GROUP BY tenant_id;
