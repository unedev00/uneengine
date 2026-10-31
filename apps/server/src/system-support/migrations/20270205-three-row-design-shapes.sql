-- Page Builder three-row Design layout with a separate Shapes tab.
-- Shared SQL metadata only; preserve tenant data, saved component values and RBAC.
DO $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid='md_builder_shared_properties'::regclass
    AND conname='md_builder_shared_properties_tab_check'
    AND pg_get_constraintdef(oid) LIKE '%Shapes%'
 ) THEN
  ALTER TABLE md_builder_shared_properties
   DROP CONSTRAINT IF EXISTS md_builder_shared_properties_tab_check;
  ALTER TABLE md_builder_shared_properties
   ADD CONSTRAINT md_builder_shared_properties_tab_check
   CHECK(tab IN ('Home','Data','Design','Shapes','Layout'));
 END IF;
END $$;

-- Presentation variants are shared-control metadata, never component-specific logic.
ALTER TABLE md_builder_shared_properties
 ADD COLUMN IF NOT EXISTS design_display text NOT NULL DEFAULT 'buttons'
 CHECK(design_display IN ('buttons','dropdown'));

-- Move entire Image and Icon sections without duplicating properties or rules.
UPDATE md_builder_shared_properties
 SET tab='Shapes'
 WHERE tab='Design' AND section_group IN ('Image','Icon');

WITH approved(property_key,row_no,width_px,order_no) AS (
 VALUES
 ('badgeAlignment',1,85,1),
 ('badgeTextSize',2,70,1),
 ('badgeBold',2,28,2),
 ('badgeTextColor',3,40,1),
 ('badgeBodyColor',3,40,2),
 ('badgeVisible',3,40,3),
 ('backgroundColor',1,40,1),
 ('borderColor',1,40,2),
 ('labelColor',2,40,1),
 ('shadow',2,28,2),
 ('radius',3,70,1),
 ('wrapText',1,28,1),
 ('headerBorderColor',1,40,2),
 ('headerTextColor',2,40,1),
 ('headerAlignment',3,28,1),
 ('headerBold',2,28,2),
 ('supportingBorderColor',1,40,1),
 ('supportingTextColor',1,40,2),
 ('supportingBold',2,28,1),
 ('supportingAlignment',2,28,2),
 ('iconFillColor',1,40,1),
 ('imagePlacement',1,70,1),
 ('imageFill',2,70,1),
 ('imageBorderColor',3,40,1),
 ('rowBorderColor',1,40,1),
 ('rowLabelColor',1,40,2),
 ('rowRadius',2,70,1),
 ('rowHeight',3,70,1),
 ('summaryBackgroundColor',1,40,1),
 ('summaryBorderColor',1,40,2),
 ('summaryRadius',1,70,3),
 ('summaryTextColor',2,40,1),
 ('summaryHeight',2,70,2),
 ('summaryWidth',2,70,3),
 ('summaryShadow',3,84,1),
 ('summaryTextSize',3,70,2),
 ('summaryTextWeight',3,28,3),
 ('summary2TextSize',1,70,1),
 ('summary2TextWeight',2,28,1),
 ('summary2TextColor',3,40,1),
 ('tableBackgroundColor',1,40,1),
 ('tableBorderColor',1,40,2),
 ('tableRadius',2,70,1),
 ('tableShadow',3,84,1),
 ('tabCount',1,58,1),
 ('selectedTabColor',2,40,1),
 ('tabColor',2,40,2),
 ('labelAlignment',1,28,1),
 ('defaultValueColor',2,40,1),
 ('textSize',2,70,2)
)
UPDATE md_builder_shared_properties AS p
 SET design_row=a.row_no,design_width=a.width_px,
     design_height=26,design_order=a.order_no
 FROM approved a
 WHERE p.property_key=a.property_key AND p.tab IN ('Design','Shapes')
   AND (p.design_row,p.design_width,p.design_height,p.design_order)
       IS DISTINCT FROM (a.row_no,a.width_px,26,a.order_no);

-- One 28px icon dropdown for alignment and the Body shadow selector.
UPDATE md_builder_shared_properties SET design_display='dropdown'
 WHERE property_key IN ('labelAlignment','headerAlignment','supportingAlignment','shadow')
 AND tab='Design' AND design_display IS DISTINCT FROM 'dropdown';

-- Caption widths are in addition to editor widths, in the same property.
WITH captions(property_key,caption,width_px) AS (
 VALUES ('badgeAlignment','Position',48),
        ('imagePlacement','Place',35),
        ('imageFill','Fit',35),
        ('tabCount','Tabs',35)
)
UPDATE md_builder_shared_properties AS p
 SET design_caption=c.caption,design_caption_width=c.width_px
 FROM captions c
 WHERE p.property_key=c.property_key AND p.tab IN ('Design','Shapes')
   AND (p.design_caption,p.design_caption_width) IS DISTINCT FROM (c.caption,c.width_px);
