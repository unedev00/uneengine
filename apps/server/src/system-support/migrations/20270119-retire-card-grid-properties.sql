-- Retire 16 Card Grid property definitions from active SQL contracts only.
-- Older version snapshots and authored page instance values remain untouched.
-- Preserve tenant-authored non-bundled component definitions.
DO $migration$
DECLARE
 active_row record;
 old_idx integer;
 next_idx integer;
 retired_keys text[] := ARRAY[
  'accentColor','tone','descriptionExpression','emptyText','showDescription',
  'valueTextAlign','missingImageBehavior','showAddIcon','showHeading',
  'badgeExpression','cartTargetKey','currencyCode','headingExpression',
  'separateAddButton','valueColor','valueLineLimit'
 ];
BEGIN
 IF to_regclass('md_component_library_contract_properties') IS NULL
    OR to_regclass('md_component_library_heads') IS NULL THEN RETURN; END IF;
 FOR active_row IN
  SELECT DISTINCT h.tenant_id,h.component_api,ver.version
  FROM md_component_library_heads h
  JOIN md_component_definitions d ON d.tenant_id=h.tenant_id
    AND d.api_name=h.component_api
    AND d.renderer_key='one-bundled:une_item_grid'
  CROSS JOIN LATERAL (VALUES (h.current_version),(h.published_version)) AS ver(version)
  WHERE h.component_api='une_item_grid' AND ver.version IS NOT NULL
 LOOP
  -- Delete whole entries, not just their /propertyKey field.
  DELETE FROM md_component_library_contract_properties p
  USING (
    SELECT DISTINCT substring(property_path FROM '^/propertyDefinitions/([0-9]+)/propertyKey$')::integer AS idx
    FROM md_component_library_contract_properties
    WHERE tenant_id=active_row.tenant_id
      AND component_api=active_row.component_api
      AND version=active_row.version
      AND property_path ~ '^/propertyDefinitions/[0-9]+/propertyKey$'
      AND value_kind='string' AND value_text=ANY(retired_keys)
  ) removed
  WHERE p.tenant_id=active_row.tenant_id
    AND p.component_api=active_row.component_api
    AND p.version=active_row.version
    AND (p.property_path='/propertyDefinitions/'||removed.idx
      OR p.property_path LIKE ('/propertyDefinitions/'||removed.idx||'/%'));
  -- Encode arrays with sequential zero-based indices. Move through a distinct
  -- namespace before renumbering so the relational primary key cannot collide.
  next_idx := 0;
  FOR old_idx IN
    SELECT DISTINCT substring(property_path FROM '^/propertyDefinitions/([0-9]+)')::integer
    FROM md_component_library_contract_properties
    WHERE tenant_id=active_row.tenant_id
      AND component_api=active_row.component_api
      AND version=active_row.version
      AND property_path ~ '^/propertyDefinitions/[0-9]+(/|$)'
    ORDER BY 1
  LOOP
    UPDATE md_component_library_contract_properties p
    SET property_path='/__card_grid_reindex__/'||next_idx||
      substring(p.property_path FROM '^/propertyDefinitions/[0-9]+(.*)$')
    WHERE p.tenant_id=active_row.tenant_id
      AND p.component_api=active_row.component_api
      AND p.version=active_row.version
      AND (p.property_path='/propertyDefinitions/'||old_idx
        OR p.property_path LIKE ('/propertyDefinitions/'||old_idx||'/%'));
    next_idx := next_idx+1;
  END LOOP;
  UPDATE md_component_library_contract_properties p
  SET property_path=replace(p.property_path,'/__card_grid_reindex__/','/propertyDefinitions/')
  WHERE p.tenant_id=active_row.tenant_id
    AND p.component_api=active_row.component_api
    AND p.version=active_row.version
    AND p.property_path LIKE '/__card_grid_reindex__/%';
 END LOOP;
END $migration$;
