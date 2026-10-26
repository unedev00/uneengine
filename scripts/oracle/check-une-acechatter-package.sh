#!/usr/bin/env bash
# Read-only production AppExchange install readiness, without tenant/user IDs or data.
set -Eeuo pipefail
DB="${METADRIVE_SQL_PRODUCTION_DB:-metadrive_sql_20261022_production}"
[[ "$DB" =~ ^[A-Za-z][A-Za-z0-9_]{0,127}$ ]] || exit 64
runuser -u postgres -- psql -X -A -t -v ON_ERROR_STOP=1 -d "$DB" <<'SQL'
WITH catalog AS (
 SELECT
 (SELECT id FROM md_apps WHERE api_name='AceChatter' AND tenant_owner_id IS NULL AND enabled=true LIMIT 1) AS source_id,
 (SELECT id FROM md_apps WHERE api_name='UNEAceChatter' AND tenant_owner_id IS NULL AND enabled=true LIMIT 1) AS une_id
), state AS (
 SELECT
  row_number() OVER (ORDER BY t.id) AS ordinal,
  EXISTS(SELECT 1 FROM md_app_installations i WHERE i.tenant_id=t.id AND i.app_id=c.source_id) AS source_installed,
  EXISTS(SELECT 1 FROM md_app_entitlements e WHERE e.tenant_id=t.id AND e.app_id=c.source_id
   AND e.active AND (e.expires_at IS NULL OR e.expires_at>now())) AS source_licensed,
  (SELECT v.version FROM md_tenant_app_installed_versions v WHERE v.tenant_id=t.id AND v.app_id=c.source_id) AS source_version,
  EXISTS(SELECT 1 FROM md_app_entitlements e WHERE e.tenant_id=t.id AND e.app_id=c.une_id
   AND e.active AND (e.expires_at IS NULL OR e.expires_at>now())) AS une_licensed,
  EXISTS(SELECT 1 FROM md_app_installations i WHERE i.tenant_id=t.id AND i.app_id=c.une_id) AS une_installed,
  (SELECT v.version FROM md_tenant_app_installed_versions v WHERE v.tenant_id=t.id AND v.app_id=c.une_id) AS une_version,
  (SELECT count(*) FROM md_tenant_app_metadata m WHERE m.tenant_id=t.id
    AND m.api_name='UNEAceChatter' AND m.app_id IS DISTINCT FROM c.une_id) AS conflicting_app_aliases,
  (SELECT count(*) FROM md_page_definitions p WHERE p.tenant_id=t.id
   AND p.api_name IN ('UNEAceChatterDesktop','UNEAceChatterTablet','UNEAceChatterMobile','UNEAceChatterCustom')) AS une_pages,
  (SELECT count(*) FROM md_flow_definitions f WHERE f.tenant_id=t.id AND f.api_name IN
   ('AceChatterLoadConversations','AceChatterLoadCommunications','AceChatterLoadContacts')
   AND f.active AND NOT f.archived) AS source_read_flows
 FROM md_tenants t CROSS JOIN catalog c
)
SELECT format('UNE_PACKAGE_READINESS tenant_ordinal=%s source_installed=%s source_licensed=%s source_version=%s une_licensed=%s une_installed=%s une_version=%s une_pages=%s source_read_flows=%s conflicting_app_aliases=%s',
 ordinal,source_installed,source_licensed,coalesce(source_version::text,'none'),
 une_licensed,une_installed,coalesce(une_version::text,'none'),une_pages,source_read_flows,conflicting_app_aliases)
FROM state ORDER BY ordinal;
SELECT format('UNE_CATALOG source_package_version=%s une_package_version=%s',
 coalesce((SELECT max(p.version)::text FROM md_app_package_versions p JOIN md_apps a ON a.id=p.app_id
  WHERE a.api_name='AceChatter' AND a.tenant_owner_id IS NULL AND p.published),'none'),
 coalesce((SELECT max(p.version)::text FROM md_app_package_versions p JOIN md_apps a ON a.id=p.app_id
  WHERE a.api_name='UNEAceChatter' AND a.tenant_owner_id IS NULL AND p.published),'none'));
SQL
