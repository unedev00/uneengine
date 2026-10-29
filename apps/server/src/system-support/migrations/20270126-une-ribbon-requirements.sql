-- Complete the SQL-backed UNE Page Builder ribbon requirements.
-- This migration only edits the global inventory and applicability, not saved page values.
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope)
VALUES ('badgeBodyColor','Badge Body Color','Design','Badge','color',
  (SELECT COALESCE(MAX(sort_order),0)+1 FROM md_builder_shared_properties),
  NULL,'[]'::jsonb,'component')
ON CONFLICT(property_key) DO UPDATE SET
 label=EXCLUDED.label,tab=EXCLUDED.tab,section_group=EXCLUDED.section_group,
 control_kind=EXCLUDED.control_kind;

INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
VALUES
 ('une_item_grid','badgeBodyColor',true,NULL,NULL,NULL,NULL),
 ('une_image','badgeBodyColor',true,NULL,NULL,NULL,NULL)
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;

UPDATE md_builder_ribbon_component_rules SET enabled=false
WHERE (component_api='une_item_grid' AND property_key IN
 ('label','labelAlignment','defaultValueColor','textSize'))
 OR (component_api='une_container' AND property_key IN
 ('objectApiName','imageSource','badgeText','badgeAlignment','badgeTextSize',
  'badgeBold','badgeTextColor','badgeVisible','badgeBodyColor',
  'labelAlignment','textSize','label','textSource','labelColor','imageFill'))
 OR (component_api='une_calendar' AND property_key IN ('label','labelAlignment'));

UPDATE md_builder_shared_properties SET
 tab=CASE
  WHEN property_key IN ('label','defaultValue') THEN 'Data'
  WHEN property_key IN ('tabHeight','tabWidth','headerBoxHeight','imageHeight') THEN 'Layout'
  WHEN property_key='imagePlacement' THEN 'Design'
  ELSE tab END,
 section_group=CASE
  WHEN property_key IN ('label','defaultValue') THEN 'Values'
  WHEN property_key IN ('tabHeight','tabWidth') THEN 'Tabs'
  WHEN property_key='headerBoxHeight' THEN 'Header'
  WHEN property_key IN ('imageHeight','imagePlacement') THEN 'Image'
  ELSE section_group END
WHERE property_key IN
 ('label','defaultValue','tabHeight','tabWidth','headerBoxHeight','imageHeight','imagePlacement');

UPDATE md_builder_ribbon_component_rules SET control_kind_override='shadow'
WHERE component_api='une_calendar' AND property_key='shadow';
