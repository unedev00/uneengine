-- Phase 2B: External IDs may repeat unless explicitly marked Unique.
-- Both exact and case-insensitive upsert paths retain bounded, tenant-scoped index probes.
CREATE INDEX IF NOT EXISTS md_record_values_lookup_ci
 ON md_record_values(tenant_id,object_api,field_api,lower(value_text))
 WHERE value_text IS NOT NULL AND record_is_deleted=false;
CREATE INDEX IF NOT EXISTS md_record_values_lookup_cs
 ON md_record_values(tenant_id,object_api,field_api,value_text)
 WHERE value_text IS NOT NULL AND record_is_deleted=false;
