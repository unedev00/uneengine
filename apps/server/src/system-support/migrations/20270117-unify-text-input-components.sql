-- Consolidate the platform's retired UNE Text into UNE Input without rewriting
-- tenant-owned components. Preserve instance IDs, styling, values and Flow bindings.
-- Existing text boxes remain display-only; newly inserted Input boxes allow typing.
INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled)
SELECT t.id,'une_input','one-bundled:une_input',true FROM md_tenants t
ON CONFLICT(tenant_id,api_name) DO NOTHING;
UPDATE md_component_definitions SET enabled=true
WHERE api_name='une_input' AND renderer_key='one-bundled:une_input';

-- Current Page Builder nodes: explicitly prevent any migrated label from typing.
INSERT INTO md_lightning_page_node_properties
 (tenant_id,page_id,component_key,property_path,value_kind,value_text)
SELECT n.tenant_id,n.page_id,n.component_key,'/props/allowTyping','boolean','false'
FROM md_lightning_page_nodes n
WHERE n.component_type='Custom:une_text'
ON CONFLICT DO NOTHING;
UPDATE md_lightning_page_node_properties p SET property_path='/props/value'
WHERE p.property_path='/props/text' AND EXISTS (
 SELECT 1 FROM md_lightning_page_nodes n
 WHERE n.tenant_id=p.tenant_id AND n.page_id=p.page_id
   AND n.component_key=p.component_key AND n.component_type='Custom:une_text'
) AND NOT EXISTS (
 SELECT 1 FROM md_lightning_page_node_properties v
 WHERE v.tenant_id=p.tenant_id AND v.page_id=p.page_id AND v.component_key=p.component_key
   AND v.property_path='/props/value'
);
UPDATE md_lightning_page_node_properties p SET property_path='/props/stateBindings/value'
WHERE p.property_path='/props/stateBindings/text' AND EXISTS (
 SELECT 1 FROM md_lightning_page_nodes n WHERE n.tenant_id=p.tenant_id
 AND n.page_id=p.page_id AND n.component_key=p.component_key AND n.component_type='Custom:une_text'
) AND NOT EXISTS (
 SELECT 1 FROM md_lightning_page_node_properties v WHERE v.tenant_id=p.tenant_id
 AND v.page_id=p.page_id AND v.component_key=p.component_key AND v.property_path='/props/stateBindings/value'
);
UPDATE md_lightning_page_nodes SET component_type='Custom:une_input'
WHERE component_type='Custom:une_text';

-- Published and draft layout variants share the same safe transformation.
INSERT INTO md_page_layout_version_properties
 (tenant_id,page_id,variant,version,component_key,property_path,value_kind,value_text)
SELECT n.tenant_id,n.page_id,n.variant,n.version,n.component_key,
 '/props/allowTyping','boolean','false'
FROM md_page_layout_version_nodes n WHERE n.component_type='Custom:une_text'
ON CONFLICT DO NOTHING;
UPDATE md_page_layout_version_properties p SET property_path='/props/value'
WHERE p.property_path='/props/text' AND EXISTS (
 SELECT 1 FROM md_page_layout_version_nodes n WHERE n.tenant_id=p.tenant_id
  AND n.page_id=p.page_id AND n.variant=p.variant AND n.version=p.version
  AND n.component_key=p.component_key AND n.component_type='Custom:une_text'
) AND NOT EXISTS (
 SELECT 1 FROM md_page_layout_version_properties v WHERE v.tenant_id=p.tenant_id
  AND v.page_id=p.page_id AND v.variant=p.variant AND v.version=p.version
  AND v.component_key=p.component_key AND v.property_path='/props/value'
);
UPDATE md_page_layout_version_properties p SET property_path='/props/stateBindings/value'
WHERE p.property_path='/props/stateBindings/text' AND EXISTS (
 SELECT 1 FROM md_page_layout_version_nodes n WHERE n.tenant_id=p.tenant_id
  AND n.page_id=p.page_id AND n.variant=p.variant AND n.version=p.version
  AND n.component_key=p.component_key AND n.component_type='Custom:une_text'
) AND NOT EXISTS (
 SELECT 1 FROM md_page_layout_version_properties v WHERE v.tenant_id=p.tenant_id
  AND v.page_id=p.page_id AND v.variant=p.variant AND v.version=p.version
  AND v.component_key=p.component_key AND v.property_path='/props/stateBindings/value'
);
UPDATE md_page_layout_version_nodes SET component_type='Custom:une_input'
WHERE component_type='Custom:une_text';

-- Package templates must also install the new unified component. A historic
-- component/text pair stays display-only without changing its content.
INSERT INTO md_app_package_page_property_templates
 (app_id,version,page_api,component_api,slot,sort_order,property_path,data_type,value_text)
SELECT c.app_id,c.version,c.page_api,'une_input',c.slot,c.sort_order,
 'allowTyping','boolean','false'
FROM md_app_package_page_component_templates c WHERE c.component_api='une_text'
ON CONFLICT DO NOTHING;
UPDATE md_app_package_page_component_templates SET component_api='une_input'
WHERE component_api='une_text';
UPDATE md_app_package_page_property_templates SET component_api='une_input',
 property_path=CASE WHEN property_path='text' THEN 'value' ELSE property_path END
WHERE component_api='une_text';
INSERT INTO md_app_package_resources(app_id,version,resource_type,api_name,parent_api)
SELECT r.app_id,r.version,r.resource_type,'une_input',r.parent_api
FROM md_app_package_resources r
WHERE r.resource_type='Component' AND r.api_name='une_text'
ON CONFLICT DO NOTHING;
DELETE FROM md_app_package_resources
WHERE resource_type='Component' AND api_name='une_text';

-- Foreign-key-backed legacy app placements.
UPDATE md_page_components SET component_api='une_input'
WHERE component_api='une_text';

-- Update exact structured component references, never arbitrary free text.
CREATE FUNCTION md_input_textbox_upgrade(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $function$
DECLARE k text; v jsonb; result jsonb; is_text boolean; props jsonb;
BEGIN
 IF jsonb_typeof(payload)='array' THEN
   SELECT coalesce(jsonb_agg(md_input_textbox_upgrade(a.value) ORDER BY a.ordinality),'[]'::jsonb)
   INTO result FROM jsonb_array_elements(payload) WITH ORDINALITY a(value,ordinality);
   RETURN result;
 ELSIF jsonb_typeof(payload)='object' THEN
   is_text=(payload->>'type' IN ('Custom:une_text','une_text')
     OR payload->>'componentApiName'='une_text'
     OR payload->>'customComponentApiName'='une_text'
     OR payload->>'libraryComponentId'='une_text');
   result='{}'::jsonb;
   FOR k,v IN SELECT e.key,e.value FROM jsonb_each(payload) e LOOP
     IF k IN ('type','componentApiName','customComponentApiName','libraryComponentId')
       AND v='"une_text"'::jsonb THEN
       v='"une_input"'::jsonb;
     ELSIF k='type' AND v='"Custom:une_text"'::jsonb THEN
       v='"Custom:une_input"'::jsonb;
     ELSE v=md_input_textbox_upgrade(v);
     END IF;
     result=result||jsonb_build_object(k,v);
   END LOOP;
   IF is_text AND jsonb_typeof(result->'props')='object' THEN
     props=result->'props';
     IF props ? 'text' AND NOT props ? 'value' THEN
       props=(props-'text')||jsonb_build_object('value',props->'text');
     END IF;
     IF jsonb_typeof(props->'stateBindings')='object'
       AND (props->'stateBindings') ? 'text'
       AND NOT (props->'stateBindings') ? 'value' THEN
       props=jsonb_set(props,'{stateBindings}',
         ((props->'stateBindings')-'text')||
          jsonb_build_object('value',props->'stateBindings'->'text'));
     END IF;
     IF NOT props ? 'allowTyping' THEN props=props||'{"allowTyping":false}'::jsonb; END IF;
     result=jsonb_set(result,'{props}',props);
   END IF;
   RETURN result;
 END IF;
 RETURN payload;
END
$function$;
UPDATE md_system_definitions SET properties=md_input_textbox_upgrade(properties)
WHERE kind='dashboards' AND properties::text LIKE '%une_text%';
UPDATE md_flow_editor_values
SET value_text=md_input_textbox_upgrade(value_text::jsonb)::text
WHERE value_kind IN ('object','array') AND value_text LIKE '%une_text%';
UPDATE md_flow_editor_values SET value_text='une_input'
WHERE value_kind='string' AND value_text='une_text'
 AND property_path ~ '(^|/)(componentApiName|customComponentApiName|libraryComponentId)$';
UPDATE md_flow_node_properties SET value_text='une_input'
WHERE value_text='une_text'
 AND api_name IN ('componentApiName','customComponentApiName','libraryComponentId');
UPDATE md_object_actions SET component_api_name='une_input'
WHERE component_api_name='une_text';
UPDATE md_global_quick_actions SET component_api_name='une_input'
WHERE component_api_name='une_text';
DROP FUNCTION md_input_textbox_upgrade(jsonb);

-- Retain historic registration rows for foreign keys and safe rollback, but
-- remove the retired platform component from all active component libraries.
UPDATE md_component_definitions d SET enabled=false
WHERE d.api_name='une_text' AND d.renderer_key='one-bundled:une_text'
 AND NOT EXISTS(SELECT 1 FROM md_component_library_heads h
  WHERE h.tenant_id=d.tenant_id AND h.component_api=d.api_name);
