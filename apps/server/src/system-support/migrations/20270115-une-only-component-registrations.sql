-- Consolidate the eight legacy system-registered One components into their UNE equivalents.
-- Preserves layout node keys, component props, Flows, page versions and user-created components.
-- Re-runnable: update exact identifiers only; never broad text replacement.
-- Keep shared old renderer source files as internal UNE dependencies.
INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled)
SELECT t.id,m.new_api,'one-bundled:'||m.new_api,true
FROM md_tenants t CROSS JOIN (VALUES
 ('OneText','une_text'),
 ('OneBadge','une_badge'),
 ('OneButton','une_button'),
 ('OneSearch','une_search'),
 ('OneCalendar','une_calendar'),
 ('OneItemGrid','une_item_grid'),
 ('OneConversation','une_conversation'),
 ('OneShoppingCart','une_cart')
) AS m(old_api,new_api)
ON CONFLICT(tenant_id,api_name) DO NOTHING;

UPDATE md_lightning_page_nodes n SET component_type='Custom:'||m.new_api
FROM (VALUES
 ('OneText','une_text'),
 ('OneBadge','une_badge'),
 ('OneButton','une_button'),
 ('OneSearch','une_search'),
 ('OneCalendar','une_calendar'),
 ('OneItemGrid','une_item_grid'),
 ('OneConversation','une_conversation'),
 ('OneShoppingCart','une_cart')
) AS m(old_api,new_api)
WHERE n.component_type='Custom:'||m.old_api AND EXISTS (SELECT 1 FROM md_component_definitions legacy
  WHERE legacy.tenant_id=n.tenant_id AND legacy.api_name=m.old_api
    AND legacy.renderer_key='one-bundled:'||m.old_api);

UPDATE md_page_layout_version_nodes n SET component_type='Custom:'||m.new_api
FROM (VALUES
 ('OneText','une_text'),
 ('OneBadge','une_badge'),
 ('OneButton','une_button'),
 ('OneSearch','une_search'),
 ('OneCalendar','une_calendar'),
 ('OneItemGrid','une_item_grid'),
 ('OneConversation','une_conversation'),
 ('OneShoppingCart','une_cart')
) AS m(old_api,new_api)
WHERE n.component_type='Custom:'||m.old_api AND EXISTS (SELECT 1 FROM md_component_definitions legacy
  WHERE legacy.tenant_id=n.tenant_id AND legacy.api_name=m.old_api
    AND legacy.renderer_key='one-bundled:'||m.old_api);

-- Older app pages use a foreign-key-backed component_api column.
UPDATE md_page_components p SET component_api=m.new_api
FROM (VALUES
 ('OneText','une_text'),
 ('OneBadge','une_badge'),
 ('OneButton','une_button'),
 ('OneSearch','une_search'),
 ('OneCalendar','une_calendar'),
 ('OneItemGrid','une_item_grid'),
 ('OneConversation','une_conversation'),
 ('OneShoppingCart','une_cart')
) AS m(old_api,new_api)
WHERE p.component_api=m.old_api AND EXISTS (SELECT 1 FROM md_component_definitions legacy
  WHERE legacy.tenant_id=p.tenant_id AND legacy.api_name=m.old_api
    AND legacy.renderer_key='one-bundled:'||m.old_api);

-- Flow screen data can appear in flattened component keys and encoded arrays.
UPDATE md_flow_editor_values f SET value_text=m.new_api
FROM (VALUES
 ('OneText','une_text'),
 ('OneBadge','une_badge'),
 ('OneButton','une_button'),
 ('OneSearch','une_search'),
 ('OneCalendar','une_calendar'),
 ('OneItemGrid','une_item_grid'),
 ('OneConversation','une_conversation'),
 ('OneShoppingCart','une_cart')
) AS m(old_api,new_api)
WHERE f.value_kind='string' AND f.value_text=m.old_api
  AND f.property_path ~ '(^|/)(componentApiName|customComponentApiName|libraryComponentId)$'
  AND EXISTS (SELECT 1 FROM md_component_definitions legacy
  WHERE legacy.tenant_id=f.tenant_id AND legacy.api_name=m.old_api
    AND legacy.renderer_key='one-bundled:'||m.old_api);

UPDATE md_flow_node_properties f SET value_text=m.new_api
FROM (VALUES
 ('OneText','une_text'),
 ('OneBadge','une_badge'),
 ('OneButton','une_button'),
 ('OneSearch','une_search'),
 ('OneCalendar','une_calendar'),
 ('OneItemGrid','une_item_grid'),
 ('OneConversation','une_conversation'),
 ('OneShoppingCart','une_cart')
) AS m(old_api,new_api)
WHERE f.value_text=m.old_api
  AND f.api_name IN ('componentApiName','customComponentApiName','libraryComponentId')
  AND EXISTS (SELECT 1 FROM md_component_definitions legacy
  WHERE legacy.tenant_id=f.tenant_id AND legacy.api_name=m.old_api
    AND legacy.renderer_key='one-bundled:'||m.old_api);

UPDATE md_object_actions a SET component_api_name=m.new_api
FROM (VALUES
 ('OneText','une_text'),
 ('OneBadge','une_badge'),
 ('OneButton','une_button'),
 ('OneSearch','une_search'),
 ('OneCalendar','une_calendar'),
 ('OneItemGrid','une_item_grid'),
 ('OneConversation','une_conversation'),
 ('OneShoppingCart','une_cart')
) AS m(old_api,new_api)
WHERE a.component_api_name=m.old_api AND EXISTS (SELECT 1 FROM md_component_definitions legacy
  WHERE legacy.tenant_id=a.tenant_id AND legacy.api_name=m.old_api
    AND legacy.renderer_key='one-bundled:'||m.old_api);

UPDATE md_global_quick_actions a SET component_api_name=m.new_api
FROM (VALUES
 ('OneText','une_text'),
 ('OneBadge','une_badge'),
 ('OneButton','une_button'),
 ('OneSearch','une_search'),
 ('OneCalendar','une_calendar'),
 ('OneItemGrid','une_item_grid'),
 ('OneConversation','une_conversation'),
 ('OneShoppingCart','une_cart')
) AS m(old_api,new_api)
WHERE a.component_api_name=m.old_api AND EXISTS (SELECT 1 FROM md_component_definitions legacy
  WHERE legacy.tenant_id=a.tenant_id AND legacy.api_name=m.old_api
    AND legacy.renderer_key='one-bundled:'||m.old_api);

-- Recursive, key-aware JSON transformation: never rewrite ordinary text,
-- formula contents, titles, or tenant values which merely resemble API names.
CREATE FUNCTION md_une_component_reference_upgrade(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $func$
DECLARE k text; entry jsonb; result jsonb; target text;
BEGIN
 IF jsonb_typeof(payload)='object' THEN
  result:='{}'::jsonb;
  FOR k,entry IN SELECT e.key,e.value FROM jsonb_each(payload) AS e LOOP
   IF jsonb_typeof(entry)='string' AND
      k IN ('componentApiName','customComponentApiName','libraryComponentId','type') THEN
    target:=CASE entry #>> '{}'
 WHEN 'OneText' THEN 'une_text'
 WHEN 'Custom:OneText' THEN 'Custom:une_text'
 WHEN 'OneBadge' THEN 'une_badge'
 WHEN 'Custom:OneBadge' THEN 'Custom:une_badge'
 WHEN 'OneButton' THEN 'une_button'
 WHEN 'Custom:OneButton' THEN 'Custom:une_button'
 WHEN 'OneSearch' THEN 'une_search'
 WHEN 'Custom:OneSearch' THEN 'Custom:une_search'
 WHEN 'OneCalendar' THEN 'une_calendar'
 WHEN 'Custom:OneCalendar' THEN 'Custom:une_calendar'
 WHEN 'OneItemGrid' THEN 'une_item_grid'
 WHEN 'Custom:OneItemGrid' THEN 'Custom:une_item_grid'
 WHEN 'OneConversation' THEN 'une_conversation'
 WHEN 'Custom:OneConversation' THEN 'Custom:une_conversation'
 WHEN 'OneShoppingCart' THEN 'une_cart'
 WHEN 'Custom:OneShoppingCart' THEN 'Custom:une_cart'
     ELSE NULL END;
    IF k='type' AND (entry #>> '{}') NOT LIKE 'Custom:%' THEN target:=NULL; END IF;
    IF target IS NOT NULL THEN entry:=to_jsonb(target); END IF;
   ELSE entry:=md_une_component_reference_upgrade(entry);
   END IF;
   result:=result||jsonb_build_object(k,entry);
  END LOOP;
  RETURN result;
 ELSIF jsonb_typeof(payload)='array' THEN
  SELECT COALESCE(jsonb_agg(md_une_component_reference_upgrade(item.value)
    ORDER BY item.ordinality),'[]'::jsonb)
   INTO result FROM jsonb_array_elements(payload) WITH ORDINALITY AS item(value,ordinality);
  RETURN result;
 END IF;
 RETURN payload;
END
$func$;

-- Dashboard definitions and Flow editor structured state retain all authored data.
UPDATE md_system_definitions d
SET properties=md_une_component_reference_upgrade(d.properties)
WHERE d.kind='dashboards'
  AND d.properties::text LIKE '%One%'
  AND EXISTS(SELECT 1 FROM md_component_definitions r
    WHERE r.tenant_id=d.tenant_id AND r.renderer_key='one-bundled:'||r.api_name
    AND r.api_name=ANY(ARRAY['OneText','OneBadge','OneButton','OneSearch','OneCalendar','OneItemGrid','OneConversation','OneShoppingCart']::text[]));

UPDATE md_flow_editor_values f
SET value_text=md_une_component_reference_upgrade(f.value_text::jsonb)::text
WHERE f.value_kind IN ('object','array') AND f.value_text IS NOT NULL
 AND f.value_text LIKE '%One%'
 AND EXISTS(SELECT 1 FROM md_component_definitions r
    WHERE r.tenant_id=f.tenant_id AND r.renderer_key='one-bundled:'||r.api_name
    AND r.api_name=ANY(ARRAY['OneText','OneBadge','OneButton','OneSearch','OneCalendar','OneItemGrid','OneConversation','OneShoppingCart']::text[]));

DROP FUNCTION md_une_component_reference_upgrade(jsonb);

-- Disable only exact system-owned legacy registrations, retaining rows for
-- published page history, foreign keys, and reversible deployment recovery.
UPDATE md_component_definitions d SET enabled=false
FROM (VALUES
 ('OneText','une_text'),
 ('OneBadge','une_badge'),
 ('OneButton','une_button'),
 ('OneSearch','une_search'),
 ('OneCalendar','une_calendar'),
 ('OneItemGrid','une_item_grid'),
 ('OneConversation','une_conversation'),
 ('OneShoppingCart','une_cart')
) AS m(old_api,new_api)
WHERE d.api_name=m.old_api AND d.renderer_key='one-bundled:'||m.old_api
  AND d.enabled=true AND NOT EXISTS (
    SELECT 1 FROM md_component_library_heads h
    WHERE h.tenant_id=d.tenant_id AND h.component_api=d.api_name
  );
