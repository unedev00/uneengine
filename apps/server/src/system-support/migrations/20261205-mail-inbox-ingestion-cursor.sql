-- Shared Core mail ingestion progress. No credentials, mail bodies or tenant
-- app state live here; actual events go through the existing Communication outbox.
CREATE TABLE IF NOT EXISTS md_mail_inbox_scan_offsets(
 tenant_id uuid NOT NULL,
 email text NOT NULL,
 next_offset integer NOT NULL DEFAULT 0 CHECK(next_offset>=0 AND next_offset<=20000),
 scanned_at timestamptz NOT NULL DEFAULT to_timestamp(0),
 PRIMARY KEY(tenant_id,email),
 FOREIGN KEY(tenant_id,email) REFERENCES md_mail_accounts(tenant_id,email) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_mail_inbox_scan_due
 ON md_mail_inbox_scan_offsets(scanned_at);
