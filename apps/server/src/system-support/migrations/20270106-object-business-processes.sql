-- Shared, tenant-scoped business process definitions; record-type status values
-- remain the single Record Engine source of truth after an explicit apply.
CREATE TABLE IF NOT EXISTS md_object_business_processes (
 tenant_id uuid NOT NULL,object_api text NOT NULL,api_name text NOT NULL,
 label text NOT NULL,status_field text NOT NULL,revision integer NOT NULL DEFAULT 1,
 active boolean NOT NULL DEFAULT true,updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,object_api,api_name),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,object_api,status_field)
  REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE RESTRICT,
 CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]{0,79}$'),
 CHECK(length(label) BETWEEN 1 AND 160),
 CHECK(revision>0)
);
CREATE TABLE IF NOT EXISTS md_object_business_process_values (
 tenant_id uuid NOT NULL,object_api text NOT NULL,process_api text NOT NULL,
 value_text text NOT NULL,sort_order integer NOT NULL,
 PRIMARY KEY(tenant_id,object_api,process_api,value_text),
 FOREIGN KEY(tenant_id,object_api,process_api)
  REFERENCES md_object_business_processes(tenant_id,object_api,api_name) ON DELETE CASCADE,
 CHECK(length(value_text) BETWEEN 1 AND 255)
);
CREATE INDEX IF NOT EXISTS md_object_business_process_values_order
 ON md_object_business_process_values(tenant_id,object_api,process_api,sort_order);
ALTER TABLE md_object_record_types
 ADD COLUMN IF NOT EXISTS business_process_api_name text;
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='md_object_record_types'::regclass
  AND conname='md_record_type_business_process_fkey') THEN
  ALTER TABLE md_object_record_types ADD CONSTRAINT md_record_type_business_process_fkey
   FOREIGN KEY(tenant_id,object_api,business_process_api_name)
   REFERENCES md_object_business_processes(tenant_id,object_api,api_name) ON DELETE RESTRICT;
 END IF;
END $$;
