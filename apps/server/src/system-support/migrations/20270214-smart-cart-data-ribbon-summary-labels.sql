-- Combine the existing cart column and summary expression slots in one
-- three-row Data group. Geometry/labels only: existing formulas and tenant
-- component properties are untouched.
WITH placement(property_key,row_no,order_no,width_px,new_label) AS (
 VALUES
 ('column2Source',1,1,252,NULL),
 ('column3Source',1,2,252,NULL),
 ('subtotalValue',1,3,227,'Summary 1'),
 ('column4Source',2,1,252,NULL),
 ('column5Source',2,2,252,NULL),
 ('totalValue',2,3,227,'Summary 2'),
 ('columnVisibility',3,1,145,NULL),
 ('taxValue',3,2,227,'Summary 3'),
 ('discountValue',3,3,227,'Summary 4')
)
UPDATE md_builder_shared_properties AS p
SET section_group='Cart',
    design_row=v.row_no,
    design_order=v.order_no,
    design_width=v.width_px,
    design_height=26,
    design_caption_width=0,
    label=COALESCE(v.new_label,p.label),
    design_caption=COALESCE(v.new_label,p.design_caption)
FROM placement v
WHERE p.tab='Data' AND p.property_key=v.property_key;

-- The four visible summary labels are stored in the cart component properties
-- (subtotalLabel/totalLabel/taxLabel/discountLabel) by the inline ribbon editor.
-- They are intentionally not extra ribbon slots; published pages retain their
-- previous labels until an author explicitly changes one.
