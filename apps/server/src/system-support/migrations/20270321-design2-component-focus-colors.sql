-- Component-specific Focus Fill controls for the approved Design 2 section matrix.
-- Add only Design 2 properties. The original Design inventory stays unchanged.
WITH specs(property_key,label,ordinal) AS (
 VALUES
 ('toggleFocusColor','Toggle On Fill',1),
 ('lookupFocusColor','Lookup Focused Row Fill',2),
 ('navigationFocusColor','Navigation Focus Fill',3)
), existing AS (SELECT COALESCE(MAX(sort_order),0) AS max_order FROM md_builder_shared_properties)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,
  scope,design_row,design_order,design_width,design_height,design_caption_width)
SELECT specs.property_key,specs.label,'Design2','Contextual','color',
 existing.max_order+specs.ordinal,NULL::jsonb,'[]'::jsonb,'component',2,1,40,26,0
FROM specs CROSS JOIN existing
ON CONFLICT(property_key) DO NOTHING;

INSERT INTO md_builder_ribbon_component_rules(component_api,property_key,enabled)
SELECT named.component_api,p.property_key,true
FROM (VALUES
 ('smart_toggle','toggleFocusColor'),
 ('smart_lookup','lookupFocusColor'),
 ('smart_navigation','navigationFocusColor'),
 ('smart_calendar','defaultValueColor')
) AS named(component_api,property_key)
JOIN md_builder_ribbon_components c ON c.component_api=named.component_api
JOIN md_builder_shared_properties p ON p.property_key=named.property_key
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;
