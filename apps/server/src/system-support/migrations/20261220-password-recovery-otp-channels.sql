-- Tenant-scoped, versionable security recovery Flow configuration.
-- Core verification is not an ordinary anonymous Flow: its issued secrets are server-owned.
CREATE TABLE IF NOT EXISTS md_password_recovery_flow (
 tenant_id uuid PRIMARY KEY REFERENCES md_tenants(id),
 otp_length integer NOT NULL DEFAULT 6 CHECK(otp_length IN (4,6)),
 otp_expiry_minutes integer NOT NULL DEFAULT 10 CHECK(otp_expiry_minutes BETWEEN 5 AND 15),
 max_otp_attempts integer NOT NULL DEFAULT 5 CHECK(max_otp_attempts BETWEEN 3 AND 5),
 email_subject text NOT NULL DEFAULT 'MetaDrive password recovery',
 email_template text NOT NULL DEFAULT 'Your verification code is {!Verification.Value}. It expires in {!Verification.ExpiryMinutes} minutes.',
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS md_password_recovery_channel_actions (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 channel text NOT NULL CHECK(channel IN ('sms','whatsapp')),
 enabled boolean NOT NULL DEFAULT false,
 flow_service_user_id uuid,
 credential_id uuid,
 callout_path text NOT NULL DEFAULT '',
 callout_body text NOT NULL DEFAULT '',
 message_template text NOT NULL DEFAULT 'Your MetaDrive recovery code is {!Verification.Value}. Expires in {!Verification.ExpiryMinutes} minutes.',
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,channel),
 FOREIGN KEY(tenant_id,flow_service_user_id) REFERENCES md_users(tenant_id,id),
 FOREIGN KEY(tenant_id,credential_id) REFERENCES md_named_credentials(tenant_id,id)
);
-- A phone must be verified separately by the account holder before recovery delivery.
-- Never infer a recovery destination from an arbitrary CRM Phone field or user input.
CREATE TABLE IF NOT EXISTS md_user_recovery_phones (
 tenant_id uuid NOT NULL,
 user_id uuid NOT NULL,
 phone_e164 text NOT NULL CHECK(phone_e164 ~ '^\\+[1-9][0-9]{7,14}$'),
 verified_at timestamptz NOT NULL,
 PRIMARY KEY(tenant_id,user_id),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE
);
ALTER TABLE md_password_reset_challenges
 ADD COLUMN IF NOT EXISTS otp_hash text CHECK(otp_hash IS NULL OR length(otp_hash)=64),
 ADD COLUMN IF NOT EXISTS otp_length integer CHECK(otp_length IS NULL OR otp_length IN(4,6)),
 ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count>=0),
 ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 5 CHECK(max_attempts BETWEEN 3 AND 5),
 ADD COLUMN IF NOT EXISTS verified_at timestamptz,
 ADD COLUMN IF NOT EXISTS delivery_channel text NOT NULL DEFAULT 'email'
   CHECK(delivery_channel IN('email','sms','whatsapp'));
CREATE INDEX IF NOT EXISTS md_password_reset_pending_otp
 ON md_password_reset_challenges(tenant_id,user_id,created_at DESC)
 WHERE consumed_at IS NULL;
-- Migration only adds structures; user customisations and existing link challenges remain.
