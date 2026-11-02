-- SQL-backed, opt-in normalization for a tenant's existing API metadata.
-- This migration installs the reusable operation. An operator invokes the function
-- explicitly for a test tenant after choosing that tenant; system startup never
-- silently renames any customer's metadata.
CREATE TABLE IF NOT EXISTS md_api_casefold_changes (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 old_name text NOT NULL,
 new_name text NOT NULL,
 applied_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (tenant_id,old_name),
 CHECK (new_name=lower(new_name))
);

CREATE OR REPLACE FUNCTION md_casefold_tenant_api_names(p_tenant uuid)
RETURNS integer LANGUAGE plpgsql AS $casefold$
DECLARE
 item record;
 fk record;
 mapping record;
 definitions text[] := ARRAY[
  'md_object_definitions','md_field_definitions','md_page_definitions',
  'md_component_definitions','md_flow_definitions','md_tenant_app_metadata',
  'md_global_value_sets','md_custom_labels','md_custom_metadata_types',
  'md_custom_metadata_fields','md_custom_settings','md_custom_setting_fields',
  'md_system_definitions','md_matching_rules','md_validation_rules',
  'md_field_default_formulas',
  'md_inbound_webhook_endpoints','md_webhook_subscriptions'
 ];
 structural text[] := ARRAY[
  'object_api','related_object','target_object','source_object_api','target_object_api',
  'parent_object_api','child_object_api','object_api_name',
  'field_api','controller_field_api','related_field_api','source_field_api',
  'target_field_api','rollup_field_api','filter_field_api','field_api_name',
  'page_api','page_api_name','target_page_api',
  'flow_api','flow_api_name','target_flow_api','trigger_flow_api',
  'component_api','component_api_name',
  'app_api','app_api_name','landing_app_api',
  'type_api','setting_api','source_api','target_api',
  'object_name','flow_name','page_name'
 ];
 touched integer := 0;
 count_rows integer;
 duplicate_exists boolean;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM md_tenants WHERE id=p_tenant) THEN
  RAISE EXCEPTION 'Unknown tenant for API-name migration';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtext('metadrive:api-casefold'),hashtext(p_tenant::text));

 -- Fail rather than silently merge case-only conflicts. Installed casefold
 -- unique indexes normally protect these identities already.
 FOR item IN
  SELECT c.table_name FROM information_schema.columns c
  WHERE c.table_schema=current_schema()
   AND c.column_name='api_name' AND c.table_name=ANY(definitions)
  ORDER BY c.table_name
 LOOP
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE tenant_id=$1
     GROUP BY lower(api_name), %s HAVING count(*)>1)',
     item.table_name,
     CASE WHEN item.table_name='md_field_definitions' THEN 'object_api'
          WHEN item.table_name='md_custom_metadata_fields' THEN 'type_api'
          WHEN item.table_name='md_custom_setting_fields' THEN 'setting_api'
          WHEN item.table_name='md_custom_labels' THEN 'language'
          WHEN item.table_name='md_system_definitions' THEN 'kind'
          WHEN item.table_name IN ('md_matching_rules','md_validation_rules','md_field_default_formulas') THEN 'object_api'
          WHEN item.table_name='md_flow_definitions' THEN 'version'
          ELSE 'tenant_id' END)
   INTO STRICT duplicate_exists USING p_tenant;
  IF duplicate_exists THEN
   RAISE EXCEPTION 'Case-only API identity collision in %',item.table_name;
  END IF;
 END LOOP;

 -- Save a stable audit map before changing any definition identity. The
 -- record is not a backup and deliberately contains no business values.
 FOR item IN SELECT c.table_name FROM information_schema.columns c
  WHERE c.table_schema=current_schema()
   AND c.column_name='api_name' AND c.table_name=ANY(definitions)
  ORDER BY c.table_name
 LOOP
  EXECUTE format('INSERT INTO md_api_casefold_changes(tenant_id,old_name,new_name)
     SELECT DISTINCT tenant_id,api_name,lower(api_name) FROM %I
     WHERE tenant_id=$1 AND api_name<>lower(api_name)
     ON CONFLICT (tenant_id,old_name) DO NOTHING',item.table_name)
    USING p_tenant;
 END LOOP;
 FOR item IN SELECT c.table_name,c.column_name FROM information_schema.columns c
   WHERE c.table_schema=current_schema()
    AND (c.table_name='md_global_quick_actions' AND c.column_name='action_id')
     OR (c.table_name='md_named_credentials' AND c.column_name='name')
 LOOP
  EXECUTE format('INSERT INTO md_api_casefold_changes(tenant_id,old_name,new_name)
     SELECT DISTINCT tenant_id,%I,lower(%I) FROM %I
     WHERE tenant_id=$1 AND %I<>lower(%I)
     ON CONFLICT (tenant_id,old_name) DO NOTHING',
    item.column_name,item.column_name,item.table_name,item.column_name,item.column_name)
   USING p_tenant;
 END LOOP;

 -- Most existing FKs are NOT DEFERRABLE. Temporarily make them deferrable
 -- inside the *same* caller transaction, so changing referenced and referencing
 -- API strings does not trigger an intermediate invalid-FK state.
 CREATE TEMP TABLE IF NOT EXISTS md_casefold_fks(
  table_name text, constraint_name text, PRIMARY KEY(table_name,constraint_name)
 ) ON COMMIT DROP;
 TRUNCATE md_casefold_fks;
 INSERT INTO md_casefold_fks(table_name,constraint_name)
  SELECT c.conrelid::regclass::text,c.conname
  FROM pg_constraint c
  WHERE c.contype='f' AND NOT c.condeferrable
    AND c.connamespace='public'::regnamespace
    AND (c.conrelid::regclass::text LIKE 'md\_%' ESCAPE '\'
      OR c.confrelid::regclass::text LIKE 'md\_%' ESCAPE '\');
 FOR fk IN SELECT * FROM md_casefold_fks ORDER BY table_name,constraint_name LOOP
  EXECUTE format('ALTER TABLE %s ALTER CONSTRAINT %I DEFERRABLE INITIALLY DEFERRED',
    fk.table_name,fk.constraint_name);
 END LOOP;
 SET CONSTRAINTS ALL DEFERRED;

 -- Only columns whose SQL meaning is an API identifier are changed, and
 -- only when that value appears in an inventoried tenant identifier map.
 -- Core reserved permission names, platform app identities, component
 -- property keys and ordinary record values are NOT indiscriminately lowered.
 FOR item IN
  SELECT c.table_name,c.column_name FROM information_schema.columns c
  WHERE c.table_schema=current_schema()
    AND c.table_name LIKE 'md\_%' ESCAPE '\'
    AND c.data_type IN ('text','character varying')
    AND EXISTS(SELECT 1 FROM information_schema.columns t
       WHERE t.table_schema=c.table_schema AND t.table_name=c.table_name
         AND t.column_name='tenant_id')
    AND (
      c.column_name=ANY(structural)
      OR (c.column_name='api_name' AND c.table_name=ANY(definitions))
      OR (c.table_name='md_tenant_app_navigation' AND c.column_name='api_name')
      OR (c.table_name='md_flow_nodes' AND c.column_name='api_name')
      OR (c.table_name='md_global_quick_actions' AND c.column_name='action_id')
      OR (c.table_name='md_named_credentials' AND c.column_name='name')
    )
    AND NOT(c.table_name='md_app_route_aliases' AND c.column_name='app_api')
  ORDER BY c.table_name,c.column_name
 LOOP
  EXECUTE format('UPDATE %I t SET %I=m.new_name
    FROM md_api_casefold_changes m WHERE t.tenant_id=$1 AND m.tenant_id=$1
      AND t.%I=m.old_name AND m.old_name<>m.new_name',
    item.table_name,item.column_name,item.column_name) USING p_tenant;
  GET DIAGNOSTICS count_rows=ROW_COUNT;
  touched:=touched+count_rows;
 END LOOP;

 -- Some embedded references are stored as typed SQL metadata values, not
 -- FK columns. Rewrite token boundaries only in binding/formula-like values
 -- and exact-value identifiers; keep normal captions and record data intact.
 FOR mapping IN
  SELECT old_name,new_name FROM md_api_casefold_changes
  WHERE tenant_id=p_tenant AND old_name<>new_name
  ORDER BY length(old_name) DESC,old_name
 LOOP
  FOR item IN SELECT c.table_name,c.column_name FROM information_schema.columns c
    WHERE c.table_schema=current_schema()
     AND c.column_name='value_text'
     AND c.table_name=ANY(ARRAY[
       'md_lightning_page_node_properties','md_page_layout_version_properties',
       'md_page_component_properties','md_component_properties','md_page_properties',
       'md_flow_editor_values','md_flow_node_properties',
       'md_component_library_version_properties','md_object_layout_version_properties'
     ])
     AND EXISTS(SELECT 1 FROM information_schema.columns t
       WHERE t.table_schema=c.table_schema AND t.table_name=c.table_name
         AND t.column_name='tenant_id')
  LOOP
   -- Do not rewrite unrelated user-visible text. Property-path filtering is
   -- conservative; references in unknown keys are left for the audit check.
   count_rows:=0;
   IF EXISTS(SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema=current_schema()
       AND c.table_name=item.table_name AND c.column_name='property_path') THEN
    EXECUTE format('UPDATE %I SET value_text=regexp_replace(value_text,
      $2,$3,''g'') WHERE tenant_id=$1 AND value_text IS NOT NULL
      AND (value_text=$4 OR property_path ~* $5) AND value_text ~ $2',
      item.table_name)
     USING p_tenant, '\m'||mapping.old_name||'\M',mapping.new_name,
       mapping.old_name,'(formula|bind|flow|action|object|field|page|app|source|target|reference|filter|query|expression|navigation)';
    GET DIAGNOSTICS count_rows=ROW_COUNT;
   ELSIF EXISTS(SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema=current_schema()
       AND c.table_name=item.table_name AND c.column_name='api_name') THEN
    EXECUTE format('UPDATE %I SET value_text=regexp_replace(value_text,
      $2,$3,''g'') WHERE tenant_id=$1 AND value_text IS NOT NULL
      AND (value_text=$4 OR api_name ~* $5) AND value_text ~ $2',
      item.table_name)
     USING p_tenant, '\m'||mapping.old_name||'\M',mapping.new_name,
       mapping.old_name,'(formula|bind|flow|action|object|field|page|app|source|target|reference|filter|query|expression|navigation)';
    GET DIAGNOSTICS count_rows=ROW_COUNT;
   END IF;
   touched:=touched+count_rows;
  END LOOP;
 END LOOP;

 -- Tenant-owned global app rows are changed only when they belong to this
 -- tenant. Their route-alias foreign keys must change in the same transaction.
 -- Shared installed app definitions remain stable for other tenants.
 IF EXISTS(SELECT 1 FROM information_schema.columns c WHERE
   c.table_schema=current_schema() AND c.table_name='md_apps'
   AND c.column_name='tenant_owner_id') THEN
  UPDATE md_app_route_aliases r SET app_api=lower(r.app_api)
    FROM md_apps a WHERE a.api_name=r.app_api AND a.tenant_owner_id=p_tenant
      AND r.tenant_id=p_tenant AND r.app_api<>lower(r.app_api);
  UPDATE md_apps SET api_name=lower(api_name)
   WHERE tenant_owner_id=p_tenant AND api_name<>lower(api_name);
 END IF;

 -- Referential integrity is rechecked before committing, and original FK
 -- deferrability restored. Any failure aborts this entire invocation.
 SET CONSTRAINTS ALL IMMEDIATE;
 FOR fk IN SELECT * FROM md_casefold_fks ORDER BY table_name,constraint_name LOOP
  EXECUTE format('ALTER TABLE %s ALTER CONSTRAINT %I NOT DEFERRABLE INITIALLY IMMEDIATE',
    fk.table_name,fk.constraint_name);
 END LOOP;
 RETURN touched;
END
$casefold$;
