-- Shared Page Builder ribbon corrections (1 Nov 2026).
-- Presentation metadata only: no tenant records, expressions, Flows, published
-- pages, permissions or component values are modified. Re-running is safe.
-- Column Visibility is intentionally untouched; its visual alignment is CSS.
WITH geometry(property_key,group_name,row_no,col_no,width_px,caption) AS (
 VALUES
 ('objectApiName','Source',1,1,150,NULL),
 ('objectApiName2','Source',2,1,150,NULL),
 ('objectApiName3','Source',3,1,150,NULL),
 ('label','Values',1,1,225,'Label'),
 ('imageSource','Values',1,2,225,'Image'),
 ('defaultValue','Values',2,1,225,'Default value'),
 ('textSource','Values',2,2,225,'Text'),
 ('badgeText','Values',3,1,225,'Badge text'),
 ('defaultCheck','Values',3,2,225,'Default check'),
 ('column2Source','Cart',1,1,225,NULL),
 ('column3Source','Cart',1,2,225,NULL),
 ('subtotalValue','Cart',1,3,225,'Summary 1'),
 ('column4Source','Cart',2,1,225,NULL),
 ('column5Source','Cart',2,2,225,NULL),
 ('totalValue','Cart',2,3,225,'Summary 2'),
 ('taxValue','Cart',3,2,225,'Summary 3'),
 ('discountValue','Cart',3,3,225,'Summary 4')
)
UPDATE md_builder_shared_properties AS p
SET section_group=g.group_name,
    design_row=g.row_no,
    design_order=g.col_no,
    design_width=g.width_px,
    design_height=26,
    design_caption_width=CASE WHEN p.property_key IN
      ('objectApiName','objectApiName2','objectApiName3') THEN 52 ELSE 0 END,
    design_caption=COALESCE(g.caption,p.design_caption)
FROM geometry g
WHERE p.tab='Data' AND p.property_key=g.property_key;

-- Exact Design tab row/column positions and rendered control widths from the
-- approved property table. Disabled/unsupported controls keep their slots.
WITH geometry(property_key,group_name,row_no,col_no,width_px) AS (
 VALUES
 ('badgeAlignment','Badge',1,1,125),
 ('badgeTextSize','Badge',2,1,58),
 ('badgeBold','Badge',2,2,28),
 ('badgeBodyColor','Badge',3,1,40),
 ('badgeTextColor','Badge',3,2,40),
 ('badgeVisible','Badge',3,3,28),
 ('backgroundColor','Body',1,1,40),
 ('borderColor','Body',1,2,40),
 ('labelColor','Body',2,1,40),
 ('radius','Body',2,2,58),
 ('shadow','Body',3,1,105),
 ('wrapText','Header',1,1,28),
 ('headerBorderColor','Header',1,2,40),
 ('headerTextColor','Header',2,1,40),
 ('headerBold','Header',2,2,28),
 ('headerAlignment','Header',3,1,35),
 ('supportingBorderColor','Header Supporting',1,1,40),
 ('supportingTextColor','Header Supporting',1,2,40),
 ('supportingBold','Header Supporting',2,1,28),
 ('supportingAlignment','Header Supporting',2,2,35),
 ('rowBorderColor','Row',1,1,40),
 ('rowLabelColor','Row',1,2,40),
 ('rowRadius','Row',2,1,58),
 ('rowHeight','Row',3,1,58),
 ('summaryBackgroundColor','Summary',1,1,40),
 ('summaryBorderColor','Summary',1,2,40),
 ('summaryRadius','Summary',1,3,58),
 ('summaryTextColor','Summary',2,1,40),
 ('summaryHeight','Summary',2,2,58),
 ('summaryWidth','Summary',2,3,58),
 ('summaryTextSize','Summary',3,1,58),
 ('summaryTextWeight','Summary',3,2,28),
 ('summaryShadow','Summary',3,3,105),
 ('summary2TextSize','Summary 2',1,1,58),
 ('summary2TextWeight','Summary 2',1,2,28),
 ('summary2TextColor','Summary 2',2,1,40),
 ('tableBackgroundColor','Table',1,1,40),
 ('tableBorderColor','Table',1,2,40),
 ('tableRadius','Table',2,1,58),
 ('tableShadow','Table',3,1,35),
 ('selectedTabColor','Tabs',1,1,40),
 ('tabColor','Tabs',2,1,40),
 ('labelAlignment','Typography',1,1,35),
 ('defaultValueColor','Typography',2,1,40),
 ('textSize','Typography',3,1,58)
)
UPDATE md_builder_shared_properties AS p
SET section_group=g.group_name,
    design_row=g.row_no,
    design_order=g.col_no,
    design_width=g.width_px,
    design_height=26,
    design_caption_width=0
FROM geometry g
WHERE p.tab='Design' AND p.property_key=g.property_key;

-- Badge Alignment displays "Alignment | Value" within its 125px box.
UPDATE md_builder_shared_properties
SET design_caption='Alignment',design_caption_width=0
WHERE tab='Design' AND property_key='badgeAlignment';

-- Body and Summary shadow use three inline choices across 105px.
-- Keep Table Shadow's existing 35px dropdown unchanged.
UPDATE md_builder_shared_properties
SET design_display='icons'
WHERE tab='Design' AND property_key IN ('shadow','summaryShadow');
