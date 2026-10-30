-- Compact Layout ribbon: group the existing page-level Layout and Version controls
-- under Page. SQL metadata remains the source of truth for group placement.
-- Idempotent, no page component values, versions or tenant customisations changed.
UPDATE md_builder_shared_properties
SET section_group='Page'
WHERE tab='Home' AND scope='page'
  AND property_key IN ('deviceLayout','selectVersion')
  AND section_group IN ('Device','Version');
