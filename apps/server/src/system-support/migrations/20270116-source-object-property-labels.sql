-- Label-only migration. Preserve component property keys, authored values, historical versions and tenant custom labels.
-- Update active contracts only where a label still equals the original system label.
WITH labels(component_api,old_label,new_label) AS (
 VALUES
  ('une_conversation', 'Account object', 'Source Object — Account'),
  ('une_conversation', 'Contact object', 'Source Object — Contact'),
  ('une_conversation', 'Contact source Object API from Flow', 'Source Object — Contact (Flow)'),
  ('une_conversation', 'Conversation object', 'Source Object — Conversation'),
  ('une_conversation', 'Message object', 'Source Object — Message'),
  ('une_repeater', 'Flow record source Object API', 'Source Object — Flow Records'),
  ('une_cart', 'State object', 'Source Object — State')
)
UPDATE md_component_library_contract_properties p
SET value_text = labels.new_label
FROM labels
JOIN md_component_library_heads h ON h.component_api=labels.component_api
WHERE p.tenant_id=h.tenant_id
 AND p.component_api=h.component_api
 AND p.version=h.current_version
 AND p.component_api=labels.component_api
 AND p.property_path LIKE '/propertyDefinitions/%/label'
 AND p.value_kind='string'
 AND p.value_text=labels.old_label;
