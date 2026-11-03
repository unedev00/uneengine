-- One shared, SQL-owned zero-based initial Tab Index for Smart Tabs.
-- Preserve all existing page component values, tenant customisations,
-- published layouts, Flows and the already-approved horizontal/vertical orientation.
-- Width/Height retain their requested row-one slots, Orientation remains R2C2,
-- Index occupies the previously conflicting free R2C1, and Count moves to R3C1.
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,
  min_value,max_value,choices,scope,design_row,design_order,design_width,
  design_height,design_caption,design_caption_width)
SELECT 'tabIndex','Tab Index','Layout','Tabs','number',
 COALESCE(MAX(sort_order),0)+1,'0'::jsonb,0,20,'[]'::jsonb,'component',
 2,1,30,26,'Tab Index',45
FROM md_builder_shared_properties
ON CONFLICT(property_key) DO NOTHING;

-- Global property inventory, enabled only for Smart Tabs; keep tenant rule edits.
INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,
  default_value_override,choices_override)
SELECT 'smart_tabs','tabIndex',true,NULL,NULL,NULL,NULL
WHERE EXISTS(SELECT 1 FROM md_builder_ribbon_components WHERE component_api='smart_tabs')
ON CONFLICT(component_api,property_key) DO NOTHING;

-- Correct the conflicting layout positions without altering saved values.
-- Existing Orientation remains Layout / Tabs / R2C2.
WITH approved(property_key,row_no,col_no,width_px) AS (
 VALUES ('tabWidth',1,1,58),('tabHeight',1,2,58),
        ('tabCount',3,1,58),('tabIndex',2,1,30)
)
UPDATE md_builder_shared_properties AS p
SET tab='Layout',section_group='Tabs',
 design_row=approved.row_no,design_order=approved.col_no,
 design_width=approved.width_px,design_height=26,
 design_caption=CASE WHEN p.property_key='tabIndex' THEN 'Tab Index' ELSE p.design_caption END,
 design_caption_width=CASE WHEN p.property_key='tabIndex' THEN 45 ELSE 0 END
FROM approved
WHERE p.property_key=approved.property_key
 AND (p.tab,p.section_group,p.design_row,p.design_order,p.design_width,
       p.design_height,p.design_caption_width)
  IS DISTINCT FROM
     ('Layout','Tabs',approved.row_no,approved.col_no,approved.width_px,
       26,CASE WHEN p.property_key='tabIndex' THEN 45 ELSE 0 END);
