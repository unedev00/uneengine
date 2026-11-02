-- Add the Smart Cart Header Body Color control without changing shared Header
-- slots for Card Grid/Image or existing published Cart component values.
-- Unset values preserve the legacy blue (#255d9d) in the Cart renderer.
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,
  default_value,choices,scope,design_row,design_order,design_width,
  design_height,design_caption_width)
SELECT 'headerBodyColor','Header Body Color','Design','Header','color',
       (SELECT COALESCE(MAX(sort_order),0)+1 FROM md_builder_shared_properties),
       NULL,'[]'::jsonb,'component',3,2,35,26,0
WHERE NOT EXISTS (
 SELECT 1 FROM md_builder_shared_properties WHERE property_key='headerBodyColor'
)
ON CONFLICT(property_key) DO NOTHING;

-- The property is editable only on smart_cart; other components retain their
-- global inventory and disabled/unsupported states.
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled)
SELECT 'smart_cart','headerBodyColor',true
FROM md_builder_shared_properties
WHERE property_key='headerBodyColor'
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;
