-- Design 2-only Focus Fill metadata. The existing Design tab, existing
-- property definitions, and old page values are not modified.
-- Smart Calendar already uses defaultValueColor for its selected date.
-- Tabs, Cart and Card Grid continue using selectedTabColor/selectedRowColor/
-- selectedCardColor respectively.
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,
  choices,scope,design_row,design_order,design_width,design_height,design_caption_width)
SELECT 'focusColor','Focus Fill','Design2','Contextual','color',
       (SELECT COALESCE(MAX(sort_order),0)+1 FROM md_builder_shared_properties),
       NULL,'[]'::jsonb,'component',2,1,40,26,0
ON CONFLICT(property_key) DO NOTHING;

INSERT INTO md_builder_ribbon_component_rules (component_api,property_key,enabled)
SELECT c.component_api,'focusColor',true
FROM (VALUES ('smart_toggle'),('smart_lookup')) c(component_api)
JOIN md_builder_ribbon_components registered ON registered.component_api=c.component_api
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;

UPDATE md_builder_design2_component_slots
SET property_key='focusColor',fallback_key='focusColor'
WHERE (component_api,area,slot_key) IN
 (('smart_toggle','Body','Focus'),('smart_lookup','Body','Focus'));
