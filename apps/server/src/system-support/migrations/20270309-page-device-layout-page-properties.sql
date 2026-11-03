-- Page layout selection is navigation between independently versioned device drafts,
-- not a component or Layout ribbon setting. Keep the single SQL definition and
-- preserve all tenant metadata and authored layouts; only reclassify its editor.
UPDATE md_builder_shared_properties
SET section_group='Page Properties'
WHERE property_key='deviceLayout' AND tab='Home' AND scope='page'
  AND section_group IN ('Device','Page');
