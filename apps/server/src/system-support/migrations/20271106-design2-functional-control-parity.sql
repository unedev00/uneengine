-- Restore the semantic Design 2 mapping without moving approved R/C slots.
-- Shared catalog only. Saved pages and tenant-specific metadata remain untouched.
--
-- A slot existing in the grid is not the same as a working control: enable a
-- property only when its matching shared definition and renderer exist.
UPDATE md_builder_design2_slot_rules
SET property_key='backgroundColor'
WHERE component_api='smart_tabs' AND area='Body' AND slot_key='fill';

INSERT INTO md_builder_design2_slot_rules(component_api,area,slot_key,property_key)
VALUES
  ('smart_textbox','Body','wrap','wrapText'),
  -- Caption alignment remains Body R3C2; value alignment is independently
  -- editable in the existing Header Supporting R3C2 slot.
  ('smart_textbox','Header Supporting','alignment','supportingAlignment'),
  ('smart_textbox','Header Supporting','text','supportingTextColor'),
  ('smart_textbox','Header Supporting','border','supportingBorderColor'),
  ('smart_textbox','Header Supporting','bold','supportingBold'),
  ('smart_icon','Body','fill','backgroundColor'),
  ('smart_icon','Body','border','borderColor'),
  ('smart_icon','Body','shadow','shadow'),
  ('smart_icon','Body','radius','radius'),
  ('smart_icon','Body','width','width'),
  ('smart_icon','Body','height','height'),
  ('smart_toggle','Body','width','width'),
  ('smart_toggle','Body','height','height'),
  -- Body Fill is the tab-bar shell; Tabs Fill styles the tab buttons.
  ('smart_tabs','Tabs','fill','tabColor'),
  ('smart_tabs','Tabs','focused','selectedTabColor'),
  ('smart_tabs','Tabs','height','tabHeight'),
  ('smart_tabs','Tabs','width','tabWidth'),
  ('smart_tabs','Tabs','text','labelColor'),
  ('smart_tabs','Tabs','alignment','labelAlignment'),
  ('smart_tabs','Tabs','size','textSize'),
  ('smart_tabs','Tabs','border','borderColor'),
  ('smart_tabs','Tabs','radius','radius')
ON CONFLICT(component_api,area,slot_key)
DO UPDATE SET property_key=EXCLUDED.property_key;

-- Definitions below were referenced by approved Design 2 rules but had no
-- shared metadata definition. Without one, SmartRibbon draws a disabled glyph.
-- Define only keys with a renderer below; leave Bin/+/- keys disabled.
WITH spec(property_key,label,section_group,control_kind,default_json) AS (
 VALUES
 ('badgeHeight','Badge Height','Badge','number',NULL),
 ('badgeWidth','Badge Width','Badge','number',NULL),
 ('badgeBorderColor','Badge Border','Badge','color',NULL),
 ('badgeRadius','Badge Radius','Badge','number',NULL),
 ('tableHeight','Table Height','Table','number',NULL),
 ('tableWidth','Table Width','Table','number',NULL),
 ('rowWidth','Row Width','Row','number',NULL),
 ('footerHeight','Footer Height','Footer','number',NULL),
 ('footerWidth','Footer Width','Footer','number',NULL),
 ('footerBackgroundColor','Footer Fill','Footer','color',NULL),
 ('footerTextColor','Footer Text Color','Footer','color',NULL),
 ('footerBorderColor','Footer Border','Footer','color',NULL),
 ('footerAlignment','Footer Alignment','Footer','align',NULL),
 ('footerTextSize','Footer Text Size','Footer','number',NULL),
 ('footerBold','Footer Bold','Footer','boolean','false'),
 ('footerWrapText','Footer Wrap','Footer','boolean','true'),
 ('cardButtonHeight','Button Height','Button','number',NULL),
 ('cardButtonWidth','Button Width','Button','number',NULL),
 ('cardButtonRadius','Button Radius','Button','number',NULL),
 ('cardButtonAlignment','Button Alignment','Button','align',NULL),
 ('cardButtonBold','Button Bold','Button','boolean',NULL),
 ('cardButtonWrapText','Button Wrap','Button','boolean',NULL)
), base AS (SELECT COALESCE(MAX(sort_order),0) last_order FROM md_builder_shared_properties),
 numbered AS (
 SELECT s.*,ROW_NUMBER() OVER(ORDER BY s.property_key) ordinal FROM spec s
)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope)
SELECT s.property_key,s.label,'Design2',s.section_group,s.control_kind,
 base.last_order+s.ordinal,s.default_json::jsonb,'[]'::jsonb,'component'
FROM numbered s CROSS JOIN base
ON CONFLICT(property_key) DO NOTHING;

-- Make only the genuinely implemented approved controls editable. Retain
-- tenant-specific ribbon visibility overrides independently of these defaults.
INSERT INTO md_builder_ribbon_component_rules(component_api,property_key,enabled)
SELECT DISTINCT rules.component_api,rules.property_key,true
FROM md_builder_design2_slot_rules rules
JOIN md_builder_shared_properties property ON property.property_key=rules.property_key
WHERE
 (rules.component_api='smart_tabs' AND rules.area IN ('Body','Tabs'))
 OR (rules.component_api='smart_textbox' AND
      (rules.area='Body' AND rules.slot_key='wrap'
       OR rules.area='Header Supporting'))
 OR (rules.component_api IN ('smart_icon','smart_toggle') AND
      rules.area='Body' AND rules.slot_key IN ('fill','border','shadow','radius','height','width'))
 OR rules.property_key IN
   ('badgeHeight','badgeWidth','badgeBorderColor','badgeRadius',
    'tableHeight','tableWidth','rowWidth',
    'footerHeight','footerWidth','footerBackgroundColor',
    'footerTextColor','footerBorderColor','footerAlignment','footerTextSize',
    'footerBold','footerWrapText',
    'cardButtonHeight','cardButtonWidth','cardButtonRadius',
    'cardButtonAlignment','cardButtonBold','cardButtonWrapText')
ON CONFLICT(component_api,property_key) DO UPDATE SET enabled=true;
