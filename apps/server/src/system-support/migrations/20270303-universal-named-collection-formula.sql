-- One universal named COLLECTION source. Formula output is a typed collection,
-- not a new business record. Existing SQL Object filters remain the source of truth.
WITH spec AS (
 SELECT COALESCE(MAX(sort_order),0)+1 AS sort FROM md_builder_shared_properties
)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope,
  field_select)
SELECT 'collectionFormula','Collection','Data','Source','expression',spec.sort,
 NULL,'[]'::jsonb,'component',true
FROM spec ON CONFLICT(property_key) DO NOTHING;

-- Only record-collection consumers get a source editor; the Formula Engine itself
-- is not tied to these components and supports Flow and other binding contexts.
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
SELECT component_api,'collectionFormula',true,NULL,NULL,NULL,NULL
FROM md_builder_ribbon_components
WHERE component_api IN ('smart_tabs','smart_card_grid','smart_navigation','smart_lookup',
 'smart_cart','ui_item_grid','ui_repeater','ui_record_list')
ON CONFLICT(component_api,property_key) DO NOTHING;
