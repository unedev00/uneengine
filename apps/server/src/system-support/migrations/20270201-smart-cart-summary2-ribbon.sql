-- Smart Cart Summary 2 has its own ribbon group.  The keys and stored page
-- values are unchanged; only metadata placement and redundant display labels
-- change.  This is forward-only and safe to rerun.
UPDATE md_builder_shared_properties
SET section_group='Summary 2'
WHERE tab='Design' AND property_key IN
 ('summary2TextSize','summary2TextWeight','summary2TextColor');

UPDATE md_builder_shared_properties
SET label=CASE property_key
 WHEN 'summaryTextSize' THEN 'Text Size'
 WHEN 'summaryTextWeight' THEN 'Bold'
 WHEN 'summaryTextColor' THEN 'Text Color'
 WHEN 'summary2TextSize' THEN 'Text Size'
 WHEN 'summary2TextWeight' THEN 'Bold'
 WHEN 'summary2TextColor' THEN 'Text Color'
 ELSE label END
WHERE tab='Design' AND property_key IN
 ('summaryTextSize','summaryTextWeight','summaryTextColor',
  'summary2TextSize','summary2TextWeight','summary2TextColor');
