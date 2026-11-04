-- One shared Data editor. New expression targets reuse SQL ribbon rules, the
-- existing Formula Engine and existing component properties; no tenant pages
-- or business records are rewritten. Forward-only/idempotent.
WITH spec(property_key,label,component_api,ordinal) AS (
 VALUES
 ('cartSupportingSource','Cart supporting text','smart_cart',1),
 ('cartColumn1Header','Product heading','smart_cart',2),
 ('cartColumn2Header','Unit price heading','smart_cart',3),
 ('cartColumn3Header','Quantity heading','smart_cart',4),
 ('cartColumn4Header','Total heading','smart_cart',5),
 ('cartColumn5Header','Discount heading','smart_cart',6),
 ('subtotalLabel','Subtotal heading','smart_cart',7),
 ('discountLabel','Discount heading','smart_cart',8),
 ('taxLabel','Tax heading','smart_cart',9),
 ('totalLabel','Total heading','smart_cart',10),
 ('lookupValueFormula','Search value','smart_lookup',11),
 ('selectedDate','Selected date','smart_calendar',12),
 ('tabCaptionFormula','Tab caption','smart_tabs',13)
), last_order AS (
 SELECT COALESCE(MAX(sort_order),0) AS n FROM md_builder_shared_properties
)
INSERT INTO md_builder_shared_properties(
 property_key,label,tab,section_group,control_kind,sort_order,
 default_value,choices,scope,field_select)
SELECT spec.property_key,spec.label,'Data','Values','expression',
 last_order.n+spec.ordinal,NULL,'[]'::jsonb,'component',true
FROM spec CROSS JOIN last_order
ON CONFLICT(property_key) DO NOTHING;

WITH spec(property_key,component_api,value_key) AS (
 VALUES
 ('cartSupportingSource','smart_cart',NULL::text),
 ('cartColumn1Header','smart_cart',NULL),
 ('cartColumn2Header','smart_cart',NULL),
 ('cartColumn3Header','smart_cart',NULL),
 ('cartColumn4Header','smart_cart',NULL),
 ('cartColumn5Header','smart_cart',NULL),
 ('subtotalLabel','smart_cart',NULL),
 ('discountLabel','smart_cart',NULL),
 ('taxLabel','smart_cart',NULL),
 ('totalLabel','smart_cart',NULL),
 ('label','smart_cart',NULL),
 ('lookupValueFormula','smart_lookup',NULL),
 ('selectedDate','smart_calendar',NULL),
 ('tabCaptionFormula','smart_tabs','tabs'),
 ('objectApiName','smart_calendar',NULL),
 ('objectApiName2','smart_calendar',NULL),
 ('objectApiName3','smart_calendar',NULL)
)
INSERT INTO md_builder_ribbon_component_rules(
 component_api,property_key,enabled,control_kind_override,value_key,
 default_value_override,choices_override)
SELECT spec.component_api,spec.property_key,true,NULL,spec.value_key,NULL,NULL
FROM spec
JOIN md_builder_ribbon_components c ON c.component_api=spec.component_api
JOIN md_builder_shared_properties p ON p.property_key=spec.property_key
ON CONFLICT(component_api,property_key) DO UPDATE
 SET enabled=true,value_key=COALESCE(EXCLUDED.value_key,md_builder_ribbon_component_rules.value_key);

-- These are choices, not binding expressions. Keep them editable in Layout,
-- where existing settings controls continue to use their original SQL keys.
UPDATE md_builder_shared_properties
SET tab='Layout',section_group='Behaviour'
WHERE property_key='defaultCheck' AND tab='Data';
UPDATE md_builder_shared_properties
SET tab='Layout',section_group='Cart'
WHERE property_key='columnVisibility' AND tab='Data';
