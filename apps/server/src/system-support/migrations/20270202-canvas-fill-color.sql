-- Canvas fill is page metadata, independent of nested components and containers.
ALTER TABLE md_lightning_page_details
 ADD COLUMN IF NOT EXISTS canvas_fill_color text NOT NULL DEFAULT '#ffffff';
ALTER TABLE md_page_layout_versions
 ADD COLUMN IF NOT EXISTS canvas_fill_color text NOT NULL DEFAULT '#ffffff';
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope)
SELECT 'canvasFillColor','Canvas Fill Color','Home','Canvas','color',
       COALESCE((SELECT MAX(sort_order)+1 FROM md_builder_shared_properties),1),
       '"#ffffff"'::jsonb,'[]'::jsonb,'page'
WHERE NOT EXISTS (SELECT 1 FROM md_builder_shared_properties WHERE property_key='canvasFillColor')
ON CONFLICT (property_key) DO NOTHING;
