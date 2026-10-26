-- Subject is the business message subject; transport diagnostics already have
-- structured Communication fields from the existing Core seeder. Do not add
-- duplicate metadata fields or modify any customer's configuration.
--
-- Match only the exact historic central integration-writer subject template,
-- including optional user-supplied subject prefixes. Never rewrite arbitrary
-- business subjects. Every original value is archived before the update.
CREATE TABLE IF NOT EXISTS md_communication_legacy_api_subject_archive (
 tenant_id uuid NOT NULL,
 record_id uuid NOT NULL,
 original_subject text NOT NULL,
 recovered_subject text,
 migrated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,record_id),
 FOREIGN KEY(tenant_id,record_id) REFERENCES md_records(tenant_id,id)
);

CREATE TEMP TABLE md_communication_legacy_subject_targets ON COMMIT DROP AS
SELECT subject.tenant_id,subject.record_id,subject.value_text AS original_subject,
 matched.parts
FROM md_record_values subject
JOIN md_record_values relation
 ON relation.tenant_id=subject.tenant_id
 AND relation.record_id=subject.record_id
 AND relation.object_api='Communication'
 AND relation.field_api='RelatedObject'
 AND relation.value_text IS NOT NULL
CROSS JOIN LATERAL (
 SELECT regexp_match(subject.value_text,
  '^(?:(.{1,100}) · )?(GET|POST|PUT|PATCH|DELETE|SMTP|OTHER) (NO_RESPONSE|[1-5][0-9][0-9]) · (success|http_error|network_error|rejected) · ([0-9]+)ms · req ([0-9]+)B/resp ([0-9]+)B · (.+)$'
 ) AS parts
) AS matched
WHERE subject.object_api='Communication'
 AND subject.field_api='Subject'
 AND subject.value_text IS NOT NULL
 AND matched.parts IS NOT NULL
 -- Where this field already exists, verify the generated subject's endpoint.
 AND NOT EXISTS (
  SELECT 1 FROM md_record_values endpoint
  WHERE endpoint.tenant_id=subject.tenant_id
   AND endpoint.record_id=subject.record_id
   AND endpoint.object_api='Communication'
   AND endpoint.field_api='Endpoint'
   AND endpoint.value_text IS DISTINCT FROM matched.parts[8]
 );

INSERT INTO md_communication_legacy_api_subject_archive
 (tenant_id,record_id,original_subject,recovered_subject)
SELECT tenant_id,record_id,original_subject,
 NULLIF(parts[1],'')
FROM md_communication_legacy_subject_targets
ON CONFLICT(tenant_id,record_id) DO NOTHING;

-- Previous API messages and verified webhooks may predate structured activity
-- metadata. Fill gaps in the already-existing fields, without overwriting
-- any recorded values, tenant-specific field metadata, or explicit RBAC denies.
SELECT set_config('metadrive.communication_writer','on',true);
INSERT INTO md_record_values
 (tenant_id,record_id,object_api,field_api,value_text)
SELECT target.tenant_id,target.record_id,'Communication',entry.field_api,entry.value_text
FROM md_communication_legacy_subject_targets target
CROSS JOIN LATERAL (VALUES
 ('RequestMethod',target.parts[2]),
 ('ResponseStatusCode',NULLIF(target.parts[3],'NO_RESPONSE')),
 ('Outcome',target.parts[4]),
 ('DurationMs',target.parts[5]),
 ('RequestBytes',target.parts[6]),
 ('ResponseBytes',target.parts[7]),
 ('Endpoint',target.parts[8])
) AS entry(field_api,value_text)
JOIN md_field_definitions f
 ON f.tenant_id=target.tenant_id
 AND f.object_api='Communication'
 AND f.api_name=entry.field_api
 AND f.deleted_at IS NULL
WHERE entry.value_text IS NOT NULL
 -- Do not guess transport or timestamps from other message fields.
 AND (entry.field_api NOT IN
   ('ResponseStatusCode','DurationMs','RequestBytes','ResponseBytes')
   OR entry.value_text ~ '^[0-9]{1,10}$')
ON CONFLICT(tenant_id,record_id,field_api) DO NOTHING;

-- The existing append-only guard is restored before the migration commits.
-- Only original subjects archived above and still equal to their source value
-- can be changed. The transaction is atomic in the system migration runner.
DROP TRIGGER md_communication_values_append_only ON md_record_values;
UPDATE md_record_values subject SET value_text=archive.recovered_subject
FROM md_communication_legacy_api_subject_archive archive
JOIN md_communication_legacy_subject_targets target
 ON target.tenant_id=archive.tenant_id
 AND target.record_id=archive.record_id
 AND target.original_subject=archive.original_subject
WHERE subject.tenant_id=archive.tenant_id
 AND subject.record_id=archive.record_id
 AND subject.object_api='Communication'
 AND subject.field_api='Subject'
 AND subject.value_text=archive.original_subject;
CREATE TRIGGER md_communication_values_append_only
 BEFORE INSERT OR UPDATE OR DELETE ON md_record_values
 FOR EACH ROW EXECUTE FUNCTION md_communication_append_only_guard();
SELECT set_config('metadrive.communication_writer','off',true);

INSERT INTO md_security_events(tenant_id,action,details)
SELECT tenant_id,'communication.legacy_api_subject_normalized',
 jsonb_build_object('archivedSubjects',count(*))
FROM md_communication_legacy_subject_targets
GROUP BY tenant_id;
