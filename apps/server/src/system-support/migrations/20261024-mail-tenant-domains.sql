-- Tenant ownership boundary for the Docker Mailserver provisioning API.
-- Never store mailbox passwords or SMTP credentials in the application database.
CREATE TABLE IF NOT EXISTS md_mail_domains (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
 domain text NOT NULL UNIQUE,
 verified_at timestamptz,
 verification_token text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,domain)
);
CREATE INDEX IF NOT EXISTS md_mail_domains_tenant_idx ON md_mail_domains(tenant_id);

CREATE TABLE IF NOT EXISTS md_mail_accounts (
 email text PRIMARY KEY,
 tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
 domain text NOT NULL,
 FOREIGN KEY(tenant_id,domain) REFERENCES md_mail_domains(tenant_id,domain),
 description text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','error')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,email)
);
CREATE INDEX IF NOT EXISTS md_mail_accounts_tenant_idx ON md_mail_accounts(tenant_id);

-- Existing system domain only: associate it with its actual registered MetaDrive tenant.
-- Future tenant domains must be explicitly verified before activation.
INSERT INTO md_mail_domains(tenant_id,domain,verified_at)
SELECT DISTINCT tenant_id,domain,now() FROM md_tenant_domains
WHERE domain='unesolutions.co.uk'
ON CONFLICT(domain) DO NOTHING;

-- Existing owner mailbox confirmed present in Docker Mailserver; only register
-- it for the tenant that owns the verified system domain.
INSERT INTO md_mail_accounts(email,tenant_id,domain,description,status)
SELECT 'support@unesolutions.co.uk',tenant_id,domain,'Platform support mailbox','active'
FROM md_mail_domains WHERE domain='unesolutions.co.uk' AND verified_at IS NOT NULL
ON CONFLICT(email) DO NOTHING;
