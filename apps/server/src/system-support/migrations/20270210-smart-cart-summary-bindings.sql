-- Additive, tenant-independent metadata: a Smart Cart shows real monetary amounts
-- only when a published Page State/Flow supplies them. No invented POS totals.
-- No tenant page, business record or customer-authored value is overwritten.
WITH specs(n,property_key,label) AS (
 VALUES
 (1,'subtotalValue','Subtotal Amount'),
 (2,'discountValue','Discount Amount'),
 (3,'taxValue','Tax Amount'),
 (4,'totalValue','Total Amount')
), missing AS (
 SELECT specs.*,row_number() OVER (ORDER BY n) AS pos FROM specs
 WHERE NOT EXISTS (SELECT 1 FROM md_builder_shared_properties p
                   WHERE p.property_key=specs.property_key)
), last_order AS (
 SELECT COALESCE(MAX(sort_order),0) AS last_sort FROM md_builder_shared_properties
)
INSERT INTO md_builder_shared_properties
 (property_key,label,tab,section_group,control_kind,sort_order,default_value,choices,scope)
SELECT property_key,label,'Data','Cart','expression',last_sort+pos,NULL,'[]'::jsonb,'component'
FROM missing CROSS JOIN last_order
ON CONFLICT(property_key) DO NOTHING;

INSERT INTO md_builder_ribbon_component_rules
 (component_api,property_key,enabled,control_kind_override,value_key,default_value_override,choices_override)
SELECT 'smart_cart',p.property_key,true,NULL,NULL,NULL,NULL
FROM md_builder_shared_properties p
WHERE p.property_key IN ('subtotalValue','discountValue','taxValue','totalValue')
ON CONFLICT(component_api,property_key) DO NOTHING;
