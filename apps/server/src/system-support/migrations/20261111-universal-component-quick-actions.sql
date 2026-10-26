-- Reusable Open Component Quick Actions. Retains existing tenant metadata and records.
ALTER TABLE md_object_actions ADD COLUMN IF NOT EXISTS component_api_name text;
ALTER TABLE md_object_actions ADD COLUMN IF NOT EXISTS component_bindings jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE md_object_actions DROP CONSTRAINT IF EXISTS md_object_actions_component_bindings_check;
ALTER TABLE md_object_actions ADD CONSTRAINT md_object_actions_component_bindings_check
 CHECK(jsonb_typeof(component_bindings)='array' AND jsonb_array_length(component_bindings)<=20);
ALTER TABLE md_object_actions ADD COLUMN IF NOT EXISTS presentation text NOT NULL DEFAULT 'Modal';
ALTER TABLE md_global_quick_actions ADD COLUMN IF NOT EXISTS component_api_name text;
ALTER TABLE md_global_quick_actions ADD COLUMN IF NOT EXISTS component_bindings jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE md_global_quick_actions DROP CONSTRAINT IF EXISTS md_global_quick_actions_component_bindings_check;
ALTER TABLE md_global_quick_actions ADD CONSTRAINT md_global_quick_actions_component_bindings_check
 CHECK(jsonb_typeof(component_bindings)='array' AND jsonb_array_length(component_bindings)<=20);
ALTER TABLE md_global_quick_actions ADD COLUMN IF NOT EXISTS presentation text NOT NULL DEFAULT 'Modal';
ALTER TABLE md_object_actions DROP CONSTRAINT IF EXISTS md_object_actions_presentation_check;
ALTER TABLE md_object_actions ADD CONSTRAINT md_object_actions_presentation_check
 CHECK(presentation IN ('Modal','Side Panel'));
ALTER TABLE md_global_quick_actions DROP CONSTRAINT IF EXISTS md_global_quick_actions_presentation_check;
ALTER TABLE md_global_quick_actions ADD CONSTRAINT md_global_quick_actions_presentation_check
 CHECK(presentation IN ('Modal','Side Panel'));
-- The legacy global behavior CHECK was unnamed. Drop only constraints mentioning the action kinds.
DO $$
DECLARE old_name text;
BEGIN
 FOR old_name IN SELECT c.conname FROM pg_constraint c
  WHERE c.conrelid='md_global_quick_actions'::regclass AND c.contype='c'
   AND pg_get_constraintdef(c.oid) LIKE '%Create Record%'
 LOOP
  EXECUTE format('ALTER TABLE md_global_quick_actions DROP CONSTRAINT %I',old_name);
 END LOOP;
END $$;
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
   OR (behavior='Send Email' AND credential_id IS NOT NULL AND from_email IS NOT NULL
     AND length(from_email)<=254 AND from_email~'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
     AND field_api IS NULL AND flow_api_name IS NULL AND relationship_field_api IS NULL
     AND target_object_api IS NULL AND value_text IS NULL AND component_api_name IS NULL)
    OR (behavior='Open Component' AND component_api_name IS NOT NULL AND field_api IS NULL
      AND value_text IS NULL AND target_object_api IS NULL AND relationship_field_api IS NULL
      AND flow_api_name IS NULL AND credential_id IS NULL AND from_email IS NULL)
  )));
ALTER TABLE md_global_quick_actions DROP CONSTRAINT IF EXISTS md_global_quick_actions_behavior_contract;
ALTER TABLE md_global_quick_actions ADD CONSTRAINT md_global_quick_actions_behavior_contract CHECK(
 (behavior='Create Record' AND target_object_api IS NOT NULL AND flow_api_name IS NULL
   AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
 OR (behavior='Run Flow' AND flow_api_name IS NOT NULL AND target_object_api IS NULL
   AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
 OR (behavior='Send Email' AND credential_id IS NOT NULL AND from_email IS NOT NULL
   AND length(from_email)<=254 AND from_email~'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
   AND target_object_api IS NULL AND flow_api_name IS NULL AND component_api_name IS NULL)
 OR (behavior='Open Component' AND component_api_name IS NOT NULL AND target_object_api IS NULL
   AND flow_api_name IS NULL AND credential_id IS NULL AND from_email IS NULL));
