-- Migration preflight: never silently rename or delete tenant metadata to resolve conflicts.
DO $migration$
DECLARE
  item record;
  duplicate_exists boolean;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('md_custom_labels', 'tenant_id, language, lower(api_name)'),
    ('md_custom_metadata_types', 'tenant_id, lower(api_name)'),
    ('md_custom_settings', 'tenant_id, lower(api_name)'),
    ('md_custom_metadata_fields', 'tenant_id, type_api, lower(api_name)'),
    ('md_custom_setting_fields', 'tenant_id, setting_api, lower(api_name)'),
    ('md_global_value_sets', 'tenant_id, lower(api_name)'),
    ('md_matching_rules', 'tenant_id, object_api, lower(api_name)'),
    ('md_validation_rules', 'tenant_id, object_api, lower(api_name)'),
    ('md_object_definitions', 'tenant_id, lower(api_name)'),
    ('md_field_definitions', 'tenant_id, object_api, lower(api_name)'),
    ('md_page_definitions', 'tenant_id, lower(api_name)'),
    ('md_component_definitions', 'tenant_id, lower(api_name)'),
    ('md_flow_definitions', 'tenant_id, lower(api_name), version'),
    ('md_global_quick_actions', 'tenant_id, lower(action_id)'),
    ('md_system_definitions', 'tenant_id, kind, lower(api_name)'),
    ('md_tenant_app_metadata', 'tenant_id, lower(api_name)'),
    ('md_named_credentials', 'tenant_id, lower(name)')
  ) AS source(table_name,grouping) LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I GROUP BY %s HAVING count(*) > 1)',
      item.table_name,item.grouping) INTO duplicate_exists;
    IF duplicate_exists THEN
      RAISE EXCEPTION 'Case-insensitive API Name conflicts in %, reconcile metadata before applying unique indexes',item.table_name;
    END IF;
  END LOOP;
END
$migration$;

-- Preserve stable API names while preventing case-only duplicate identities.
-- These tenant-aware indexes are an atomic final guard under concurrent creates.
-- Existing conflicting names must be reconciled explicitly; never silently rename tenant metadata.
CREATE UNIQUE INDEX IF NOT EXISTS md_custom_labels_api_name_ci_uq
 ON md_custom_labels(tenant_id,language,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_custom_metadata_types_api_name_ci_uq
 ON md_custom_metadata_types(tenant_id,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_custom_settings_api_name_ci_uq
 ON md_custom_settings(tenant_id,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_custom_metadata_fields_api_name_ci_uq
 ON md_custom_metadata_fields(tenant_id,type_api,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_custom_setting_fields_api_name_ci_uq
 ON md_custom_setting_fields(tenant_id,setting_api,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_global_value_sets_api_name_ci_uq
 ON md_global_value_sets(tenant_id,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_matching_rules_api_name_ci_uq
 ON md_matching_rules(tenant_id,object_api,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_validation_rules_api_name_ci_uq
 ON md_validation_rules(tenant_id,object_api,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_objects_api_name_ci_uq
 ON md_object_definitions(tenant_id,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_fields_api_name_ci_uq
 ON md_field_definitions(tenant_id,object_api,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_pages_api_name_ci_uq
 ON md_page_definitions(tenant_id,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_components_api_name_ci_uq
 ON md_component_definitions(tenant_id,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_flows_api_version_ci_uq
 ON md_flow_definitions(tenant_id,lower(api_name),version);
CREATE UNIQUE INDEX IF NOT EXISTS md_global_actions_id_ci_uq
 ON md_global_quick_actions(tenant_id,lower(action_id));
CREATE UNIQUE INDEX IF NOT EXISTS md_system_definitions_api_name_ci_uq
 ON md_system_definitions(tenant_id,kind,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_tenant_apps_api_name_ci_uq
 ON md_tenant_app_metadata(tenant_id,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_named_credentials_name_ci_uq
 ON md_named_credentials(tenant_id,lower(name));
