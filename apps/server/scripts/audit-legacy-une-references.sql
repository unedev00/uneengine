-- Run read-only as an authorised platform database administrator.
-- No raw tenant data is changed; page ids are intentionally not displayed.
-- References in immutable versions block automated source-file deletion.
SELECT d.tenant_id,d.api_name,d.enabled,
 (SELECT count(*) FROM md_page_components p
   WHERE p.tenant_id=d.tenant_id AND p.component_api=d.api_name) AS page_instances,
 (SELECT count(*) FROM md_lightning_page_nodes n
   WHERE n.tenant_id=d.tenant_id AND n.component_type='Custom:'||d.api_name) AS live_nodes,
 (SELECT count(*) FROM md_page_layout_version_nodes n
   WHERE n.tenant_id=d.tenant_id AND n.component_type='Custom:'||d.api_name) AS history_nodes,
 (SELECT count(*) FROM md_component_library_heads h
   WHERE h.tenant_id=d.tenant_id AND h.component_api=d.api_name) AS tenant_library_heads,
 (SELECT count(*) FROM md_flow_node_properties f
   WHERE f.tenant_id=d.tenant_id AND f.api_name IN
     ('componentApiName','customComponentApiName','libraryComponentId')
     AND f.value_text=d.api_name) AS flow_references
FROM md_component_definitions d
WHERE d.api_name LIKE 'une\_%' ESCAPE '\'
  AND d.renderer_key='one-bundled:'||d.api_name
ORDER BY d.tenant_id,d.api_name;

-- Before the migration this table is absent. Use dynamic SQL so the same
-- read-only audit can be run safely before and after deployment.
DO $audit$
DECLARE row_ record;
BEGIN
 IF to_regclass('md_legacy_une_component_replacements') IS NULL THEN
   RAISE NOTICE 'No legacy UNE replacement log yet (migration not applied)';
   RETURN;
 END IF;
 FOR row_ IN EXECUTE
   'SELECT tenant_id,surface,old_api,new_api,count(*) AS replaced_instances
    FROM md_legacy_une_component_replacements
    GROUP BY tenant_id,surface,old_api,new_api
    ORDER BY tenant_id,surface,old_api,new_api'
 LOOP
   RAISE NOTICE 'tenant=% surface=% old=% new=% instances=%',
      row_.tenant_id,row_.surface,row_.old_api,row_.new_api,row_.replaced_instances;
 END LOOP;
END $audit$;
