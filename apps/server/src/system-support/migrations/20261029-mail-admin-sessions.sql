-- One-time admin mailbox tickets and short-lived read-only access.
-- Contains SHA-256 token hashes only. NEVER store mailbox or Dovecot master passwords.
CREATE TABLE IF NOT EXISTS md_mail_admin_sessions(
 token_hash text PRIMARY KEY CHECK(length(token_hash)=64),
 tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
 actor_user_id uuid NOT NULL,
 mailbox_email text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('ticket','session')),
 created_at timestamptz NOT NULL DEFAULT now(),
 redeemed_at timestamptz,
 expires_at timestamptz NOT NULL,
 FOREIGN KEY(tenant_id,mailbox_email) REFERENCES md_mail_accounts(tenant_id,email) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_mail_admin_sessions_expiry_idx ON md_mail_admin_sessions(expires_at);
