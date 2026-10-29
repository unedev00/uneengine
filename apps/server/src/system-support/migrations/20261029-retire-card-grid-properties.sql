-- Retire the 16 legacy UNE Card Grid settings from active SQL component contracts.
-- Retains historical snapshots and authored page values for rollback/audit.
-- Only the Card Grid component's active versions are touched; shared UNE settings remain unchanged.
DO $$
DECLARE
  active_row record;
  old_index integer;
  new_index integer;
  retired_keys text[] := ARRAY[
    'accentColor','tone','descriptionExpression','emptyText','showDescription',
    'valueTextAlign','missingImageBehavior','showAddIcon','showHeading',
    'badgeExpression','cartTargetKey','currencyCode','headingExpression',
    'separateAddButton','valueColor','valueLineLimit'
  ];
BEGIN
  IF to_regclass('md_component_library_contract_properties') IS NULL
     OR to_regclass('md_component_library_heads') IS NULL THEN
    RETURN;
  END IF;
  FOR active_row IN
    SELECT DISTINCT h.tenant_id,h.component_api,version_number AS version
    FROM md_component_library_heads h
    CROSS JOIN LATERAL (VALUES (h.current_version),(h.published_version)) active_versions(version_number)
    WHERE h.component_api='une_item_grid' AND version_number IS NOT NULL
  LOOP
    DELETE FROM md_component_library_contract_properties p
    WHERE p.tenant_id=active_row.tenant_id AND p.component_api=active_row.component_api
      AND p.version=active_row.version
      AND EXISTS (
        SELECT 1 FROM md_component_library_contract_properties keyrow
        WHERE keyrow.tenant_id=p.tenant_id AND keyrow.component_api=p.component_api
          AND keyrow.version=p.version
          AND keyrow.property_path ~ '^/propertyDefinitions/[0-9]+/propertyKey$'
          AND keyrow.value_text=ANY(retired_keys)
          AND p.property_path LIKE
            regexp_replace(keyrow.property_path,'/propertyKey$','') || '/%'
      );
    new_index := 0;
    FOR old_index IN
      SELECT DISTINCT substring(p.property_path from '^/propertyDefinitions/([0-9]+)')::integer
      FROM md_component_library_contract_properties p
      WHERE p.tenant_id=active_row.tenant_id AND p.component_api=active_row.component_api
        AND p.version=active_row.version
        AND p.property_path ~ '^/propertyDefinitions/[0-9]+(/|$)'
      ORDER BY 1
    LOOP
      UPDATE md_component_library_contract_properties p
      SET property_path='/__card_grid_reindex__/' || new_index ||
        substring(p.property_path from '^/propertyDefinitions/[0-9]+(.*)$')
      WHERE p.tenant_id=active_row.tenant_id AND p.component_api=active_row.component_api
        AND p.version=active_row.version
        AND p.property_path LIKE '/propertyDefinitions/' || old_index || '/%';
      new_index := new_index+1;
    END LOOP;
    UPDATE md_component_library_contract_properties p
    SET property_path=replace(p.property_path,'/__card_grid_reindex__/','/propertyDefinitions/')
    WHERE p.tenant_id=active_row.tenant_id AND p.component_api=active_row.component_api
      AND p.version=active_row.version
      AND p.property_path LIKE '/__card_grid_reindex__/%';
  END LOOP;
END $$;
