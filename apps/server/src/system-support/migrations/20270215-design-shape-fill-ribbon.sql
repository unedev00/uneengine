-- Shared Shape ribbon layout and surface-fill control.
-- Shape geometry is the existing shared component property; Shape Fill is a
-- second editor for the existing effective surface colour, not new runtime data.
-- Metadata only: saved pages, tenant customisations and records are untouched.

-- Move the previously registered Shape gallery from Layout to Design, with
-- the approved full 94px editor track, not the generic choice shrink.
UPDATE md_builder_shared_properties
SET tab='Design', section_group='Shape',
    design_row=1, design_order=1, design_width=94, design_height=26,
    design_caption='Shape', design_caption_width=0
WHERE property_key='shapeId'
  AND (tab,section_group,design_row,design_order,design_width,design_height,
       design_caption,design_caption_width)
      IS DISTINCT FROM ('Design','Shape',1,1,94,26,'Shape',0);

-- Reuse the same shared Fill colour-picker UI as Body Color. An alias rule
-- writes the existing runtime colour field: backgroundColor for native shapes,
-- imageBackgroundColor for Container (its effective surface fill).
INSERT INTO md_builder_shared_properties
  (property_key,label,tab,section_group,control_kind,sort_order,default_value,
   choices,scope,design_row,design_order,design_width,design_height,
   design_caption,design_caption_width)
VALUES
  ('shapeFill','Shape Fill','Design','Shape','color',
   (SELECT COALESCE(MAX(sort_order),0)+1 FROM md_builder_shared_properties),
   NULL::jsonb,'[]'::jsonb,'component',2,1,40,26,'Shape Fill',0)
ON CONFLICT(property_key) DO NOTHING;

-- Only the five shape-capable components enable this slot. Disabled inventory
-- remains visible for all other components, like the other shared ribbon slots.
INSERT INTO md_builder_ribbon_component_rules
  (component_api,property_key,enabled,control_kind_override,value_key,
   default_value_override,choices_override)
SELECT c.component_api,'shapeFill',true,NULL,
       CASE WHEN c.component_api='smart_container'
            THEN 'imageBackgroundColor' ELSE 'backgroundColor' END,
       NULL,NULL
FROM (VALUES
  ('smart_button'),('smart_toggle'),('smart_lookup'),
  ('smart_text'),('smart_container')
) AS c(component_api)
JOIN md_builder_ribbon_components registered
  ON registered.component_api=c.component_api
ON CONFLICT(component_api,property_key) DO NOTHING;
