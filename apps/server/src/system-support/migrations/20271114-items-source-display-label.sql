-- Collection is a record-list SOURCE, not a visible field caption.
-- Preserve tenant/user overrides by changing only the original default label.
-- Idempotent and does not touch component instances, published pages or data.
UPDATE md_builder_shared_properties
SET label='Items source'
WHERE property_key='collectionFormula' AND label='Collection';
