-- Eight-tab Page Builder ribbon specification (31 Oct 2026).
-- Presentation metadata only: no saved component values, tenant records, rules or flows change.
-- All keys below were checked against the existing shared-property inventory and migrations.
-- Preserve existing icon components and colour controls in React.
UPDATE md_builder_shared_properties
 SET tab='Layout',
     section_group=CASE
       WHEN property_key='iconFillColor' THEN 'Icon'
       ELSE 'Image' END
 WHERE property_key IN ('imagePlacement','imageFill','imageBorderColor','iconFillColor')
   AND tab IN ('Design','Shapes','Layout');

UPDATE md_builder_shared_properties SET tab='Layout',section_group='Tabs'
 WHERE property_key='tabCount' AND tab IN ('Design','Layout');
UPDATE md_builder_shared_properties SET tab='Layout',section_group='Cards'
 WHERE property_key IN ('imageHeight','headerBoxHeight','supportingBoxHeight')
   AND tab='Layout';
UPDATE md_builder_shared_properties SET tab='Layout',section_group='Size & Position'
 WHERE property_key IN ('width','height','x','y') AND tab='Layout';

-- Existing Data formula values remain expressions. A formula box now contains its own label;
-- remove additional external caption tracks and keep two equal columns in Values.
WITH placements(property_key,group_name,row_no,order_no,width_px,caption,caption_px) AS (
 VALUES
 ('objectApiName','Source',1,1,145,'Object 1',52),
 ('objectApiName2','Source',2,1,145,'Object 2',52),
 ('objectApiName3','Source',3,1,145,'Object 3',52),
 ('label','Values',1,1,252,'Label',0),
 ('imageSource','Values',1,2,252,'Image source',0),
 ('defaultValue','Values',2,1,252,'Default value',0),
 ('textSource','Values',2,2,252,'Text source',0),
 ('badgeText','Values',3,1,252,'Badge text',0),
 ('defaultCheck','Values',3,2,42,'Default check',100),
 ('column2Source','Cart columns',1,1,252,'Column 2',0),
 ('column3Source','Cart columns',1,2,252,'Column 3',0),
 ('column4Source','Cart columns',2,1,252,'Column 4',0),
 ('column5Source','Cart columns',2,2,252,'Column 5',0),
 ('columnVisibility','Cart columns',3,1,145,'Column Visibility',0)
)
UPDATE md_builder_shared_properties AS p
 SET section_group=v.group_name,design_row=v.row_no,design_order=v.order_no,
 design_width=v.width_px,design_height=26,design_caption=v.caption,
 design_caption_width=v.caption_px
FROM placements v WHERE p.tab='Data' AND p.property_key=v.property_key;

-- Cart monetary bindings were added later than the mockup; keep them reachable
-- as an additional, disabled-for-other-components group, not silently deleted.
UPDATE md_builder_shared_properties SET section_group='Cart totals'
 WHERE tab='Data' AND property_key IN ('subtotalValue','discountValue','taxValue','totalValue');
WITH totals(property_key,row_no,order_no) AS (
 VALUES ('subtotalValue',1,1),('discountValue',1,2),('taxValue',2,1),('totalValue',2,2)
)
UPDATE md_builder_shared_properties AS p SET design_row=v.row_no,
 design_order=v.order_no,design_width=252,design_height=26,design_caption_width=0
FROM totals v WHERE p.tab='Data' AND p.property_key=v.property_key;

-- Ten fixed Design groups. Rows/track widths reflect the real 26px controls.
-- Existing components' icons/values are untouched; unsupported fields stay listed.
WITH geometry(property_key,section_group,row_no,order_no,width_px) AS (
 VALUES
 ('backgroundColor','Body',1,1,40),('borderColor','Body',1,2,40),
 ('labelColor','Body',2,1,40),('radius','Body',2,2,64),('shadow','Body',3,1,35),
 ('labelAlignment','Typography',1,1,35),('textSize','Typography',1,2,64),
 ('defaultValueColor','Typography',2,1,40),
 ('selectedTabColor','Tabs',1,1,40),('tabColor','Tabs',1,2,40),
 ('wrapText','Header',1,1,28),('headerBorderColor','Header',1,2,40),
 ('headerTextColor','Header',2,1,40),('headerBold','Header',2,2,28),
 ('headerAlignment','Header',3,1,35),
 ('badgeAlignment','Badge',1,1,84),('badgeVisible','Badge',1,2,28),
 ('badgeTextSize','Badge',2,1,64),('badgeBold','Badge',2,2,28),
 ('badgeBodyColor','Badge',3,1,40),('badgeTextColor','Badge',3,2,40),
 ('supportingBorderColor','Header Supporting',1,1,40),
 ('supportingTextColor','Header Supporting',1,2,40),
 ('supportingBold','Header Supporting',2,1,28),
 ('supportingAlignment','Header Supporting',2,2,35),
 ('tableBackgroundColor','Table',1,1,40),('tableBorderColor','Table',1,2,40),
 ('tableRadius','Table',2,1,64),('tableShadow','Table',2,2,35),
 ('rowBorderColor','Row',1,1,40),('rowLabelColor','Row',1,2,40),
 ('rowRadius','Row',2,1,64),('rowHeight','Row',2,2,64),
 ('summaryBackgroundColor','Summary',1,1,40),('summaryBorderColor','Summary',1,2,40),
 ('summaryRadius','Summary',1,3,64),('summaryTextColor','Summary',2,1,40),
 ('summaryHeight','Summary',2,2,64),('summaryWidth','Summary',2,3,64),
 ('summaryTextSize','Summary',3,1,64),('summaryTextWeight','Summary',3,2,28),
 ('summaryShadow','Summary',3,3,35),
 ('summary2TextSize','Summary 2',1,1,64),('summary2TextWeight','Summary 2',1,2,28),
 ('summary2TextColor','Summary 2',2,1,40)
)
UPDATE md_builder_shared_properties AS p SET section_group=v.section_group,
 design_row=v.row_no,design_order=v.order_no,design_width=v.width_px,design_height=26,
 design_caption_width=0
FROM geometry v WHERE p.tab='Design' AND p.property_key=v.property_key;

-- Retain the existing Position dropdown but remove its external width-reserving caption.
UPDATE md_builder_shared_properties
 SET design_width=84,design_caption='Position',design_caption_width=0
 WHERE tab='Design' AND property_key='badgeAlignment';

-- Layout: Size & Position, Tabs, Cards, Navigation, Calendar, Image and Icon.
-- Page and Canvas remain the existing metadata-backed controls rendered by the parent.
WITH geometry(property_key,group_name,row_no,order_no,width_px,caption,caption_px) AS (
 VALUES
 ('width','Size & Position',1,1,64,NULL,0),
 ('x','Size & Position',1,2,64,NULL,0),
 ('height','Size & Position',2,1,64,NULL,0),
 ('y','Size & Position',2,2,64,NULL,0),
 ('tabWidth','Tabs',1,1,64,NULL,0),
 ('tabHeight','Tabs',1,2,64,NULL,0),
 ('tabCount','Tabs',2,1,64,NULL,0),
 ('cardsPerRow','Cards',1,1,82,'Columns',0),
 ('cardsPerColumn','Cards',1,2,82,'Rows',0),
 ('imageHeight','Cards',2,1,64,NULL,0),
 ('headerBoxHeight','Cards',2,2,64,NULL,0),
 ('supportingBoxHeight','Cards',3,1,64,NULL,0),
 ('navigationDirection','Navigation',1,1,125,'Direction',0),
 ('showDays','Calendar',1,1,60,'Days',0),
 ('firstDay','Calendar',1,2,84,'First day',0),
 ('imagePlacement','Image',1,1,99,'Place',0),
 ('imageFill','Image',2,1,84,'Fit',0),
 ('imageBorderColor','Image',3,1,40,'Border',0),
 ('iconFillColor','Icon',1,1,40,'Icon colour',0)
)
UPDATE md_builder_shared_properties AS p SET section_group=v.group_name,
 design_row=v.row_no,design_order=v.order_no,design_width=v.width_px,
 design_height=26,design_caption=v.caption,design_caption_width=v.caption_px
FROM geometry v WHERE p.tab='Layout' AND p.property_key=v.property_key;
