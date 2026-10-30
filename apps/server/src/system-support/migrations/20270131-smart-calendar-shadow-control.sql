-- Smart Calendar uses the shared three-preset Shadow control, not a color picker.
-- Tenant-safe/idempotent and preserves all existing shadow values and custom layouts.
UPDATE md_builder_ribbon_component_rules
SET control_kind_override='shadow'
WHERE component_api='smart_calendar' AND property_key='shadow'
  AND control_kind_override IS DISTINCT FROM 'shadow';
