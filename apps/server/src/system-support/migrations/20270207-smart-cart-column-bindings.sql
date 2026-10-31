-- Smart Cart-specific Data > Cart ribbon settings; global property registry reused.
-- Forward-only and idempotent. No page business records, published values or other apps changed.
WITH specs(n,property_key,label,control_kind,default_value,choices,field_select) AS (
 VALUES
 (1,'column2Source','Column 2 Source','expression',NULL::jsonb,'[]'::jsonb,true),
 (2,'column3Source','Column 3 Source','expression',NULL::jsonb,'[]'::jsonb,true),
 (3,'column4Source','Column 4 Source','expression',NULL::jsonb,'[]'::jsonb,true),
 (4,'column5Source','Column 5 Source','expression',NULL::jsonb,'[]'::jsonb,true),
 (5,'columnVisibility','Column Visibility','choice',
  '["Column 1","Column 2","Column 3","Column 4","Column 5"]'::jsonb,
  '["Column 1","Column 2","Column 3","Column 4","Column 5"]'::jsonb,false)
), missing AS (
 SELECT specs.*,row_number() OVER (ORDER BY n) AS pos FROM specs
 WHERE NOT EXISTS (SELECT 1 FROM md_builder_shared_properties p WHERE p.property_key=specs.property_key)
), last_order AS (SELECT COALESCE(MAX(sort_order),0) AS last_sort FROM md_builder_shared_properties)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,field_select,scope)
SELECT property_key,label,'Data','Cart',control_kind,last_sort+pos,default_value,choices,field_select,'component'
FROM missing CROSS JOIN last_order
ON CONFLICT(property_key) DO NOTHING;

-- Add applicability only for Cart: every other app's property remains disabled.
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
SELECT 'smart_cart',p.property_key,true,NULL,NULL,NULL,NULL
FROM md_builder_shared_properties p
WHERE p.property_key IN ('column2Source','column3Source','column4Source','column5Source','columnVisibility')
ON CONFLICT(component_api,property_key) DO NOTHING;

-- Reuse the existing Cards per row setting as visible Cart lines before scrolling.
-- Do not change any saved page/component value or rules of other components.
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
SELECT 'smart_cart','cardsPerRow',true,NULL,NULL,'5'::jsonb,NULL
WHERE EXISTS(SELECT 1 FROM md_builder_shared_properties WHERE property_key='cardsPerRow')
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true,
 default_value_override=COALESCE(md_builder_ribbon_component_rules.default_value_override,EXCLUDED.default_value_override);

-- Three-row SQL geometry consumed by the same shared property renderer.
WITH placements(key,slot,width_px,caption_px) AS (
 VALUES
 ('column2Source',1,178,104),
 ('column3Source',2,178,104),
 ('column4Source',1,178,104),
 ('column5Source',2,178,104),
 ('columnVisibility',3,145,104)
)
UPDATE md_builder_shared_properties p SET
 design_row=pl.slot,design_width=pl.width_px,design_height=26,
 design_order=CASE WHEN p.property_key IN ('column4Source','column5Source') THEN 2 ELSE 1 END,
 design_caption=p.label,design_caption_width=pl.caption_px
FROM placements pl
WHERE p.property_key=pl.key AND p.tab='Data' AND p.section_group='Cart'
 AND (p.design_row,p.design_width,p.design_height,p.design_order,p.design_caption,p.design_caption_width)
 IS DISTINCT FROM (pl.slot,pl.width_px,26,
  CASE WHEN p.property_key IN ('column4Source','column5Source') THEN 2 ELSE 1 END,
  p.label,pl.caption_px);
