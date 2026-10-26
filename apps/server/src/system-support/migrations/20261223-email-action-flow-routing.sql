-- Preserve existing legacy SMTP definitions for tenant migration while allowing
-- new Send Email Quick Actions to execute configured HTTPS Callout Flows.
ALTER TABLE md_object_actions DROP CONSTRAINT IF EXISTS md_object_actions_behavior_contract;
ALTER TABLE md_object_actions ADD CONSTRAINT md_object_actions_behavior_contract CHECK(
 (action_type='Standard' AND behavior IS NULL AND field_api IS NULL AND value_text IS NULL
  AND target_object_api IS NULL AND relationship_field_api IS NULL AND flow_api_name IS NULL
  AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
 OR (action_type='Custom' AND (
   (behavior='Set Field Value' AND field_api IS NOT NULL AND value_text IS NOT NULL
     AND target_object_api IS NULL AND flow_api_name IS NULL AND relationship_field_api IS NULL
     AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
   OR (behavior='Log Call' AND field_api IS NULL AND target_object_api IS NULL
     AND flow_api_name IS NULL AND relationship_field_api IS NULL AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
   OR (behavior='Run Flow' AND flow_api_name IS NOT NULL AND field_api IS NULL
     AND target_object_api IS NULL AND relationship_field_api IS NULL AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
   OR (behavior='Create Related' AND target_object_api IS NOT NULL
     AND relationship_field_api IS NOT NULL AND field_api IS NULL AND flow_api_name IS NULL
     AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
   OR (behavior='Send Email' AND field_api IS NULL AND relationship_field_api IS NULL
     AND target_object_api IS NULL AND value_text IS NULL AND component_api_name IS NULL
     AND ((flow_api_name IS NOT NULL AND credential_id IS NULL AND from_email IS NULL)
       OR (flow_api_name IS NULL AND credential_id IS NOT NULL AND from_email IS NOT NULL
         AND length(from_email)<=254 AND from_email~'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$')))
   OR (behavior='Open Component' AND component_api_name IS NOT NULL AND field_api IS NULL
     AND value_text IS NULL AND target_object_api IS NULL AND relationship_field_api IS NULL
     AND flow_api_name IS NULL AND credential_id IS NULL AND from_email IS NULL)
  ))
);
DO $sql$
DECLARE contract record;
BEGIN
 FOR contract IN SELECT conname FROM pg_constraint
  WHERE conrelid='md_global_quick_actions'::regclass AND contype='c'
    AND pg_get_constraintdef(oid) LIKE '%Create Record%'
    AND pg_get_constraintdef(oid) LIKE '%Send Email%'
 LOOP
  EXECUTE format('ALTER TABLE md_global_quick_actions DROP CONSTRAINT %I',contract.conname);
 END LOOP;
END $sql$;
ALTER TABLE md_global_quick_actions ADD CONSTRAINT md_global_quick_actions_behavior_contract_v2 CHECK(
 (behavior='Create Record' AND target_object_api IS NOT NULL AND flow_api_name IS NULL
   AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
 OR (behavior='Run Flow' AND flow_api_name IS NOT NULL AND target_object_api IS NULL
   AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
 OR (behavior='Send Email' AND target_object_api IS NULL AND component_api_name IS NULL
   AND ((flow_api_name IS NOT NULL AND credential_id IS NULL AND from_email IS NULL)
     OR (flow_api_name IS NULL AND credential_id IS NOT NULL AND from_email IS NOT NULL
       AND length(from_email)<=254 AND from_email~'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$')))
 OR (behavior='Open Component' AND component_api_name IS NOT NULL AND target_object_api IS NULL
   AND flow_api_name IS NULL AND credential_id IS NULL AND from_email IS NULL)
);
