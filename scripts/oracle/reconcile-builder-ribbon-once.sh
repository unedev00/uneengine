#!/usr/bin/env bash
# One-time metadata-only repair for the known 20270122 immutable SQL mismatch.
# Owner-authorized Oracle production recovery, 2026-10-29.
# No business records, tenant credentials, permissions or published page data touched.
set -Eeuo pipefail
umask 077
[[ "${EUID}" == 0 && "$#" == 1 ]] || exit 64
[[ "${GITHUB_REPOSITORY:-}" == 'unedev00/uneengine' ]] || exit 64
[[ "${GITHUB_REF:-}" == 'refs/heads/ops/oracle-ribbon-reconcile-20261029' ]] || exit 64
[[ "$(uname -m)" == aarch64 ]] || exit 64
mode="$1"
[[ "$mode" == 'dry-run' || "$mode" == 'apply' ]] || exit 64
folder="${GITHUB_WORKSPACE:?}/apps/server/src/system-support/migrations"
name=20270122-global-shared-builder-ribbon.sql
migration="$folder/$name"
old=547b0b2db37abf187d8f4fdcde8cf4461817f1383c0c93d7a2536d9c9afee71c
canonical=5efcce906bcd213adddde0791cc391b192133663f4902f0670cf8bd0fa09fa78
db=metadrive_sql_20261022_production
[[ -f "$migration" ]] || { echo 'Canonical SQL file missing'; exit 1; }
[[ "$(sha256sum "$migration" | cut -d ' ' -f 1)" == "$canonical" ]] || {
 echo 'Canonical SQL hash changed; refusing repair'; exit 1;
}
applied="$(runuser -u postgres -- psql -X -Atq -v ON_ERROR_STOP=1 -d "$db" -c "SELECT checksum FROM md_system_migrations WHERE version='$name'")"
if [[ "$applied" != "$old" ]]; then
 echo 'Unexpected applied checksum; refusing repair or duplicate execution'
 exit 1
fi
for expected in 'Home|15' 'Data|4' 'Design|29' 'Layout|10'; do
 value="$(runuser -u postgres -- psql -X -Atq -v ON_ERROR_STOP=1 -d "$db" -c "SELECT tab || '|' || count(*) FROM md_builder_shared_properties GROUP BY tab HAVING tab='${expected%%|*}'")"
 [[ "$value" == "$expected" ]] || { echo 'Ribbon inventory has changed; refusing repair'; exit 1; }
done
if [[ "$mode" == apply ]]; then
 echo 'SQL snapshot before approved reconciliation'
 bash "${GITHUB_WORKSPACE}/scripts/oracle/backup-production-sql.sh"
fi
echo "Running safeguarded 20270122 metadata reconciliation: $mode"
{
 cat <<'SQL'
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('metadrive:system:migrations'));
DO $$
BEGIN
 IF (SELECT checksum FROM md_system_migrations WHERE version='20270122-global-shared-builder-ribbon.sql')
    IS DISTINCT FROM '547b0b2db37abf187d8f4fdcde8cf4461817f1383c0c93d7a2536d9c9afee71c' THEN
  RAISE EXCEPTION 'SQL migration checksum changed during reconciliation';
 END IF;
END $$;
CREATE TEMP TABLE _md_home_snapshot ON COMMIT DROP AS
 SELECT property_key,to_jsonb(p) AS snapshot
 FROM md_builder_shared_properties p WHERE tab='Home';
SQL
 cat "$migration"
 cat <<'SQL'
DO $$
BEGIN
 IF EXISTS (
  (SELECT property_key,snapshot FROM _md_home_snapshot
   EXCEPT
   SELECT property_key,to_jsonb(p) FROM md_builder_shared_properties p WHERE tab='Home')
  UNION ALL
  (SELECT property_key,to_jsonb(p) FROM md_builder_shared_properties p WHERE tab='Home'
   EXCEPT SELECT property_key,snapshot FROM _md_home_snapshot)
 ) THEN RAISE EXCEPTION 'Home property inventory changed; rolling back'; END IF;
 IF (SELECT count(*) FROM md_builder_shared_properties) <> 58 THEN
  RAISE EXCEPTION 'Unexpected shared SQL property count'; END IF;
END $$;
SQL
 if [[ "$mode" == apply ]]; then
 cat <<'SQL'
CREATE TABLE IF NOT EXISTS md_system_migration_reconciliation_audit(
 version text PRIMARY KEY,
 old_checksum text NOT NULL,
 new_checksum text NOT NULL,
 explanation text NOT NULL,
 reconciled_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO md_system_migration_reconciliation_audit(version,old_checksum,new_checksum,explanation)
VALUES('20270122-global-shared-builder-ribbon.sql',
 '547b0b2db37abf187d8f4fdcde8cf4461817f1383c0c93d7a2536d9c9afee71c',
 '5efcce906bcd213adddde0791cc391b192133663f4902f0670cf8bd0fa09fa78',
 'Owner-approved canonical SQL replay after verifying 171 applied SQL checksums and an unchanged Home property snapshot')
ON CONFLICT(version) DO NOTHING;
UPDATE md_system_migrations SET checksum='5efcce906bcd213adddde0791cc391b192133663f4902f0670cf8bd0fa09fa78'
WHERE version='20270122-global-shared-builder-ribbon.sql'
 AND checksum='547b0b2db37abf187d8f4fdcde8cf4461817f1383c0c93d7a2536d9c9afee71c';
DO $$
BEGIN
 IF (SELECT checksum FROM md_system_migrations WHERE version='20270122-global-shared-builder-ribbon.sql')
 IS DISTINCT FROM '5efcce906bcd213adddde0791cc391b192133663f4902f0670cf8bd0fa09fa78'
 THEN RAISE EXCEPTION 'Migration reconciliation was not applied'; END IF;
END $$;
COMMIT;
SQL
 else
   printf 'ROLLBACK;\n'
 fi
} | runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -d "$db"
echo "Safeguarded SQL reconciliation $mode completed."
