-- Zero-based default selection for Smart Tabs, stored in the existing global
-- SQL-owned ribbon inventory. No app-specific runtime, tenant values, or user
-- customisations are overwritten.
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,
  min_value,max_value,choices,scope,design_row,design_order,design_width,
  design_height,design_caption,design_caption_width)
SELECT 'tabIndex','Tab Index','Layout','Tabs','number',
 COALESCE(MAX(sort_order),0)+1,'0'::jsonb,0,20,'[]'::jsonb,'component',
 2,1,30,26,'Tab Index',45
FROM md_builder_shared_properties
ON CONFLICT(property_key) DO NOTHING;

-- Only the Tabs component may edit this globally visible property slot.
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,
  default_value_override,choices_override)
VALUES ('smart_tabs','tabIndex',true,NULL,NULL,NULL,NULL)
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;

-- Same fixed ribbon positions for every selected component (including disabled
-- slots). A 45px caption plus 30px spinner-free integer input = 75px total.
UPDATE md_builder_shared_properties
SET label='Tab Index',tab='Layout',section_group='Tabs',control_kind='number',
 default_value=COALESCE(default_value,'0'::jsonb),
 min_value=0,max_value=20,design_row=2,design_order=1,
 design_width=30,design_height=26,design_caption='Tab Index',
 design_caption_width=45
WHERE property_key='tabIndex';

-- The submitted table duplicated R1/C1 for Width and Index. Give Index
-- the vacant R2/C1 instead, without displacing Width, Height or Tab Count.
WITH placement(property_key,row_no,col_no) AS (
 VALUES ('tabWidth',1,1),('tabHeight',1,2),('tabCount',3,1)
)
UPDATE md_builder_shared_properties AS p
SET tab='Layout',section_group='Tabs',design_row=placement.row_no,
 design_order=placement.col_no,design_width=58,design_height=26,
 design_caption_width=0
FROM placement
WHERE p.property_key=placement.property_key;
