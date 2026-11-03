-- Design 2: SQL-backed contextual slots; the original Design inventory is untouched.
-- Reuses existing editor/icon components and existing property value keys.
-- One property can appear in multiple area/slot rows without duplicating its definition.
-- Idempotent: existing tenant-edited placements are not overwritten.
ALTER TABLE md_builder_shared_properties
 DROP CONSTRAINT IF EXISTS md_builder_shared_properties_tab_check;
ALTER TABLE md_builder_shared_properties
 ADD CONSTRAINT md_builder_shared_properties_tab_check
 CHECK(tab IN ('Home','Data','Design','Design2','Shapes','Layout'));

-- New controls only where the existing component renderer has a genuine missing
-- style hook. They live on Design2, never appear in the legacy Design tab.
WITH specs(property_key,label,kind,default_value) AS (
 VALUES
 ('headerTextSize','Header Text Size','number',NULL::jsonb),
 ('supportingBackgroundColor','Supporting Body Color','color',NULL::jsonb),
 ('supportingTextSize','Supporting Text Size','number',NULL::jsonb),
 ('rowAlignment','Row Alignment','align',NULL::jsonb),
 ('rowTextSize','Row Text Size','number',NULL::jsonb),
 ('rowBold','Row Bold','boolean',NULL::jsonb),
 ('summaryAlignment','Summary Alignment','align',NULL::jsonb),
 ('summary2Alignment','Summary 2 Alignment','align',NULL::jsonb)
), missing AS (
 SELECT s.*, row_number() OVER(ORDER BY s.property_key) AS pos
 FROM specs s
 WHERE NOT EXISTS(SELECT 1 FROM md_builder_shared_properties p WHERE p.property_key=s.property_key)
), last_order AS (
 SELECT COALESCE(MAX(sort_order),0) AS n FROM md_builder_shared_properties
)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,
  choices,scope,design_row,design_order,design_width,design_height,design_caption_width,design_display)
SELECT m.property_key,m.label,'Design2','Contextual',m.kind,
 l.n+m.pos,m.default_value,'[]'::jsonb,'component',
 3,1,CASE WHEN m.kind='number' THEN 58 WHEN m.kind='boolean' THEN 28 ELSE 40 END,
 26,0,CASE WHEN m.kind='align' THEN 'dropdown' ELSE 'buttons' END
FROM missing m CROSS JOIN last_order l
ON CONFLICT(property_key) DO NOTHING;

-- Applicability remains separate from area placement. Missing controls for
-- unrelated components remain disabled, never silently write unused keys.
WITH supported(component_api,property_key) AS (
 VALUES
 ('smart_cart','headerTextSize'),('smart_cart','supportingBackgroundColor'),
 ('smart_cart','supportingTextSize'),('smart_cart','rowAlignment'),
 ('smart_cart','rowTextSize'),('smart_cart','rowBold'),
 ('smart_cart','summaryAlignment'),('smart_cart','summary2Alignment'),
 ('smart_table','headerTextSize'),('smart_table','rowAlignment'),
 ('smart_table','rowTextSize'),('smart_table','rowBold'),
 ('smart_table','summaryAlignment')
)
INSERT INTO md_builder_ribbon_component_rules(component_api,property_key,enabled)
SELECT s.component_api,s.property_key,true
FROM supported s
JOIN md_builder_ribbon_components c ON c.component_api=s.component_api
JOIN md_builder_shared_properties p ON p.property_key=s.property_key
ON CONFLICT(component_api,property_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS md_builder_design2_slots (
 area text NOT NULL,
 area_order smallint NOT NULL CHECK(area_order>0),
 slot_key text NOT NULL,
 row_no smallint NOT NULL CHECK(row_no IN (2,3)),
 order_no smallint NOT NULL CHECK(order_no>0),
 width_px smallint NOT NULL CHECK(width_px BETWEEN 20 AND 300),
 height_px smallint NOT NULL CHECK(height_px=26),
 property_key text REFERENCES md_builder_shared_properties(property_key),
 fallback_key text NOT NULL REFERENCES md_builder_shared_properties(property_key),
 PRIMARY KEY(area,slot_key),
 UNIQUE(area,row_no,order_no)
);
-- Rows 2 and 3 are the familiar shared property boxes; row 1 hosts the
-- area selector, visibility switch and the existing Shape / Shape Fill controls.
-- Null property_key intentionally draws a disabled control using the fallback icon.
INSERT INTO md_builder_design2_slots
 (area,area_order,slot_key,row_no,order_no,width_px,height_px,property_key,fallback_key)
VALUES
 ('Body',1,'fill',2,1,40,26,'backgroundColor','backgroundColor'),
 ('Body',1,'border',2,2,40,26,'borderColor','borderColor'),
 ('Body',1,'radius',2,3,58,26,'radius','radius'),
 ('Body',1,'height',2,4,58,26,NULL,'rowHeight'),
 ('Body',1,'width',2,5,58,26,NULL,'summaryWidth'),
 ('Body',1,'focused',2,6,40,26,NULL,'selectedRowColor'),
 ('Body',1,'shadow',2,7,35,26,'shadow','shadow'),
 ('Body',1,'text',3,1,40,26,'labelColor','labelColor'),
 ('Body',1,'alignment',3,2,35,26,'labelAlignment','labelAlignment'),
 ('Body',1,'size',3,3,58,26,'textSize','textSize'),
 ('Body',1,'bold',3,4,28,26,NULL,'headerBold'),
 ('Body',1,'wrap',3,5,28,26,NULL,'wrapText'),
 ('Header',2,'fill',2,1,40,26,'headerBodyColor','backgroundColor'),
 ('Header',2,'border',2,2,40,26,'headerBorderColor','borderColor'),
 ('Header',2,'radius',2,3,58,26,NULL,'radius'),
 ('Header',2,'height',2,4,58,26,'headerBoxHeight','rowHeight'),
 ('Header',2,'width',2,5,58,26,NULL,'summaryWidth'),
 ('Header',2,'focused',2,6,40,26,NULL,'selectedRowColor'),
 ('Header',2,'shadow',2,7,35,26,NULL,'shadow'),
 ('Header',2,'text',3,1,40,26,'headerTextColor','labelColor'),
 ('Header',2,'alignment',3,2,35,26,'headerAlignment','labelAlignment'),
 ('Header',2,'size',3,3,58,26,'headerTextSize','textSize'),
 ('Header',2,'bold',3,4,28,26,'headerBold','headerBold'),
 ('Header',2,'wrap',3,5,28,26,'wrapText','wrapText'),
 ('Header Supporting',3,'fill',2,1,40,26,'supportingBackgroundColor','backgroundColor'),
 ('Header Supporting',3,'border',2,2,40,26,'supportingBorderColor','borderColor'),
 ('Header Supporting',3,'radius',2,3,58,26,NULL,'radius'),
 ('Header Supporting',3,'height',2,4,58,26,'supportingBoxHeight','rowHeight'),
 ('Header Supporting',3,'width',2,5,58,26,NULL,'summaryWidth'),
 ('Header Supporting',3,'focused',2,6,40,26,NULL,'selectedRowColor'),
 ('Header Supporting',3,'shadow',2,7,35,26,NULL,'shadow'),
 ('Header Supporting',3,'text',3,1,40,26,'supportingTextColor','labelColor'),
 ('Header Supporting',3,'alignment',3,2,35,26,'supportingAlignment','labelAlignment'),
 ('Header Supporting',3,'size',3,3,58,26,'supportingTextSize','textSize'),
 ('Header Supporting',3,'bold',3,4,28,26,'supportingBold','headerBold'),
 ('Header Supporting',3,'wrap',3,5,28,26,NULL,'wrapText'),
 ('Table',4,'fill',2,1,40,26,'tableBackgroundColor','backgroundColor'),
 ('Table',4,'border',2,2,40,26,'tableBorderColor','borderColor'),
 ('Table',4,'radius',2,3,58,26,'tableRadius','radius'),
 ('Table',4,'height',2,4,58,26,NULL,'rowHeight'),
 ('Table',4,'width',2,5,58,26,NULL,'summaryWidth'),
 ('Table',4,'focused',2,6,40,26,NULL,'selectedRowColor'),
 ('Table',4,'shadow',2,7,35,26,'tableShadow','shadow'),
 ('Table',4,'text',3,1,40,26,NULL,'labelColor'),
 ('Table',4,'alignment',3,2,35,26,NULL,'labelAlignment'),
 ('Table',4,'size',3,3,58,26,NULL,'textSize'),
 ('Table',4,'bold',3,4,28,26,NULL,'headerBold'),
 ('Table',4,'wrap',3,5,28,26,NULL,'wrapText'),
 ('Row',5,'fill',2,1,40,26,NULL,'backgroundColor'),
 ('Row',5,'border',2,2,40,26,'rowBorderColor','borderColor'),
 ('Row',5,'radius',2,3,58,26,'rowRadius','radius'),
 ('Row',5,'height',2,4,58,26,'rowHeight','rowHeight'),
 ('Row',5,'width',2,5,58,26,NULL,'summaryWidth'),
 ('Row',5,'focused',2,6,40,26,'selectedRowColor','selectedRowColor'),
 ('Row',5,'shadow',2,7,35,26,NULL,'shadow'),
 ('Row',5,'text',3,1,40,26,'rowLabelColor','labelColor'),
 ('Row',5,'alignment',3,2,35,26,'rowAlignment','labelAlignment'),
 ('Row',5,'size',3,3,58,26,'rowTextSize','textSize'),
 ('Row',5,'bold',3,4,28,26,'rowBold','headerBold'),
 ('Row',5,'wrap',3,5,28,26,NULL,'wrapText'),
 ('Summary',6,'fill',2,1,40,26,'summaryBackgroundColor','backgroundColor'),
 ('Summary',6,'border',2,2,40,26,'summaryBorderColor','borderColor'),
 ('Summary',6,'radius',2,3,58,26,'summaryRadius','radius'),
 ('Summary',6,'height',2,4,58,26,'summaryHeight','rowHeight'),
 ('Summary',6,'width',2,5,58,26,'summaryWidth','summaryWidth'),
 ('Summary',6,'focused',2,6,40,26,NULL,'selectedRowColor'),
 ('Summary',6,'shadow',2,7,35,26,'summaryShadow','shadow'),
 ('Summary',6,'text',3,1,40,26,'summaryTextColor','labelColor'),
 ('Summary',6,'alignment',3,2,35,26,'summaryAlignment','labelAlignment'),
 ('Summary',6,'size',3,3,58,26,'summaryTextSize','textSize'),
 ('Summary',6,'bold',3,4,28,26,'summaryTextWeight','headerBold'),
 ('Summary',6,'wrap',3,5,28,26,NULL,'wrapText'),
 ('Summary 2',7,'fill',2,1,40,26,NULL,'backgroundColor'),
 ('Summary 2',7,'border',2,2,40,26,NULL,'borderColor'),
 ('Summary 2',7,'radius',2,3,58,26,NULL,'radius'),
 ('Summary 2',7,'height',2,4,58,26,NULL,'rowHeight'),
 ('Summary 2',7,'width',2,5,58,26,NULL,'summaryWidth'),
 ('Summary 2',7,'focused',2,6,40,26,NULL,'selectedRowColor'),
 ('Summary 2',7,'shadow',2,7,35,26,NULL,'shadow'),
 ('Summary 2',7,'text',3,1,40,26,'summary2TextColor','labelColor'),
 ('Summary 2',7,'alignment',3,2,35,26,'summary2Alignment','labelAlignment'),
 ('Summary 2',7,'size',3,3,58,26,'summary2TextSize','textSize'),
 ('Summary 2',7,'bold',3,4,28,26,'summary2TextWeight','headerBold'),
 ('Summary 2',7,'wrap',3,5,28,26,NULL,'wrapText'),
 ('Tabs',8,'fill',2,1,40,26,'tabColor','backgroundColor'),
 ('Tabs',8,'border',2,2,40,26,'borderColor','borderColor'),
 ('Tabs',8,'radius',2,3,58,26,'radius','radius'),
 ('Tabs',8,'height',2,4,58,26,'tabHeight','rowHeight'),
 ('Tabs',8,'width',2,5,58,26,'tabWidth','summaryWidth'),
 ('Tabs',8,'focused',2,6,40,26,'selectedTabColor','selectedRowColor'),
 ('Tabs',8,'shadow',2,7,35,26,'shadow','shadow'),
 ('Tabs',8,'text',3,1,40,26,'labelColor','labelColor'),
 ('Tabs',8,'alignment',3,2,35,26,'labelAlignment','labelAlignment'),
 ('Tabs',8,'size',3,3,58,26,'textSize','textSize'),
 ('Tabs',8,'bold',3,4,28,26,NULL,'headerBold'),
 ('Tabs',8,'wrap',3,5,28,26,NULL,'wrapText')
ON CONFLICT(area,slot_key) DO NOTHING;
