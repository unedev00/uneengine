-- Status callbacks can arrive before the outbound message has been persisted.
-- Keep one latest receipt per status for tenant-scoped reconciliation.
CREATE TABLE IF NOT EXISTS md_communication_pending_status (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
 external_message_id text NOT NULL,
 provider_status text NOT NULL
   CHECK(provider_status IN ('sent','delivered','read','failed')),
 provider_timestamp timestamptz NOT NULL,
 PRIMARY KEY (tenant_id,external_message_id,provider_status)
);
CREATE INDEX IF NOT EXISTS md_communication_pending_status_time
 ON md_communication_pending_status(tenant_id,provider_timestamp);
