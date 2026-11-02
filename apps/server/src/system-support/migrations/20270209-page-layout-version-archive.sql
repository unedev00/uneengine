-- Reversible version "delete": preserve immutable snapshots and all recovery paths.
-- App-seeded pages remain protected by the PageLayoutVersionRuntime owner guard.
ALTER TABLE md_page_layout_versions
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid;

CREATE TABLE IF NOT EXISTS md_page_layout_version_archive_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  page_id uuid NOT NULL,
  variant text NOT NULL CHECK (variant IN ('Mobile','Desktop','Tablet','Custom')),
  version integer NOT NULL CHECK (version > 0),
  actor_user_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('Archive','Unarchive')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id,page_id) REFERENCES md_lightning_page_details(tenant_id,page_id),
  FOREIGN KEY (tenant_id,actor_user_id) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_page_layout_version_archive_audit_lookup
  ON md_page_layout_version_archive_audit(tenant_id,page_id,variant,occurred_at DESC);
