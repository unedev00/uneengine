#!/usr/bin/env bash
# Owner-authorised one-time production metadata ownership correction.
# The existing system migrations are owned by metadrive, but the reconciliation
# audit table was accidentally created under postgres by an emergency repair.
set -Eeuo pipefail
umask 077
[[ "$EUID" == 0 && "$#" == 1 ]] || exit 64
[[ "${GITHUB_REPOSITORY:-}" == "unedev00/uneengine" ]] || exit 64
[[ "${GITHUB_REF:-}" == "refs/heads/ops/oracle-audit-table-ownership-20261029" ]] || exit 64
[[ "$(uname -m)" == "aarch64" ]] || exit 64
mode="$1"
[[ "$mode" == dry-run || "$mode" == apply ]] || exit 64
db=metadrive_sql_20261022_production
owner="$(runuser -u postgres -- psql -X -Atq -v ON_ERROR_STOP=1 -d "$db" -c "SELECT tableowner FROM pg_tables WHERE schemaname='public' AND tablename='md_system_migrations'")"
audit_owner="$(runuser -u postgres -- psql -X -Atq -v ON_ERROR_STOP=1 -d "$db" -c "SELECT tableowner FROM pg_tables WHERE schemaname='public' AND tablename='md_system_migration_reconciliation_audit'")"
[[ "$owner" == metadrive ]] || { echo 'System migrations ownership unexpectedly changed; fail closed'; exit 1; }
[[ "$audit_owner" == postgres || "$audit_owner" == metadrive ]] ||
 { echo 'Audit ownership unexpectedly changed; fail closed'; exit 1; }
if [[ "$audit_owner" == metadrive ]]; then
 echo 'Audit table already correctly owned; no change required'
 exit 0
fi
if [[ "$mode" == apply ]]; then
 bash "${GITHUB_WORKSPACE:?}/scripts/oracle/backup-production-sql.sh"
fi
echo "Correcting audit table ownership (mode=$mode), no tenant data touched"
{
 cat <<'SQL'
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('metadrive:system:migrations'));
DO $$
BEGIN
 IF (SELECT tableowner FROM pg_tables WHERE schemaname='public' AND tablename='md_system_migrations') <> 'metadrive'
 OR (SELECT tableowner FROM pg_tables WHERE schemaname='public' AND tablename='md_system_migration_reconciliation_audit') <> 'postgres'
 THEN RAISE EXCEPTION 'Unexpected migration metadata table owner'; END IF;
END $$;
ALTER TABLE public.md_system_migration_reconciliation_audit OWNER TO metadrive;
DO $$
BEGIN
 IF (SELECT tableowner FROM pg_tables WHERE schemaname='public' AND tablename='md_system_migration_reconciliation_audit') <> 'metadrive'
 THEN RAISE EXCEPTION 'Audit table owner change did not apply'; END IF;
END $$;
SQL
 if [[ "$mode" == dry-run ]]; then printf 'ROLLBACK;\n'; else printf 'COMMIT;\n'; fi
} | runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -d "$db"
echo "Audit ownership $mode completed"
