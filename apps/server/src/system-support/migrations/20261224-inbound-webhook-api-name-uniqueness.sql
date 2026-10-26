-- Inbound webhook table is installed by the later 20261126 migration.
-- Refuse case-only collisions: never rename or delete tenant endpoints.
DO $migration$
BEGIN
 IF EXISTS (
  SELECT 1 FROM md_inbound_webhook_endpoints
  GROUP BY tenant_id,lower(api_name) HAVING count(*)>1
 ) THEN
  RAISE EXCEPTION 'Inbound Webhook API Name conflicts: reconcile tenant metadata before upgrading';
 END IF;
 IF EXISTS (
  SELECT 1 FROM md_webhook_subscriptions
  GROUP BY tenant_id,lower(api_name) HAVING count(*)>1
 ) THEN
  RAISE EXCEPTION 'Outbound Webhook API Name conflicts: reconcile tenant metadata before upgrading';
 END IF;
END
$migration$;
CREATE UNIQUE INDEX IF NOT EXISTS md_inbound_webhook_endpoints_api_name_ci_uq
 ON md_inbound_webhook_endpoints(tenant_id,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_webhook_subscriptions_api_name_ci_uq
 ON md_webhook_subscriptions(tenant_id,lower(api_name));
