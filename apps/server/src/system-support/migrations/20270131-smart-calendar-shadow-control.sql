-- Restore shared Shadow preset semantics for Calendar without deleting prior user data.
-- Old versions mapped this UI property to the obsolete calendarShadowColor value.
-- Reset the override so all Smart components read/write the shared 'shadow' key.
UPDATE md_builder_ribbon_component_rules
SET control_kind_override='shadow', value_key_override=NULL
WHERE component_api='smart_calendar' AND property_key='shadow'
  AND (control_kind_override IS DISTINCT FROM 'shadow'
       OR value_key_override IS NOT NULL);
