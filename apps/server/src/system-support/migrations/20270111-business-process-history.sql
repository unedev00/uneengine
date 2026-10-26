-- Immutable relational revision snapshots; customer Record Type values are never
-- rewritten when the named process changes or a historic revision is restored.
CREATE TABLE IF NOT EXISTS md_object_business_process_history (
 tenant_id uuid NOT NULL,object_api text NOT NULL,process_api text NOT NULL,
 revision integer NOT NULL CHECK(revision>0),label text NOT NULL,
 status_field text NOT NULL,active boolean NOT NULL,
 actor_user_id uuid,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,object_api,process_api,revision),
 FOREIGN KEY(tenant_id,object_api,process_api)
  REFERENCES md_object_business_processes(tenant_id,object_api,api_name)
  ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_object_business_process_history_values (
 tenant_id uuid NOT NULL,object_api text NOT NULL,process_api text NOT NULL,
 revision integer NOT NULL,value_text text NOT NULL,sort_order integer NOT NULL,
 PRIMARY KEY(tenant_id,object_api,process_api,revision,value_text),
 FOREIGN KEY(tenant_id,object_api,process_api,revision)
  REFERENCES md_object_business_process_history(tenant_id,object_api,process_api,revision)
  ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_object_business_process_history_order
 ON md_object_business_process_history(tenant_id,object_api,process_api,revision DESC);
-- The first installed revision is preserved for tenants upgraded after processes
-- were created. Running this migration again never overwrites later changes.
INSERT INTO md_object_business_process_history
 (tenant_id,object_api,process_api,revision,label,status_field,active)
SELECT tenant_id,object_api,api_name,revision,label,status_field,active
FROM md_object_business_processes
ON CONFLICT DO NOTHING;
INSERT INTO md_object_business_process_history_values
 (tenant_id,object_api,process_api,revision,value_text,sort_order)
SELECT v.tenant_id,v.object_api,v.process_api,p.revision,v.value_text,v.sort_order
FROM md_object_business_process_values v
JOIN md_object_business_processes p
 ON p.tenant_id=v.tenant_id AND p.object_api=v.object_api AND p.api_name=v.process_api
ON CONFLICT DO NOTHING;
