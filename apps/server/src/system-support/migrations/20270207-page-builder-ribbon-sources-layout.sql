-- Page Builder ribbon consolidation: SQL-owned layout, idempotent, no saved page data changed.
UPDATE md_builder_shared_properties SET section_group='Values'
 WHERE tab='Data' AND property_key IN ('imageSource','textSource','badgeText');
UPDATE md_builder_shared_properties SET section_group='Others',
 label=CASE WHEN property_key='navigationDirection' THEN 'Navigation Placement' ELSE label END
 WHERE tab='Layout' AND property_key IN ('imageHeight','headerBoxHeight','navigationDirection');
UPDATE md_builder_shared_properties SET section_group='Component'
 WHERE tab='Layout' AND property_key IN ('width','height') AND section_group='Size';
UPDATE md_builder_shared_properties SET label='Object 1'
 WHERE property_key='objectApiName' AND tab='Data' AND label='Object';
INSERT INTO md_builder_shared_properties(property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope)
SELECT v.key,v.label,p.tab,'Source',p.control_kind,
 (SELECT COALESCE(MAX(sort_order),0) FROM md_builder_shared_properties)+v.seq,
 NULL,'[]'::jsonb,p.scope
FROM md_builder_shared_properties p
CROSS JOIN (VALUES('objectApiName2','Object 2',1),('objectApiName3','Object 3',2)) v(key,label,seq)
WHERE p.property_key='objectApiName'
ON CONFLICT(property_key) DO NOTHING;
INSERT INTO md_builder_ribbon_component_rules(
 component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
SELECT rule.component_api,v.key,rule.enabled,NULL,NULL,NULL,NULL
FROM md_builder_ribbon_component_rules rule
CROSS JOIN (VALUES('objectApiName2'),('objectApiName3')) v(key)
WHERE rule.property_key='objectApiName'
ON CONFLICT(component_api,property_key) DO NOTHING;
WITH arrangement(key,tab,grp,row_no,width_px,order_no,caption,caption_width) AS (
 VALUES
 ('objectApiName','Data','Source',1,145,1,'Object 1',52),
 ('objectApiName2','Data','Source',2,145,1,'Object 2',52),
 ('objectApiName3','Data','Source',3,145,1,'Object 3',52),
 ('label','Data','Values',1,225,1,'Label',42),
 ('defaultValue','Data','Values',1,225,2,'Default Value',87),
 ('imageSource','Data','Values',2,225,1,'Image Source',86),
 ('textSource','Data','Values',2,225,2,'Text Source',78),
 ('badgeText','Data','Values',3,225,1,'Badge Text',76),
 ('defaultCheck','Data','Values',3,55,2,'Default Check',88),
 ('imageHeight','Layout','Others',1,70,1,'Image Height',85),
 ('headerBoxHeight','Layout','Others',2,70,1,'Header Box Height',112),
 ('navigationDirection','Layout','Others',3,125,1,'Navigation Placement',131),
 ('width','Layout','Component',1,70,1,NULL,0),
 ('height','Layout','Component',2,70,1,NULL,0),
 ('tabWidth','Layout','Tabs',1,70,1,NULL,0),
 ('tabHeight','Layout','Tabs',2,70,1,NULL,0)
)
UPDATE md_builder_shared_properties p SET
 design_row=a.row_no,design_width=a.width_px,design_height=26,
 design_order=a.order_no,design_caption=a.caption,design_caption_width=a.caption_width
FROM arrangement a
WHERE p.property_key=a.key AND p.tab=a.tab AND p.section_group=a.grp;
