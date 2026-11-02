-- A one-time, append-only receipt for the provisioned platform deploy owner.
-- Never use bootstrap credentials as runtime authorization. Runtime checks only SQL
-- assignments and revocable OneEngine RBAC grants.
CREATE TABLE IF NOT EXISTS md_platform_deployment_owner_receipts (
 tenant_id uuid PRIMARY KEY REFERENCES md_tenants(id),
 user_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id)
);
