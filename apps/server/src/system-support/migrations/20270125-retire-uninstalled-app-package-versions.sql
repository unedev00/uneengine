-- Remove superseded system-owned app package versions that NO tenant has installed.
-- This is package catalogue metadata only: never delete tenant installations,
-- business records, page versions, authored component libraries or permissions.
-- Each removed package version and its direct child metadata is archived first.
-- Requires a separate verified SQL backup before production deployment.
CREATE TABLE IF NOT EXISTS md_retired_app_package_version_archive (
  app_id uuid NOT NULL REFERENCES md_apps(id),
  version integer NOT NULL CHECK(version>0),
  archived_at timestamptz NOT NULL DEFAULT now(),
  package_snapshot jsonb NOT NULL,
  child_snapshots jsonb NOT NULL,
  PRIMARY KEY(app_id,version)
);

DO $cleanup$
DECLARE
  candidate record;
  child record;
  child_rows jsonb;
  children jsonb;
  package_data jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('metadrive:system:retire-app-package-versions'));
  FOR candidate IN
    SELECT p.app_id,p.version
    FROM md_app_package_versions p
    JOIN md_apps a ON a.id=p.app_id AND a.tenant_owner_id IS NULL
    WHERE p.version < (
      SELECT MAX(current_version.version)
      FROM md_app_package_versions current_version
      WHERE current_version.app_id=p.app_id AND current_version.published=true
    )
    AND NOT EXISTS (
      SELECT 1 FROM md_tenant_app_installed_versions installed
      WHERE installed.app_id=p.app_id AND installed.version=p.version
    )
    -- Legacy installations lacking a version receipt retain their full
    -- published package history until version backfill explicitly resolves it.
    AND NOT EXISTS (
      SELECT 1 FROM md_app_installations installation
      WHERE installation.app_id=p.app_id
        AND NOT EXISTS (
          SELECT 1 FROM md_tenant_app_installed_versions receipt
          WHERE receipt.tenant_id=installation.tenant_id
            AND receipt.app_id=installation.app_id
        )
    )
    ORDER BY p.app_id,p.version
    FOR UPDATE OF p
  LOOP
    -- Archive exact metadata for rollback (including historical published versions).
    SELECT to_jsonb(p) INTO package_data FROM md_app_package_versions p
    WHERE p.app_id=candidate.app_id AND p.version=candidate.version;
    children:='{}'::jsonb;
    -- Archive every versioned package-template table, including nested FK
    -- children such as home-page templates. Exclude tenant-owned rows.
    FOR child IN
      SELECT n.nspname AS schema_name,c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE c.relkind IN ('r','p') AND n.nspname=current_schema()
        AND c.relname LIKE 'md_app_package_%'
        AND c.relname NOT IN ('md_app_package_versions')
        AND EXISTS (SELECT 1 FROM pg_attribute att
          WHERE att.attrelid=c.oid AND att.attname='app_id' AND NOT att.attisdropped)
        AND EXISTS (SELECT 1 FROM pg_attribute att
          WHERE att.attrelid=c.oid AND att.attname='version' AND NOT att.attisdropped)
    LOOP
      EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(t)),''[]''::jsonb) FROM %I.%I t WHERE t.app_id=$1 AND t.version=$2',
        child.schema_name,child.table_name)
        INTO child_rows USING candidate.app_id,candidate.version;
      children:=children||jsonb_build_object(child.schema_name||'.'||child.table_name,child_rows);
    END LOOP;
    INSERT INTO md_retired_app_package_version_archive(app_id,version,package_snapshot,child_snapshots)
    VALUES(candidate.app_id,candidate.version,package_data,children)
    ON CONFLICT(app_id,version) DO NOTHING;
    -- Fail rather than erase metadata whose backup could not be written.
    IF NOT EXISTS (
      SELECT 1 FROM md_retired_app_package_version_archive archived
      WHERE archived.app_id=candidate.app_id AND archived.version=candidate.version
    ) THEN RAISE EXCEPTION 'Package version archive missing for % version %',candidate.app_id,candidate.version;
    END IF;
    -- Repeat the installed-version guard, now inside the transaction.
    DELETE FROM md_app_package_versions p
    WHERE p.app_id=candidate.app_id AND p.version=candidate.version
      AND EXISTS (SELECT 1 FROM md_retired_app_package_version_archive archive
        WHERE archive.app_id=p.app_id AND archive.version=p.version)
      AND NOT EXISTS (SELECT 1 FROM md_tenant_app_installed_versions i
        WHERE i.app_id=p.app_id AND i.version=p.version);
  END LOOP;
END $cleanup$;
