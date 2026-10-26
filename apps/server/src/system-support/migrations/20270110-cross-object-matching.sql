-- Cross-object duplicate rules extend the existing Record Matching engine.
-- Old rules remain same-object; there is no separate workflow or CRUD engine.
ALTER TABLE md_matching_rules
 ADD COLUMN IF NOT EXISTS target_object_api text;
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='md_matching_rules'::regclass
  AND conname='md_matching_rules_target_object_fkey') THEN
  ALTER TABLE md_matching_rules ADD CONSTRAINT md_matching_rules_target_object_fkey
    FOREIGN KEY(tenant_id,target_object_api)
    REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE RESTRICT;
 END IF;
END $$;
ALTER TABLE md_matching_rule_fields
 ADD COLUMN IF NOT EXISTS target_field_api text;
CREATE TABLE IF NOT EXISTS md_cross_object_duplicate_sets(
 tenant_id uuid NOT NULL,object_api text NOT NULL,rule_api text NOT NULL,
 record_id uuid NOT NULL,matched_object_api text NOT NULL,matched_record_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,object_api,rule_api,record_id,matched_object_api,matched_record_id),
 FOREIGN KEY(tenant_id,object_api,rule_api)
  REFERENCES md_matching_rules(tenant_id,object_api,api_name) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,record_id,object_api)
  REFERENCES md_records(tenant_id,id,object_api) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,matched_record_id,matched_object_api)
  REFERENCES md_records(tenant_id,id,object_api) ON DELETE CASCADE,
 CHECK(object_api<>matched_object_api)
);
CREATE INDEX IF NOT EXISTS md_cross_object_duplicate_sets_source
 ON md_cross_object_duplicate_sets(tenant_id,object_api,record_id,created_at DESC);
