-- System migration baseline 1/2: SQL patches and metadata, preserved in original execution order.
-- Prerequisite: apps/server/src/system-files/schema.sql.
-- Each BEGIN LEGACY / END LEGACY section identifies its former source for review and smoke tests.
-- Do not amend after applying: the migration runner enforces the SHA-256 checksum.

-- BEGIN LEGACY 001-metadata-bindings.sql
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE md_flow_definitions ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE md_flow_definitions ADD COLUMN IF NOT EXISTS flow_type text NOT NULL DEFAULT 'Autolaunched Flow';
-- Stable references remain tenant-scoped even when API names change.
CREATE UNIQUE INDEX IF NOT EXISTS md_object_definition_tenant_id ON md_object_definitions(tenant_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS md_field_definition_tenant_id ON md_field_definitions(tenant_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS md_page_component_tenant_id ON md_page_components(tenant_id,id);
CREATE TABLE IF NOT EXISTS md_page_component_properties (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id), component_id uuid NOT NULL,
 property_path text NOT NULL, value_text text,
 data_type text NOT NULL CHECK(data_type IN ('string','number','boolean','null','reference','array','object')),
 object_id uuid,field_id uuid,flow_id uuid,
 PRIMARY KEY(tenant_id,component_id,property_path),
 FOREIGN KEY(tenant_id,component_id) REFERENCES md_page_components(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,object_id) REFERENCES md_object_definitions(tenant_id,id),
 FOREIGN KEY(tenant_id,field_id) REFERENCES md_field_definitions(tenant_id,id),
 FOREIGN KEY(tenant_id,flow_id) REFERENCES md_flow_definitions(tenant_id,id),
 CHECK((data_type='reference' AND num_nonnulls(object_id,field_id,flow_id)=1 AND value_text IS NULL)
  OR (data_type<>'reference' AND num_nonnulls(object_id,field_id,flow_id)=0))
);
CREATE TABLE IF NOT EXISTS md_app_seed_pages (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),app_id uuid NOT NULL REFERENCES md_apps(id),seed_key text NOT NULL,
 page_id uuid NOT NULL,component_id uuid NOT NULL,version integer NOT NULL CHECK(version>0),
 PRIMARY KEY(tenant_id,app_id,seed_key),
 FOREIGN KEY(tenant_id,page_id) REFERENCES md_page_definitions(tenant_id,id),
 FOREIGN KEY(tenant_id,component_id) REFERENCES md_page_components(tenant_id,id)
);
-- END LEGACY 001-metadata-bindings.sql

-- BEGIN LEGACY 20261018-address-compound.sql
ALTER TABLE md_record_values ADD COLUMN IF NOT EXISTS address_street text;
ALTER TABLE md_record_values ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE md_record_values ADD COLUMN IF NOT EXISTS address_state text;
ALTER TABLE md_record_values ADD COLUMN IF NOT EXISTS address_postal_code text;
ALTER TABLE md_record_values ADD COLUMN IF NOT EXISTS address_country text;
-- END LEGACY 20261018-address-compound.sql

-- BEGIN LEGACY 20261018-named-credentials.sql
-- Isolated encrypted credential storage. The SQL record never contains plaintext secrets.
CREATE TABLE IF NOT EXISTS md_named_credentials (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 name text NOT NULL,
 label text NOT NULL,
 protocol text NOT NULL CHECK(protocol IN ('HTTPS','SMTP')),
 base_url text NOT NULL,
 auth_type text NOT NULL,
 header_name text NOT NULL DEFAULT '',
 secret_ciphertext bytea,
 configuration_ciphertext bytea,
 enabled boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,name),UNIQUE(tenant_id,id)
);
-- END LEGACY 20261018-named-credentials.sql

-- BEGIN LEGACY 20261018-record-history.sql
CREATE TABLE IF NOT EXISTS md_record_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 record_id uuid NOT NULL,
 object_api text NOT NULL,
 field_api text NOT NULL,
 changed_by uuid NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now(),
 old_value text,
 new_value text,
 FOREIGN KEY(tenant_id,record_id,object_api) REFERENCES md_records(tenant_id,id,object_api) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,changed_by) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_record_history_lookup ON md_record_history(tenant_id,object_api,record_id,changed_at DESC);
-- END LEGACY 20261018-record-history.sql

-- BEGIN LEGACY 20261018-system-definitions.sql
-- Run by the versioned SQL migration runner before enabling the new routes.
-- Shared metadata for optional runtime definitions. Never stores credentials or secrets.
CREATE TABLE IF NOT EXISTS md_system_definitions (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 kind text NOT NULL CHECK (kind IN ('platform-events','email-alerts','approval-processes','dashboards','dashboard-folders','dashboard-territories','report-folders','reports','connector-providers','integration-connections')),
 api_name text NOT NULL,
 label text NOT NULL,
 properties jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(properties)='object'),
 enabled boolean NOT NULL DEFAULT true,
 revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (tenant_id,kind,api_name)
);
CREATE INDEX IF NOT EXISTS md_system_definitions_lookup ON md_system_definitions(tenant_id,kind,enabled);
-- END LEGACY 20261018-system-definitions.sql

-- BEGIN LEGACY 20261018-tenant-domains-usage.sql
-- Shared tenant metadata. Verification never follows from inserting a pending claim.
CREATE TABLE IF NOT EXISTS md_tenant_domain_claims (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 domain text NOT NULL,
 proof_token text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 verified_at timestamptz,
 PRIMARY KEY(tenant_id,domain),
 UNIQUE(domain),
 CHECK (domain=lower(domain))
);
ALTER TABLE md_tenant_domains
 ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE md_tenant_domains
 ADD COLUMN IF NOT EXISTS verified_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS md_tenant_usage_targets (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 metric text NOT NULL CHECK(metric IN ('users','records','objects','flows')),
 target_value bigint NOT NULL CHECK(target_value BETWEEN 1 AND 1000000000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,metric)
);
-- END LEGACY 20261018-tenant-domains-usage.sql

-- BEGIN LEGACY 20261018-tenant-lifecycle.sql
-- Additive tenant lifecycle fields. Preserve tenants, users, domains and business records.
ALTER TABLE md_tenants ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE md_tenants ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE md_tenants ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE md_tenants ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE md_tenants ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE md_tenants ADD COLUMN IF NOT EXISTS retention_until timestamptz;
ALTER TABLE md_tenants ADD COLUMN IF NOT EXISTS legal_hold boolean NOT NULL DEFAULT false;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='md_tenants_status_check' AND conrelid='md_tenants'::regclass) THEN
  ALTER TABLE md_tenants ADD CONSTRAINT md_tenants_status_check CHECK(status IN ('ACTIVE','SUSPENDED','ARCHIVED'));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS md_tenant_lifecycle_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 actor_user_id uuid NOT NULL,
 target_tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 operation text NOT NULL,
 previous_status text NOT NULL,
 new_status text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (actor_tenant_id,actor_user_id) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_tenant_lifecycle_audit_target ON md_tenant_lifecycle_audit(target_tenant_id,created_at DESC);

ALTER TABLE md_users ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS md_tenant_provisioning_requests (
 actor_tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 actor_user_id uuid NOT NULL,
 request_key uuid NOT NULL,
 request_digest text NOT NULL,
 target_tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (actor_tenant_id,actor_user_id,request_key),
 FOREIGN KEY (actor_tenant_id,actor_user_id) REFERENCES md_users(tenant_id,id)
);
-- END LEGACY 20261018-tenant-lifecycle.sql

-- BEGIN LEGACY 20261018-tenant-settings.sql
-- Additive, tenant-isolated settings storage. Preserve existing tenants and metadata.
CREATE TABLE IF NOT EXISTS md_tenant_settings (
  tenant_id uuid NOT NULL REFERENCES md_tenants(id),
  setting_key text NOT NULL CHECK (setting_key IN ('company-profile','currencies','automation-settings')),
  properties jsonb NOT NULL CHECK (jsonb_typeof(properties)='object'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,setting_key)
);
-- END LEGACY 20261018-tenant-settings.sql

-- BEGIN LEGACY 20261018-zz-flow-run-cancellation.sql
-- Additive upgrade: explicit cancellation state for durable SQL Flow interviews.
-- Preserves all existing runs, statuses and timestamps.
ALTER TABLE md_flow_runs DROP CONSTRAINT IF EXISTS md_flow_runs_status_check;
ALTER TABLE md_flow_runs ADD CONSTRAINT md_flow_runs_status_check
  CHECK (status IN ('pending','completed','failed','cancelled'));
-- END LEGACY 20261018-zz-flow-run-cancellation.sql

-- BEGIN LEGACY 20261018-zzz-app-route-aliases.sql
-- Tenant-aware versioned friendly app route metadata.
-- Additive only: existing app installations and business records are preserved.
CREATE TABLE IF NOT EXISTS md_app_route_aliases (
  tenant_id uuid NOT NULL REFERENCES md_tenants(id),
  app_api text NOT NULL REFERENCES md_apps(api_name),
  slug text NOT NULL CHECK (slug ~ '^[a-z][a-z0-9-]{0,61}[a-z0-9]$'),
  kind text NOT NULL CHECK (kind IN ('App Home','App Page','Record List')),
  target_api text NOT NULL,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Disabled')),
  version integer NOT NULL DEFAULT 1 CHECK (version>=1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,app_api,slug)
);
-- END LEGACY 20261018-zzz-app-route-aliases.sql

-- BEGIN LEGACY 20261018-zzzz-notifications.sql
-- Durable tenant- and recipient-scoped shared notifications.
CREATE TABLE IF NOT EXISTS md_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 recipient_id uuid NOT NULL,
 title text NOT NULL,
 body text NOT NULL DEFAULT '',
 flow_api_name text NOT NULL DEFAULT '',
 sent_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 read_at timestamptz,
 FOREIGN KEY(tenant_id,recipient_id) REFERENCES md_users(tenant_id,id),
 FOREIGN KEY(tenant_id,sent_by) REFERENCES md_users(tenant_id,id),
 UNIQUE(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_notifications_inbox ON md_notifications(tenant_id,recipient_id,created_at DESC);
-- END LEGACY 20261018-zzzz-notifications.sql

-- BEGIN LEGACY 20261018-zzzz-object-page-layouts.sql
-- Tenant-scoped relational Page Layout metadata. No prior layouts or records are changed.
CREATE TABLE IF NOT EXISTS md_object_layout_versions (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,object_api),
  FOREIGN KEY (tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_object_page_layouts (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  layout_id text NOT NULL CHECK (length(layout_id) BETWEEN 1 AND 128),
  label text NOT NULL CHECK (length(label) BETWEEN 1 AND 200),
  sort_order integer NOT NULL,
  PRIMARY KEY (tenant_id,object_api,layout_id),
  FOREIGN KEY (tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_object_page_layout_sections (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  layout_id text NOT NULL,
  section_id text NOT NULL CHECK (length(section_id) BETWEEN 1 AND 128),
  label text NOT NULL CHECK (length(label) BETWEEN 1 AND 200),
  columns smallint NOT NULL CHECK (columns IN (1,2)),
  sort_order integer NOT NULL,
  PRIMARY KEY (tenant_id,object_api,layout_id,section_id),
  FOREIGN KEY (tenant_id,object_api,layout_id) REFERENCES md_object_page_layouts(tenant_id,object_api,layout_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_object_page_layout_fields (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  layout_id text NOT NULL,
  section_id text NOT NULL,
  field_api text NOT NULL,
  sort_order integer NOT NULL,
  PRIMARY KEY (tenant_id,object_api,layout_id,section_id,field_api),
  FOREIGN KEY (tenant_id,object_api,layout_id,section_id) REFERENCES md_object_page_layout_sections(tenant_id,object_api,layout_id,section_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id,object_api,field_api) REFERENCES md_field_definitions(tenant_id,object_api,api_name)
);
CREATE TABLE IF NOT EXISTS md_object_page_layout_actions (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  layout_id text NOT NULL,
  action_name text NOT NULL CHECK (length(action_name) BETWEEN 1 AND 128),
  sort_order integer NOT NULL,
  PRIMARY KEY (tenant_id,object_api,layout_id,action_name),
  FOREIGN KEY (tenant_id,object_api,layout_id) REFERENCES md_object_page_layouts(tenant_id,object_api,layout_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_object_page_layout_related_lists (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  layout_id text NOT NULL,
  list_name text NOT NULL CHECK (length(list_name) BETWEEN 1 AND 128),
  sort_order integer NOT NULL,
  PRIMARY KEY (tenant_id,object_api,layout_id,list_name),
  FOREIGN KEY (tenant_id,object_api,layout_id) REFERENCES md_object_page_layouts(tenant_id,object_api,layout_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_object_page_layout_links (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  layout_id text NOT NULL,
  link_id text NOT NULL CHECK (length(link_id) BETWEEN 1 AND 128),
  label text NOT NULL CHECK (length(label) BETWEEN 1 AND 200),
  url text NOT NULL CHECK (length(url) BETWEEN 1 AND 2048),
  open_in_new_window boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL,
  PRIMARY KEY (tenant_id,object_api,layout_id,link_id),
  FOREIGN KEY (tenant_id,object_api,layout_id) REFERENCES md_object_page_layouts(tenant_id,object_api,layout_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_object_page_layout_assignments (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  profile_id text NOT NULL CHECK (length(profile_id) BETWEEN 1 AND 128),
  record_type_id text NOT NULL CHECK (length(record_type_id) BETWEEN 1 AND 128),
  layout_id text NOT NULL,
  PRIMARY KEY (tenant_id,object_api,profile_id,record_type_id),
  FOREIGN KEY (tenant_id,object_api,layout_id) REFERENCES md_object_page_layouts(tenant_id,object_api,layout_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_object_page_layout_fields_lookup ON md_object_page_layout_fields(tenant_id,object_api,layout_id);


-- Idempotent backfill: add a default only where the object has no Page Layout.
-- Never overwrite or replace tenant-owned configurations.
INSERT INTO md_object_page_layouts(tenant_id,object_api,layout_id,label,sort_order)
SELECT o.tenant_id,o.api_name,'default',o.label||' Layout',0
FROM md_object_definitions o WHERE NOT EXISTS (
 SELECT 1 FROM md_object_page_layouts l
 WHERE l.tenant_id=o.tenant_id AND l.object_api=o.api_name
) ON CONFLICT DO NOTHING;
INSERT INTO md_object_page_layout_sections(tenant_id,object_api,layout_id,section_id,label,columns,sort_order)
SELECT l.tenant_id,l.object_api,l.layout_id,'details','Record Information',2,0
FROM md_object_page_layouts l
WHERE l.layout_id='default' AND NOT EXISTS (
 SELECT 1 FROM md_object_page_layout_sections s
 WHERE s.tenant_id=l.tenant_id AND s.object_api=l.object_api AND s.layout_id=l.layout_id
) ON CONFLICT DO NOTHING;
INSERT INTO md_object_page_layout_fields(tenant_id,object_api,layout_id,section_id,field_api,sort_order)
SELECT s.tenant_id,s.object_api,s.layout_id,s.section_id,f.api_name,
 row_number() OVER (PARTITION BY s.tenant_id,s.object_api,s.layout_id,s.section_id ORDER BY f.api_name)-1
FROM md_object_page_layout_sections s JOIN md_field_definitions f
 ON f.tenant_id=s.tenant_id AND f.object_api=s.object_api
WHERE s.layout_id='default' AND s.section_id='details'
AND NOT EXISTS (
 SELECT 1 FROM md_object_page_layout_fields pf
 WHERE pf.tenant_id=s.tenant_id AND pf.object_api=s.object_api AND pf.layout_id=s.layout_id
) ON CONFLICT DO NOTHING;
INSERT INTO md_object_page_layout_actions(tenant_id,object_api,layout_id,action_name,sort_order)
SELECT l.tenant_id,l.object_api,l.layout_id,a.action_name,a.sort_order
FROM md_object_page_layouts l
CROSS JOIN (VALUES ('New',0),('Edit',1),('Delete',2)) AS a(action_name,sort_order)
WHERE l.layout_id='default' AND NOT EXISTS (
 SELECT 1 FROM md_object_page_layout_actions x
 WHERE x.tenant_id=l.tenant_id AND x.object_api=l.object_api AND x.layout_id=l.layout_id
) ON CONFLICT DO NOTHING;

-- Normalized, tenant-scoped Lightning Page definition, component tree and activation.
-- Existing app seed pages are retained; no JSON/JSONB storage.
CREATE TABLE IF NOT EXISTS md_lightning_page_details (
 tenant_id uuid NOT NULL, page_id uuid NOT NULL,
 page_type text NOT NULL CHECK(page_type IN ('Record Page','App Page','Home Page')),
 target_object text NOT NULL DEFAULT '',
 layout_mode text NOT NULL CHECK(layout_mode IN ('template','free-canvas')),
 template text,
 canvas_width integer NOT NULL CHECK(canvas_width BETWEEN 320 AND 10000),
 canvas_height integer NOT NULL CHECK(canvas_height BETWEEN 320 AND 10000),
 status text NOT NULL CHECK(status IN ('Draft','Active')),
 devices text[] NOT NULL CHECK(cardinality(devices) BETWEEN 1 AND 2),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,page_id),
 FOREIGN KEY(tenant_id,page_id) REFERENCES md_page_definitions(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_lightning_page_nodes (
 tenant_id uuid NOT NULL, page_id uuid NOT NULL,
 component_key text NOT NULL CHECK(length(component_key) BETWEEN 1 AND 128),
 component_type text NOT NULL CHECK(length(component_type) BETWEEN 1 AND 128),
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 200),
 region text NOT NULL DEFAULT 'main',
 visible boolean NOT NULL DEFAULT true,
 sort_order integer NOT NULL,
 PRIMARY KEY(tenant_id,page_id,component_key),
 FOREIGN KEY(tenant_id,page_id) REFERENCES md_lightning_page_details(tenant_id,page_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_lightning_page_node_properties (
 tenant_id uuid NOT NULL, page_id uuid NOT NULL,
 component_key text NOT NULL,
 property_path text NOT NULL CHECK(length(property_path) BETWEEN 1 AND 1024),
 value_kind text NOT NULL CHECK(value_kind IN ('string','number','boolean','null','array','object')),
 value_text text,
 PRIMARY KEY(tenant_id,page_id,component_key,property_path),
 FOREIGN KEY(tenant_id,page_id,component_key)
   REFERENCES md_lightning_page_nodes(tenant_id,page_id,component_key) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_lightning_page_activation (
 tenant_id uuid NOT NULL, page_id uuid NOT NULL,
 assignment_id text NOT NULL CHECK(length(assignment_id) BETWEEN 1 AND 128),
 scope text NOT NULL CHECK(scope IN ('Org Default','App Default','App and Profile','App, Record Type, and Profile')),
 app_api text, profile_id text, record_type_id text,
 desktop boolean NOT NULL DEFAULT true,
 phone boolean NOT NULL DEFAULT false,
 sort_order integer NOT NULL,
 PRIMARY KEY(tenant_id,page_id,assignment_id),
 FOREIGN KEY(tenant_id,page_id) REFERENCES md_lightning_page_details(tenant_id,page_id) ON DELETE CASCADE,
 CHECK(desktop OR phone)
);
CREATE INDEX IF NOT EXISTS md_lightning_page_active_lookup
 ON md_lightning_page_details(tenant_id,target_object,page_type,status);


-- Explicit tenant profiles and grants. Permission evaluation continues to use the shared SQL RBAC engine.
CREATE TABLE IF NOT EXISTS md_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 api_name text NOT NULL,
 label text NOT NULL,
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,api_name)
);
CREATE TABLE IF NOT EXISTS md_user_profiles (
 tenant_id uuid NOT NULL,
 user_id uuid NOT NULL,
 profile_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,user_id),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,profile_id) REFERENCES md_profiles(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_profile_permission_sets (
 tenant_id uuid NOT NULL,
 profile_id uuid NOT NULL,
 permission_set_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,profile_id,permission_set_id),
 FOREIGN KEY(tenant_id,profile_id) REFERENCES md_profiles(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,permission_set_id) REFERENCES md_permission_sets(tenant_id,id) ON DELETE CASCADE
);
INSERT INTO md_profiles(tenant_id,api_name,label)
 SELECT id,'Default','Default Profile' FROM md_tenants
 ON CONFLICT(tenant_id,api_name) DO NOTHING;
INSERT INTO md_user_profiles(tenant_id,user_id,profile_id)
 SELECT u.tenant_id,u.id,p.id FROM md_users u
 JOIN md_profiles p ON p.tenant_id=u.tenant_id AND p.api_name='Default'
 ON CONFLICT(tenant_id,user_id) DO NOTHING;


-- Record types and allowed picklist values are object-scoped relational rows.
CREATE TABLE IF NOT EXISTS md_object_record_types (
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 record_type_id text NOT NULL CHECK(length(record_type_id) BETWEEN 1 AND 128),
 developer_name text NOT NULL,
 label text NOT NULL,
 description text NOT NULL DEFAULT '',
 active boolean NOT NULL DEFAULT true,
 is_default boolean NOT NULL DEFAULT false,
 sort_order integer NOT NULL DEFAULT 0,
 PRIMARY KEY(tenant_id,object_api,record_type_id),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_object_record_type_values (
 tenant_id uuid NOT NULL,object_api text NOT NULL,record_type_id text NOT NULL,
 field_api text NOT NULL,field_value text NOT NULL,sort_order integer NOT NULL,
 PRIMARY KEY(tenant_id,object_api,record_type_id,field_api,field_value),
 FOREIGN KEY(tenant_id,object_api,record_type_id)
  REFERENCES md_object_record_types(tenant_id,object_api,record_type_id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,object_api,field_api)
  REFERENCES md_field_definitions(tenant_id,object_api,api_name)
);
ALTER TABLE md_records ADD COLUMN IF NOT EXISTS record_type_id text;
INSERT INTO md_object_record_types(tenant_id,object_api,record_type_id,developer_name,label,active,is_default,sort_order)
 SELECT o.tenant_id,o.api_name,'master','Master','Master',true,true,0
 FROM md_object_definitions o WHERE NOT EXISTS(
  SELECT 1 FROM md_object_record_types r WHERE r.tenant_id=o.tenant_id AND r.object_api=o.api_name
 ) ON CONFLICT DO NOTHING;
-- END LEGACY 20261018-zzzz-object-page-layouts.sql

-- BEGIN LEGACY 20261018-zzzzz-approval-requests.sql
-- Tenant-safe durable approval requests. Decisions are atomic and auditable.
CREATE TABLE IF NOT EXISTS md_approval_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 group_id uuid NOT NULL DEFAULT gen_random_uuid(),
 object_api text NOT NULL,
 object_label text NOT NULL,
 record_id uuid NOT NULL,
 record_name text NOT NULL,
 flow_api_name text NOT NULL,
 submitted_by uuid NOT NULL,
 approver_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected','Canceled')),
 comments text NOT NULL DEFAULT '',
 decision_comments text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 decided_at timestamptz,
 decided_by uuid,
 UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,record_id,object_api) REFERENCES md_records(tenant_id,id,object_api),
 FOREIGN KEY(tenant_id,submitted_by) REFERENCES md_users(tenant_id,id),
 FOREIGN KEY(tenant_id,approver_id) REFERENCES md_users(tenant_id,id),
 FOREIGN KEY(tenant_id,decided_by) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_approval_requests_inbox ON md_approval_requests(tenant_id,approver_id,status,created_at DESC);
-- END LEGACY 20261018-zzzzz-approval-requests.sql

-- BEGIN LEGACY 20261018-zzzzzz-oneengine-identity.sql
-- Preserve existing tenant grants and assignments when adopting the OneEngine name.
-- Never create a second wildcard grant or change another tenant's permission set.
UPDATE md_permission_sets target
SET api_name='OneEngine'
WHERE target.api_name='TenantDeveloper'
  AND NOT EXISTS (
    SELECT 1 FROM md_permission_sets present
    WHERE present.tenant_id=target.tenant_id AND present.api_name='OneEngine'
  );
-- END LEGACY 20261018-zzzzzz-oneengine-identity.sql

-- BEGIN LEGACY 20261018-zzzzzz-record-ownership.sql
-- Universal record ownership is tenant-bound and independent of business Objects.
ALTER TABLE md_records ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE md_records ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='md_records_owner_tenant_fkey') THEN
  ALTER TABLE md_records ADD CONSTRAINT md_records_owner_tenant_fkey
   FOREIGN KEY(tenant_id,owner_id) REFERENCES md_users(tenant_id,id);
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS md_records_owner_lookup ON md_records(tenant_id,owner_id,object_api);
-- END LEGACY 20261018-zzzzzz-record-ownership.sql

-- BEGIN LEGACY 20261018-zzzzzzz-record-collaboration.sql
CREATE TABLE IF NOT EXISTS md_record_activities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 object_api text NOT NULL,record_id uuid NOT NULL,created_by uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('Task','Call','Event')),subject text NOT NULL,
 description text NOT NULL DEFAULT '',status text NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','Completed')),
 due_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,record_id,object_api) REFERENCES md_records(tenant_id,id,object_api),
 FOREIGN KEY(tenant_id,created_by) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_record_activities_record ON md_record_activities(tenant_id,object_api,record_id,created_at DESC);
CREATE TABLE IF NOT EXISTS md_record_chatter_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 object_api text NOT NULL,record_id uuid NOT NULL,created_by uuid NOT NULL,
 body text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,record_id,object_api) REFERENCES md_records(tenant_id,id,object_api),
 FOREIGN KEY(tenant_id,created_by) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_record_chatter_record ON md_record_chatter_posts(tenant_id,object_api,record_id,created_at DESC);
CREATE TABLE IF NOT EXISTS md_record_chatter_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 post_id uuid NOT NULL,created_by uuid NOT NULL,body text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,post_id) REFERENCES md_record_chatter_posts(tenant_id,id),
 FOREIGN KEY(tenant_id,created_by) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_record_chatter_comments_post ON md_record_chatter_comments(tenant_id,post_id,created_at);
-- END LEGACY 20261018-zzzzzzz-record-collaboration.sql

-- BEGIN LEGACY 20261018-zzzzzzzz-password-recovery-settings.sql
CREATE TABLE IF NOT EXISTS md_password_recovery_settings (
 tenant_id uuid PRIMARY KEY REFERENCES md_tenants(id),
 smtp_credential_id uuid,
 from_email text NOT NULL DEFAULT '',
 policy jsonb NOT NULL DEFAULT '{"method":"OTP","defaultChannel":"email","allowedChannels":["email"]}'::jsonb
   CHECK (jsonb_typeof(policy)='object'),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,smtp_credential_id) REFERENCES md_named_credentials(tenant_id,id)
);
-- END LEGACY 20261018-zzzzzzzz-password-recovery-settings.sql

-- BEGIN LEGACY 20261018-zzzzzzzzz-security-events.sql
ALTER TABLE md_users ADD COLUMN IF NOT EXISTS locked_until timestamptz;
CREATE TABLE IF NOT EXISTS md_security_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 actor_user_id uuid NOT NULL,
 action text NOT NULL,
 subject_user_id uuid,
 details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(details)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,actor_user_id) REFERENCES md_users(tenant_id,id),
 FOREIGN KEY(tenant_id,subject_user_id) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_security_events_tenant_created ON md_security_events(tenant_id,created_at DESC);
-- END LEGACY 20261018-zzzzzzzzz-security-events.sql

-- BEGIN LEGACY 20261018-zzzzzzzzzz-field-types.sql
-- Extended scalar field metadata stays fully relational and tenant-scoped.
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS picklist_restricted boolean NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS md_field_picklist_values (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  field_api text NOT NULL,
  value text NOT NULL CHECK(length(value) BETWEEN 1 AND 512),
  sort_order integer NOT NULL,
  PRIMARY KEY(tenant_id,object_api,field_api,value),
  FOREIGN KEY(tenant_id,object_api,field_api)
    REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_field_picklist_values_order
  ON md_field_picklist_values(tenant_id,object_api,field_api,sort_order);
-- END LEGACY 20261018-zzzzzzzzzz-field-types.sql

-- BEGIN LEGACY 20261018-zzzzzzzzzzz-builder-contracts.sql
-- Additive, tenant-scoped Builder metadata. No business records or existing app installations are removed.
-- General metadata values use relational path/value rows shared with the Component and Page engines.
CREATE TABLE IF NOT EXISTS md_flow_editor_values (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 flow_id uuid NOT NULL,
 property_path text NOT NULL CHECK(length(property_path) BETWEEN 1 AND 1024),
 value_kind text NOT NULL CHECK(value_kind IN ('string','number','boolean','null','array','object')),
 value_text text,
 PRIMARY KEY(tenant_id,flow_id,property_path),
 FOREIGN KEY(tenant_id,flow_id) REFERENCES md_flow_definitions(tenant_id,id) ON DELETE CASCADE
);
ALTER TABLE md_flow_definitions ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS md_flow_definitions_latest
 ON md_flow_definitions(tenant_id,api_name,version DESC) WHERE archived=false;

-- Tenant-owned custom application definitions have independent public API names.
-- md_apps remains the global licensed catalog with an internal unique identity.
ALTER TABLE md_apps ADD COLUMN IF NOT EXISTS tenant_owner_id uuid REFERENCES md_tenants(id);
CREATE TABLE IF NOT EXISTS md_tenant_app_metadata (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 app_id uuid NOT NULL REFERENCES md_apps(id),
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 200),
 description text NOT NULL DEFAULT '',
 brand_color text NOT NULL DEFAULT '#2563eb',
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 PRIMARY KEY(tenant_id,app_id),
 UNIQUE(tenant_id,api_name),
 FOREIGN KEY(app_id) REFERENCES md_apps(id)
);
CREATE TABLE IF NOT EXISTS md_tenant_app_navigation (
 tenant_id uuid NOT NULL,
 app_id uuid NOT NULL,
 entry_type text NOT NULL CHECK(entry_type IN ('Object','App Page')),
 api_name text NOT NULL,
 sort_order integer NOT NULL,
 PRIMARY KEY(tenant_id,app_id,entry_type,api_name),
 FOREIGN KEY(tenant_id,app_id) REFERENCES md_tenant_app_metadata(tenant_id,app_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_tenant_app_utilities (
 tenant_id uuid NOT NULL, app_id uuid NOT NULL,
 utility_name text NOT NULL CHECK(utility_name IN ('Notes','History')),
 sort_order integer NOT NULL,
 PRIMARY KEY(tenant_id,app_id,utility_name),
 FOREIGN KEY(tenant_id,app_id) REFERENCES md_tenant_app_metadata(tenant_id,app_id) ON DELETE CASCADE
);
-- END LEGACY 20261018-zzzzzzzzzzz-builder-contracts.sql

-- BEGIN LEGACY 20261018-zzzzzzzzzzzz-record-field-list-fixes.sql
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS is_unique boolean NOT NULL DEFAULT false;
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS external_id boolean NOT NULL DEFAULT false;
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS case_sensitive boolean NOT NULL DEFAULT false;
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS help_text text;
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS precision integer CHECK (precision BETWEEN 1 AND 38);
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS scale integer CHECK (scale BETWEEN 0 AND 38);
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS default_value text;
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS relationship_type text;
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS formula_expression text;
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS formula_return_type text;
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS auto_number_format text;

ALTER TABLE md_record_values ADD COLUMN IF NOT EXISTS is_unique boolean NOT NULL DEFAULT false;
ALTER TABLE md_record_values ADD COLUMN IF NOT EXISTS case_sensitive boolean NOT NULL DEFAULT false;
ALTER TABLE md_record_values ADD COLUMN IF NOT EXISTS geo_latitude double precision;
ALTER TABLE md_record_values ADD COLUMN IF NOT EXISTS geo_longitude double precision;

CREATE UNIQUE INDEX IF NOT EXISTS md_record_values_unique_ci
  ON md_record_values(tenant_id,object_api,field_api,lower(value_text))
  WHERE is_unique AND NOT case_sensitive AND value_text IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS md_record_values_unique_cs
  ON md_record_values(tenant_id,object_api,field_api,value_text)
  WHERE is_unique AND case_sensitive AND value_text IS NOT NULL;

CREATE TABLE IF NOT EXISTS md_auto_number_counters (
  tenant_id uuid NOT NULL REFERENCES md_tenants(id),
  object_api text NOT NULL,
  field_api text NOT NULL,
  next_value bigint NOT NULL DEFAULT 1 CHECK(next_value > 0),
  PRIMARY KEY(tenant_id,object_api,field_api),
  FOREIGN KEY(tenant_id,object_api,field_api)
    REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE
);
-- END LEGACY 20261018-zzzzzzzzzzzz-record-field-list-fixes.sql

-- BEGIN LEGACY 20261019-flow-interviews.sql
-- Durable tenant-isolated Screen Flow cursor and typed values. No JSON/JSONB.
CREATE TABLE IF NOT EXISTS md_flow_interview_state (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 run_id uuid NOT NULL,
 current_element integer NOT NULL,
 history_elements integer[] NOT NULL DEFAULT '{}',
 step_count integer NOT NULL DEFAULT 0 CHECK (step_count BETWEEN 0 AND 200),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,run_id),
 FOREIGN KEY(tenant_id,run_id) REFERENCES md_flow_runs(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_flow_interview_values (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 run_id uuid NOT NULL,
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 value_text text,
 data_type text NOT NULL CHECK(data_type IN ('string','number','boolean','null')),
 PRIMARY KEY(tenant_id,run_id,api_name),
 FOREIGN KEY(tenant_id,run_id) REFERENCES md_flow_interview_state(tenant_id,run_id) ON DELETE CASCADE
);
-- END LEGACY 20261019-flow-interviews.sql

-- BEGIN LEGACY 20261019-formula-clone-context.sql
ALTER TABLE md_records ADD COLUMN IF NOT EXISTS is_clone boolean NOT NULL DEFAULT false;
-- END LEGACY 20261019-formula-clone-context.sql

-- BEGIN LEGACY 20261019-global-value-sets.sql
CREATE TABLE IF NOT EXISTS md_global_value_sets (
  tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]{0,79}$'),
  label text NOT NULL CHECK(length(btrim(label)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK(length(description) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,id),
  UNIQUE(tenant_id,api_name)
);

CREATE TABLE IF NOT EXISTS md_global_value_set_values (
  tenant_id uuid NOT NULL,
  value_set_id uuid NOT NULL,
  value text NOT NULL CHECK(length(btrim(value)) BETWEEN 1 AND 512),
  label text NOT NULL CHECK(length(btrim(label)) BETWEEN 1 AND 120),
  sort_order integer NOT NULL CHECK(sort_order >= 0),
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY(tenant_id,value_set_id,value),
  FOREIGN KEY(tenant_id,value_set_id)
    REFERENCES md_global_value_sets(tenant_id,id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS md_global_value_set_values_unique_ci
  ON md_global_value_set_values(tenant_id,value_set_id,lower(value));
CREATE INDEX IF NOT EXISTS md_global_value_set_values_order
  ON md_global_value_set_values(tenant_id,value_set_id,sort_order,value);

CREATE TABLE IF NOT EXISTS md_global_value_set_audit (
  tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  value_set_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK(action IN ('create','update','delete')),
  api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]{0,79}$'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,id),
  FOREIGN KEY(tenant_id,actor_id) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_global_value_set_audit_lookup
  ON md_global_value_set_audit(tenant_id,value_set_id,occurred_at DESC);
-- END LEGACY 20261019-global-value-sets.sql

-- BEGIN LEGACY 20261019-prepare-field-recycle-column.sql
-- Upgrade compatibility: rollup-summaries creates a partial index referencing
-- deleted_at before the later field-recycle-bin migration on existing SQL tenants.
-- This additive precondition is idempotent and never modifies field records.
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
-- END LEGACY 20261019-prepare-field-recycle-column.sql

-- BEGIN LEGACY 20261019-record-type-integrity.sql
-- Enforce tenant/object-scoped Record Type references for new writes.
-- NOT VALID preserves existing business rows until a separately audited validation.
-- PostgreSQL still enforces this foreign key for new inserts and changed references.
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint
   WHERE conname='md_records_record_type_tenant_object_fk'
     AND conrelid='md_records'::regclass
 ) THEN
   ALTER TABLE md_records
     ADD CONSTRAINT md_records_record_type_tenant_object_fk
     FOREIGN KEY (tenant_id,object_api,record_type_id)
     REFERENCES md_object_record_types(tenant_id,object_api,record_type_id)
     NOT VALID;
 END IF;
END $$;
-- END LEGACY 20261019-record-type-integrity.sql

-- BEGIN LEGACY 20261019-rich-text-inline-images.sql
CREATE TABLE IF NOT EXISTS md_record_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
  object_api text NOT NULL,
  record_id uuid NOT NULL,
  field_api text NOT NULL,
  name text NOT NULL CHECK(length(name) BETWEEN 1 AND 255),
  content_type text NOT NULL CHECK(content_type IN ('image/jpeg','image/png','image/gif','image/webp')),
  byte_size integer NOT NULL CHECK(byte_size BETWEEN 1 AND 1048576),
  checksum text NOT NULL CHECK(checksum ~ '^[0-9a-f]{64}$'),
  content bytea NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(octet_length(content)=byte_size),
  FOREIGN KEY(tenant_id,record_id,object_api)
    REFERENCES md_records(tenant_id,id,object_api) ON DELETE CASCADE,
  FOREIGN KEY(tenant_id,object_api,field_api)
    REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE,
  FOREIGN KEY(tenant_id,created_by) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_record_files_record_field
  ON md_record_files(tenant_id,object_api,record_id,field_api,created_at);
-- END LEGACY 20261019-rich-text-inline-images.sql

-- BEGIN LEGACY 20261019-rollup-summaries.sql
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS rollup_child_object text;
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS rollup_relationship_field text;
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS rollup_operation text;
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS rollup_source_field text;
ALTER TABLE md_field_definitions ADD CONSTRAINT md_field_rollup_operation_check
  CHECK (rollup_operation IS NULL OR rollup_operation IN ('COUNT','SUM','MIN','MAX'));
CREATE INDEX IF NOT EXISTS md_field_rollup_child
  ON md_field_definitions(tenant_id,rollup_child_object)
  WHERE data_type='rollup' AND deleted_at IS NULL;
-- END LEGACY 20261019-rollup-summaries.sql

-- BEGIN LEGACY 20261020-app-package-lifecycle.sql
-- Central versioned application manifests; no app code is copied into tenant runtime.
-- Tenants receive only installation receipts and metadata needed by the selected app.
CREATE TABLE IF NOT EXISTS md_app_package_versions (
  app_id uuid NOT NULL REFERENCES md_apps(id),
  version integer NOT NULL CHECK(version > 0),
  published boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT '',
  brand_color text NOT NULL DEFAULT '#2563eb' CHECK(brand_color ~ '^#[0-9a-fA-F]{6}$'),
  PRIMARY KEY(app_id,version)
);
CREATE TABLE IF NOT EXISTS md_app_package_dependencies (
  app_id uuid NOT NULL,
  version integer NOT NULL,
  required_app_id uuid NOT NULL REFERENCES md_apps(id),
  minimum_version integer NOT NULL DEFAULT 1 CHECK(minimum_version > 0),
  PRIMARY KEY(app_id,version,required_app_id),
  FOREIGN KEY(app_id,version) REFERENCES md_app_package_versions(app_id,version) ON DELETE CASCADE,
  CHECK(app_id <> required_app_id)
);
CREATE TABLE IF NOT EXISTS md_app_package_resources (
  app_id uuid NOT NULL,
  version integer NOT NULL,
  resource_type text NOT NULL CHECK(resource_type IN ('Object','Field','Component','App Page','Flow')),
  api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
  parent_api text NOT NULL DEFAULT '' CHECK(parent_api = '' OR parent_api ~ '^[A-Za-z][A-Za-z0-9_]*$'),
  PRIMARY KEY(app_id,version,resource_type,api_name,parent_api),
  FOREIGN KEY(app_id,version) REFERENCES md_app_package_versions(app_id,version) ON DELETE CASCADE,
  CHECK((resource_type='Field' AND parent_api <> '') OR (resource_type<>'Field' AND parent_api=''))
);
CREATE TABLE IF NOT EXISTS md_app_package_navigation (
  app_id uuid NOT NULL,
  version integer NOT NULL,
  entry_type text NOT NULL CHECK(entry_type IN ('Object','App Page')),
  api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY(app_id,version,entry_type,api_name),
  FOREIGN KEY(app_id,version) REFERENCES md_app_package_versions(app_id,version) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_tenant_app_installed_versions (
  tenant_id uuid NOT NULL,
  app_id uuid NOT NULL,
  version integer NOT NULL,
  installed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,app_id),
  FOREIGN KEY(tenant_id,app_id) REFERENCES md_app_installations(tenant_id,app_id) ON DELETE CASCADE,
  FOREIGN KEY(app_id,version) REFERENCES md_app_package_versions(app_id,version)
);
CREATE INDEX IF NOT EXISTS md_app_package_published_lookup
  ON md_app_package_versions(app_id,version DESC) WHERE published=true;
CREATE INDEX IF NOT EXISTS md_app_package_reverse_deps
  ON md_app_package_dependencies(required_app_id,app_id,version);
-- END LEGACY 20261020-app-package-lifecycle.sql

-- BEGIN LEGACY 20261020-b-app-package-templates.sql
-- Immutable-by-convention published package templates. Publisher workflows must create
-- a new version rather than mutate published versions.
CREATE TABLE IF NOT EXISTS md_app_package_object_templates (
 app_id uuid NOT NULL,version integer NOT NULL,
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 label text NOT NULL CHECK(length(label)>0),
 PRIMARY KEY(app_id,version,api_name),
 FOREIGN KEY(app_id,version) REFERENCES md_app_package_versions(app_id,version) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_app_package_field_templates (
 app_id uuid NOT NULL,version integer NOT NULL,
 object_api text NOT NULL CHECK(object_api ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 label text NOT NULL,data_type text NOT NULL,
 related_object text,max_length integer CHECK(max_length BETWEEN 1 AND 1000000),
 required boolean NOT NULL DEFAULT false,
 PRIMARY KEY(app_id,version,object_api,api_name),
 FOREIGN KEY(app_id,version) REFERENCES md_app_package_versions(app_id,version) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_app_package_component_templates (
 app_id uuid NOT NULL,version integer NOT NULL,
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 renderer_key text NOT NULL,
 PRIMARY KEY(app_id,version,api_name),
 FOREIGN KEY(app_id,version) REFERENCES md_app_package_versions(app_id,version) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_app_package_page_templates (
 app_id uuid NOT NULL,version integer NOT NULL,
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 title text NOT NULL CHECK(length(title)>0),
 PRIMARY KEY(app_id,version,api_name),
 FOREIGN KEY(app_id,version) REFERENCES md_app_package_versions(app_id,version) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_app_package_page_component_templates (
 app_id uuid NOT NULL,version integer NOT NULL,
 page_api text NOT NULL,component_api text NOT NULL,
 slot text NOT NULL,sort_order integer NOT NULL DEFAULT 0,
 PRIMARY KEY(app_id,version,page_api,component_api,slot,sort_order),
 FOREIGN KEY(app_id,version) REFERENCES md_app_package_versions(app_id,version) ON DELETE CASCADE
);
-- Receipts persist after uninstall: existing tenant customisations are never overwritten.
CREATE TABLE IF NOT EXISTS md_app_package_seed_receipts (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 app_id uuid NOT NULL REFERENCES md_apps(id),
 resource_type text NOT NULL CHECK(resource_type IN ('Object','Field','Component','App Page','Page Component')),
 parent_api text NOT NULL DEFAULT '',api_name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,app_id,resource_type,parent_api,api_name)
);
-- END LEGACY 20261020-b-app-package-templates.sql

-- BEGIN LEGACY 20261020-c-app-package-page-properties.sql
-- Typed Page Component properties are stored centrally and materialised only for
-- installed packages. Reference names resolve to tenant-local SQL metadata IDs.
CREATE TABLE IF NOT EXISTS md_app_package_page_property_templates (
 app_id uuid NOT NULL,version integer NOT NULL,
 page_api text NOT NULL,component_api text NOT NULL,
 slot text NOT NULL,sort_order integer NOT NULL DEFAULT 0,
 property_path text NOT NULL CHECK(length(property_path) BETWEEN 1 AND 1024),
 data_type text NOT NULL CHECK(data_type IN ('string','number','boolean','null','array','object','reference')),
 value_text text,
 reference_kind text CHECK(reference_kind IN ('Object','Field','Flow')),
 reference_api text,
 reference_parent_api text,
 PRIMARY KEY(app_id,version,page_api,component_api,slot,sort_order,property_path),
 FOREIGN KEY(app_id,version) REFERENCES md_app_package_versions(app_id,version) ON DELETE CASCADE,
 CHECK(
   (data_type='reference' AND reference_kind IS NOT NULL AND reference_api IS NOT NULL
    AND value_text IS NULL)
   OR (data_type<>'reference' AND reference_kind IS NULL AND reference_api IS NULL
       AND reference_parent_api IS NULL)
 )
);
-- END LEGACY 20261020-c-app-package-page-properties.sql

-- BEGIN LEGACY 20261020-declarative-rules.sql
-- Tenant-scoped declarative validation and formula default definitions.
CREATE TABLE IF NOT EXISTS md_validation_rules (
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]{0,79}$'),
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 160),
 expression text NOT NULL CHECK(length(expression) BETWEEN 1 AND 4000),
 error_message text NOT NULL CHECK(length(error_message) BETWEEN 1 AND 1000),
 error_field_api text,
 active boolean NOT NULL DEFAULT false,
 sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,object_api,api_name),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,object_api,error_field_api) REFERENCES md_field_definitions(tenant_id,object_api,api_name)
);
CREATE INDEX IF NOT EXISTS md_validation_rules_active
 ON md_validation_rules(tenant_id,object_api,sort_order,api_name) WHERE active=true;
CREATE TABLE IF NOT EXISTS md_field_default_formulas (
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 field_api text NOT NULL,
 expression text NOT NULL CHECK(length(expression) BETWEEN 1 AND 4000),
 PRIMARY KEY(tenant_id,object_api,field_api),
 FOREIGN KEY(tenant_id,object_api,field_api) REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE
);
-- END LEGACY 20261020-declarative-rules.sql

-- BEGIN LEGACY 20261020-named-credential-key-version.sql
-- Track encryption-key identity separately from ciphertext.
-- Existing ciphertext retains the legacy key identity until explicitly re-encrypted.
ALTER TABLE md_named_credentials
  ADD COLUMN IF NOT EXISTS encryption_key_id text NOT NULL DEFAULT 'legacy';
-- END LEGACY 20261020-named-credential-key-version.sql

-- BEGIN LEGACY 20261020-p1-matching-rules.sql
-- Matching is deterministic exact comparison, scoped to a tenant and object.
CREATE TABLE IF NOT EXISTS md_matching_rules (
 tenant_id uuid NOT NULL, object_api text NOT NULL,
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]{0,79}$'),
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 160),
 active boolean NOT NULL DEFAULT false,
 match_mode text NOT NULL DEFAULT 'All' CHECK(match_mode IN ('All','Any')),
 action text NOT NULL DEFAULT 'Alert' CHECK(action IN ('Alert','Block')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,object_api,api_name),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_matching_rule_fields (
 tenant_id uuid NOT NULL, object_api text NOT NULL, rule_api text NOT NULL,
 field_api text NOT NULL, case_sensitive boolean NOT NULL DEFAULT false,
 PRIMARY KEY(tenant_id,object_api,rule_api,field_api),
 FOREIGN KEY(tenant_id,object_api,rule_api) REFERENCES md_matching_rules(tenant_id,object_api,api_name) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,object_api,field_api) REFERENCES md_field_definitions(tenant_id,object_api,api_name)
);
CREATE TABLE IF NOT EXISTS md_duplicate_record_sets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,object_api text NOT NULL,rule_api text NOT NULL,
 record_id uuid NOT NULL, matched_record_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,object_api,rule_api,record_id,matched_record_id),
 FOREIGN KEY(tenant_id,object_api,rule_api) REFERENCES md_matching_rules(tenant_id,object_api,api_name) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,record_id,object_api) REFERENCES md_records(tenant_id,id,object_api) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,matched_record_id,object_api) REFERENCES md_records(tenant_id,id,object_api) ON DELETE CASCADE,
 CHECK(record_id<>matched_record_id)
);
CREATE INDEX IF NOT EXISTS md_duplicate_record_sets_lookup ON md_duplicate_record_sets(tenant_id,object_api,record_id,created_at DESC);
-- END LEGACY 20261020-p1-matching-rules.sql

-- BEGIN LEGACY 20261020-rbac-administration.sql
-- Additive relational RBAC administration. Existing grants, links and records are retained.
ALTER TABLE md_permission_sets ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE md_permission_sets ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE md_permission_sets ADD COLUMN IF NOT EXISTS license text NOT NULL DEFAULT '';
ALTER TABLE md_permission_sets ADD COLUMN IF NOT EXISTS navigation_default_access text NOT NULL DEFAULT 'Deny'
 CHECK(navigation_default_access IN ('Allow','Deny'));
ALTER TABLE md_profiles ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE md_profiles ADD COLUMN IF NOT EXISTS license text NOT NULL DEFAULT 'MetaDrive';
ALTER TABLE md_profiles ADD COLUMN IF NOT EXISTS is_standard boolean NOT NULL DEFAULT false;
-- A profile's editable rules live in an ordinary permission set, using the existing evaluator.
ALTER TABLE md_profiles ADD COLUMN IF NOT EXISTS editor_set_id uuid;
ALTER TABLE md_profiles DROP CONSTRAINT IF EXISTS md_profiles_editor_set_fk;
ALTER TABLE md_profiles ADD CONSTRAINT md_profiles_editor_set_fk
 FOREIGN KEY(tenant_id,editor_set_id) REFERENCES md_permission_sets(tenant_id,id);
CREATE TABLE IF NOT EXISTS md_rbac_revisions (
 tenant_id uuid PRIMARY KEY REFERENCES md_tenants(id), revision integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS md_permission_set_groups (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),id uuid NOT NULL DEFAULT gen_random_uuid(),
 api_name text NOT NULL,label text NOT NULL,description text NOT NULL DEFAULT '',calculated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,id),UNIQUE(tenant_id,api_name)
);
CREATE TABLE IF NOT EXISTS md_permission_group_sets (
 tenant_id uuid NOT NULL,group_id uuid NOT NULL,permission_set_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,group_id,permission_set_id),
 FOREIGN KEY(tenant_id,group_id) REFERENCES md_permission_set_groups(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,permission_set_id) REFERENCES md_permission_sets(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_permission_group_mutes (
 tenant_id uuid NOT NULL,group_id uuid NOT NULL,resource text NOT NULL,action text NOT NULL,
 PRIMARY KEY(tenant_id,group_id,resource,action),
 FOREIGN KEY(tenant_id,group_id) REFERENCES md_permission_set_groups(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_user_permission_groups (
 tenant_id uuid NOT NULL,user_id uuid NOT NULL,group_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,user_id,group_id),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,group_id) REFERENCES md_permission_set_groups(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_access_groups (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),id uuid NOT NULL DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK(kind IN ('PublicGroup','Queue')),api_name text NOT NULL,label text NOT NULL,
 description text NOT NULL DEFAULT '',PRIMARY KEY(tenant_id,id),UNIQUE(tenant_id,kind,api_name)
);
CREATE TABLE IF NOT EXISTS md_access_group_members (
 tenant_id uuid NOT NULL,group_id uuid NOT NULL,member_kind text NOT NULL
 CHECK(member_kind IN ('User','Role','RoleAndSubordinates','PublicGroup')),member_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,group_id,member_kind,member_id),
 FOREIGN KEY(tenant_id,group_id) REFERENCES md_access_groups(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_queue_objects (
 tenant_id uuid NOT NULL,queue_id uuid NOT NULL,object_api text NOT NULL,
 PRIMARY KEY(tenant_id,queue_id,object_api),
 FOREIGN KEY(tenant_id,queue_id) REFERENCES md_access_groups(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name)
);
CREATE TABLE IF NOT EXISTS md_sharing_settings (
 tenant_id uuid NOT NULL,object_api text NOT NULL,default_access text NOT NULL DEFAULT 'Private'
 CHECK(default_access IN ('Private','Public Read Only','Public Read/Write')),
 use_hierarchy boolean NOT NULL DEFAULT true,portal_enabled boolean NOT NULL DEFAULT false,portal_account_field text,
 PRIMARY KEY(tenant_id,object_api),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name)
);
CREATE TABLE IF NOT EXISTS md_record_policies (
 tenant_id uuid NOT NULL,id text NOT NULL,kind text NOT NULL CHECK(kind IN ('share','restriction')),
 object_api text NOT NULL,api_name text,label text,enabled boolean NOT NULL,
 rule_type text,condition_logic text NOT NULL CHECK(condition_logic IN ('all','any')),
 target_type text,target_id uuid,access_level text,subject_type text,subject_id uuid,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name)
);
CREATE TABLE IF NOT EXISTS md_policy_owner_roles (
 tenant_id uuid NOT NULL,policy_id text NOT NULL,role_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,policy_id,role_id),
 FOREIGN KEY(tenant_id,policy_id) REFERENCES md_record_policies(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,role_id) REFERENCES md_roles(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_policy_conditions (
 tenant_id uuid NOT NULL,policy_id text NOT NULL,position integer NOT NULL,field_api text NOT NULL,
 operator text NOT NULL,value_type text NOT NULL DEFAULT 'undefined',
 PRIMARY KEY(tenant_id,policy_id,position),
 FOREIGN KEY(tenant_id,policy_id) REFERENCES md_record_policies(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_policy_condition_values (
 tenant_id uuid NOT NULL,policy_id text NOT NULL,condition_position integer NOT NULL,position integer NOT NULL,
 value_text text,PRIMARY KEY(tenant_id,policy_id,condition_position,position),
 FOREIGN KEY(tenant_id,policy_id,condition_position) REFERENCES md_policy_conditions(tenant_id,policy_id,position) ON DELETE CASCADE
);
ALTER TABLE md_users ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'UTC';
ALTER TABLE md_users ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en-GB';
ALTER TABLE md_users ADD COLUMN IF NOT EXISTS currency_iso_code text;
ALTER TABLE md_users ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'internal' CHECK(user_type IN ('internal','external'));
ALTER TABLE md_users ADD COLUMN IF NOT EXISTS external_account_id uuid;
ALTER TABLE md_records ADD COLUMN IF NOT EXISTS owner_queue_id uuid;
ALTER TABLE md_records DROP CONSTRAINT IF EXISTS md_records_owner_queue_fk;
ALTER TABLE md_records ADD CONSTRAINT md_records_owner_queue_fk
 FOREIGN KEY(tenant_id,owner_queue_id) REFERENCES md_access_groups(tenant_id,id);
CREATE INDEX IF NOT EXISTS md_records_owner_lookup ON md_records(tenant_id,object_api,owner_id);
CREATE INDEX IF NOT EXISTS md_record_policies_lookup ON md_record_policies(tenant_id,object_api,kind) WHERE enabled;
CREATE INDEX IF NOT EXISTS md_access_members_lookup ON md_access_group_members(tenant_id,member_id);

-- One canonical decision function is shared by HTTP checks and SQL record filtering.
-- Group mutes suppress only group-contributed allows; an explicit deny always wins.
CREATE OR REPLACE FUNCTION md_rbac_decision(t uuid,u uuid,res text,act text)
RETURNS TABLE(allow_granted boolean,deny_granted boolean) LANGUAGE sql STABLE AS $$
 WITH assigned AS (
  SELECT permission_set_id,NULL::uuid AS group_id FROM md_permission_assignments WHERE tenant_id=t AND user_id=u
  UNION SELECT rp.permission_set_id,NULL::uuid FROM md_user_roles ur
   JOIN md_role_permission_sets rp ON rp.tenant_id=ur.tenant_id AND rp.role_id=ur.role_id
   WHERE ur.tenant_id=t AND ur.user_id=u
  UNION SELECT pp.permission_set_id,NULL::uuid FROM md_user_profiles up
   JOIN md_profile_permission_sets pp ON pp.tenant_id=up.tenant_id AND pp.profile_id=up.profile_id
   WHERE up.tenant_id=t AND up.user_id=u
  UNION SELECT gs.permission_set_id,ug.group_id FROM md_user_permission_groups ug
   JOIN md_permission_group_sets gs ON gs.tenant_id=ug.tenant_id AND gs.group_id=ug.group_id
   WHERE ug.tenant_id=t AND ug.user_id=u
 ), matched AS (
  SELECT r.effect,a.group_id FROM assigned a JOIN md_permission_rules r
   ON r.tenant_id=t AND r.permission_set_id=a.permission_set_id
   WHERE r.resource IN(res,'*',CASE WHEN res LIKE 'Flow:%' THEN 'Flow' ELSE res END)
   AND r.action IN(act,'*')
  UNION ALL
  SELECT 'allow',a.group_id FROM assigned a JOIN md_permission_sets p ON p.tenant_id=t AND p.id=a.permission_set_id
   WHERE act='read' AND (res LIKE 'App:%' OR res LIKE 'Tab:%') AND p.navigation_default_access='Allow'
 )
 SELECT COALESCE(bool_or(m.effect='allow' AND (m.group_id IS NULL OR NOT EXISTS(
  SELECT 1 FROM md_permission_group_mutes gm WHERE gm.tenant_id=t AND gm.group_id=m.group_id
   AND gm.resource IN(res,'*',CASE WHEN res LIKE 'Flow:%' THEN 'Flow' ELSE res END) AND gm.action IN(act,'*')
 ))),false) AND EXISTS(SELECT 1 FROM md_users WHERE tenant_id=t AND id=u AND enabled AND (user_type='internal' OR (act='read' AND (EXISTS(SELECT 1 FROM md_object_definitions o WHERE o.tenant_id=t AND o.api_name=res) OR EXISTS(SELECT 1 FROM md_field_definitions f WHERE f.tenant_id=t AND f.object_api||'.'||f.api_name=res) OR res LIKE 'RecordType:%')))),
 COALESCE(bool_or(m.effect='deny'),false)
 FROM matched m
$$;
CREATE OR REPLACE FUNCTION md_rbac_allowed(t uuid,u uuid,res text,act text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT allow_granted AND NOT deny_granted FROM md_rbac_decision(t,u,res,act)
$$;

-- The actor's roles and ancestor roles. UNION terminates even with legacy cycles.
CREATE OR REPLACE FUNCTION md_user_role_tree(t uuid,u uuid)
RETURNS TABLE(role_id uuid) LANGUAGE sql STABLE AS $$
 WITH RECURSIVE ancestors(id) AS (
  SELECT ur.role_id FROM md_user_roles ur WHERE ur.tenant_id=t AND ur.user_id=u
  UNION SELECT r.parent_role_id FROM ancestors a JOIN md_roles r ON r.tenant_id=t AND r.id=a.id WHERE r.parent_role_id IS NOT NULL
 ) SELECT id FROM ancestors
$$;
CREATE OR REPLACE FUNCTION md_access_member(t uuid,u uuid,g uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH RECURSIVE groups(id) AS (
  SELECT id FROM md_access_groups WHERE tenant_id=t AND id=g
  UNION SELECT m.member_id FROM groups x JOIN md_access_group_members m
   ON m.tenant_id=t AND m.group_id=x.id AND m.member_kind='PublicGroup'
   JOIN md_access_groups nested ON nested.tenant_id=t AND nested.id=m.member_id AND nested.kind='PublicGroup'
 )
 SELECT EXISTS(SELECT 1 FROM groups x JOIN md_access_group_members m ON m.tenant_id=t AND m.group_id=x.id
  WHERE (m.member_kind='User' AND m.member_id=u)
   OR (m.member_kind='Role' AND EXISTS(SELECT 1 FROM md_user_roles ur WHERE ur.tenant_id=t AND ur.user_id=u AND ur.role_id=m.member_id))
   OR (m.member_kind='RoleAndSubordinates' AND m.member_id IN(SELECT role_id FROM md_user_role_tree(t,u))))
$$;
CREATE OR REPLACE FUNCTION md_record_field(t uuid,r uuid,f text)
RETURNS text LANGUAGE sql STABLE AS $$
 SELECT CASE f WHEN 'Id' THEN rec.id::text WHEN 'OwnerId' THEN COALESCE(rec.owner_id,rec.owner_queue_id)::text
  WHEN 'RecordTypeId' THEN rec.record_type_id
  ELSE (SELECT COALESCE(v.reference_record_id::text,v.value_text) FROM md_record_values v
    WHERE v.tenant_id=t AND v.record_id=r AND v.field_api=f) END
 FROM md_records rec WHERE rec.tenant_id=t AND rec.id=r
$$;
CREATE OR REPLACE FUNCTION md_policy_matches(t uuid,p text,r uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH comparisons AS (
 SELECT CASE c.operator
  WHEN 'eq' THEN actual.value IS NOT DISTINCT FROM expected.value_text
  WHEN 'Equals' THEN actual.value IS NOT DISTINCT FROM expected.value_text
  WHEN 'ne' THEN actual.value IS DISTINCT FROM expected.value_text
  WHEN 'Not Equals' THEN actual.value IS DISTINCT FROM expected.value_text
  WHEN 'Contains' THEN position(expected.value_text IN actual.value)>0
  WHEN 'Starts With' THEN starts_with(actual.value,expected.value_text)
  WHEN 'Greater Than' THEN CASE WHEN actual.value ~ '^-?[0-9]+(\.[0-9]+)?$' AND expected.value_text ~ '^-?[0-9]+(\.[0-9]+)?$'
    THEN actual.value::numeric > expected.value_text::numeric ELSE false END
  WHEN 'Less Than' THEN CASE WHEN actual.value ~ '^-?[0-9]+(\.[0-9]+)?$' AND expected.value_text ~ '^-?[0-9]+(\.[0-9]+)?$'
    THEN actual.value::numeric < expected.value_text::numeric ELSE false END
  WHEN 'isNull' THEN actual.value IS NULL WHEN 'Is Null' THEN actual.value IS NULL
  WHEN 'notNull' THEN actual.value IS NOT NULL
  WHEN 'in' THEN EXISTS(SELECT 1 FROM md_policy_condition_values v WHERE v.tenant_id=t AND v.policy_id=p
     AND v.condition_position=c.position AND v.value_text IS NOT DISTINCT FROM actual.value)
  WHEN 'notIn' THEN NOT EXISTS(SELECT 1 FROM md_policy_condition_values v WHERE v.tenant_id=t AND v.policy_id=p
     AND v.condition_position=c.position AND v.value_text IS NOT DISTINCT FROM actual.value)
  ELSE false END AS ok
 FROM md_policy_conditions c
 CROSS JOIN LATERAL(SELECT md_record_field(t,r,c.field_api) AS value) actual
 LEFT JOIN md_policy_condition_values expected ON expected.tenant_id=t AND expected.policy_id=p
   AND expected.condition_position=c.position AND expected.position=0
 WHERE c.tenant_id=t AND c.policy_id=p
 )
 SELECT COALESCE(CASE WHEN policy.condition_logic='all' THEN (SELECT bool_and(COALESCE(ok,false)) FROM comparisons)
  ELSE (SELECT bool_or(COALESCE(ok,false)) FROM comparisons) END,false)
 FROM md_record_policies policy WHERE policy.tenant_id=t AND policy.id=p
$$;
CREATE OR REPLACE FUNCTION md_record_access(t uuid,u uuid,rid uuid,act text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT COALESCE((
 SELECT
 -- Object/record denies and restrictions also narrow ownership and broad grants.
 NOT (SELECT deny_granted FROM md_rbac_decision(t,u,'Record:'||rec.id::text,act))
 AND md_rbac_allowed(t,u,rec.object_api,act)
 AND (rec.record_type_id IS NULL OR md_rbac_allowed(t,u,'RecordType:'||rec.object_api||'.'||rec.record_type_id,'read'))
 AND NOT EXISTS(SELECT 1 FROM md_record_policies rp WHERE rp.tenant_id=t AND rp.object_api=rec.object_api
  AND rp.kind='restriction' AND rp.enabled
  AND (rp.subject_type='all' OR (rp.subject_type='external' AND usr.user_type='external')
   OR (rp.subject_type='user' AND rp.subject_id=u) OR (rp.subject_type='role' AND EXISTS(
    SELECT 1 FROM md_user_roles ur WHERE ur.tenant_id=t AND ur.user_id=u AND ur.role_id=rp.subject_id)))
  AND NOT md_policy_matches(t,rp.id,rec.id))
 AND (CASE WHEN usr.user_type='external' THEN act='read' AND COALESCE(setting.portal_enabled,false)
   AND usr.external_account_id IS NOT NULL
   AND md_record_field(t,rec.id,setting.portal_account_field)=usr.external_account_id::text
 ELSE
 rec.owner_id=u OR (rec.owner_queue_id IS NOT NULL AND md_access_member(t,u,rec.owner_queue_id))
 OR md_rbac_allowed(t,u,'Record:'||rec.id::text,act)
 OR md_rbac_allowed(t,u,rec.object_api,'modifyAll')
 OR (act='read' AND (md_rbac_allowed(t,u,rec.object_api,'viewAll') OR md_rbac_allowed(t,u,'Record','viewAll')))
 OR (act='read' AND setting.default_access IN ('Public Read Only','Public Read/Write'))
 OR (act='edit' AND setting.default_access='Public Read/Write')
 OR (COALESCE(setting.use_hierarchy,true) AND EXISTS(
   SELECT 1 FROM md_user_role_tree(t,rec.owner_id) ancestor
   JOIN md_user_roles ur ON ur.tenant_id=t AND ur.user_id=u AND ur.role_id=ancestor.role_id
   WHERE NOT EXISTS(SELECT 1 FROM md_user_roles own WHERE own.tenant_id=t AND own.user_id=rec.owner_id AND own.role_id=ancestor.role_id)))
 OR (act IN ('read','edit') AND EXISTS(SELECT 1 FROM md_record_policies rp
  WHERE rp.tenant_id=t AND rp.object_api=rec.object_api AND rp.kind='share' AND rp.enabled
   AND (act='read' OR rp.access_level='Edit')
   AND (CASE rp.target_type WHEN 'User' THEN rp.target_id=u
    WHEN 'PublicGroup' THEN md_access_member(t,u,rp.target_id)
    WHEN 'Role' THEN EXISTS(SELECT 1 FROM md_user_roles ur WHERE ur.tenant_id=t AND ur.user_id=u AND ur.role_id=rp.target_id)
    WHEN 'RoleAndSubordinates' THEN rp.target_id IN(SELECT role_id FROM md_user_role_tree(t,u)) ELSE false END)
   AND (CASE rp.rule_type WHEN 'OwnerBased' THEN EXISTS(
    SELECT 1 FROM md_policy_owner_roles por JOIN md_user_roles own
     ON own.tenant_id=por.tenant_id AND own.role_id=por.role_id AND own.user_id=rec.owner_id
     WHERE por.tenant_id=t AND por.policy_id=rp.id)
    WHEN 'CriteriaBased' THEN md_policy_matches(t,rp.id,rec.id) ELSE false END)))
 END)
 FROM md_records rec JOIN md_users usr ON usr.tenant_id=t AND usr.id=u AND usr.enabled
 LEFT JOIN md_sharing_settings setting ON setting.tenant_id=t AND setting.object_api=rec.object_api
 WHERE rec.tenant_id=t AND rec.id=rid
 ),false)
$$;
-- END LEGACY 20261020-rbac-administration.sql

-- BEGIN LEGACY 20261020-z-declarative-rule-history.sql
-- Preserve declarative rule history across edits while keeping active metadata relational.
ALTER TABLE md_validation_rules ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1
 CHECK(revision>0);
ALTER TABLE md_field_default_formulas ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1
 CHECK(revision>0);

CREATE TABLE IF NOT EXISTS md_validation_rule_history(
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 rule_api text NOT NULL,
 revision integer NOT NULL,
 label text NOT NULL,
 expression text NOT NULL,
 error_message text NOT NULL,
 error_field_api text,
 active boolean NOT NULL,
 sort_order integer NOT NULL,
 saved_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,object_api,rule_api,revision),
 FOREIGN KEY(tenant_id,object_api)
   REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_field_default_formula_history(
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 field_api text NOT NULL,
 revision integer NOT NULL,
 expression text NOT NULL,
 saved_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,object_api,field_api,revision),
 FOREIGN KEY(tenant_id,object_api)
   REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE
);
-- END LEGACY 20261020-z-declarative-rule-history.sql

-- BEGIN LEGACY 20261021-app-package-home-pages.sql
CREATE TABLE IF NOT EXISTS md_app_package_home_page_templates (
 app_id uuid NOT NULL,version integer NOT NULL,
 page_api text NOT NULL CHECK(page_api ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 form_factor text NOT NULL CHECK(form_factor IN ('desktop','tablet','phone')),
 PRIMARY KEY(app_id,version,form_factor),
 FOREIGN KEY(app_id,version,page_api)
   REFERENCES md_app_package_page_templates(app_id,version,api_name) ON DELETE CASCADE
);
-- END LEGACY 20261021-app-package-home-pages.sql

-- BEGIN LEGACY 20261021-component-library-versioning.sql
-- Reuse the tenant-scoped shared Component definition registry for version history.
-- Flexible, schema-validated component display metadata is kept in JSONB; active
-- version, state and revision numbers remain relational and independently queried.
CREATE TABLE IF NOT EXISTS md_component_library_versions(
 tenant_id uuid NOT NULL,
 component_api text NOT NULL,
 version integer NOT NULL CHECK(version>0),
 state text NOT NULL CHECK(state IN ('Draft','Published')),
 properties jsonb NOT NULL CHECK(jsonb_typeof(properties)='object'),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,component_api,version),
 FOREIGN KEY(tenant_id,component_api) REFERENCES md_component_definitions(tenant_id,api_name),
 FOREIGN KEY(tenant_id,created_by) REFERENCES md_users(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_component_library_heads(
 tenant_id uuid NOT NULL,
 component_api text NOT NULL,
 current_version integer NOT NULL CHECK(current_version>0),
 published_version integer CHECK(published_version>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,component_api),
 FOREIGN KEY(tenant_id,component_api) REFERENCES md_component_definitions(tenant_id,api_name),
 FOREIGN KEY(tenant_id,component_api,current_version) REFERENCES md_component_library_versions(tenant_id,component_api,version),
 FOREIGN KEY(tenant_id,component_api,published_version) REFERENCES md_component_library_versions(tenant_id,component_api,version)
);
-- END LEGACY 20261021-component-library-versioning.sql

-- BEGIN LEGACY 20261021-durable-jobs.sql
-- Shared, application-neutral and tenant-isolated durable job substrate.
-- Dispatch and execution must additionally enforce central RBAC, app licensing,
-- active published metadata and execution-context policy.
CREATE TABLE IF NOT EXISTS md_durable_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 app_api_name text,
 job_type text NOT NULL CHECK (length(job_type) BETWEEN 1 AND 128),
 resource_id text,
 resource_version integer CHECK(resource_version>0),
 actor_user_id uuid,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','leased','completed','failed','cancelled')),
 scheduled_at timestamptz NOT NULL DEFAULT now(),
 recurrence_seconds integer CHECK(recurrence_seconds BETWEEN 60 AND 31536000),
 attempt integer NOT NULL DEFAULT 0 CHECK(attempt>=0),
 max_attempts integer NOT NULL DEFAULT 5 CHECK(max_attempts BETWEEN 1 AND 100),
 lease_owner text,
 lease_until timestamptz,
 idempotency_key text,
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id),
 FOREIGN KEY (tenant_id,actor_user_id) REFERENCES md_users(tenant_id,id),
 CONSTRAINT md_durable_jobs_lease CHECK(status <> 'leased' OR (lease_owner IS NOT NULL AND lease_until IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS md_durable_jobs_idempotent
 ON md_durable_jobs(tenant_id,job_type,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS md_durable_jobs_ready
 ON md_durable_jobs(scheduled_at,id) WHERE status='queued';
CREATE INDEX IF NOT EXISTS md_durable_jobs_tenant_status
 ON md_durable_jobs(tenant_id,status,scheduled_at);
CREATE INDEX IF NOT EXISTS md_durable_jobs_expired
 ON md_durable_jobs(lease_until) WHERE status='leased';
-- Payloads are deliberately NOT JSONB. Store versioned execution inputs through
-- typed child rows before enabling dispatch.
CREATE TABLE IF NOT EXISTS md_durable_job_values(
 tenant_id uuid NOT NULL,
 job_id uuid NOT NULL,
 name text NOT NULL,
 value_text text,
 value_number numeric,
 value_boolean boolean,
 value_datetime timestamptz,
 reference_id uuid,
 PRIMARY KEY(tenant_id,job_id,name),
 FOREIGN KEY(tenant_id,job_id) REFERENCES md_durable_jobs(tenant_id,id) ON DELETE CASCADE,
 CHECK(num_nonnulls(value_text,value_number,value_boolean,value_datetime,reference_id)<=1)
);
-- END LEGACY 20261021-durable-jobs.sql

-- BEGIN LEGACY 20261021-field-dependencies.sql
CREATE TABLE IF NOT EXISTS md_field_dependencies (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  field_api text NOT NULL,
  controller_field_api text NOT NULL,
  PRIMARY KEY(tenant_id,object_api,field_api),
  CHECK(field_api<>controller_field_api),
  FOREIGN KEY(tenant_id,object_api,field_api)
    REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE,
  FOREIGN KEY(tenant_id,object_api,controller_field_api)
    REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_field_dependency_values (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  field_api text NOT NULL,
  controller_value text NOT NULL CHECK(length(controller_value) BETWEEN 1 AND 512),
  picklist_value text NOT NULL CHECK(length(picklist_value) BETWEEN 1 AND 512),
  PRIMARY KEY(tenant_id,object_api,field_api,controller_value,picklist_value),
  FOREIGN KEY(tenant_id,object_api,field_api)
    REFERENCES md_field_dependencies(tenant_id,object_api,field_api) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_field_dependency_values_lookup
  ON md_field_dependency_values(tenant_id,object_api,field_api,controller_value);
-- END LEGACY 20261021-field-dependencies.sql

-- BEGIN LEGACY 20261021-field-recycle-bin.sql
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS md_field_definitions_recycle_bin
  ON md_field_definitions(tenant_id,deleted_at) WHERE deleted_at IS NOT NULL;
-- END LEGACY 20261021-field-recycle-bin.sql

-- BEGIN LEGACY 20261021-multipicklist-storage.sql
CREATE TABLE IF NOT EXISTS md_record_multi_values (
  tenant_id uuid NOT NULL,
  record_id uuid NOT NULL,
  object_api text NOT NULL,
  field_api text NOT NULL,
  value text NOT NULL CHECK(length(value) BETWEEN 1 AND 512),
  sort_order integer NOT NULL CHECK(sort_order>=0),
  PRIMARY KEY(tenant_id,record_id,field_api,value),
  FOREIGN KEY(tenant_id,record_id,object_api)
    REFERENCES md_records(tenant_id,id,object_api) ON DELETE CASCADE,
  FOREIGN KEY(tenant_id,object_api,field_api)
    REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_record_multi_values_lookup
  ON md_record_multi_values(tenant_id,object_api,field_api,value,record_id);

INSERT INTO md_record_multi_values(tenant_id,record_id,object_api,field_api,value,sort_order)
SELECT v.tenant_id,v.record_id,v.object_api,v.field_api,selected.value,
       selected.ordinality::integer-1
FROM md_record_values v
JOIN md_field_definitions f
  ON f.tenant_id=v.tenant_id AND f.object_api=v.object_api AND f.api_name=v.field_api
CROSS JOIN LATERAL unnest(string_to_array(v.value_text,';')) WITH ORDINALITY AS selected(value,ordinality)
WHERE f.data_type='multipicklist' AND v.value_text IS NOT NULL AND v.value_text<>''
ON CONFLICT(tenant_id,record_id,field_api,value) DO NOTHING;
-- END LEGACY 20261021-multipicklist-storage.sql

-- BEGIN LEGACY 20261021-relationship-options.sql
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS relationship_name text;
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS child_relationship_name text;
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS delete_behavior text;
ALTER TABLE md_field_definitions ADD COLUMN IF NOT EXISTS allow_reparenting boolean NOT NULL DEFAULT false;
-- END LEGACY 20261021-relationship-options.sql

-- BEGIN LEGACY 20261021-typed-record-values.sql
-- Additive typed projections; legacy text remains for backward compatibility.
ALTER TABLE md_record_values ADD COLUMN IF NOT EXISTS value_number numeric;
ALTER TABLE md_record_values ADD COLUMN IF NOT EXISTS value_date date;
ALTER TABLE md_record_values ADD COLUMN IF NOT EXISTS value_datetime timestamptz;
ALTER TABLE md_record_values ADD COLUMN IF NOT EXISTS value_boolean boolean;

CREATE OR REPLACE FUNCTION md_record_value_typed_projection()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE kind text;
BEGIN
 SELECT data_type INTO kind FROM md_field_definitions
 WHERE tenant_id=NEW.tenant_id AND object_api=NEW.object_api AND api_name=NEW.field_api;
 NEW.value_number:=NULL;
 NEW.value_date:=NULL;
 NEW.value_datetime:=NULL;
 NEW.value_boolean:=NULL;
 IF NEW.value_text IS NULL THEN RETURN NEW; END IF;
 IF kind IN ('number','currency','percent') THEN
   NEW.value_number:=NEW.value_text::numeric;
 ELSIF kind='date' THEN
   NEW.value_date:=NEW.value_text::date;
 ELSIF kind='datetime' THEN
   NEW.value_datetime:=NEW.value_text::timestamptz;
 ELSIF kind='boolean' THEN
   NEW.value_boolean:=NEW.value_text::boolean;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS md_record_value_typed_sync ON md_record_values;
CREATE TRIGGER md_record_value_typed_sync
BEFORE INSERT OR UPDATE OF value_text,field_api,object_api ON md_record_values
FOR EACH ROW EXECUTE FUNCTION md_record_value_typed_projection();

-- Legacy numeric/boolean values are backfilled only when safe to cast.
UPDATE md_record_values v SET value_number=v.value_text::numeric
FROM md_field_definitions f
WHERE f.tenant_id=v.tenant_id AND f.object_api=v.object_api AND f.api_name=v.field_api
 AND f.data_type IN ('number','currency','percent')
 AND v.value_text ~ '^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)$'
 AND v.value_number IS NULL;
UPDATE md_record_values v SET value_boolean=v.value_text::boolean
FROM md_field_definitions f
WHERE f.tenant_id=v.tenant_id AND f.object_api=v.object_api AND f.api_name=v.field_api
 AND f.data_type='boolean' AND v.value_text IN ('true','false')
 AND v.value_boolean IS NULL;

-- Invalid historical date/time strings remain unchanged; do not abort migration.
CREATE OR REPLACE FUNCTION md_try_record_date(raw text) RETURNS date
LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF raw IS NULL OR raw !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RETURN NULL; END IF;
 RETURN raw::date;
EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION md_try_record_datetime(raw text) RETURNS timestamptz
LANGUAGE plpgsql STABLE AS $$
BEGIN
 IF raw IS NULL OR raw !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' THEN RETURN NULL; END IF;
 RETURN raw::timestamptz;
EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN RETURN NULL;
END $$;
UPDATE md_record_values v SET value_date=md_try_record_date(v.value_text)
FROM md_field_definitions f
WHERE f.tenant_id=v.tenant_id AND f.object_api=v.object_api AND f.api_name=v.field_api
 AND f.data_type='date' AND v.value_text IS NOT NULL AND v.value_date IS NULL;
UPDATE md_record_values v SET value_datetime=md_try_record_datetime(v.value_text)
FROM md_field_definitions f
WHERE f.tenant_id=v.tenant_id AND f.object_api=v.object_api AND f.api_name=v.field_api
 AND f.data_type='datetime' AND v.value_text IS NOT NULL AND v.value_datetime IS NULL;

CREATE INDEX IF NOT EXISTS md_record_values_numeric_idx ON md_record_values(tenant_id,object_api,field_api,value_number) WHERE value_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS md_record_values_date_idx ON md_record_values(tenant_id,object_api,field_api,value_date) WHERE value_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS md_record_values_datetime_idx ON md_record_values(tenant_id,object_api,field_api,value_datetime) WHERE value_datetime IS NOT NULL;
-- END LEGACY 20261021-typed-record-values.sql

-- BEGIN LEGACY 20261021-user-landing-app.sql
ALTER TABLE md_users
  ADD COLUMN IF NOT EXISTS landing_app_api text NOT NULL DEFAULT 'Setup';
-- END LEGACY 20261021-user-landing-app.sql

-- BEGIN LEGACY 20261021-validate-record-type-fk.sql
-- Once legacy references have been reconciled, validate the existing tenant/object FK.
-- This does not change any customer record. Invalid legacy references cause a safe failure.
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM md_records r
   WHERE r.record_type_id IS NOT NULL AND NOT EXISTS (
     SELECT 1 FROM md_object_record_types t
     WHERE t.tenant_id=r.tenant_id AND t.object_api=r.object_api
       AND t.record_type_id=r.record_type_id
   )
 ) THEN
   RAISE EXCEPTION 'Legacy record type references require correction before FK validation';
 END IF;
END $$;
ALTER TABLE md_records VALIDATE CONSTRAINT md_records_record_type_tenant_object_fk;
-- END LEGACY 20261021-validate-record-type-fk.sql

-- BEGIN LEGACY 20261022-acetill-visual-drafts.sql
-- The live Acetill React terminal remains the original design.
-- Visual editor changes are saved as drafts, never auto-published.
CREATE TABLE IF NOT EXISTS md_acetill_visual_styles (
  tenant_id uuid PRIMARY KEY REFERENCES md_tenants(id) ON DELETE CASCADE,
  draft_styles jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(draft_styles)='object'),
  published_styles jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(published_styles)='object'),
  revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Existing entitled tenants need a visible Page Builder entry now; new installs
-- receive the same draft via the explicit Acetill installation hook.
INSERT INTO md_page_definitions(tenant_id,api_name,title,enabled)
SELECT i.tenant_id,'AcetillRegisterEditable','Acetill Terminal (Editable Copy)',true
FROM md_app_installations i
JOIN md_apps a ON a.id=i.app_id AND a.api_name='Acetill' AND a.enabled=true
JOIN md_app_entitlements e ON e.tenant_id=i.tenant_id AND e.app_id=i.app_id
WHERE e.active=true AND (e.expires_at IS NULL OR e.expires_at>now())
ON CONFLICT(tenant_id,api_name) DO NOTHING;

INSERT INTO md_lightning_page_details
 (tenant_id,page_id,page_type,target_object,layout_mode,template,canvas_width,canvas_height,status,devices,revision)
SELECT p.tenant_id,p.id,'App Page','','template','main-sidebar',1440,900,'Draft',ARRAY['Desktop','Phone']::text[],1
FROM md_page_definitions p
JOIN md_app_installations i ON i.tenant_id=p.tenant_id
JOIN md_apps a ON a.id=i.app_id AND a.api_name='Acetill' AND a.enabled=true
JOIN md_app_entitlements e ON e.tenant_id=i.tenant_id AND e.app_id=i.app_id
WHERE p.api_name='AcetillRegisterEditable' AND p.enabled=true
  AND e.active=true AND (e.expires_at IS NULL OR e.expires_at>now())
ON CONFLICT(tenant_id,page_id) DO NOTHING;
-- END LEGACY 20261022-acetill-visual-drafts.sql

-- BEGIN LEGACY 20261022-dashboard-snapshots.sql
-- Tenant-scoped immutable dashboard results; snapshots do not confer data access.
CREATE TABLE IF NOT EXISTS md_dashboard_snapshots(
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 dashboard_kind text NOT NULL DEFAULT 'dashboards' CHECK(dashboard_kind='dashboards'),
 dashboard_api text NOT NULL,
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 200),
 created_by uuid NOT NULL,
 content jsonb NOT NULL CHECK(jsonb_typeof(content)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,created_by) REFERENCES md_users(tenant_id,id),
 FOREIGN KEY(tenant_id,dashboard_kind,dashboard_api) REFERENCES md_system_definitions(tenant_id,kind,api_name)
);
CREATE INDEX IF NOT EXISTS md_dashboard_snapshots_lookup
 ON md_dashboard_snapshots(tenant_id,dashboard_api,created_at DESC);
-- END LEGACY 20261022-dashboard-snapshots.sql

-- BEGIN LEGACY 20261022-dashboard-subscriptions.sql
-- Dashboard delivery uses shared metadata and encrypted Named Credentials.
-- SQL owns schedule state, which can be picked up by the shared durable job worker.
CREATE TABLE IF NOT EXISTS md_dashboard_subscriptions(
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 dashboard_kind text NOT NULL DEFAULT 'dashboards' CHECK(dashboard_kind='dashboards'),
 dashboard_api text NOT NULL,
 owner_user_id uuid NOT NULL,
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 200),
 frequency text NOT NULL CHECK(frequency IN ('Daily','Weekly')),
 local_time time NOT NULL,
 time_zone text NOT NULL,
 day_of_week integer CHECK(day_of_week BETWEEN 0 AND 6),
 recipient_user_ids uuid[] NOT NULL,
 credential_id uuid NOT NULL,
 from_email text NOT NULL,
 active boolean NOT NULL DEFAULT false,
 save_snapshots boolean NOT NULL DEFAULT true,
 next_run_at timestamptz NOT NULL,
 last_run_at timestamptz,
 last_run_status text NOT NULL DEFAULT 'Never' CHECK(last_run_status IN ('Never','Pending','Success','Failed')),
 last_run_error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,dashboard_kind,dashboard_api) REFERENCES md_system_definitions(tenant_id,kind,api_name),
 FOREIGN KEY(tenant_id,owner_user_id) REFERENCES md_users(tenant_id,id),
 FOREIGN KEY(tenant_id,credential_id) REFERENCES md_named_credentials(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_dashboard_subscriptions_due ON md_dashboard_subscriptions(next_run_at)
 WHERE active=true;
-- END LEGACY 20261022-dashboard-subscriptions.sql

-- BEGIN LEGACY 20261022-flow-http-callout-jobs.sql
CREATE TABLE IF NOT EXISTS md_http_callout_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 run_id uuid NOT NULL,
 node_id integer NOT NULL,
 user_id uuid NOT NULL,
 credential_id uuid NOT NULL,
 method text NOT NULL CHECK(method IN ('GET','POST','PUT','PATCH','DELETE')),
 path_ciphertext bytea NOT NULL,
 headers_ciphertext bytea NOT NULL,
 body_ciphertext bytea,
 idempotency_key_ciphertext bytea,
 max_attempts integer NOT NULL DEFAULT 5 CHECK(max_attempts BETWEEN 1 AND 5),
 timeout_ms integer NOT NULL CHECK(timeout_ms BETWEEN 1000 AND 30000),
 status text NOT NULL DEFAULT 'queued'
  CHECK(status IN ('queued','processing','retrying','completed','failed')),
 attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count>=0),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 claimed_at timestamptz,
 last_error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,run_id) REFERENCES md_flow_runs(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_http_callout_jobs_ready
 ON md_http_callout_jobs(status,next_attempt_at,created_at);
CREATE TABLE IF NOT EXISTS md_http_callout_job_values (
 tenant_id uuid NOT NULL,
 job_id uuid NOT NULL,
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_.]*$'),
 value_ciphertext bytea NOT NULL,
 data_type text NOT NULL CHECK(data_type IN ('string','number','boolean','null')),
 PRIMARY KEY(tenant_id,job_id,api_name),
 FOREIGN KEY(tenant_id,job_id)
  REFERENCES md_http_callout_jobs(tenant_id,id) ON DELETE CASCADE
);
-- END LEGACY 20261022-flow-http-callout-jobs.sql

-- BEGIN LEGACY 20261022-flow-interview-loops.sql
CREATE TABLE IF NOT EXISTS md_flow_interview_loop_state (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 run_id uuid NOT NULL,
 element_id integer NOT NULL,
 next_index integer NOT NULL CHECK(next_index BETWEEN -1 AND 200),
 PRIMARY KEY(tenant_id,run_id,element_id),
 FOREIGN KEY(tenant_id,run_id) REFERENCES md_flow_interview_state(tenant_id,run_id) ON DELETE CASCADE
);
-- END LEGACY 20261022-flow-interview-loops.sql

-- BEGIN LEGACY 20261022-flow-interview-records.sql
-- Durable Flow record variables and collections are represented by SQL references.
CREATE TABLE IF NOT EXISTS md_flow_interview_records (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 run_id uuid NOT NULL,
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 object_api text NOT NULL,
 sort_order integer NOT NULL CHECK(sort_order >= 0),
 record_id uuid,
 is_collection boolean NOT NULL,
 PRIMARY KEY(tenant_id,run_id,api_name,sort_order),
 FOREIGN KEY(tenant_id,run_id) REFERENCES md_flow_interview_state(tenant_id,run_id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,record_id,object_api) REFERENCES md_records(tenant_id,id,object_api) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_flow_interview_record_fields (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 run_id uuid NOT NULL,
 api_name text NOT NULL,
 sort_order integer NOT NULL,
 field_api text NOT NULL CHECK(field_api ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 value_text text,
 data_type text NOT NULL CHECK(data_type IN ('string','number','boolean','null')),
 PRIMARY KEY(tenant_id,run_id,api_name,sort_order,field_api),
 FOREIGN KEY(tenant_id,run_id,api_name,sort_order)
   REFERENCES md_flow_interview_records(tenant_id,run_id,api_name,sort_order) ON DELETE CASCADE
);
-- END LEGACY 20261022-flow-interview-records.sql

-- BEGIN LEGACY 20261022-flow-trigger-record-resources.sql
ALTER TABLE md_flow_interview_records
 DROP CONSTRAINT IF EXISTS md_flow_interview_records_api_name_check;
ALTER TABLE md_flow_interview_records
 ADD CONSTRAINT md_flow_interview_records_api_name_check
 CHECK(api_name ~ '^(\$[A-Za-z][A-Za-z0-9_]*|[A-Za-z][A-Za-z0-9_]*)$');
-- END LEGACY 20261022-flow-trigger-record-resources.sql

-- BEGIN LEGACY 20261022-password-reset-tokens.sql
-- Ephemeral one-time password reset challenges. Never persist plaintext tokens.
CREATE TABLE IF NOT EXISTS md_password_reset_challenges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 user_id uuid NOT NULL,
 token_hash text NOT NULL UNIQUE CHECK (length(token_hash)=64),
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_password_reset_user_recent
 ON md_password_reset_challenges(tenant_id,user_id,created_at DESC);
-- END LEGACY 20261022-password-reset-tokens.sql

-- BEGIN LEGACY 20261022-till-pin.sql
-- PIN material never stored in a generic readable User record field.
ALTER TABLE md_users ADD COLUMN IF NOT EXISTS till_pin_hash text;
ALTER TABLE md_users ADD COLUMN IF NOT EXISTS till_pin_failures integer NOT NULL DEFAULT 0;
ALTER TABLE md_users ADD COLUMN IF NOT EXISTS till_pin_locked_until timestamptz;
-- END LEGACY 20261022-till-pin.sql

-- BEGIN LEGACY 20261023-custom-metadata-foundation.sql
-- Tenant-scoped custom labels, custom metadata and hierarchy custom settings.
-- All definitions and values are stored in relational columns.
CREATE TABLE IF NOT EXISTS md_custom_labels (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 language text NOT NULL DEFAULT 'en' CHECK(length(language) BETWEEN 2 AND 35),
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 255),
 value text NOT NULL CHECK(length(value)<=4000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,api_name,language)
);
CREATE INDEX IF NOT EXISTS md_custom_labels_lookup
 ON md_custom_labels(tenant_id,language,api_name);

CREATE TABLE IF NOT EXISTS md_custom_metadata_types (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 255),
 description text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,api_name)
);
CREATE TABLE IF NOT EXISTS md_custom_metadata_fields (
 tenant_id uuid NOT NULL,
 type_api text NOT NULL,
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 255),
 data_type text NOT NULL CHECK(data_type IN ('text','number','boolean','date','datetime')),
 required boolean NOT NULL DEFAULT false,
 max_length integer CHECK(max_length BETWEEN 1 AND 10000),
 sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order>=0),
 PRIMARY KEY(tenant_id,type_api,api_name),
 FOREIGN KEY(tenant_id,type_api) REFERENCES md_custom_metadata_types(tenant_id,api_name) ON DELETE CASCADE,
 CHECK((data_type='text') OR max_length IS NULL)
);
CREATE TABLE IF NOT EXISTS md_custom_metadata_records (
 tenant_id uuid NOT NULL,
 type_api text NOT NULL,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 record_key text NOT NULL CHECK(length(record_key) BETWEEN 1 AND 255),
 master_label text NOT NULL CHECK(length(master_label) BETWEEN 1 AND 255),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,type_api,id),
 UNIQUE(tenant_id,type_api,record_key),
 FOREIGN KEY(tenant_id,type_api) REFERENCES md_custom_metadata_types(tenant_id,api_name) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_custom_metadata_values (
 tenant_id uuid NOT NULL,
 type_api text NOT NULL,
 record_id uuid NOT NULL,
 field_api text NOT NULL,
 data_type text NOT NULL CHECK(data_type IN ('text','number','boolean','date','datetime')),
 value_text text,
 value_number numeric,
 value_boolean boolean,
 value_date date,
 value_datetime timestamptz,
 PRIMARY KEY(tenant_id,type_api,record_id,field_api),
 FOREIGN KEY(tenant_id,type_api,record_id)
  REFERENCES md_custom_metadata_records(tenant_id,type_api,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,type_api,field_api)
  REFERENCES md_custom_metadata_fields(tenant_id,type_api,api_name) ON DELETE CASCADE,
 CHECK(
  (data_type='text' AND value_text IS NOT NULL AND value_number IS NULL AND value_boolean IS NULL AND value_date IS NULL AND value_datetime IS NULL) OR
  (data_type='number' AND value_text IS NULL AND value_number IS NOT NULL AND value_boolean IS NULL AND value_date IS NULL AND value_datetime IS NULL) OR
  (data_type='boolean' AND value_text IS NULL AND value_number IS NULL AND value_boolean IS NOT NULL AND value_date IS NULL AND value_datetime IS NULL) OR
  (data_type='date' AND value_text IS NULL AND value_number IS NULL AND value_boolean IS NULL AND value_date IS NOT NULL AND value_datetime IS NULL) OR
  (data_type='datetime' AND value_text IS NULL AND value_number IS NULL AND value_boolean IS NULL AND value_date IS NULL AND value_datetime IS NOT NULL)
 )
);
CREATE INDEX IF NOT EXISTS md_custom_metadata_records_lookup
 ON md_custom_metadata_records(tenant_id,type_api,master_label,record_key);

CREATE TABLE IF NOT EXISTS md_custom_settings (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 255),
 description text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,api_name)
);
CREATE TABLE IF NOT EXISTS md_custom_setting_fields (
 tenant_id uuid NOT NULL,
 setting_api text NOT NULL,
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 255),
 data_type text NOT NULL CHECK(data_type IN ('text','number','boolean','date','datetime')),
 max_length integer CHECK(max_length BETWEEN 1 AND 10000),
 sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order>=0),
 PRIMARY KEY(tenant_id,setting_api,api_name),
 FOREIGN KEY(tenant_id,setting_api) REFERENCES md_custom_settings(tenant_id,api_name) ON DELETE CASCADE,
 CHECK((data_type='text') OR max_length IS NULL)
);
CREATE TABLE IF NOT EXISTS md_custom_setting_entries (
 tenant_id uuid NOT NULL,
 setting_api text NOT NULL,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 scope text NOT NULL CHECK(scope IN ('organization','profile','user')),
 profile_id uuid,
 user_id uuid,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,setting_api,id),
 FOREIGN KEY(tenant_id,setting_api) REFERENCES md_custom_settings(tenant_id,api_name) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,profile_id) REFERENCES md_profiles(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE,
 CHECK(
  (scope='organization' AND profile_id IS NULL AND user_id IS NULL) OR
  (scope='profile' AND profile_id IS NOT NULL AND user_id IS NULL) OR
  (scope='user' AND profile_id IS NULL AND user_id IS NOT NULL)
 )
);
CREATE UNIQUE INDEX IF NOT EXISTS md_custom_setting_org_entry
 ON md_custom_setting_entries(tenant_id,setting_api) WHERE scope='organization';
CREATE UNIQUE INDEX IF NOT EXISTS md_custom_setting_profile_entry
 ON md_custom_setting_entries(tenant_id,setting_api,profile_id) WHERE scope='profile';
CREATE UNIQUE INDEX IF NOT EXISTS md_custom_setting_user_entry
 ON md_custom_setting_entries(tenant_id,setting_api,user_id) WHERE scope='user';
CREATE TABLE IF NOT EXISTS md_custom_setting_values (
 tenant_id uuid NOT NULL,
 setting_api text NOT NULL,
 entry_id uuid NOT NULL,
 field_api text NOT NULL,
 data_type text NOT NULL CHECK(data_type IN ('text','number','boolean','date','datetime')),
 value_text text,
 value_number numeric,
 value_boolean boolean,
 value_date date,
 value_datetime timestamptz,
 PRIMARY KEY(tenant_id,setting_api,entry_id,field_api),
 FOREIGN KEY(tenant_id,setting_api,entry_id)
  REFERENCES md_custom_setting_entries(tenant_id,setting_api,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,setting_api,field_api)
  REFERENCES md_custom_setting_fields(tenant_id,setting_api,api_name) ON DELETE CASCADE,
 CHECK(
  (data_type='text' AND value_text IS NOT NULL AND value_number IS NULL AND value_boolean IS NULL AND value_date IS NULL AND value_datetime IS NULL) OR
  (data_type='number' AND value_text IS NULL AND value_number IS NOT NULL AND value_boolean IS NULL AND value_date IS NULL AND value_datetime IS NULL) OR
  (data_type='boolean' AND value_text IS NULL AND value_number IS NULL AND value_boolean IS NOT NULL AND value_date IS NULL AND value_datetime IS NULL) OR
  (data_type='date' AND value_text IS NULL AND value_number IS NULL AND value_boolean IS NULL AND value_date IS NOT NULL AND value_datetime IS NULL) OR
  (data_type='datetime' AND value_text IS NULL AND value_number IS NULL AND value_boolean IS NULL AND value_date IS NULL AND value_datetime IS NOT NULL)
 )
);
-- END LEGACY 20261023-custom-metadata-foundation.sql

-- BEGIN LEGACY 20261023-mfa-identity.sql
-- Universal, tenant-scoped MFA metadata and one-time authentication challenges.
CREATE TABLE IF NOT EXISTS md_tenant_mfa_policies(
 tenant_id uuid PRIMARY KEY REFERENCES md_tenants(id),
 mode text NOT NULL DEFAULT 'Off' CHECK(mode IN ('Off','Optional','Required')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS md_user_mfa_secrets(
 tenant_id uuid NOT NULL,
 user_id uuid NOT NULL,
 secret_ciphertext bytea NOT NULL,
 key_id text NOT NULL,
 last_counter bigint NOT NULL DEFAULT -1,
 enrolled_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,user_id),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_mfa_enrollment_tokens(
 tenant_id uuid NOT NULL,
 user_id uuid NOT NULL,
 token_hash text NOT NULL UNIQUE CHECK(length(token_hash)=64),
 failed_attempts integer NOT NULL DEFAULT 0 CHECK(failed_attempts BETWEEN 0 AND 10),
 secret_ciphertext bytea NOT NULL,
 key_id text NOT NULL,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,user_id),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_mfa_login_challenges(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 user_id uuid NOT NULL,
 challenge_hash text NOT NULL UNIQUE CHECK(length(challenge_hash)=64),
 failed_attempts integer NOT NULL DEFAULT 0 CHECK(failed_attempts BETWEEN 0 AND 10),
 enrollment_secret_ciphertext bytea,
 key_id text,
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_mfa_login_recent ON md_mfa_login_challenges(tenant_id,user_id,created_at DESC);
ALTER TABLE md_sessions ADD COLUMN IF NOT EXISTS mfa_verified boolean NOT NULL DEFAULT false;
ALTER TABLE md_refresh_sessions ADD COLUMN IF NOT EXISTS mfa_verified boolean NOT NULL DEFAULT false;
-- END LEGACY 20261023-mfa-identity.sql

-- BEGIN LEGACY 20261023-object-manager-metadata.sql
CREATE TABLE IF NOT EXISTS md_object_manager_settings (
  tenant_id uuid NOT NULL REFERENCES md_tenants(id),
  object_api text NOT NULL,
  plural_label text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  help_text text NOT NULL DEFAULT '',
  allow_reports boolean NOT NULL DEFAULT true,
  allow_activities boolean NOT NULL DEFAULT false,
  track_field_history boolean NOT NULL DEFAULT false,
  allow_in_chatter boolean NOT NULL DEFAULT false,
  allow_search boolean NOT NULL DEFAULT true,
  deployment_status text NOT NULL DEFAULT 'Deployed'
    CHECK(deployment_status IN ('In Development','Deployed')),
  record_name_type text NOT NULL DEFAULT 'Text'
    CHECK(record_name_type IN ('Text','Auto Number')),
  record_name_format text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,object_api),
  FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE,
  CHECK(length(description)<=1000),
  CHECK(length(plural_label)<=160),
  CHECK(length(help_text)<=1000),
  CHECK(length(record_name_format)<=80)
);
CREATE TABLE IF NOT EXISTS md_object_field_sets (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  api_name text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY(tenant_id,object_api,api_name),
  FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE,
  CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
  CHECK(length(label) BETWEEN 1 AND 80)
);
CREATE TABLE IF NOT EXISTS md_object_field_set_items (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  field_set_api text NOT NULL,
  field_api text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY(tenant_id,object_api,field_set_api,field_api),
  FOREIGN KEY(tenant_id,object_api,field_set_api)
    REFERENCES md_object_field_sets(tenant_id,object_api,api_name) ON DELETE CASCADE,
  FOREIGN KEY(tenant_id,object_api,field_api)
    REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE
);
-- END LEGACY 20261023-object-manager-metadata.sql

-- BEGIN LEGACY 20261023-tenant-developer-activation.sql
-- A tenant's pre-created developer identity remains disabled until activated by a
-- security administrator with a fresh authenticator challenge.
CREATE TABLE IF NOT EXISTS md_tenant_developer_accounts (
 tenant_id uuid PRIMARY KEY REFERENCES md_tenants(id),
 user_id uuid NOT NULL,
 activated_at timestamptz,
 activated_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id),
 FOREIGN KEY(tenant_id,activated_by) REFERENCES md_users(tenant_id,id),
 UNIQUE(tenant_id,user_id)
);
-- END LEGACY 20261023-tenant-developer-activation.sql

-- BEGIN LEGACY 20261023-tenant-recovery.sql
-- Emergency tenant recovery: separately verified durable security evidence.
-- Private contact tokens are hashed. Secrets never enter JSON or audit logs.
CREATE TABLE IF NOT EXISTS md_tenant_recovery_contacts(
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 email text NOT NULL,
 verification_hash text NOT NULL,
 verification_expires_at timestamptz NOT NULL,
 failed_attempts integer NOT NULL DEFAULT 0 CHECK(failed_attempts BETWEEN 0 AND 10),
 verified_at timestamptz,
 enrolled_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,email),
 FOREIGN KEY(tenant_id,enrolled_by) REFERENCES md_users(tenant_id,id),
 CHECK(email=lower(email))
);
CREATE TABLE IF NOT EXISTS md_tenant_recovery_cases(
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 claimant_user_id uuid NOT NULL,
 opened_by_tenant_id uuid NOT NULL,
 opened_by_user_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN
  ('PENDING','VERIFIED','DISPUTED','APPROVED','INVITED','REDEEMED','REPAIRED')),
 identity_proof_status text NOT NULL DEFAULT 'PENDING' CHECK(identity_proof_status IN
  ('PENDING','VERIFIED','DISPUTED')),
 opened_at timestamptz NOT NULL DEFAULT now(),
 wait_until timestamptz NOT NULL DEFAULT (now()+interval '24 hours'),
 approved_at timestamptz,
 invitation_hash text,
 invitation_expires_at timestamptz,
 redeemed_at timestamptz,
 repaired_at timestamptz,
 PRIMARY KEY(tenant_id,id),
 UNIQUE(id),
 FOREIGN KEY(tenant_id,claimant_user_id) REFERENCES md_users(tenant_id,id),
 FOREIGN KEY(opened_by_tenant_id,opened_by_user_id) REFERENCES md_users(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_tenant_recovery_case_proofs(
 tenant_id uuid NOT NULL,
 case_id uuid NOT NULL,
 email text NOT NULL,
 token_hash text NOT NULL,
 token_expires_at timestamptz NOT NULL,
 failed_attempts integer NOT NULL DEFAULT 0 CHECK(failed_attempts BETWEEN 0 AND 10),
 confirmed_at timestamptz,
 disputed_at timestamptz,
 PRIMARY KEY(tenant_id,case_id,email),
 FOREIGN KEY(tenant_id,case_id) REFERENCES md_tenant_recovery_cases(tenant_id,id),
 FOREIGN KEY(tenant_id,email) REFERENCES md_tenant_recovery_contacts(tenant_id,email)
);
CREATE TABLE IF NOT EXISTS md_tenant_recovery_approvals(
 tenant_id uuid NOT NULL,
 case_id uuid NOT NULL,
 operator_tenant_id uuid NOT NULL,
 operator_user_id uuid NOT NULL,
 approved_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,case_id,operator_tenant_id,operator_user_id),
 FOREIGN KEY(tenant_id,case_id) REFERENCES md_tenant_recovery_cases(tenant_id,id),
 FOREIGN KEY(operator_tenant_id,operator_user_id) REFERENCES md_users(tenant_id,id)
);
-- END LEGACY 20261023-tenant-recovery.sql

-- BEGIN LEGACY 20261024-field-formulas.sql
-- Reusable Formula field definitions use relational tenant/object/field identity.
-- Expressions are parsed by the shared bounded Formula Engine and never eval'd.
CREATE TABLE IF NOT EXISTS md_field_formulas(
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 field_api text NOT NULL,
 expression text NOT NULL CHECK(length(expression) BETWEEN 1 AND 2048),
 return_type text NOT NULL CHECK(return_type IN ('Number','Currency','Percent','Text','Checkbox')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,object_api,field_api),
 FOREIGN KEY(tenant_id,object_api,field_api)
   REFERENCES md_field_definitions(tenant_id,object_api,api_name)
);
-- END LEGACY 20261024-field-formulas.sql

-- BEGIN LEGACY 20261024-field-global-value-sets.sql
CREATE TABLE IF NOT EXISTS md_field_global_value_sets (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  field_api text NOT NULL,
  value_set_api text NOT NULL,
  PRIMARY KEY(tenant_id,object_api,field_api),
  FOREIGN KEY(tenant_id,object_api,field_api)
    REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE,
  FOREIGN KEY(tenant_id,value_set_api)
    REFERENCES md_global_value_sets(tenant_id,api_name) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS md_field_global_value_sets_lookup
  ON md_field_global_value_sets(tenant_id,value_set_api);
-- END LEGACY 20261024-field-global-value-sets.sql

-- BEGIN LEGACY 20261024-integration-connection-tests.sql
-- Durable tenant-scoped connector connectivity observations.
CREATE TABLE IF NOT EXISTS md_integration_connection_tests(
 tenant_id uuid NOT NULL,
 connection_api text NOT NULL,
 connection_kind text NOT NULL DEFAULT 'integration-connections' CHECK(connection_kind='integration-connections'),
 status text NOT NULL CHECK(status IN ('Connected','Failed','Not configured','Test unavailable')),
 message text NOT NULL DEFAULT '',
 tested_by uuid NOT NULL,
 tested_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,connection_api),
 FOREIGN KEY(tenant_id,connection_kind,connection_api) REFERENCES md_system_definitions(tenant_id,kind,api_name),
 FOREIGN KEY(tenant_id,tested_by) REFERENCES md_users(tenant_id,id)
);
-- END LEGACY 20261024-integration-connection-tests.sql

-- BEGIN LEGACY 20261024-mail-tenant-domains.sql
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
-- END LEGACY 20261024-mail-tenant-domains.sql

-- BEGIN LEGACY 20261024-user-reporting-hierarchy.sql
-- Tenant-scoped management reporting hierarchy; roles/permission sets remain independent.
-- Additive, repeatable migration. Never delete or replace existing reporting relationships.
ALTER TABLE md_users ADD COLUMN IF NOT EXISTS reports_to_user_id uuid;
CREATE INDEX IF NOT EXISTS md_users_reporting_parent_idx ON md_users(tenant_id,reports_to_user_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='md_users_reporting_tenant_fk') THEN
  ALTER TABLE md_users ADD CONSTRAINT md_users_reporting_tenant_fk
  FOREIGN KEY(tenant_id,reports_to_user_id) REFERENCES md_users(tenant_id,id);
 END IF;
END $$;

-- Walk one tenant's reporting graph. Level 0 is the requested user.
-- Ancestors and descendants are always based on Reports To, never on roles.
CREATE OR REPLACE FUNCTION md_reporting_users(t uuid, subject uuid, direction text)
RETURNS TABLE(user_id uuid, hierarchy_level integer)
LANGUAGE sql STABLE AS $$
 WITH RECURSIVE chain(id,parent_id,depth,path) AS (
  SELECT u.id,u.reports_to_user_id,0,ARRAY[u.id]::uuid[]
  FROM md_users u WHERE u.tenant_id=t AND u.id=subject
  UNION ALL
  SELECT next.id,next.reports_to_user_id,c.depth+1,c.path||next.id
  FROM chain c JOIN md_users next ON next.tenant_id=t AND
   ((direction='descendants' AND next.reports_to_user_id=c.id)
    OR (direction='ancestors' AND next.id=c.parent_id))
  WHERE c.depth<512 AND NOT(next.id=ANY(c.path))
 )
 SELECT id,depth FROM chain WHERE direction IN ('descendants','ancestors');
$$;

CREATE OR REPLACE FUNCTION md_reporting_scope(t uuid, viewer uuid, target uuid, requested_scope text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT CASE requested_scope
  WHEN 'all' THEN EXISTS(SELECT 1 FROM md_users WHERE tenant_id=t AND id=target)
  WHEN 'own' THEN viewer=target AND EXISTS(SELECT 1 FROM md_users WHERE tenant_id=t AND id=viewer)
  WHEN 'direct' THEN viewer=target OR EXISTS(
   SELECT 1 FROM md_users WHERE tenant_id=t AND id=target AND reports_to_user_id=viewer)
  WHEN 'descendants' THEN EXISTS(
   SELECT 1 FROM md_reporting_users(t,viewer,'descendants') WHERE user_id=target)
  ELSE false END;
$$;

CREATE OR REPLACE FUNCTION md_validate_reporting_manager()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE root_id uuid;
BEGIN
 -- Serialise edits within the tenant to avoid mutually concurrent reparenting cycles.
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.tenant_id::text,19041));
 SELECT a.user_id INTO root_id
 FROM md_tenant_developer_accounts a WHERE a.tenant_id=NEW.tenant_id;
 IF root_id IS NOT NULL AND NEW.id=root_id THEN
  IF NEW.reports_to_user_id IS NOT NULL THEN
   RAISE EXCEPTION 'The tenant developer reporting root cannot have a manager';
  END IF;
  RETURN NEW;
 END IF;
 IF NEW.reports_to_user_id IS NULL THEN NEW.reports_to_user_id:=root_id; END IF;
 IF NEW.reports_to_user_id IS NULL THEN RETURN NEW; END IF;
 IF NEW.reports_to_user_id=NEW.id THEN RAISE EXCEPTION 'A user cannot report to themselves'; END IF;
 IF NOT EXISTS(SELECT 1 FROM md_users u WHERE u.tenant_id=NEW.tenant_id AND u.id=NEW.reports_to_user_id) THEN
  RAISE EXCEPTION 'Reporting manager must belong to the same tenant';
 END IF;
 IF TG_OP='UPDATE' AND EXISTS(
  SELECT 1 FROM md_reporting_users(NEW.tenant_id,NEW.id,'descendants')
  WHERE user_id=NEW.reports_to_user_id
 ) THEN RAISE EXCEPTION 'Circular reporting hierarchy'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS md_users_validate_reporting_manager ON md_users;
CREATE TRIGGER md_users_validate_reporting_manager
 BEFORE INSERT OR UPDATE OF reports_to_user_id ON md_users
 FOR EACH ROW EXECUTE FUNCTION md_validate_reporting_manager();

-- Existing users without a manager now report to the tenant developer.
-- Preserve explicitly assigned managers; developer is always the unique root.
UPDATE md_users u SET reports_to_user_id=a.user_id
FROM md_tenant_developer_accounts a
WHERE u.tenant_id=a.tenant_id AND u.id<>a.user_id AND u.reports_to_user_id IS NULL;
UPDATE md_users u SET reports_to_user_id=NULL
FROM md_tenant_developer_accounts a
WHERE u.tenant_id=a.tenant_id AND u.id=a.user_id AND u.reports_to_user_id IS NOT NULL;
-- END LEGACY 20261024-user-reporting-hierarchy.sql

-- BEGIN LEGACY 20261025-durable-flow-waits.sql
-- Persist Flow Wait state and allow interviews to be distinguished from screens.
ALTER TABLE md_flow_runs DROP CONSTRAINT IF EXISTS md_flow_runs_status_check;
ALTER TABLE md_flow_runs ADD CONSTRAINT md_flow_runs_status_check
 CHECK(status IN ('pending','waiting','completed','failed','cancelled'));
ALTER TABLE md_flow_runs ADD COLUMN IF NOT EXISTS wait_until timestamptz;
CREATE INDEX IF NOT EXISTS md_flow_runs_waiting
 ON md_flow_runs(tenant_id,wait_until) WHERE status='waiting';
-- END LEGACY 20261025-durable-flow-waits.sql

-- BEGIN LEGACY 20261025-object-metadata-history.sql
-- Versioned object metadata history in typed relational path/value rows.
-- Existing objects retain current layout data without fabricating historical revisions.
CREATE TABLE IF NOT EXISTS md_object_metadata_history(
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 revision integer NOT NULL CHECK(revision>0),
 action text NOT NULL DEFAULT 'Updated',
 actor_user_id uuid,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,object_api,revision),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name),
 FOREIGN KEY(tenant_id,actor_user_id) REFERENCES md_users(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_object_metadata_history_values(
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 revision integer NOT NULL,
 property_path text NOT NULL CHECK(length(property_path) BETWEEN 1 AND 1024),
 value_kind text NOT NULL CHECK(value_kind IN ('string','number','boolean','null','array','object')),
 value_text text,
 PRIMARY KEY(tenant_id,object_api,revision,property_path),
 FOREIGN KEY(tenant_id,object_api,revision)
   REFERENCES md_object_metadata_history(tenant_id,object_api,revision) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_object_metadata_history_recent
 ON md_object_metadata_history(tenant_id,object_api,revision DESC);
-- END LEGACY 20261025-object-metadata-history.sql

-- BEGIN LEGACY 20261026-metadata-api-name-casefold-uniqueness.sql
-- Migration preflight: never silently rename or delete tenant metadata to resolve conflicts.
DO $migration$
DECLARE
  item record;
  duplicate_exists boolean;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('md_custom_labels', 'tenant_id, language, lower(api_name)'),
    ('md_custom_metadata_types', 'tenant_id, lower(api_name)'),
    ('md_custom_settings', 'tenant_id, lower(api_name)'),
    ('md_custom_metadata_fields', 'tenant_id, type_api, lower(api_name)'),
    ('md_custom_setting_fields', 'tenant_id, setting_api, lower(api_name)'),
    ('md_global_value_sets', 'tenant_id, lower(api_name)'),
    ('md_matching_rules', 'tenant_id, object_api, lower(api_name)'),
    ('md_validation_rules', 'tenant_id, object_api, lower(api_name)'),
    ('md_object_definitions', 'tenant_id, lower(api_name)'),
    ('md_field_definitions', 'tenant_id, object_api, lower(api_name)'),
    ('md_page_definitions', 'tenant_id, lower(api_name)'),
    ('md_component_definitions', 'tenant_id, lower(api_name)'),
    ('md_flow_definitions', 'tenant_id, lower(api_name), version'),
    ('md_global_quick_actions', 'tenant_id, lower(action_id)'),
    ('md_system_definitions', 'tenant_id, kind, lower(api_name)'),
    ('md_tenant_app_metadata', 'tenant_id, lower(api_name)'),
    ('md_named_credentials', 'tenant_id, lower(name)')
  ) AS source(table_name,grouping) LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I GROUP BY %s HAVING count(*) > 1)',
      item.table_name,item.grouping) INTO duplicate_exists;
    IF duplicate_exists THEN
      RAISE EXCEPTION 'Case-insensitive API Name conflicts in %, reconcile metadata before applying unique indexes',item.table_name;
    END IF;
  END LOOP;
END
$migration$;

-- Preserve stable API names while preventing case-only duplicate identities.
-- These tenant-aware indexes are an atomic final guard under concurrent creates.
-- Existing conflicting names must be reconciled explicitly; never silently rename tenant metadata.
CREATE UNIQUE INDEX IF NOT EXISTS md_custom_labels_api_name_ci_uq
 ON md_custom_labels(tenant_id,language,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_custom_metadata_types_api_name_ci_uq
 ON md_custom_metadata_types(tenant_id,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_custom_settings_api_name_ci_uq
 ON md_custom_settings(tenant_id,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_custom_metadata_fields_api_name_ci_uq
 ON md_custom_metadata_fields(tenant_id,type_api,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_custom_setting_fields_api_name_ci_uq
 ON md_custom_setting_fields(tenant_id,setting_api,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_global_value_sets_api_name_ci_uq
 ON md_global_value_sets(tenant_id,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_matching_rules_api_name_ci_uq
 ON md_matching_rules(tenant_id,object_api,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_validation_rules_api_name_ci_uq
 ON md_validation_rules(tenant_id,object_api,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_objects_api_name_ci_uq
 ON md_object_definitions(tenant_id,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_fields_api_name_ci_uq
 ON md_field_definitions(tenant_id,object_api,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_pages_api_name_ci_uq
 ON md_page_definitions(tenant_id,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_components_api_name_ci_uq
 ON md_component_definitions(tenant_id,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_flows_api_version_ci_uq
 ON md_flow_definitions(tenant_id,lower(api_name),version);
CREATE UNIQUE INDEX IF NOT EXISTS md_global_actions_id_ci_uq
 ON md_global_quick_actions(tenant_id,lower(action_id));
CREATE UNIQUE INDEX IF NOT EXISTS md_system_definitions_api_name_ci_uq
 ON md_system_definitions(tenant_id,kind,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_tenant_apps_api_name_ci_uq
 ON md_tenant_app_metadata(tenant_id,lower(api_name));
CREATE UNIQUE INDEX IF NOT EXISTS md_named_credentials_name_ci_uq
 ON md_named_credentials(tenant_id,lower(name));
-- END LEGACY 20261026-metadata-api-name-casefold-uniqueness.sql

-- BEGIN LEGACY 20261026-oauth-authorization-code.sql
-- Tenant-scoped OAuth Authorization Code + PKCE grants and encrypted provider tokens.
CREATE TABLE IF NOT EXISTS md_credential_oauth_grants(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 credential_id uuid NOT NULL,
 initiated_by uuid NOT NULL,
 state_hash text NOT NULL UNIQUE CHECK(length(state_hash)=64),
 verifier_ciphertext bytea NOT NULL,
 key_id text NOT NULL,
 redirect_uri text NOT NULL,
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,credential_id) REFERENCES md_named_credentials(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,initiated_by) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_oauth_grants_tenant_recent ON md_credential_oauth_grants(tenant_id,credential_id,created_at DESC);
CREATE TABLE IF NOT EXISTS md_credential_oauth_tokens(
 tenant_id uuid NOT NULL,
 credential_id uuid NOT NULL,
 key_id text NOT NULL,
 access_ciphertext bytea NOT NULL,
 refresh_ciphertext bytea,
 expires_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,credential_id),
 FOREIGN KEY(tenant_id,credential_id) REFERENCES md_named_credentials(tenant_id,id) ON DELETE CASCADE
);
-- END LEGACY 20261026-oauth-authorization-code.sql

-- BEGIN LEGACY 20261027-durable-job-history.sql
-- Append-only tenant-scoped state transitions; no payloads or credentials.
CREATE TABLE IF NOT EXISTS md_durable_job_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant_id uuid NOT NULL,
 job_id uuid NOT NULL,
 status text NOT NULL,
 attempt integer NOT NULL,
 worker_id text,
 error_code text,
 observed_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (tenant_id,job_id) REFERENCES md_durable_jobs(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_durable_job_history_tenant_job
 ON md_durable_job_history(tenant_id,job_id,id);
CREATE OR REPLACE FUNCTION md_log_durable_job_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' OR
    (OLD.status,OLD.attempt,OLD.lease_owner,OLD.error_code)
    IS DISTINCT FROM
    (NEW.status,NEW.attempt,NEW.lease_owner,NEW.error_code) THEN
  INSERT INTO md_durable_job_history(tenant_id,job_id,status,attempt,worker_id,error_code)
  VALUES(NEW.tenant_id,NEW.id,NEW.status,NEW.attempt,NEW.lease_owner,NEW.error_code);
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS md_durable_job_transition_audit ON md_durable_jobs;
CREATE TRIGGER md_durable_job_transition_audit
 AFTER INSERT OR UPDATE ON md_durable_jobs
 FOR EACH ROW EXECUTE FUNCTION md_log_durable_job_transition();

-- Preserve the current state of jobs that predate this additive ledger.
INSERT INTO md_durable_job_history(tenant_id,job_id,status,attempt,worker_id,error_code)
SELECT j.tenant_id,j.id,j.status,j.attempt,j.lease_owner,j.error_code
FROM md_durable_jobs j
WHERE NOT EXISTS(
 SELECT 1 FROM md_durable_job_history h
 WHERE h.tenant_id=j.tenant_id AND h.job_id=j.id
);
-- END LEGACY 20261027-durable-job-history.sql

-- BEGIN LEGACY 20261027-encrypted-field-audit.sql
CREATE TABLE IF NOT EXISTS md_encrypted_field_access_audit (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  object_api text NOT NULL,
  field_api text NOT NULL,
  accessed_by uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,id),
  FOREIGN KEY(tenant_id,record_id,object_api)
    REFERENCES md_records(tenant_id,id,object_api) ON DELETE CASCADE,
  FOREIGN KEY(tenant_id,object_api,field_api)
    REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE,
  FOREIGN KEY(tenant_id,accessed_by) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_encrypted_field_access_audit_lookup
  ON md_encrypted_field_access_audit(tenant_id,object_api,field_api,occurred_at DESC);
-- END LEGACY 20261027-encrypted-field-audit.sql

-- BEGIN LEGACY 20261027-http-callout-receipts.sql
-- Typed provider HTTP acknowledgement only: never persist remote response bodies or secrets.
CREATE TABLE IF NOT EXISTS md_http_callout_receipts (
 tenant_id uuid NOT NULL,
 job_id uuid NOT NULL,
 attempt integer NOT NULL CHECK(attempt>0),
 response_status integer NOT NULL CHECK(response_status BETWEEN 100 AND 599),
 received_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,job_id,attempt),
 FOREIGN KEY(tenant_id,job_id) REFERENCES md_http_callout_jobs(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_http_callout_receipts_job
 ON md_http_callout_receipts(tenant_id,job_id,received_at DESC);
-- END LEGACY 20261027-http-callout-receipts.sql

-- BEGIN LEGACY 20261028-custom-setting-required.sql
ALTER TABLE md_custom_setting_fields
  ADD COLUMN IF NOT EXISTS required boolean NOT NULL DEFAULT false;
-- END LEGACY 20261028-custom-setting-required.sql

-- BEGIN LEGACY 20261029-mail-admin-sessions.sql
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
-- END LEGACY 20261029-mail-admin-sessions.sql

-- BEGIN LEGACY 20261029-rollup-filter-criteria.sql
ALTER TABLE md_field_definitions
  ADD COLUMN IF NOT EXISTS rollup_filter_logic text NOT NULL DEFAULT 'All'
  CHECK(rollup_filter_logic IN ('All','Any'));

CREATE TABLE IF NOT EXISTS md_field_rollup_filters (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  child_object text NOT NULL,
  rollup_field_api text NOT NULL,
  filter_field_api text NOT NULL,
  operator text NOT NULL CHECK(operator IN
    ('Equals','Not Equal To','Greater Than','Less Than','Contains','Is Null','Is Not Null')),
  value_text text NOT NULL DEFAULT '',
  sort_order integer NOT NULL CHECK(sort_order>=0),
  PRIMARY KEY(tenant_id,object_api,rollup_field_api,sort_order),
  FOREIGN KEY(tenant_id,object_api,rollup_field_api)
    REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE,
  FOREIGN KEY(tenant_id,child_object,filter_field_api)
    REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_field_rollup_filters_lookup
  ON md_field_rollup_filters(tenant_id,object_api,rollup_field_api,sort_order);
-- END LEGACY 20261029-rollup-filter-criteria.sql

-- BEGIN LEGACY 20261030-field-type-migrations.sql
CREATE TABLE IF NOT EXISTS md_field_type_migrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
  object_api text NOT NULL,
  field_api text NOT NULL,
  actor_user_id uuid,
  from_data_type text NOT NULL,
  to_data_type text NOT NULL,
  from_max_length integer,
  from_precision integer,
  from_scale integer,
  from_required boolean NOT NULL,
  from_unique boolean NOT NULL,
  from_external_id boolean NOT NULL,
  from_case_sensitive boolean NOT NULL,
  from_default_value text,
  to_max_length integer,
  to_precision integer,
  to_scale integer,
  to_required boolean NOT NULL,
  to_unique boolean NOT NULL,
  to_external_id boolean NOT NULL,
  to_case_sensitive boolean NOT NULL,
  to_default_value text,
  status text NOT NULL DEFAULT 'applied' CHECK(status IN ('applied','rolled_back')),
  records_migrated integer NOT NULL DEFAULT 0 CHECK(records_migrated>=0),
  created_at timestamptz NOT NULL DEFAULT now(),
  rolled_back_at timestamptz,
  UNIQUE(tenant_id,id),
  FOREIGN KEY(tenant_id,actor_user_id) REFERENCES md_users(tenant_id,id),
  FOREIGN KEY(tenant_id,object_api,field_api)
    REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_field_type_migrations_history
  ON md_field_type_migrations(tenant_id,object_api,field_api,created_at DESC);
CREATE TABLE IF NOT EXISTS md_field_type_migration_values (
  tenant_id uuid NOT NULL,
  migration_id uuid NOT NULL,
  record_id uuid NOT NULL,
  object_api text NOT NULL,
  before_value_text text,
  before_value_number numeric,
  before_value_boolean boolean,
  before_value_date date,
  before_value_datetime timestamptz,
  before_is_unique boolean NOT NULL,
  before_case_sensitive boolean NOT NULL,
  after_value_text text,
  after_value_number numeric,
  after_value_boolean boolean,
  after_value_date date,
  after_value_datetime timestamptz,
  PRIMARY KEY(tenant_id,migration_id,record_id),
  FOREIGN KEY(tenant_id,migration_id)
    REFERENCES md_field_type_migrations(tenant_id,id) ON DELETE CASCADE,
  FOREIGN KEY(tenant_id,record_id,object_api)
    REFERENCES md_records(tenant_id,id,object_api) ON DELETE CASCADE
);
-- END LEGACY 20261030-field-type-migrations.sql

-- BEGIN LEGACY 20261030-flow-service-user-setting.sql
CREATE TABLE IF NOT EXISTS md_tenant_automation_settings (
 tenant_id uuid PRIMARY KEY REFERENCES md_tenants(id) ON DELETE CASCADE,
 flow_service_user_id uuid,
 updated_by uuid NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,flow_service_user_id) REFERENCES md_users(tenant_id,id),
 FOREIGN KEY(tenant_id,updated_by) REFERENCES md_users(tenant_id,id)
);
-- END LEGACY 20261030-flow-service-user-setting.sql

-- BEGIN LEGACY 20261031-field-type-migration-projections.sql
ALTER TABLE md_field_type_migration_values
  ADD COLUMN IF NOT EXISTS before_value_exists boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS after_value_exists boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS before_snapshot_encrypted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS before_reference_record_id uuid,
  ADD COLUMN IF NOT EXISTS before_geo_latitude double precision,
  ADD COLUMN IF NOT EXISTS before_geo_longitude double precision,
  ADD COLUMN IF NOT EXISTS before_address_street text,
  ADD COLUMN IF NOT EXISTS before_address_city text,
  ADD COLUMN IF NOT EXISTS before_address_state text,
  ADD COLUMN IF NOT EXISTS before_address_postal_code text,
  ADD COLUMN IF NOT EXISTS before_address_country text,
  ADD COLUMN IF NOT EXISTS after_reference_record_id uuid,
  ADD COLUMN IF NOT EXISTS after_geo_latitude double precision,
  ADD COLUMN IF NOT EXISTS after_geo_longitude double precision,
  ADD COLUMN IF NOT EXISTS after_address_street text,
  ADD COLUMN IF NOT EXISTS after_address_city text,
  ADD COLUMN IF NOT EXISTS after_address_state text,
  ADD COLUMN IF NOT EXISTS after_address_postal_code text,
  ADD COLUMN IF NOT EXISTS after_address_country text;

CREATE TABLE IF NOT EXISTS md_field_type_migration_config (
  tenant_id uuid NOT NULL,
  migration_id uuid NOT NULL,
  side text NOT NULL CHECK(side IN ('from','to')),
  related_object text,
  global_value_set_api text,
  controller_field_api text,
  relationship_type text,
  relationship_name text,
  child_relationship_name text,
  delete_behavior text,
  allow_reparenting boolean NOT NULL DEFAULT false,
  picklist_restricted boolean NOT NULL DEFAULT true,
  auto_number_format text,
  formula_expression text,
  formula_return_type text,
  rollup_child_object text,
  rollup_relationship_field text,
  rollup_operation text,
  rollup_source_field text,
  rollup_filter_logic text,
  PRIMARY KEY(tenant_id,migration_id,side),
  FOREIGN KEY(tenant_id,migration_id)
    REFERENCES md_field_type_migrations(tenant_id,id) ON DELETE CASCADE
);

ALTER TABLE md_field_type_migration_config
  ADD COLUMN IF NOT EXISTS auto_number_counter_exists boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_number_next_value bigint;

CREATE TABLE IF NOT EXISTS md_field_type_migration_picklist_values (
  tenant_id uuid NOT NULL,
  migration_id uuid NOT NULL,
  side text NOT NULL CHECK(side IN ('from','to')),
  value text NOT NULL,
  sort_order integer NOT NULL,
  PRIMARY KEY(tenant_id,migration_id,side,value),
  FOREIGN KEY(tenant_id,migration_id,side)
    REFERENCES md_field_type_migration_config(tenant_id,migration_id,side) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS md_field_type_migration_rollup_filters (
  tenant_id uuid NOT NULL,
  migration_id uuid NOT NULL,
  side text NOT NULL CHECK(side IN ('from','to')),
  filter_field_api text NOT NULL,
  operator text NOT NULL,
  value_text text NOT NULL,
  sort_order integer NOT NULL,
  PRIMARY KEY(tenant_id,migration_id,side,sort_order),
  FOREIGN KEY(tenant_id,migration_id,side)
    REFERENCES md_field_type_migration_config(tenant_id,migration_id,side) ON DELETE CASCADE
);
-- END LEGACY 20261031-field-type-migration-projections.sql

-- BEGIN LEGACY 20261031-flow-trigger-subscriptions.sql
CREATE TABLE IF NOT EXISTS md_flow_trigger_subscriptions (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 flow_id uuid NOT NULL,
 flow_type text NOT NULL CHECK(flow_type IN (
  'Record-Triggered Flow','Schedule-Triggered Flow','Platform Event-Triggered Flow')),
 trigger_key text NOT NULL CHECK(length(trigger_key) BETWEEN 1 AND 255),
 app_api_name text,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,flow_id),
 FOREIGN KEY(tenant_id,flow_id) REFERENCES md_flow_definitions(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_flow_trigger_subscriptions_dispatch
 ON md_flow_trigger_subscriptions(tenant_id,flow_type,trigger_key,flow_id) WHERE active=true;
INSERT INTO md_flow_trigger_subscriptions
 (tenant_id,flow_id,flow_type,trigger_key,app_api_name,active)
SELECT DISTINCT ON (f.tenant_id,f.id) f.tenant_id,f.id,f.flow_type,
 COALESCE(object_value.value_text,event_value.value_text),app_value.value_text,true
FROM md_flow_definitions f
JOIN md_flow_editor_values start_type
 ON start_type.tenant_id=f.tenant_id AND start_type.flow_id=f.id
 AND start_type.property_path ~ '^/builder/elements/[0-9]+/type$'
 AND start_type.value_text='Start'
LEFT JOIN md_flow_editor_values object_value
 ON object_value.tenant_id=f.tenant_id AND object_value.flow_id=f.id
 AND object_value.property_path=regexp_replace(start_type.property_path,
  '/type$','/config/object')
LEFT JOIN md_flow_editor_values event_value
 ON event_value.tenant_id=f.tenant_id AND event_value.flow_id=f.id
 AND event_value.property_path=regexp_replace(start_type.property_path,
  '/type$','/config/eventName')
LEFT JOIN md_flow_editor_values app_value
 ON app_value.tenant_id=f.tenant_id AND app_value.flow_id=f.id
 AND app_value.property_path='/builder/appApiName'
WHERE f.active=true AND f.archived=false
 AND f.flow_type IN ('Record-Triggered Flow','Schedule-Triggered Flow','Platform Event-Triggered Flow')
 AND COALESCE(object_value.value_text,event_value.value_text) ~ '^[A-Za-z][A-Za-z0-9_]*$'
ORDER BY f.tenant_id,f.id,start_type.property_path
ON CONFLICT(tenant_id,flow_id) DO UPDATE SET flow_type=EXCLUDED.flow_type,
 trigger_key=EXCLUDED.trigger_key,app_api_name=EXCLUDED.app_api_name,
 active=true,updated_at=now();
-- END LEGACY 20261031-flow-trigger-subscriptions.sql

-- BEGIN LEGACY 20261101-platform-event-delivery.sql
CREATE TABLE IF NOT EXISTS md_platform_event_messages (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 event_api_name text NOT NULL,
 published_by uuid NOT NULL,
 published_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','queued','completed','failed')),
 idempotency_key text,
 error_code text,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,published_by) REFERENCES md_users(tenant_id,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS md_platform_event_messages_idempotency
 ON md_platform_event_messages(tenant_id,event_api_name,idempotency_key)
 WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS md_platform_event_messages_pending
 ON md_platform_event_messages(tenant_id,published_at,id) WHERE status='pending';
CREATE TABLE IF NOT EXISTS md_platform_event_values (
 tenant_id uuid NOT NULL,
 event_id uuid NOT NULL,
 field_api text NOT NULL,
 value_kind text NOT NULL CHECK(value_kind IN ('string','number','boolean','null')),
 value_text text,
 PRIMARY KEY(tenant_id,event_id,field_api),
 FOREIGN KEY(tenant_id,event_id) REFERENCES md_platform_event_messages(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_platform_event_deliveries (
 tenant_id uuid NOT NULL,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL,
 flow_id uuid NOT NULL,
 flow_version integer NOT NULL CHECK(flow_version>0),
 actor_user_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','completed','failed')),
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 PRIMARY KEY(tenant_id,id),
 UNIQUE(tenant_id,event_id,flow_id),
 FOREIGN KEY(tenant_id,event_id) REFERENCES md_platform_event_messages(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,flow_id) REFERENCES md_flow_definitions(tenant_id,id),
 FOREIGN KEY(tenant_id,actor_user_id) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_platform_event_deliveries_queue
 ON md_platform_event_deliveries(tenant_id,status,created_at,id) WHERE status='queued';
-- END LEGACY 20261101-platform-event-delivery.sql

-- BEGIN LEGACY 20261101-universal-business-context.sql
-- Universal, tenant-owned business context metadata and per-user active record.
CREATE TABLE IF NOT EXISTS md_context_definitions(
 tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 label text NOT NULL CHECK(length(trim(label)) BETWEEN 1 AND 200),
 object_api text NOT NULL,
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,api_name)
);
CREATE TABLE IF NOT EXISTS md_user_context_selections(
 tenant_id uuid NOT NULL,
 user_id uuid NOT NULL,
 context_api text NOT NULL,
 record_id uuid NOT NULL,
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,record_id) REFERENCES md_records(tenant_id,id) ON DELETE CASCADE,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,user_id,context_api),
 FOREIGN KEY(tenant_id,context_api) REFERENCES md_context_definitions(tenant_id,api_name) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_user_context_selections_record_idx
 ON md_user_context_selections(tenant_id,record_id);
-- END LEGACY 20261101-universal-business-context.sql

-- BEGIN LEGACY 20261102-platform-event-fields.sql
CREATE TABLE IF NOT EXISTS md_platform_event_details (
 tenant_id uuid NOT NULL,
 kind text NOT NULL DEFAULT 'platform-events' CHECK(kind='platform-events'),
 event_api_name text NOT NULL,
 description text NOT NULL DEFAULT '',
 PRIMARY KEY(tenant_id,event_api_name),
 FOREIGN KEY(tenant_id,kind,event_api_name)
  REFERENCES md_system_definitions(tenant_id,kind,api_name) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_platform_event_fields (
 tenant_id uuid NOT NULL,
 kind text NOT NULL DEFAULT 'platform-events' CHECK(kind='platform-events'),
 event_api_name text NOT NULL,
 field_api text NOT NULL,
 label text NOT NULL,
 data_type text NOT NULL CHECK(data_type IN (
  'Text(255)','Long Text Area','Number','Currency','Percent','Checkbox','Date','DateTime','Picklist')),
 required boolean NOT NULL DEFAULT false,
 picklist_restricted boolean NOT NULL DEFAULT false,
 sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order>=0),
 PRIMARY KEY(tenant_id,event_api_name,field_api),
 FOREIGN KEY(tenant_id,kind,event_api_name)
  REFERENCES md_system_definitions(tenant_id,kind,api_name) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_platform_event_picklist_values (
 tenant_id uuid NOT NULL,
 event_api_name text NOT NULL,
 field_api text NOT NULL,
 value_text text NOT NULL,
 sort_order integer NOT NULL CHECK(sort_order>=0),
 PRIMARY KEY(tenant_id,event_api_name,field_api,value_text),
 FOREIGN KEY(tenant_id,event_api_name,field_api)
  REFERENCES md_platform_event_fields(tenant_id,event_api_name,field_api) ON DELETE CASCADE
);
DO $migration$
BEGIN
 IF EXISTS(
  SELECT 1 FROM md_system_definitions d
  WHERE d.kind='platform-events' AND (
   d.properties-'fields'-'description'<>'{}'::jsonb
   OR COALESCE(jsonb_typeof(d.properties->'fields'),'')<>'array'
   OR jsonb_array_length(CASE WHEN jsonb_typeof(d.properties->'fields')='array'
    THEN d.properties->'fields' ELSE '[]'::jsonb END) NOT BETWEEN 1 AND 100
   OR EXISTS(
    SELECT 1 FROM jsonb_array_elements(
     CASE WHEN jsonb_typeof(d.properties->'fields')='array'
      THEN d.properties->'fields' ELSE '[]'::jsonb END
    ) f(field)
    WHERE COALESCE(jsonb_typeof(f.field),'')<>'object'
     OR COALESCE(f.field->>'apiName','') !~ '^[A-Za-z][A-Za-z0-9_]*$'
     OR COALESCE(length(btrim(f.field->>'label')),0) NOT BETWEEN 1 AND 255
     OR COALESCE(f.field->>'dataType','') NOT IN (
      'Text(255)','Long Text Area','Number','Currency','Percent','Checkbox','Date','DateTime','Picklist')
     OR (f.field ? 'required' AND COALESCE(jsonb_typeof(f.field->'required'),'')<>'boolean')
     OR (f.field ? 'picklistRestricted'
      AND COALESCE(jsonb_typeof(f.field->'picklistRestricted'),'')<>'boolean')
     OR (f.field ? 'picklistValues'
      AND COALESCE(jsonb_typeof(f.field->'picklistValues'),'')<>'array')
     OR jsonb_array_length(CASE WHEN jsonb_typeof(f.field->'picklistValues')='array'
      THEN f.field->'picklistValues' ELSE '[]'::jsonb END)>500
     OR (f.field->>'dataType'<>'Picklist' AND (
      CASE WHEN jsonb_typeof(f.field->'picklistRestricted')='boolean'
       THEN (f.field->>'picklistRestricted')::boolean ELSE false END
      OR jsonb_array_length(CASE WHEN jsonb_typeof(f.field->'picklistValues')='array'
       THEN f.field->'picklistValues' ELSE '[]'::jsonb END)>0
     ))
     OR (f.field->>'dataType'='Picklist'
      AND CASE WHEN jsonb_typeof(f.field->'picklistRestricted')='boolean'
       THEN (f.field->>'picklistRestricted')::boolean ELSE false END
      AND jsonb_array_length(CASE WHEN jsonb_typeof(f.field->'picklistValues')='array'
       THEN f.field->'picklistValues' ELSE '[]'::jsonb END)=0)
     OR EXISTS(
      SELECT 1 FROM jsonb_array_elements(
       CASE WHEN jsonb_typeof(f.field->'picklistValues')='array'
        THEN f.field->'picklistValues' ELSE '[]'::jsonb END
      ) v(value)
      WHERE COALESCE(jsonb_typeof(v.value),'')<>'string'
       OR COALESCE(length(btrim(v.value #>> '{}')),0) NOT BETWEEN 1 AND 255
     )
   )
   OR EXISTS(
    SELECT f.field->>'apiName' FROM jsonb_array_elements(
     CASE WHEN jsonb_typeof(d.properties->'fields')='array'
      THEN d.properties->'fields' ELSE '[]'::jsonb END
    ) f(field)
    GROUP BY f.field->>'apiName' HAVING count(*)>1
   )
  )
 ) THEN
  RAISE EXCEPTION 'Platform Event metadata must be repaired before relational migration';
 END IF;
END
$migration$;
INSERT INTO md_platform_event_details(tenant_id,event_api_name,description)
SELECT tenant_id,api_name,COALESCE(properties->>'description','')
FROM md_system_definitions WHERE kind='platform-events'
ON CONFLICT(tenant_id,event_api_name) DO NOTHING;
INSERT INTO md_platform_event_fields
 (tenant_id,event_api_name,field_api,label,data_type,required,picklist_restricted,sort_order)
SELECT DISTINCT ON (d.tenant_id,d.api_name,f.field->>'apiName')
 d.tenant_id,d.api_name,f.field->>'apiName',f.field->>'label',f.field->>'dataType',
 CASE WHEN f.field->>'required' IN ('true','false') THEN (f.field->>'required')::boolean ELSE false END,
 CASE WHEN f.field->>'picklistRestricted' IN ('true','false')
  THEN (f.field->>'picklistRestricted')::boolean ELSE false END,(f.ordinality-1)::integer
FROM md_system_definitions d
CROSS JOIN LATERAL jsonb_array_elements(
 CASE WHEN jsonb_typeof(d.properties->'fields')='array' THEN d.properties->'fields' ELSE '[]'::jsonb END
) WITH ORDINALITY AS f(field,ordinality)
WHERE d.kind='platform-events'
 AND f.field->>'apiName' ~ '^[A-Za-z][A-Za-z0-9_]*$'
 AND COALESCE(f.field->>'label','')<>''
 AND f.field->>'dataType' IN (
  'Text(255)','Long Text Area','Number','Currency','Percent','Checkbox','Date','DateTime','Picklist')
ORDER BY d.tenant_id,d.api_name,f.field->>'apiName',f.ordinality
ON CONFLICT(tenant_id,event_api_name,field_api) DO UPDATE SET
 label=EXCLUDED.label,data_type=EXCLUDED.data_type,required=EXCLUDED.required,
 picklist_restricted=EXCLUDED.picklist_restricted,sort_order=EXCLUDED.sort_order;
INSERT INTO md_platform_event_picklist_values
 (tenant_id,event_api_name,field_api,value_text,sort_order)
SELECT DISTINCT ON (d.tenant_id,d.api_name,f.field->>'apiName',v.value)
 d.tenant_id,d.api_name,f.field->>'apiName',v.value,(v.ordinality-1)::integer
FROM md_system_definitions d
CROSS JOIN LATERAL jsonb_array_elements(
 CASE WHEN jsonb_typeof(d.properties->'fields')='array' THEN d.properties->'fields' ELSE '[]'::jsonb END
) WITH ORDINALITY AS f(field,ordinality)
CROSS JOIN LATERAL jsonb_array_elements_text(
 CASE WHEN jsonb_typeof(f.field->'picklistValues')='array' THEN f.field->'picklistValues' ELSE '[]'::jsonb END
) WITH ORDINALITY AS v(value,ordinality)
WHERE d.kind='platform-events'
 AND f.field->>'dataType'='Picklist' AND v.value<>''
 AND EXISTS(SELECT 1 FROM md_platform_event_fields x WHERE x.tenant_id=d.tenant_id
  AND x.event_api_name=d.api_name AND x.field_api=f.field->>'apiName')
ORDER BY d.tenant_id,d.api_name,f.field->>'apiName',v.value,v.ordinality
ON CONFLICT(tenant_id,event_api_name,field_api,value_text) DO UPDATE SET
 sort_order=EXCLUDED.sort_order;
UPDATE md_system_definitions SET properties='{}'::jsonb WHERE kind='platform-events';
-- END LEGACY 20261102-platform-event-fields.sql

-- BEGIN LEGACY 20261103-flow-email-outbox.sql
CREATE TABLE IF NOT EXISTS md_flow_email_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 run_id uuid NOT NULL,
 flow_id uuid NOT NULL,
 flow_version integer NOT NULL CHECK(flow_version>0),
 node_id integer NOT NULL,
 step integer NOT NULL CHECK(step BETWEEN 0 AND 199),
 user_id uuid NOT NULL,
 credential_id uuid NOT NULL,
 payload_ciphertext bytea NOT NULL,
 encryption_key_id text NOT NULL,
 status text NOT NULL DEFAULT 'queued'
  CHECK(status IN ('queued','sending','completed','failed')),
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 claimed_at timestamptz,
 completed_at timestamptz,
 UNIQUE(tenant_id,id),
 UNIQUE(tenant_id,run_id,node_id,step),
 FOREIGN KEY(tenant_id,run_id) REFERENCES md_flow_runs(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,flow_id) REFERENCES md_flow_definitions(tenant_id,id),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id),
 FOREIGN KEY(tenant_id,credential_id) REFERENCES md_named_credentials(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_flow_email_jobs_queue
 ON md_flow_email_jobs(status,created_at,id) WHERE status='queued';
-- END LEGACY 20261103-flow-email-outbox.sql

-- BEGIN LEGACY 20261104-email-alert-details.sql
CREATE TABLE IF NOT EXISTS md_email_alert_details (
 tenant_id uuid NOT NULL,
 kind text NOT NULL DEFAULT 'email-alerts' CHECK(kind='email-alerts'),
 alert_api_name text NOT NULL,
 object_api text NOT NULL,
 credential_id uuid NOT NULL,
 from_email text NOT NULL,
 recipients text NOT NULL,
 subject text NOT NULL,
 body text NOT NULL,
 PRIMARY KEY(tenant_id,alert_api_name),
 FOREIGN KEY(tenant_id,kind,alert_api_name)
  REFERENCES md_system_definitions(tenant_id,kind,api_name) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,credential_id) REFERENCES md_named_credentials(tenant_id,id)
);
DO $migration$
BEGIN
 IF EXISTS(
  SELECT 1 FROM md_system_definitions d
  LEFT JOIN md_named_credentials c ON c.tenant_id=d.tenant_id
   AND c.id::text=d.properties->>'namedCredentialId'
   AND c.protocol='SMTP' AND c.enabled=true
  WHERE d.kind='email-alerts' AND (
   d.properties-'objectApiName'-'namedCredentialId'-'fromEmail'-'recipients'-'subject'-'body'
    <>'{}'::jsonb
   OR COALESCE(jsonb_typeof(d.properties->'objectApiName'),'')<>'string'
   OR COALESCE(jsonb_typeof(d.properties->'namedCredentialId'),'')<>'string'
   OR COALESCE(jsonb_typeof(d.properties->'fromEmail'),'')<>'string'
   OR COALESCE(jsonb_typeof(d.properties->'recipients'),'')<>'string'
   OR COALESCE(jsonb_typeof(d.properties->'subject'),'')<>'string'
   OR COALESCE(jsonb_typeof(d.properties->'body'),'')<>'string'
   OR COALESCE(d.properties->>'objectApiName','') !~ '^[A-Za-z][A-Za-z0-9_]*$'
   OR COALESCE(d.properties->>'namedCredentialId','') !~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
   OR COALESCE(d.properties->>'fromEmail','') !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
   OR length(d.properties->>'fromEmail')>254
   OR COALESCE(length(d.properties->>'recipients'),0) NOT BETWEEN 1 AND 4096
   OR COALESCE(length(btrim(d.properties->>'subject')),0) NOT BETWEEN 1 AND 300
   OR COALESCE(d.properties->>'subject','') ~ E'[\\r\\n]'
   OR COALESCE(length(d.properties->>'body'),0)>10000
   OR c.id IS NULL
  )
 ) THEN
  RAISE EXCEPTION 'Email Alert metadata or SMTP credentials must be repaired before relational migration';
 END IF;
END
$migration$;
INSERT INTO md_email_alert_details
 (tenant_id,alert_api_name,object_api,credential_id,from_email,recipients,subject,body)
SELECT tenant_id,api_name,properties->>'objectApiName',
 (properties->>'namedCredentialId')::uuid,properties->>'fromEmail',
 properties->>'recipients',properties->>'subject',properties->>'body'
FROM md_system_definitions WHERE kind='email-alerts'
ON CONFLICT(tenant_id,alert_api_name) DO NOTHING;
UPDATE md_system_definitions SET properties='{}'::jsonb WHERE kind='email-alerts';
-- END LEGACY 20261104-email-alert-details.sql

-- BEGIN LEGACY 20261105-flow-scheduled-paths.sql
ALTER TABLE md_flow_runs ADD COLUMN IF NOT EXISTS wait_kind text NOT NULL DEFAULT 'wait';
ALTER TABLE md_flow_runs DROP CONSTRAINT IF EXISTS md_flow_runs_wait_kind_check;
ALTER TABLE md_flow_runs ADD CONSTRAINT md_flow_runs_wait_kind_check
 CHECK(wait_kind IN ('wait','scheduled-path'));
-- END LEGACY 20261105-flow-scheduled-paths.sql

-- BEGIN LEGACY 20261105-record-recycle-bin.sql
-- Phase 1: recoverable tenant-scoped record deletion (additive, idempotent).
-- This migration preserves existing records and relationships.
ALTER TABLE md_records ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE md_records ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE md_records ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE md_records ADD COLUMN IF NOT EXISTS deletion_group_id uuid;
ALTER TABLE md_records ADD COLUMN IF NOT EXISTS deletion_root_id uuid;

-- Release unique values on soft delete; restore rechecks the existing unique indexes atomically.
ALTER TABLE md_record_values ADD COLUMN IF NOT EXISTS record_is_deleted boolean NOT NULL DEFAULT false;
UPDATE md_record_values v SET record_is_deleted=r.is_deleted
 FROM md_records r WHERE v.tenant_id=r.tenant_id AND v.record_id=r.id
 AND v.record_is_deleted IS DISTINCT FROM r.is_deleted;
DROP INDEX IF EXISTS md_record_values_unique_ci;
DROP INDEX IF EXISTS md_record_values_unique_cs;
CREATE UNIQUE INDEX md_record_values_unique_ci
 ON md_record_values(tenant_id,object_api,field_api,lower(value_text))
 WHERE is_unique AND NOT case_sensitive AND value_text IS NOT NULL AND record_is_deleted=false;
CREATE UNIQUE INDEX md_record_values_unique_cs
 ON md_record_values(tenant_id,object_api,field_api,value_text)
 WHERE is_unique AND case_sensitive AND value_text IS NOT NULL AND record_is_deleted=false;

CREATE INDEX IF NOT EXISTS md_records_active_lookup
 ON md_records(tenant_id,object_api,id) WHERE is_deleted=false;
CREATE INDEX IF NOT EXISTS md_records_recycle_bin
 ON md_records(tenant_id,object_api,deleted_at DESC,id) WHERE is_deleted=true;
CREATE INDEX IF NOT EXISTS md_records_deletion_group
 ON md_records(tenant_id,deletion_group_id) WHERE is_deleted=true;

-- A lookup cleared when its referenced record is deleted may be restored only
-- if the source remains active and the field has not been changed by a user.
CREATE TABLE IF NOT EXISTS md_deleted_lookup_links(
 tenant_id uuid NOT NULL,
 deletion_group_id uuid NOT NULL,
 source_record_id uuid NOT NULL,
 source_object_api text NOT NULL,
 field_api text NOT NULL,
 target_record_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,deletion_group_id,source_record_id,field_api),
 FOREIGN KEY(tenant_id,source_record_id,source_object_api)
   REFERENCES md_records(tenant_id,id,object_api) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_deleted_lookup_links_target
 ON md_deleted_lookup_links(tenant_id,deletion_group_id,target_record_id);

CREATE TABLE IF NOT EXISTS md_record_lifecycle_audit(
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 record_id uuid NOT NULL,
 object_api text NOT NULL,
 deletion_group_id uuid,
 actor_id uuid NOT NULL,
 operation text NOT NULL CHECK(operation IN ('delete','restore','purge')),
 happened_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_record_lifecycle_audit_record
 ON md_record_lifecycle_audit(tenant_id,object_api,record_id,happened_at DESC);

-- Apply the same active-record rule on upgraded tenants without replacing RBAC policy semantics.
CREATE OR REPLACE FUNCTION md_record_access(t uuid,u uuid,rid uuid,act text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT COALESCE((
 SELECT
 -- Object/record denies and restrictions also narrow ownership and broad grants.
 (NOT rec.is_deleted OR act='delete')
 AND NOT (SELECT deny_granted FROM md_rbac_decision(t,u,'Record:'||rec.id::text,act))
 AND md_rbac_allowed(t,u,rec.object_api,act)
 AND (rec.record_type_id IS NULL OR md_rbac_allowed(t,u,'RecordType:'||rec.object_api||'.'||rec.record_type_id,'read'))
 AND NOT EXISTS(SELECT 1 FROM md_record_policies rp WHERE rp.tenant_id=t AND rp.object_api=rec.object_api
  AND rp.kind='restriction' AND rp.enabled
  AND (rp.subject_type='all' OR (rp.subject_type='external' AND usr.user_type='external')
   OR (rp.subject_type='user' AND rp.subject_id=u) OR (rp.subject_type='role' AND EXISTS(
    SELECT 1 FROM md_user_roles ur WHERE ur.tenant_id=t AND ur.user_id=u AND ur.role_id=rp.subject_id)))
  AND NOT md_policy_matches(t,rp.id,rec.id))
 AND (CASE WHEN usr.user_type='external' THEN act='read' AND COALESCE(setting.portal_enabled,false)
   AND usr.external_account_id IS NOT NULL
   AND md_record_field(t,rec.id,setting.portal_account_field)=usr.external_account_id::text
 ELSE
 rec.owner_id=u OR (rec.owner_queue_id IS NOT NULL AND md_access_member(t,u,rec.owner_queue_id))
 OR md_rbac_allowed(t,u,'Record:'||rec.id::text,act)
 OR md_rbac_allowed(t,u,rec.object_api,'modifyAll')
 OR (act='read' AND (md_rbac_allowed(t,u,rec.object_api,'viewAll') OR md_rbac_allowed(t,u,'Record','viewAll')))
 OR (act='read' AND setting.default_access IN ('Public Read Only','Public Read/Write'))
 OR (act='edit' AND setting.default_access='Public Read/Write')
 OR (COALESCE(setting.use_hierarchy,true) AND EXISTS(
   SELECT 1 FROM md_user_role_tree(t,rec.owner_id) ancestor
   JOIN md_user_roles ur ON ur.tenant_id=t AND ur.user_id=u AND ur.role_id=ancestor.role_id
   WHERE NOT EXISTS(SELECT 1 FROM md_user_roles own WHERE own.tenant_id=t AND own.user_id=rec.owner_id AND own.role_id=ancestor.role_id)))
 OR (act IN ('read','edit') AND EXISTS(SELECT 1 FROM md_record_policies rp
  WHERE rp.tenant_id=t AND rp.object_api=rec.object_api AND rp.kind='share' AND rp.enabled
   AND (act='read' OR rp.access_level='Edit')
   AND (CASE rp.target_type WHEN 'User' THEN rp.target_id=u
    WHEN 'PublicGroup' THEN md_access_member(t,u,rp.target_id)
    WHEN 'Role' THEN EXISTS(SELECT 1 FROM md_user_roles ur WHERE ur.tenant_id=t AND ur.user_id=u AND ur.role_id=rp.target_id)
    WHEN 'RoleAndSubordinates' THEN rp.target_id IN(SELECT role_id FROM md_user_role_tree(t,u)) ELSE false END)
   AND (CASE rp.rule_type WHEN 'OwnerBased' THEN EXISTS(
    SELECT 1 FROM md_policy_owner_roles por JOIN md_user_roles own
     ON own.tenant_id=por.tenant_id AND own.role_id=por.role_id AND own.user_id=rec.owner_id
     WHERE por.tenant_id=t AND por.policy_id=rp.id)
    WHEN 'CriteriaBased' THEN md_policy_matches(t,rp.id,rec.id) ELSE false END)))
 END)
 FROM md_records rec JOIN md_users usr ON usr.tenant_id=t AND usr.id=u AND usr.enabled
 LEFT JOIN md_sharing_settings setting ON setting.tenant_id=t AND setting.object_api=rec.object_api
 WHERE rec.tenant_id=t AND rec.id=rid
 ),false)
$$;
-- END LEGACY 20261105-record-recycle-bin.sql

-- BEGIN LEGACY 20261105-scheduled-actions.sql
-- ScheduledAction: persistent, tenant-scoped action-sequence continuation.
-- The existing md_durable_jobs worker owns execution; no client timer or login
-- session is needed. Keep terminal rows for audit and reconciliation.
CREATE TABLE IF NOT EXISTS md_scheduled_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 job_id uuid NOT NULL,
 scheduled_by uuid NOT NULL,
 origin_session_id text,
 action_formula text NOT NULL CHECK(length(action_formula) BETWEEN 1 AND 4000),
 next_step integer NOT NULL CHECK(next_step>=0),
 -- JSON snapshot is only a bounded set of already-authorised formula inputs;
 -- never store bearer tokens, Named Credential secrets or browser cookies here.
 input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
 result_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL DEFAULT 'Pending'
   CHECK(status IN ('Pending','Running','Completed','Cancelled','Failed','ManuallyCompleted')),
 execute_at timestamptz NOT NULL,
 finished_at timestamptz,
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id),
 UNIQUE(tenant_id,job_id),
 FOREIGN KEY(tenant_id,job_id) REFERENCES md_durable_jobs(tenant_id,id),
 FOREIGN KEY(tenant_id,scheduled_by) REFERENCES md_users(tenant_id,id),
 CHECK(octet_length(input_snapshot::text)<=32768),
 CHECK(octet_length(result_snapshot::text)<=32768)
);
CREATE INDEX IF NOT EXISTS md_scheduled_actions_due ON md_scheduled_actions(execute_at,id)
 WHERE status='Pending';
CREATE INDEX IF NOT EXISTS md_scheduled_actions_tenant ON md_scheduled_actions(tenant_id,status,created_at DESC);
CREATE TABLE IF NOT EXISTS md_scheduled_action_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant_id uuid NOT NULL,
 scheduled_action_id uuid NOT NULL,
 step_number integer,
 action_name text,
 event_type text NOT NULL,
 actor_user_id uuid,
 detail_code text,
 occurred_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,scheduled_action_id) REFERENCES md_scheduled_actions(tenant_id,id),
 FOREIGN KEY(tenant_id,actor_user_id) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_scheduled_action_history_order
 ON md_scheduled_action_history(tenant_id,scheduled_action_id,id);
-- END LEGACY 20261105-scheduled-actions.sql

-- BEGIN LEGACY 20261105-setup-menu-permissions.sql
-- Idempotent permission-set presets for Setup navigation.
-- Preserve all existing non-navigation rules and assignments; reconcile only the requested menu grants.
-- Assign a new preset explicitly through the existing Users & Permissions editor.
-- Record-level read/edit must be granted separately on the relevant object/record.
CREATE OR REPLACE FUNCTION md_seed_setup_menu_permission_sets(target_tenant uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  preset record;
  preset_id uuid;
  created_set boolean;
BEGIN
  FOR preset IN SELECT * FROM (VALUES
    ('Administrator',ARRAY['CompanySettings','SecurityRecovery','ConnectedApps','AuditTrail','ObjectManager','Records','DataLoader','AppExchange','ReportsBuilder','DashboardBuilder','ReportsView','DashboardsView','Users','Roles','Profiles','PermissionSets','PermissionSetGroups']::text[],ARRAY['ObjectDefinition|read','ObjectDefinition|create','ObjectDefinition|manage','Security|read','Security|manage','ConnectedApp|manage','SetupAudit|read','User|read','User|create','User|edit','User|delete','SystemDefinition:reports|read','SystemDefinition:reports|manage','SystemDefinition:dashboards|read','SystemDefinition:dashboards|manage']::text[]),
    ('Developer',ARRAY['CompanySettings','SecurityRecovery','ConnectedApps','AuditTrail','ObjectManager','Records','DataLoader','AppExchange','ReportsBuilder','DashboardBuilder','ReportsView','DashboardsView','Users','Roles','Profiles','PermissionSets','PermissionSetGroups','AppManager','NamedCredentials','WebhookEndpoints','Flows','PausedInterviews','ScheduledFlows','FlowHistory','ProcessAutomation','PublicGroups','SharingSettings','SharingRules']::text[],ARRAY['ObjectDefinition|read','ObjectDefinition|create','ObjectDefinition|manage','Security|read','Security|manage','ConnectedApp|manage','SetupAudit|read','User|read','User|create','User|edit','User|delete','SystemDefinition:reports|read','SystemDefinition:reports|manage','SystemDefinition:dashboards|read','SystemDefinition:dashboards|manage','NamedCredential|read','NamedCredential|manage','WebhookSubscription|read','WebhookSubscription|manage','FlowDefinition|manage','Flow|execute','ApprovalRequest|manage']::text[]),
    ('User',ARRAY['Records','ReportsView','DashboardsView']::text[],ARRAY['SystemDefinition:reports|read','SystemDefinition:dashboards|read']::text[])
  ) AS p(api_name,visible_menus,api_rights)
  LOOP
    INSERT INTO md_permission_sets(tenant_id,api_name,label,description,navigation_default_access)
    VALUES(target_tenant,preset.api_name,preset.api_name,
      'Standard Setup navigation preset; assign explicitly to users, profiles or groups','Deny')
    ON CONFLICT(tenant_id,api_name) DO NOTHING;
    created_set := FOUND;
    SELECT id INTO preset_id FROM md_permission_sets
      WHERE tenant_id=target_tenant AND api_name=preset.api_name;
    -- Add required menu grants to existing presets without changing their API/record rules.
    INSERT INTO md_permission_rules(tenant_id,permission_set_id,resource,action,effect)
    SELECT target_tenant,preset_id,'SetupMenu:'||menu,'read','allow'
      FROM unnest(preset.visible_menus) AS menu
    ON CONFLICT(tenant_id,permission_set_id,resource,action) DO NOTHING;
    IF created_set THEN
      INSERT INTO md_permission_rules(tenant_id,permission_set_id,resource,action,effect)
      SELECT target_tenant,preset_id,split_part(capability,'|',1),split_part(capability,'|',2),'allow'
        FROM unnest(preset.api_rights) AS capability
      ON CONFLICT(tenant_id,permission_set_id,resource,action) DO NOTHING;
    END IF;
  END LOOP;
END
$$;

-- Backfill missing presets and the new navigation tokens, without changing existing API rules.
SELECT md_seed_setup_menu_permission_sets(id) FROM md_tenants;

-- Registration makes each capability editable in the existing permission-set UI.
-- The later governance migration's CREATE TABLE IF NOT EXISTS is harmless.
CREATE TABLE IF NOT EXISTS md_system_permission_catalogue(
 permission_key text PRIMARY KEY,label text NOT NULL,description text NOT NULL,resource text NOT NULL,action text NOT NULL
);
INSERT INTO md_system_permission_catalogue(permission_key,label,description,resource,action) VALUES
 ('setup:TenantManagement:view','Setup / Tenant Management','Show the Tenant Management destination in Settings navigation','SetupMenu:TenantManagement','read'),
 ('setup:CompanySettings:view','Setup / Company Settings','Show the Company Settings destination in Settings navigation','SetupMenu:CompanySettings','read'),
 ('setup:SecurityRecovery:view','Setup / Security & Recovery','Show the Security & Recovery destination in Settings navigation','SetupMenu:SecurityRecovery','read'),
 ('setup:ConnectedApps:view','Setup / Connected Apps','Show the Connected Apps destination in Settings navigation','SetupMenu:ConnectedApps','read'),
 ('setup:AuditTrail:view','Setup / Audit Trail','Show the Audit Trail destination in Settings navigation','SetupMenu:AuditTrail','read'),
 ('setup:ObjectManager:view','Setup / Object Manager','Show the Object Manager destination in Settings navigation','SetupMenu:ObjectManager','read'),
 ('setup:Records:view','Setup / Records','Show the Records destination in Settings navigation','SetupMenu:Records','read'),
 ('setup:DataLoader:view','Setup / Data Loader','Show the Data Loader destination in Settings navigation','SetupMenu:DataLoader','read'),
 ('setup:PageBuilder:view','Setup / Page Builder','Show the Page Builder destination in Settings navigation','SetupMenu:PageBuilder','read'),
 ('setup:AppManager:view','Setup / App Manager','Show the App Manager destination in Settings navigation','SetupMenu:AppManager','read'),
 ('setup:AppExchange:view','Setup / AppExchange','Show the AppExchange destination in Settings navigation','SetupMenu:AppExchange','read'),
 ('setup:NamedCredentials:view','Setup / Named Credentials','Show the Named Credentials destination in Settings navigation','SetupMenu:NamedCredentials','read'),
 ('setup:WebhookEndpoints:view','Setup / Webhook Endpoints','Show the Webhook Endpoints destination in Settings navigation','SetupMenu:WebhookEndpoints','read'),
 ('setup:NamedDevices:view','Setup / Named Devices','Show the Named Devices destination in Settings navigation','SetupMenu:NamedDevices','read'),
 ('setup:Flows:view','Setup / Flows','Show the Flows destination in Settings navigation','SetupMenu:Flows','read'),
 ('setup:PausedInterviews:view','Setup / Paused Interviews','Show the Paused Interviews destination in Settings navigation','SetupMenu:PausedInterviews','read'),
 ('setup:ScheduledFlows:view','Setup / Scheduled Flows','Show the Scheduled Flows destination in Settings navigation','SetupMenu:ScheduledFlows','read'),
 ('setup:FlowHistory:view','Setup / Flow History','Show the Flow History destination in Settings navigation','SetupMenu:FlowHistory','read'),
 ('setup:ProcessAutomation:view','Setup / Process Automation','Show the Process Automation destination in Settings navigation','SetupMenu:ProcessAutomation','read'),
 ('setup:ReportsBuilder:view','Setup / Reports Builder','Show the Reports Builder destination in Settings navigation','SetupMenu:ReportsBuilder','read'),
 ('setup:DashboardBuilder:view','Setup / Dashboard Builder','Show the Dashboard Builder destination in Settings navigation','SetupMenu:DashboardBuilder','read'),
 ('setup:ReportsView:view','Setup / Reports View','Show the Reports View destination in Settings navigation','SetupMenu:ReportsView','read'),
 ('setup:DashboardsView:view','Setup / Dashboard View','Show the Dashboard View destination in Settings navigation','SetupMenu:DashboardsView','read'),
 ('setup:Users:view','Setup / Users','Show the Users destination in Settings navigation','SetupMenu:Users','read'),
 ('setup:Roles:view','Setup / Roles','Show the Roles destination in Settings navigation','SetupMenu:Roles','read'),
 ('setup:PublicGroups:view','Setup / Public Groups','Show the Public Groups destination in Settings navigation','SetupMenu:PublicGroups','read'),
 ('setup:Profiles:view','Setup / Profiles','Show the Profiles destination in Settings navigation','SetupMenu:Profiles','read'),
 ('setup:PermissionSets:view','Setup / Permission Sets','Show the Permission Sets destination in Settings navigation','SetupMenu:PermissionSets','read'),
 ('setup:PermissionSetGroups:view','Setup / Permission Set Groups','Show the Permission Set Groups destination in Settings navigation','SetupMenu:PermissionSetGroups','read'),
 ('setup:SharingSettings:view','Setup / Sharing Settings','Show the Sharing Settings destination in Settings navigation','SetupMenu:SharingSettings','read'),
 ('setup:SharingRules:view','Setup / Sharing Rules','Show the Sharing Rules destination in Settings navigation','SetupMenu:SharingRules','read')
ON CONFLICT(permission_key) DO NOTHING;
-- END LEGACY 20261105-setup-menu-permissions.sql

-- BEGIN LEGACY 20261106-object-quick-actions.sql
CREATE TABLE IF NOT EXISTS md_object_actions (
  tenant_id uuid NOT NULL,
  object_api text NOT NULL,
  action_id text NOT NULL,
  label text NOT NULL,
  action_type text NOT NULL CHECK(action_type IN ('Standard','Custom')),
  enabled boolean NOT NULL DEFAULT true,
  behavior text,
  field_api text,
  value_text text,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY(tenant_id,object_api,action_id),
  FOREIGN KEY(tenant_id,object_api)
    REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE,
  FOREIGN KEY(tenant_id,object_api,field_api)
    REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE,
  CHECK(action_id ~ '^[A-Za-z][A-Za-z0-9_-]*$'),
  CHECK(length(label) BETWEEN 1 AND 80),
  CHECK(value_text IS NULL OR length(value_text)<=10000),
  CHECK((action_type='Custom' AND behavior='Set Field Value' AND field_api IS NOT NULL
      AND value_text IS NOT NULL) OR (action_type='Standard' AND behavior IS NULL
      AND field_api IS NULL AND value_text IS NULL))
);
-- END LEGACY 20261106-object-quick-actions.sql

-- BEGIN LEGACY 20261106-record-retention.sql
-- Opt-in retention policy. A tenant administrator must explicitly enable
-- automatic purging; there is no platform-wide implicit destruction of data.
CREATE TABLE IF NOT EXISTS md_record_retention_settings (
 tenant_id uuid PRIMARY KEY REFERENCES md_tenants(id),
 retention_days integer NOT NULL DEFAULT 15 CHECK(retention_days BETWEEN 1 AND 3650),
 automatic_purge_enabled boolean NOT NULL DEFAULT false,
 configured_by uuid,
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,configured_by) REFERENCES md_users(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_record_retention_audit (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 actor_id uuid NOT NULL,
 retention_days integer NOT NULL,
 automatic_purge_enabled boolean NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,actor_id) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_record_retention_audit_lookup
 ON md_record_retention_audit(tenant_id,changed_at DESC);
-- END LEGACY 20261106-record-retention.sql

-- BEGIN LEGACY 20261107-flow-active-version.sql
UPDATE md_flow_definitions SET active=false
WHERE active=true AND archived=true;

WITH ranked_active_versions AS (
 SELECT tenant_id,api_name,id,
  row_number() OVER (PARTITION BY tenant_id,api_name ORDER BY version DESC,id DESC) AS active_position
 FROM md_flow_definitions
 WHERE active=true AND archived=false
)
UPDATE md_flow_definitions f SET active=false
FROM ranked_active_versions r
WHERE f.tenant_id=r.tenant_id AND f.id=r.id AND r.active_position>1;

UPDATE md_flow_trigger_subscriptions s SET active=false,updated_at=now()
FROM md_flow_definitions f
WHERE s.tenant_id=f.tenant_id AND s.flow_id=f.id AND s.active=true
 AND (f.active=false OR f.archived=true);

CREATE UNIQUE INDEX IF NOT EXISTS md_flow_definitions_one_active_version
 ON md_flow_definitions(tenant_id,api_name) WHERE active=true;
-- END LEGACY 20261107-flow-active-version.sql

-- BEGIN LEGACY 20261107-universal-object-actions.sql
-- Phase 2: extend the existing shared Object Actions registry; preserve all tenant customisations.
ALTER TABLE md_object_actions ADD COLUMN IF NOT EXISTS target_object_api text;
ALTER TABLE md_object_actions ADD COLUMN IF NOT EXISTS relationship_field_api text;
ALTER TABLE md_object_actions ADD COLUMN IF NOT EXISTS flow_api_name text;

DO $$
DECLARE old_name text;
BEGIN
 FOR old_name IN SELECT c.conname FROM pg_constraint c
   WHERE c.conrelid='md_object_actions'::regclass AND c.contype='c'
     AND pg_get_constraintdef(c.oid) LIKE '%Set Field Value%'
 LOOP
   EXECUTE format('ALTER TABLE md_object_actions DROP CONSTRAINT %I',old_name);
 END LOOP;
END $$;

ALTER TABLE md_object_actions DROP CONSTRAINT IF EXISTS md_object_actions_behavior_contract;
ALTER TABLE md_object_actions ADD CONSTRAINT md_object_actions_behavior_contract CHECK(
 (action_type='Standard' AND behavior IS NULL AND field_api IS NULL AND value_text IS NULL
  AND target_object_api IS NULL AND relationship_field_api IS NULL AND flow_api_name IS NULL)
 OR (action_type='Custom' AND (
   (behavior='Set Field Value' AND field_api IS NOT NULL AND value_text IS NOT NULL
     AND target_object_api IS NULL AND flow_api_name IS NULL AND relationship_field_api IS NULL)
   OR (behavior='Log Call' AND field_api IS NULL AND target_object_api IS NULL
     AND flow_api_name IS NULL AND relationship_field_api IS NULL)
   OR (behavior='Run Flow' AND flow_api_name IS NOT NULL AND field_api IS NULL
     AND target_object_api IS NULL AND relationship_field_api IS NULL)
   OR (behavior='Create Related' AND target_object_api IS NOT NULL
     AND relationship_field_api IS NOT NULL AND field_api IS NULL AND flow_api_name IS NULL)
 ))
);
CREATE INDEX IF NOT EXISTS md_object_actions_enabled_lookup
 ON md_object_actions(tenant_id,object_api,action_id) WHERE enabled=true;
-- END LEGACY 20261107-universal-object-actions.sql

-- BEGIN LEGACY 20261108-email-quick-actions.sql
-- Phase 2: an email Quick Action is a credential reference plus sender address,
-- never a stored password or provider-specific integration.
ALTER TABLE md_object_actions ADD COLUMN IF NOT EXISTS credential_id uuid;
ALTER TABLE md_object_actions ADD COLUMN IF NOT EXISTS from_email text;
ALTER TABLE md_object_actions DROP CONSTRAINT IF EXISTS md_object_actions_behavior_contract;
ALTER TABLE md_object_actions ADD CONSTRAINT md_object_actions_behavior_contract CHECK(
 (action_type='Standard' AND behavior IS NULL AND field_api IS NULL AND value_text IS NULL
  AND target_object_api IS NULL AND relationship_field_api IS NULL AND flow_api_name IS NULL
  AND credential_id IS NULL AND from_email IS NULL)
 OR (action_type='Custom' AND (
   (behavior='Set Field Value' AND field_api IS NOT NULL AND value_text IS NOT NULL
     AND target_object_api IS NULL AND flow_api_name IS NULL AND relationship_field_api IS NULL
     AND credential_id IS NULL AND from_email IS NULL)
   OR (behavior='Log Call' AND field_api IS NULL AND target_object_api IS NULL
     AND flow_api_name IS NULL AND relationship_field_api IS NULL AND credential_id IS NULL AND from_email IS NULL)
   OR (behavior='Run Flow' AND flow_api_name IS NOT NULL AND field_api IS NULL
     AND target_object_api IS NULL AND relationship_field_api IS NULL AND credential_id IS NULL AND from_email IS NULL)
   OR (behavior='Create Related' AND target_object_api IS NOT NULL
     AND relationship_field_api IS NOT NULL AND field_api IS NULL AND flow_api_name IS NULL
     AND credential_id IS NULL AND from_email IS NULL)
   OR (behavior='Send Email' AND credential_id IS NOT NULL AND from_email IS NOT NULL
     AND length(from_email)<=254 AND from_email~'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
     AND field_api IS NULL AND flow_api_name IS NULL AND relationship_field_api IS NULL
     AND target_object_api IS NULL AND value_text IS NULL)
  ))
);
-- END LEGACY 20261108-email-quick-actions.sql

-- BEGIN LEGACY 20261108-flow-execution-context.sql
ALTER TABLE md_flow_definitions ADD COLUMN IF NOT EXISTS system_context_approved_by uuid;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint
   WHERE conname='md_flow_definitions_system_context_approved_by_fkey') THEN
  ALTER TABLE md_flow_definitions
   ADD CONSTRAINT md_flow_definitions_system_context_approved_by_fkey
   FOREIGN KEY(tenant_id,system_context_approved_by) REFERENCES md_users(tenant_id,id);
 END IF;
END $$;

ALTER TABLE md_flow_runs ADD COLUMN IF NOT EXISTS initiated_by uuid;
UPDATE md_flow_runs SET initiated_by=started_by WHERE initiated_by IS NULL;
ALTER TABLE md_flow_runs ALTER COLUMN initiated_by SET NOT NULL;
ALTER TABLE md_flow_runs ADD COLUMN IF NOT EXISTS execution_context text NOT NULL DEFAULT 'User';
ALTER TABLE md_flow_runs DROP CONSTRAINT IF EXISTS md_flow_runs_execution_context_check;
ALTER TABLE md_flow_runs ADD CONSTRAINT md_flow_runs_execution_context_check
 CHECK(execution_context IN ('User','System'));
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='md_flow_runs_initiated_by_fkey') THEN
  ALTER TABLE md_flow_runs ADD CONSTRAINT md_flow_runs_initiated_by_fkey
   FOREIGN KEY(tenant_id,initiated_by) REFERENCES md_users(tenant_id,id);
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS md_flow_execution_audit (
 tenant_id uuid NOT NULL,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 flow_id uuid NOT NULL,
 run_id uuid,
 actor_user_id uuid NOT NULL,
 initiating_user_id uuid NOT NULL,
 event text NOT NULL CHECK(event IN ('system-context-approved','system-context-run')),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,flow_id) REFERENCES md_flow_definitions(tenant_id,id),
 FOREIGN KEY(tenant_id,run_id) REFERENCES md_flow_runs(tenant_id,id),
 FOREIGN KEY(tenant_id,actor_user_id) REFERENCES md_users(tenant_id,id),
 FOREIGN KEY(tenant_id,initiating_user_id) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_flow_execution_audit_lookup
 ON md_flow_execution_audit(tenant_id,flow_id,occurred_at DESC);
-- END LEGACY 20261108-flow-execution-context.sql

-- BEGIN LEGACY 20261109-global-quick-actions.sql
-- Global Quick Actions use one tenant metadata registry and shared execution permissions.
CREATE TABLE IF NOT EXISTS md_global_quick_actions(
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 action_id text NOT NULL CHECK(action_id ~ '^[A-Za-z][A-Za-z0-9_-]*$' AND length(action_id)<=100),
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 80),
 behavior text NOT NULL CHECK(behavior IN ('Create Record','Run Flow','Send Email')),
 enabled boolean NOT NULL DEFAULT true,
 target_object_api text,
 flow_api_name text,
 credential_id uuid,
 from_email text,
 sort_order integer NOT NULL DEFAULT 0,
 PRIMARY KEY(tenant_id,action_id),
 FOREIGN KEY(tenant_id,target_object_api) REFERENCES md_object_definitions(tenant_id,api_name),
 CHECK(
 (behavior='Create Record' AND target_object_api IS NOT NULL AND flow_api_name IS NULL
   AND credential_id IS NULL AND from_email IS NULL)
 OR (behavior='Run Flow' AND flow_api_name IS NOT NULL AND target_object_api IS NULL
   AND credential_id IS NULL AND from_email IS NULL)
 OR (behavior='Send Email' AND credential_id IS NOT NULL AND from_email IS NOT NULL
   AND length(from_email)<=254 AND from_email~'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
   AND target_object_api IS NULL AND flow_api_name IS NULL))
);
CREATE INDEX IF NOT EXISTS md_global_quick_actions_active
 ON md_global_quick_actions(tenant_id,sort_order,action_id) WHERE enabled=true;
-- END LEGACY 20261109-global-quick-actions.sql

-- BEGIN LEGACY 20261110-quick-action-email-queue.sql
-- Queued Quick Action email reuses the existing encrypted SMTP credential service.
-- A client-generated request key deduplicates retries without retrying unknown SMTP outcomes.
CREATE TABLE IF NOT EXISTS md_quick_action_email_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 user_id uuid NOT NULL,
 object_api text NOT NULL,
 record_id uuid,
 action_id text NOT NULL,
 credential_id uuid NOT NULL,
 payload_ciphertext bytea NOT NULL,
 encryption_key_id text NOT NULL,
 request_key uuid NOT NULL,
 payload_digest text NOT NULL CHECK(payload_digest ~ '^[0-9a-f]{64}$'),
 status text NOT NULL DEFAULT 'queued'
  CHECK(status IN ('queued','sending','completed','failed')),
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 claimed_at timestamptz,
 completed_at timestamptz,
 UNIQUE(tenant_id,id),
 UNIQUE(tenant_id,user_id,request_key),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id),
 FOREIGN KEY(tenant_id,credential_id) REFERENCES md_named_credentials(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_quick_action_email_jobs_queue
 ON md_quick_action_email_jobs(status,created_at,id) WHERE status='queued';
-- END LEGACY 20261110-quick-action-email-queue.sql

-- BEGIN LEGACY 20261111-enhanced-related-lists.sql
-- Phase 3: independent, tenant-owned related-list presentation metadata.
-- Existing rows keep the default behavior; no customer layout is overwritten.
ALTER TABLE md_object_page_layout_related_lists
 ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE md_object_page_layout_related_lists
 DROP CONSTRAINT IF EXISTS md_related_list_settings_object;
ALTER TABLE md_object_page_layout_related_lists
 ADD CONSTRAINT md_related_list_settings_object CHECK(jsonb_typeof(settings)='object');
-- END LEGACY 20261111-enhanced-related-lists.sql

-- BEGIN LEGACY 20261111-universal-component-quick-actions.sql
-- Reusable Open Component Quick Actions. Retains existing tenant metadata and records.
ALTER TABLE md_object_actions ADD COLUMN IF NOT EXISTS component_api_name text;
ALTER TABLE md_object_actions ADD COLUMN IF NOT EXISTS component_bindings jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE md_object_actions DROP CONSTRAINT IF EXISTS md_object_actions_component_bindings_check;
ALTER TABLE md_object_actions ADD CONSTRAINT md_object_actions_component_bindings_check
 CHECK(jsonb_typeof(component_bindings)='array' AND jsonb_array_length(component_bindings)<=20);
ALTER TABLE md_object_actions ADD COLUMN IF NOT EXISTS presentation text NOT NULL DEFAULT 'Modal';
ALTER TABLE md_global_quick_actions ADD COLUMN IF NOT EXISTS component_api_name text;
ALTER TABLE md_global_quick_actions ADD COLUMN IF NOT EXISTS component_bindings jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE md_global_quick_actions DROP CONSTRAINT IF EXISTS md_global_quick_actions_component_bindings_check;
ALTER TABLE md_global_quick_actions ADD CONSTRAINT md_global_quick_actions_component_bindings_check
 CHECK(jsonb_typeof(component_bindings)='array' AND jsonb_array_length(component_bindings)<=20);
ALTER TABLE md_global_quick_actions ADD COLUMN IF NOT EXISTS presentation text NOT NULL DEFAULT 'Modal';
ALTER TABLE md_object_actions DROP CONSTRAINT IF EXISTS md_object_actions_presentation_check;
ALTER TABLE md_object_actions ADD CONSTRAINT md_object_actions_presentation_check
 CHECK(presentation IN ('Modal','Side Panel'));
ALTER TABLE md_global_quick_actions DROP CONSTRAINT IF EXISTS md_global_quick_actions_presentation_check;
ALTER TABLE md_global_quick_actions ADD CONSTRAINT md_global_quick_actions_presentation_check
 CHECK(presentation IN ('Modal','Side Panel'));
-- The legacy global behavior CHECK was unnamed. Drop only constraints mentioning the action kinds.
DO $$
DECLARE old_name text;
BEGIN
 FOR old_name IN SELECT c.conname FROM pg_constraint c
  WHERE c.conrelid='md_global_quick_actions'::regclass AND c.contype='c'
   AND pg_get_constraintdef(c.oid) LIKE '%Create Record%'
 LOOP
  EXECUTE format('ALTER TABLE md_global_quick_actions DROP CONSTRAINT %I',old_name);
 END LOOP;
END $$;
ALTER TABLE md_object_actions DROP CONSTRAINT IF EXISTS md_object_actions_behavior_contract;
ALTER TABLE md_object_actions ADD CONSTRAINT md_object_actions_behavior_contract CHECK(
 (action_type='Standard' AND behavior IS NULL AND field_api IS NULL AND value_text IS NULL
  AND target_object_api IS NULL AND relationship_field_api IS NULL AND flow_api_name IS NULL
  AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
 OR (action_type='Custom' AND (
   (behavior='Set Field Value' AND field_api IS NOT NULL AND value_text IS NOT NULL
     AND target_object_api IS NULL AND flow_api_name IS NULL AND relationship_field_api IS NULL
     AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
   OR (behavior='Log Call' AND field_api IS NULL AND target_object_api IS NULL
     AND flow_api_name IS NULL AND relationship_field_api IS NULL AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
   OR (behavior='Run Flow' AND flow_api_name IS NOT NULL AND field_api IS NULL
     AND target_object_api IS NULL AND relationship_field_api IS NULL AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
   OR (behavior='Create Related' AND target_object_api IS NOT NULL
     AND relationship_field_api IS NOT NULL AND field_api IS NULL AND flow_api_name IS NULL
     AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
   OR (behavior='Send Email' AND credential_id IS NOT NULL AND from_email IS NOT NULL
     AND length(from_email)<=254 AND from_email~'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
     AND field_api IS NULL AND flow_api_name IS NULL AND relationship_field_api IS NULL
     AND target_object_api IS NULL AND value_text IS NULL AND component_api_name IS NULL)
    OR (behavior='Open Component' AND component_api_name IS NOT NULL AND field_api IS NULL
      AND value_text IS NULL AND target_object_api IS NULL AND relationship_field_api IS NULL
      AND flow_api_name IS NULL AND credential_id IS NULL AND from_email IS NULL)
  )));
ALTER TABLE md_global_quick_actions DROP CONSTRAINT IF EXISTS md_global_quick_actions_behavior_contract;
ALTER TABLE md_global_quick_actions ADD CONSTRAINT md_global_quick_actions_behavior_contract CHECK(
 (behavior='Create Record' AND target_object_api IS NOT NULL AND flow_api_name IS NULL
   AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
 OR (behavior='Run Flow' AND flow_api_name IS NOT NULL AND target_object_api IS NULL
   AND credential_id IS NULL AND from_email IS NULL AND component_api_name IS NULL)
 OR (behavior='Send Email' AND credential_id IS NOT NULL AND from_email IS NOT NULL
   AND length(from_email)<=254 AND from_email~'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
   AND target_object_api IS NULL AND flow_api_name IS NULL AND component_api_name IS NULL)
 OR (behavior='Open Component' AND component_api_name IS NOT NULL AND target_object_api IS NULL
   AND flow_api_name IS NULL AND credential_id IS NULL AND from_email IS NULL));
-- END LEGACY 20261111-universal-component-quick-actions.sql

-- BEGIN LEGACY 20261112-conditional-custom-links.sql
-- Optional declarative link visibility; empty conditions preserve existing links.
ALTER TABLE md_object_page_layout_links
 ADD COLUMN IF NOT EXISTS visible_when_field text;
ALTER TABLE md_object_page_layout_links
 ADD COLUMN IF NOT EXISTS visible_when_value text;
ALTER TABLE md_object_page_layout_links
 DROP CONSTRAINT IF EXISTS md_record_link_visibility_pair;
ALTER TABLE md_object_page_layout_links
 ADD CONSTRAINT md_record_link_visibility_pair CHECK (
  (visible_when_field IS NULL AND visible_when_value IS NULL)
  OR (visible_when_field ~ '^[A-Za-z][A-Za-z0-9_]*$'
    AND visible_when_value IS NOT NULL AND length(visible_when_value)<=256)
 );
-- END LEGACY 20261112-conditional-custom-links.sql

-- BEGIN LEGACY 20261112-flow-capability-registry.sql
-- Shared Core Flow capabilities are relational SQL metadata, not runtime JSON.
CREATE TABLE IF NOT EXISTS md_flow_capability_flow_types (
 flow_type text PRIMARY KEY,
 description text NOT NULL,
 sort_order integer NOT NULL,
 create_enabled boolean NOT NULL DEFAULT false,
 validate_enabled boolean NOT NULL DEFAULT false,
 debug_enabled boolean NOT NULL DEFAULT false,
 enabled boolean NOT NULL DEFAULT true,
 registry_version integer NOT NULL DEFAULT 1 CHECK(registry_version>0)
);
CREATE TABLE IF NOT EXISTS md_flow_capability_elements (
 element_type text PRIMARY KEY,
 display_group text NOT NULL,
 display_icon text NOT NULL,
 sort_order integer NOT NULL,
 builder_enabled boolean NOT NULL DEFAULT false,
 before_save_allowed boolean NOT NULL DEFAULT false,
 config_schema_key text NOT NULL,
 validator_key text NOT NULL,
 runtime_handler_key text NOT NULL,
 debug_behavior text NOT NULL CHECK(debug_behavior IN ('execute','simulate','unsupported')),
 app_api_name text,
 enabled boolean NOT NULL DEFAULT true,
 registry_version integer NOT NULL DEFAULT 1 CHECK(registry_version>0)
);
CREATE TABLE IF NOT EXISTS md_flow_capability_element_flows (
 element_type text NOT NULL REFERENCES md_flow_capability_elements(element_type),
 flow_type text NOT NULL REFERENCES md_flow_capability_flow_types(flow_type),
 builder_allowed boolean NOT NULL DEFAULT false,
 PRIMARY KEY(element_type,flow_type)
);
CREATE TABLE IF NOT EXISTS md_flow_capability_properties (
 element_type text NOT NULL REFERENCES md_flow_capability_elements(element_type),
 property_name text NOT NULL,
 value_type text NOT NULL CHECK(value_type IN ('text','number','boolean','resource','list','object')),
 required boolean NOT NULL DEFAULT false,
 sort_order integer NOT NULL DEFAULT 0,
 PRIMARY KEY(element_type,property_name)
);

-- Idempotent Core seed: do not overwrite administrator modifications or published Flow metadata.
INSERT INTO md_flow_capability_flow_types
(flow_type,description,sort_order,create_enabled,validate_enabled,debug_enabled)
VALUES
 ('Screen Flow','Guide a user through screens and actions.',0,true,true,true),
 ('Autolaunched Flow','Run without screens or from another flow.',10,true,true,true),
 ('Record-Triggered Flow','Run when a record changes.',20,false,true,true),
 ('Schedule-Triggered Flow','Run on a durable schedule.',30,false,true,false),
 ('Platform Event-Triggered Flow','Run after a subscribed platform event.',40,false,true,false),
 ('Flow Orchestration','Coordinate staged human approvals.',50,false,false,false)
ON CONFLICT (flow_type) DO NOTHING;

INSERT INTO md_flow_capability_elements
(element_type,display_group,display_icon,sort_order,builder_enabled,before_save_allowed,
 config_schema_key,validator_key,runtime_handler_key,debug_behavior)
VALUES
 ('Start','Logic','▶',0,false,true,'flow:Start','Start','Start','execute'),
 ('End','Logic','■',10,true,true,'flow:End','End','End','execute'),
 ('Screen','Interaction','▣',20,true,false,'flow:Screen','Screen','Screen','execute'),
 ('Wait','Interaction','◷',30,true,false,'flow:Wait','Wait','Wait','unsupported'),
 ('Action','Interaction','⚡',40,true,false,'flow:Action','Action','Action','unsupported'),
 ('Roll Back Records','Data','↶',50,true,false,'flow:Roll Back Records','Roll Back Records','Roll Back Records','unsupported'),
 ('Custom Error','Logic','!',60,true,true,'flow:Custom Error','Custom Error','Custom Error','unsupported'),
 ('Decision','Logic','◇',70,true,true,'flow:Decision','Decision','Decision','execute'),
 ('Assignment','Logic','⇄',80,true,true,'flow:Assignment','Assignment','Assignment','execute'),
 ('Loop','Logic','↻',90,true,false,'flow:Loop','Loop','Loop','unsupported'),
 ('Create Records','Data','+',100,true,false,'flow:Create Records','Create Records','Create Records','simulate'),
 ('HTTP Callout','Interaction','⇧',110,true,false,'flow:HTTP Callout','HTTP Callout','HTTP Callout','simulate'),
 ('Get Records','Data','↓',120,false,false,'flow:Get Records','Get Records','Get Records','unsupported'),
 ('Update Records','Data','✎',130,false,false,'flow:Update Records','Update Records','Update Records','simulate'),
 ('Delete Records','Data','×',140,false,false,'flow:Delete Records','Delete Records','Delete Records','unsupported'),
 ('Subflow','Interaction','↳',150,false,false,'flow:Subflow','Subflow','Subflow','unsupported'),
 ('Collection Filter','Data','⛃',160,false,false,'flow:Collection Filter','Collection Filter','Collection Filter','unsupported'),
 ('Collection Sort','Data','⇵',170,false,false,'flow:Collection Sort','Collection Sort','Collection Sort','unsupported'),
 ('Transform','Data','⇢',180,false,false,'flow:Transform','Transform','Transform','unsupported'),
 ('Publish Platform Event','Interaction','⇧',190,false,false,'flow:Publish Platform Event','Publish Platform Event','Publish Platform Event','unsupported'),
 ('CreateRecord','Data','+',200,false,false,'flow:CreateRecord','CreateRecord','CreateRecord','simulate')
ON CONFLICT (element_type) DO NOTHING;

INSERT INTO md_flow_capability_element_flows (element_type,flow_type,builder_allowed)
SELECT e.element_type,f.flow_type,
 (e.builder_enabled OR e.element_type='Publish Platform Event')
 AND (e.element_type <> 'Wait' OR f.flow_type IN ('Screen Flow','Autolaunched Flow','Record-Triggered Flow'))
 FROM md_flow_capability_elements e CROSS JOIN md_flow_capability_flow_types f
 WHERE f.validate_enabled AND e.enabled
 AND (e.element_type <> 'Screen' OR f.flow_type = 'Screen Flow')
 AND (e.element_type <> 'Custom Error' OR f.flow_type = 'Record-Triggered Flow')
 AND (e.element_type <> 'Publish Platform Event' OR f.flow_type <> 'Platform Event-Triggered Flow')
ON CONFLICT (element_type,flow_type) DO NOTHING;

-- Discoverable property contracts. Existing runtime validators remain authoritative for semantics.
INSERT INTO md_flow_capability_properties (element_type,property_name,value_type,required,sort_order)
VALUES
 ('Get Records','object','text',true,10),
 ('Get Records','conditions','list',false,20),
 ('Get Records','outputVariable','resource',true,30),
 ('Update Records','object','text',true,10),
 ('Update Records','fieldValues','list',false,20),
 ('Delete Records','object','text',true,10),
 ('Subflow','flowApiName','text',true,10),
 ('Subflow','inputValues','text',false,20),
 ('Subflow','outputValues','text',false,30),
 ('HTTP Callout','namedCredentialId','text',true,10),
 ('HTTP Callout','method','text',false,20),
 ('Wait','waitType','text',false,10),
 ('Publish Platform Event','eventApiName','text',true,10)
ON CONFLICT (element_type,property_name) DO NOTHING;
-- END LEGACY 20261112-flow-capability-registry.sql

-- BEGIN LEGACY 20261113-flow-builder-phase1-unlock.sql
-- Phase 1: unlock validated Core Flow elements and supported trigger types.
-- Only migrate the version-one defaults. Future customer/administrator overrides with
-- a higher registry_version are not reset, and published Flow graphs remain untouched.
UPDATE md_flow_capability_flow_types
SET create_enabled=true, registry_version=2
WHERE flow_type IN ('Record-Triggered Flow','Schedule-Triggered Flow',
  'Platform Event-Triggered Flow')
  AND create_enabled=false AND registry_version=1 AND validate_enabled=true;

WITH unlocked AS (
 UPDATE md_flow_capability_elements
 SET builder_enabled=true,registry_version=2
 WHERE element_type IN ('Get Records','Update Records','Delete Records','Subflow',
  'Collection Filter','Collection Sort','Transform','Publish Platform Event')
  AND builder_enabled=false AND registry_version=1
 RETURNING element_type
)
UPDATE md_flow_capability_element_flows AS relation
SET builder_allowed=true
FROM unlocked
WHERE relation.element_type=unlocked.element_type
  AND relation.builder_allowed=false;

-- Elements remain excluded from invalid contexts by existing relational
-- element/flow compatibility rows and before_save_allowed=false.
-- Platform Event-Triggered Flows may not recursively publish events.
-- END LEGACY 20261113-flow-builder-phase1-unlock.sql

-- BEGIN LEGACY 20261114-flow-interview-record-bounds.sql
DO $$
BEGIN
 IF EXISTS (
  SELECT 1 FROM md_flow_interview_records WHERE sort_order>199
 ) THEN
  RAISE EXCEPTION 'Flow interview record collections contain more than 200 entries; reconcile them before applying this migration';
 END IF;
END $$;

ALTER TABLE md_flow_interview_records
 DROP CONSTRAINT IF EXISTS md_flow_interview_records_sort_order_check;
ALTER TABLE md_flow_interview_records
 ADD CONSTRAINT md_flow_interview_records_sort_order_bound
 CHECK (sort_order BETWEEN 0 AND 199);
-- END LEGACY 20261114-flow-interview-record-bounds.sql

-- BEGIN LEGACY 20261114-flow-phase3-before-save.sql
-- Phase 3: read-only Get Records, Loop and pure collection transformations for before-save flows.
-- Core registry default upgrade only; tenant overrides with newer versions are preserved.
-- Never enables Create/Update/Delete, HTTP, Wait, Subflow or external actions in before-save.
UPDATE md_flow_capability_elements
 SET before_save_allowed=true,registry_version=3
 WHERE element_type IN ('Get Records','Loop','Collection Filter','Collection Sort','Transform')
   AND registry_version IN (1,2) AND before_save_allowed=false AND app_api_name IS NULL;
-- END LEGACY 20261114-flow-phase3-before-save.sql

-- BEGIN LEGACY 20261114-tenant-media-assets.sql
-- Shared tenant-owned media: reusable by any app, without KFC-specific Core records.
CREATE TABLE IF NOT EXISTS md_tenant_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 255),
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/gif','image/webp')),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 5242880),
  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  content bytea NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,id),
  FOREIGN KEY (tenant_id,created_by) REFERENCES md_users(tenant_id,id),
  CHECK (octet_length(content)=byte_size)
);
CREATE INDEX IF NOT EXISTS md_tenant_media_assets_created
  ON md_tenant_media_assets(tenant_id,created_at DESC,id);
-- END LEGACY 20261114-tenant-media-assets.sql

-- BEGIN LEGACY 20261115-flow-execution-idempotency.sql
-- Only executions with a caller-provided, UUID requestId enter this ledger.
-- Explicit tenant+actor scope and a unique request key reject duplicated order Flows.
CREATE TABLE IF NOT EXISTS md_flow_execution_requests (
  tenant_id uuid NOT NULL REFERENCES md_tenants(id),
  actor_id uuid NOT NULL,
  flow_api text NOT NULL,
  request_id uuid NOT NULL,
  input_hash text NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  run_id uuid,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','completed','failed')),
  result_payload jsonb,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,actor_id,flow_api,request_id),
  FOREIGN KEY (tenant_id,actor_id) REFERENCES md_users(tenant_id,id),
  FOREIGN KEY (tenant_id,run_id) REFERENCES md_flow_runs(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_flow_execution_requests_run
  ON md_flow_execution_requests(tenant_id,run_id) WHERE run_id IS NOT NULL;
-- END LEGACY 20261115-flow-execution-idempotency.sql

-- BEGIN LEGACY 20261115-flow-provider-outbox.sql
-- Provider-backed durable Flow actions must revalidate current SQL activation and permission on dispatch.
-- Preserve all existing queued and completed jobs. No customer data is removed.
ALTER TABLE md_http_callout_jobs
 ADD COLUMN IF NOT EXISTS connection_api text,
 ADD COLUMN IF NOT EXISTS operation_api text,
 ADD COLUMN IF NOT EXISTS operation_path_ciphertext bytea;
ALTER TABLE md_http_callout_jobs
 DROP CONSTRAINT IF EXISTS md_http_callout_provider_pair;
ALTER TABLE md_http_callout_jobs
 ADD CONSTRAINT md_http_callout_provider_pair CHECK (
  (connection_api IS NULL AND operation_api IS NULL AND operation_path_ciphertext IS NULL)
  OR (connection_api ~ '^[A-Za-z][A-Za-z0-9_]*$'
   AND operation_api ~ '^[A-Za-z][A-Za-z0-9_]*$'
   AND operation_path_ciphertext IS NOT NULL));
-- END LEGACY 20261115-flow-provider-outbox.sql

-- BEGIN LEGACY 20261115-list-views-record-search.sql
CREATE TABLE IF NOT EXISTS md_list_views (
 tenant_id uuid NOT NULL,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 object_api text NOT NULL,
 owner_id uuid NOT NULL,
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 120),
 visibility text NOT NULL CHECK(visibility IN ('private','all','groups')),
 scope text NOT NULL CHECK(scope IN ('my','all','my_team','queue')),
 filter_logic text NOT NULL DEFAULT '',
 sort_field text,
 sort_direction text NOT NULL DEFAULT 'asc' CHECK(sort_direction IN ('asc','desc')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,owner_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,object_api,sort_field)
  REFERENCES md_field_definitions(tenant_id,object_api,api_name)
);
CREATE INDEX IF NOT EXISTS md_list_views_object_owner
 ON md_list_views(tenant_id,object_api,owner_id);
CREATE TABLE IF NOT EXISTS md_list_view_columns (
 tenant_id uuid NOT NULL,
 view_id uuid NOT NULL,
 position integer NOT NULL CHECK(position>=0),
 field_api text NOT NULL,
 PRIMARY KEY(tenant_id,view_id,position),
 UNIQUE(tenant_id,view_id,field_api),
 FOREIGN KEY(tenant_id,view_id) REFERENCES md_list_views(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_list_view_filters (
 tenant_id uuid NOT NULL,
 view_id uuid NOT NULL,
 position integer NOT NULL CHECK(position BETWEEN 0 AND 19),
 field_api text NOT NULL,
 operator text NOT NULL CHECK(operator IN ('eq','ne','lt','lte','gt','gte','contains','startsWith','includes','excludes','in')),
 value_text text NOT NULL DEFAULT '',
 PRIMARY KEY(tenant_id,view_id,position),
 FOREIGN KEY(tenant_id,view_id) REFERENCES md_list_views(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_list_view_filter_values (
 tenant_id uuid NOT NULL,
 view_id uuid NOT NULL,
 filter_position integer NOT NULL,
 position integer NOT NULL CHECK(position BETWEEN 0 AND 99),
 value_text text NOT NULL,
 PRIMARY KEY(tenant_id,view_id,filter_position,position),
 FOREIGN KEY(tenant_id,view_id,filter_position)
  REFERENCES md_list_view_filters(tenant_id,view_id,position) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_list_view_groups (
 tenant_id uuid NOT NULL,
 view_id uuid NOT NULL,
 group_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,view_id,group_id),
 FOREIGN KEY(tenant_id,view_id) REFERENCES md_list_views(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,group_id) REFERENCES md_access_groups(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_list_view_pins (
 tenant_id uuid NOT NULL,
 user_id uuid NOT NULL,
 view_id uuid NOT NULL,
 pinned_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,user_id,view_id),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,view_id) REFERENCES md_list_views(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_records_list_page
 ON md_records(tenant_id,object_api,created_at,id);
CREATE INDEX IF NOT EXISTS md_records_queue_owner
 ON md_records(tenant_id,object_api,owner_queue_id,id) WHERE owner_queue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS md_record_values_text_lookup
 ON md_record_values(tenant_id,object_api,field_api,value_text) WHERE value_text IS NOT NULL;
CREATE INDEX IF NOT EXISTS md_record_values_boolean_lookup
 ON md_record_values(tenant_id,object_api,field_api,value_boolean) WHERE value_boolean IS NOT NULL;
CREATE INDEX IF NOT EXISTS md_record_policies_share_target
 ON md_record_policies(tenant_id,object_api,target_type,target_id,rule_type,access_level)
 WHERE kind='share' AND enabled;
CREATE INDEX IF NOT EXISTS md_record_policies_restriction_subject
 ON md_record_policies(tenant_id,object_api,subject_type,subject_id)
 WHERE kind='restriction' AND enabled;
CREATE TABLE IF NOT EXISTS md_search_layout_fields (
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 field_api text NOT NULL,
 weight char(1) NOT NULL DEFAULT 'B' CHECK(weight IN ('A','B','C','D')),
 PRIMARY KEY(tenant_id,object_api,field_api),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,object_api,field_api)
  REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_search_layout_columns (
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 layout_key text NOT NULL CHECK(layout_key IN ('searchResults','lookupDialog','lookupPhoneDialog')),
 position integer NOT NULL CHECK(position BETWEEN 0 AND 499),
 field_api text NOT NULL,
 PRIMARY KEY(tenant_id,object_api,layout_key,position),
 UNIQUE(tenant_id,object_api,layout_key,field_api),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,object_api,field_api)
  REFERENCES md_field_definitions(tenant_id,object_api,api_name) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_record_search_values (
 tenant_id uuid NOT NULL,
 record_id uuid NOT NULL,
 object_api text NOT NULL,
 field_api text NOT NULL,
 weight char(1) NOT NULL CHECK(weight IN ('A','B','C','D')),
 search_vector tsvector NOT NULL,
 PRIMARY KEY(tenant_id,record_id,field_api),
 FOREIGN KEY(tenant_id,record_id,object_api)
  REFERENCES md_records(tenant_id,id,object_api) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS md_record_search_values_vector
 ON md_record_search_values USING gin(search_vector);
CREATE INDEX IF NOT EXISTS md_record_search_values_object
 ON md_record_search_values(tenant_id,object_api,field_api,record_id);

INSERT INTO md_search_layout_fields(tenant_id,object_api,field_api,weight)
SELECT tenant_id,object_api,api_name,
 CASE WHEN api_name='Name' THEN 'A' WHEN data_type='email' THEN 'B' ELSE 'C' END
FROM md_field_definitions
WHERE deleted_at IS NULL
 AND data_type IN ('text','email','phone','url','picklist')
ON CONFLICT(tenant_id,object_api,field_api) DO NOTHING;

CREATE OR REPLACE FUNCTION md_searchable_field_default()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.deleted_at IS NULL AND NEW.data_type IN ('text','email','phone','url','picklist') THEN
  INSERT INTO md_search_layout_fields(tenant_id,object_api,field_api,weight)
  VALUES(NEW.tenant_id,NEW.object_api,NEW.api_name,
   CASE WHEN NEW.api_name='Name' THEN 'A' WHEN NEW.data_type='email' THEN 'B' ELSE 'C' END)
  ON CONFLICT(tenant_id,object_api,field_api) DO NOTHING;
 ELSE
  DELETE FROM md_search_layout_fields
   WHERE tenant_id=NEW.tenant_id AND object_api=NEW.object_api AND field_api=NEW.api_name;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER md_searchable_field_default_trigger
AFTER INSERT OR UPDATE OF data_type,deleted_at ON md_field_definitions
FOR EACH ROW EXECUTE FUNCTION md_searchable_field_default();

CREATE OR REPLACE FUNCTION md_refresh_record_search_value(
 t uuid,rid uuid,obj text,field text,raw_value text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE configured_weight char(1);
BEGIN
 SELECT weight INTO configured_weight FROM md_search_layout_fields
 WHERE tenant_id=t AND object_api=obj AND field_api=field;
 IF configured_weight IS NULL OR raw_value IS NULL OR length(raw_value)=0 THEN
  DELETE FROM md_record_search_values
   WHERE tenant_id=t AND record_id=rid AND field_api=field;
  RETURN;
 END IF;
 INSERT INTO md_record_search_values(tenant_id,record_id,object_api,field_api,weight,search_vector)
 VALUES(t,rid,obj,field,configured_weight,to_tsvector('simple',raw_value))
 ON CONFLICT(tenant_id,record_id,field_api) DO UPDATE SET
  weight=EXCLUDED.weight,search_vector=EXCLUDED.search_vector;
END $$;

CREATE OR REPLACE FUNCTION md_record_search_values_sync()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  PERFORM md_refresh_record_search_value(OLD.tenant_id,OLD.record_id,OLD.object_api,OLD.field_api,NULL);
  RETURN OLD;
 END IF;
 PERFORM md_refresh_record_search_value(NEW.tenant_id,NEW.record_id,NEW.object_api,NEW.field_api,NEW.value_text);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS md_record_search_values_sync_trigger ON md_record_values;
CREATE TRIGGER md_record_search_values_sync_trigger
AFTER INSERT OR UPDATE OF value_text,field_api,object_api OR DELETE ON md_record_values
FOR EACH ROW EXECUTE FUNCTION md_record_search_values_sync();

CREATE OR REPLACE FUNCTION md_search_layout_fields_sync()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item record;
BEGIN
 IF TG_OP='DELETE' THEN
  DELETE FROM md_record_search_values
   WHERE tenant_id=OLD.tenant_id AND object_api=OLD.object_api AND field_api=OLD.field_api;
  RETURN OLD;
 END IF;
 FOR item IN
  SELECT v.record_id,v.value_text FROM md_record_values v
  WHERE v.tenant_id=NEW.tenant_id AND v.object_api=NEW.object_api AND v.field_api=NEW.field_api
 LOOP
  PERFORM md_refresh_record_search_value(NEW.tenant_id,item.record_id,NEW.object_api,NEW.field_api,item.value_text);
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER md_search_layout_fields_sync_trigger
AFTER INSERT OR UPDATE OF weight OR DELETE ON md_search_layout_fields
FOR EACH ROW EXECUTE FUNCTION md_search_layout_fields_sync();

INSERT INTO md_record_search_values(tenant_id,record_id,object_api,field_api,weight,search_vector)
SELECT v.tenant_id,v.record_id,v.object_api,v.field_api,s.weight,to_tsvector('simple',v.value_text)
FROM md_record_values v JOIN md_search_layout_fields s
 ON s.tenant_id=v.tenant_id AND s.object_api=v.object_api AND s.field_api=v.field_api
WHERE v.value_text IS NOT NULL AND length(v.value_text)>0
ON CONFLICT(tenant_id,record_id,field_api) DO UPDATE SET
 weight=EXCLUDED.weight,search_vector=EXCLUDED.search_vector;
-- END LEGACY 20261115-list-views-record-search.sql

-- BEGIN LEGACY 20261116-business-calendar-usage.sql
ALTER TABLE md_tenant_settings
 DROP CONSTRAINT IF EXISTS md_tenant_settings_setting_key_check;
ALTER TABLE md_tenant_settings
 ADD CONSTRAINT md_tenant_settings_setting_key_check
 CHECK (setting_key IN ('company-profile','currencies','automation-settings','business-calendar'));

ALTER TABLE md_tenant_usage_targets
 DROP CONSTRAINT IF EXISTS md_tenant_usage_targets_metric_check;
ALTER TABLE md_tenant_usage_targets
 ADD CONSTRAINT md_tenant_usage_targets_metric_check
 CHECK (metric IN ('users','records','objects','flows','storage_bytes','api_requests_daily'));

CREATE TABLE IF NOT EXISTS md_tenant_api_usage_daily (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
 usage_date date NOT NULL,
 request_count bigint NOT NULL DEFAULT 0 CHECK(request_count>=0),
 PRIMARY KEY(tenant_id,usage_date)
);
-- END LEGACY 20261116-business-calendar-usage.sql

-- BEGIN LEGACY 20261116-flow-orchestration.sql
-- Phase 5: durable human approvals, no JSON graph state or separate workflow engine.
-- Upgrade preserves all tenant data and existing published flows.
ALTER TABLE md_flow_runs DROP CONSTRAINT IF EXISTS md_flow_runs_wait_kind_check;
ALTER TABLE md_flow_runs ADD CONSTRAINT md_flow_runs_wait_kind_check
 CHECK(wait_kind IN ('wait','scheduled-path','orchestration'));

CREATE TABLE IF NOT EXISTS md_flow_approval_stages (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 run_id uuid NOT NULL,
 element_id integer NOT NULL CHECK(element_id > 0),
 group_id uuid NOT NULL,
 rule text NOT NULL CHECK(rule IN ('ANY','ALL')),
 status text NOT NULL DEFAULT 'waiting'
  CHECK(status IN ('waiting','Approved','Rejected','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 PRIMARY KEY(tenant_id,run_id,element_id),
 UNIQUE(tenant_id,group_id),
 FOREIGN KEY(tenant_id,run_id) REFERENCES md_flow_runs(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_flow_approval_stages_pending
 ON md_flow_approval_stages(tenant_id,run_id,status) WHERE status='waiting';

-- Enable only when the installed baseline registry is still administrator-unmodified.
UPDATE md_flow_capability_flow_types
 SET create_enabled=true,validate_enabled=true,debug_enabled=true,registry_version=3
 WHERE flow_type='Flow Orchestration' AND create_enabled=false
  AND validate_enabled=false AND registry_version=1;

INSERT INTO md_flow_capability_elements
 (element_type,display_group,display_icon,sort_order,builder_enabled,before_save_allowed,
  config_schema_key,validator_key,runtime_handler_key,debug_behavior,registry_version)
 VALUES ('Orchestration Stage','Interaction','◎',210,true,false,
 'flow:Orchestration Stage','Orchestration Stage','Orchestration Stage','simulate',3)
 ON CONFLICT(element_type) DO NOTHING;

INSERT INTO md_flow_capability_element_flows(element_type,flow_type,builder_allowed)
 VALUES ('Orchestration Stage','Flow Orchestration',true)
 ON CONFLICT(element_type,flow_type) DO NOTHING;

-- Reuse general-purpose Flow operations only; Screens and record-only Custom Error
-- remain excluded. SQL allows no app-specific Core handlers.
INSERT INTO md_flow_capability_element_flows(element_type,flow_type,builder_allowed)
 SELECT element_type,'Flow Orchestration',builder_allowed
 FROM md_flow_capability_element_flows
 WHERE flow_type='Autolaunched Flow'
  AND element_type NOT IN ('Screen','Custom Error','Orchestration Stage')
 ON CONFLICT(element_type,flow_type) DO NOTHING;

INSERT INTO md_flow_capability_properties
 (element_type,property_name,value_type,required,sort_order)
 VALUES ('Orchestration Stage','objectApiName','text',true,10),
 ('Orchestration Stage','recordId','resource',true,20),
 ('Orchestration Stage','approvalMode','text',true,30),
 ('Orchestration Stage','statusVariable','resource',false,40)
 ON CONFLICT(element_type,property_name) DO NOTHING;
-- END LEGACY 20261116-flow-orchestration.sql

-- BEGIN LEGACY 20261116-mobile-list-view-roles.sql
-- Additive phone-list presentation metadata. Applied after 20261115-list-views-record-search.sql.
-- The role does not change SQL row visibility, record permissions or desktop columns.
ALTER TABLE md_list_view_columns
  ADD COLUMN IF NOT EXISTS phone_role text;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='md_list_view_columns_phone_role_chk'
  ) THEN
    ALTER TABLE md_list_view_columns ADD CONSTRAINT md_list_view_columns_phone_role_chk
      CHECK (phone_role IS NULL OR phone_role IN ('title','subtitle','badge','trailing','hidden'));
  END IF;
END $$;
-- END LEGACY 20261116-mobile-list-view-roles.sql

-- BEGIN LEGACY 20261116-relational-flow-execution-results.sql
-- Upgrade-safe conversion of generic Flow replay snapshots to relational path/value rows.
-- No app-specific payment data or JSON runtime payload remains in SQL after migration.
CREATE TABLE IF NOT EXISTS md_flow_execution_result_values (
 tenant_id uuid NOT NULL,
 actor_id uuid NOT NULL,
 flow_api text NOT NULL,
 request_id uuid NOT NULL,
 property_path text NOT NULL CHECK(length(property_path) BETWEEN 1 AND 1024),
 value_kind text NOT NULL CHECK(value_kind IN ('string','number','boolean','null','array','object')),
 value_text text,
 PRIMARY KEY(tenant_id,actor_id,flow_api,request_id,property_path),
 FOREIGN KEY(tenant_id,actor_id,flow_api,request_id)
  REFERENCES md_flow_execution_requests(tenant_id,actor_id,flow_api,request_id)
  ON DELETE CASCADE
);

-- Upgrades from 20261115 must preserve completed responses, including nested
-- object and array values. A fresh schema does not have the legacy JSONB column.
DO $upgrade$
BEGIN
 IF EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema=current_schema()
     AND table_name='md_flow_execution_requests' AND column_name='result_payload'
 ) THEN
  EXECUTE $migrate$
   WITH RECURSIVE nodes AS (
     SELECT tenant_id,actor_id,flow_api,request_id,
       '/result'::text AS path,result_payload AS value
     FROM md_flow_execution_requests WHERE result_payload IS NOT NULL
     UNION ALL
     SELECT n.tenant_id,n.actor_id,n.flow_api,n.request_id,
       n.path || '/' || replace(replace(child.label,'~','~0'),'/','~1'),child.value
     FROM nodes n
     CROSS JOIN LATERAL (
       SELECT key AS label,value
       FROM jsonb_each(CASE WHEN jsonb_typeof(n.value)='object'
                          THEN n.value ELSE '{}'::jsonb END)
       UNION ALL
       SELECT (ordinality-1)::text AS label,value
       FROM jsonb_array_elements(CASE WHEN jsonb_typeof(n.value)='array'
                                     THEN n.value ELSE '[]'::jsonb END)
       WITH ORDINALITY
     ) child
   )
   INSERT INTO md_flow_execution_result_values
      (tenant_id,actor_id,flow_api,request_id,property_path,value_kind,value_text)
   SELECT tenant_id,actor_id,flow_api,request_id,path,jsonb_typeof(value),
     CASE WHEN jsonb_typeof(value) IN ('string','number','boolean')
       THEN value #>> '{}' ELSE NULL END
   FROM nodes
   ON CONFLICT(tenant_id,actor_id,flow_api,request_id,property_path) DO NOTHING
  $migrate$;
  -- Dropping the old JSONB source only happens after all rows are migrated
  -- successfully within the same transactional migration.
  ALTER TABLE md_flow_execution_requests DROP COLUMN result_payload;
 END IF;
END $upgrade$;
-- END LEGACY 20261116-relational-flow-execution-results.sql

-- BEGIN LEGACY 20261117-metadata-packages.sql
CREATE TABLE IF NOT EXISTS md_metadata_package_installations(
 tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
 package_api text NOT NULL,
 label text NOT NULL,
 package_type text NOT NULL CHECK(package_type IN ('Managed','Unlocked')),
 version integer NOT NULL CHECK(version>0),
 digest text NOT NULL CHECK(digest ~ '^[0-9a-f]{64}$'),
 active boolean NOT NULL DEFAULT true,
 installed_by uuid NOT NULL REFERENCES md_users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,package_api)
);
CREATE TABLE IF NOT EXISTS md_metadata_package_versions(
 tenant_id uuid NOT NULL,
 package_api text NOT NULL,
 version integer NOT NULL CHECK(version>0),
 digest text NOT NULL CHECK(digest ~ '^[0-9a-f]{64}$'),
 installed_by uuid NOT NULL,
 installed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,package_api,version),
 FOREIGN KEY(tenant_id,package_api)
  REFERENCES md_metadata_package_installations(tenant_id,package_api) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,installed_by) REFERENCES md_users(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_metadata_package_components(
 tenant_id uuid NOT NULL,
 package_api text NOT NULL,
 component_type text NOT NULL CHECK(component_type IN ('object','page','component')),
 component_api text NOT NULL,
 component_state text NOT NULL DEFAULT 'Active'
  CHECK(component_state IN ('Active','Disabled','Retained')),
 component_digest text NOT NULL CHECK(component_digest ~ '^[0-9a-f]{64}$'),
 PRIMARY KEY(tenant_id,package_api,component_type,component_api),
 FOREIGN KEY(tenant_id,package_api)
  REFERENCES md_metadata_package_installations(tenant_id,package_api) ON DELETE CASCADE
);
-- END LEGACY 20261117-metadata-packages.sql

-- BEGIN LEGACY 20261117-platform-event-streaming.sql
ALTER TABLE md_platform_event_messages
 ADD COLUMN IF NOT EXISTS replay_id bigserial;

CREATE UNIQUE INDEX IF NOT EXISTS md_platform_event_messages_replay
 ON md_platform_event_messages(tenant_id,replay_id);
-- END LEGACY 20261117-platform-event-streaming.sql

-- BEGIN LEGACY 20261118-autolaunched-custom-errors.sql
-- Custom Error already executes via the shared Flow engine in autolaunched
-- transactions; expose the node via the SQL capability registry as well.
-- Existing tenant customisations and other node permissions remain unchanged.
INSERT INTO md_flow_capability_element_flows(element_type,flow_type,builder_allowed)
SELECT 'Custom Error','Autolaunched Flow',true
WHERE EXISTS(SELECT 1 FROM md_flow_capability_elements WHERE element_type='Custom Error')
  AND EXISTS(SELECT 1 FROM md_flow_capability_flow_types WHERE flow_type='Autolaunched Flow')
ON CONFLICT(element_type,flow_type) DO NOTHING;
-- END LEGACY 20261118-autolaunched-custom-errors.sql

-- BEGIN LEGACY 20261118-outbound-webhooks.sql
CREATE TABLE IF NOT EXISTS md_webhook_subscriptions (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 api_name text NOT NULL,
 event_api_name text NOT NULL,
 credential_id uuid NOT NULL,
 relative_path text NOT NULL,
 start_replay_id bigint NOT NULL CHECK(start_replay_id>=1),
 enabled boolean NOT NULL DEFAULT true,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,id),
 UNIQUE(tenant_id,api_name),
 FOREIGN KEY(tenant_id,credential_id) REFERENCES md_named_credentials(tenant_id,id),
 FOREIGN KEY(tenant_id,created_by) REFERENCES md_users(tenant_id,id)
);

CREATE INDEX IF NOT EXISTS md_webhook_subscriptions_event
 ON md_webhook_subscriptions(tenant_id,event_api_name,start_replay_id) WHERE enabled=true;

CREATE TABLE IF NOT EXISTS md_webhook_deliveries (
 tenant_id uuid NOT NULL,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 subscription_id uuid NOT NULL,
 event_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','delivered','failed')),
 response_status integer,
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 PRIMARY KEY(tenant_id,id),
 UNIQUE(tenant_id,subscription_id,event_id),
 FOREIGN KEY(tenant_id,subscription_id)
  REFERENCES md_webhook_subscriptions(tenant_id,id),
 FOREIGN KEY(tenant_id,event_id)
  REFERENCES md_platform_event_messages(tenant_id,id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS md_webhook_deliveries_queue
 ON md_webhook_deliveries(tenant_id,status,created_at,id) WHERE status='queued';
-- END LEGACY 20261118-outbound-webhooks.sql

-- BEGIN LEGACY 20261119-openapi-external-services.sql
CREATE TABLE IF NOT EXISTS md_external_services(
 tenant_id uuid NOT NULL REFERENCES md_tenants(id) ON DELETE CASCADE,
 api_name text NOT NULL,
 label text NOT NULL,
 server_origin text NOT NULL,
 server_path text NOT NULL DEFAULT '',
 imported_by uuid NOT NULL,
 imported_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,api_name),
 FOREIGN KEY(tenant_id,imported_by) REFERENCES md_users(tenant_id,id)
);

CREATE TABLE IF NOT EXISTS md_external_service_operations(
 tenant_id uuid NOT NULL,
 service_api text NOT NULL,
 operation_api text NOT NULL,
 label text NOT NULL,
 http_method text NOT NULL CHECK(http_method IN ('GET','POST','PUT','PATCH','DELETE')),
 path_template text NOT NULL,
 request_body_required boolean NOT NULL DEFAULT false,
 request_body_type text,
 PRIMARY KEY(tenant_id,service_api,operation_api),
 FOREIGN KEY(tenant_id,service_api)
  REFERENCES md_external_services(tenant_id,api_name) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS md_external_service_parameters(
 tenant_id uuid NOT NULL,
 service_api text NOT NULL,
 operation_api text NOT NULL,
 parameter_name text NOT NULL,
 parameter_location text NOT NULL CHECK(parameter_location IN ('path','query','body')),
 required boolean NOT NULL,
 value_type text NOT NULL CHECK(value_type IN ('string','number','integer','boolean')),
 PRIMARY KEY(tenant_id,service_api,operation_api,parameter_name,parameter_location),
 FOREIGN KEY(tenant_id,service_api,operation_api)
  REFERENCES md_external_service_operations(tenant_id,service_api,operation_api) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS md_external_service_operation_tenant_api
 ON md_external_service_operations(tenant_id,operation_api);
-- END LEGACY 20261119-openapi-external-services.sql

-- BEGIN LEGACY 20261120-metadata-package-component-types.sql
ALTER TABLE md_metadata_package_components
 DROP CONSTRAINT IF EXISTS md_metadata_package_components_component_type_check;
ALTER TABLE md_metadata_package_components
 ADD CONSTRAINT md_metadata_package_components_component_type_check
 CHECK(component_type IN ('object','page','component','flow','object-config','permission-set'));
-- END LEGACY 20261120-metadata-package-component-types.sql

-- BEGIN LEGACY 20261121-login-password-policy.sql
-- Core tenant policy. Defaults preserve existing passwords; failed logins are bounded.
CREATE TABLE IF NOT EXISTS md_password_policies (
 tenant_id uuid PRIMARY KEY REFERENCES md_tenants(id),
 min_length integer NOT NULL DEFAULT 12 CHECK(min_length BETWEEN 12 AND 128),
 require_uppercase boolean NOT NULL DEFAULT false,
 require_lowercase boolean NOT NULL DEFAULT false,
 require_number boolean NOT NULL DEFAULT false,
 require_symbol boolean NOT NULL DEFAULT false,
 max_age_days integer NOT NULL DEFAULT 0 CHECK(max_age_days BETWEEN 0 AND 365),
 history_count integer NOT NULL DEFAULT 5 CHECK(history_count BETWEEN 0 AND 24),
 max_failed_attempts integer NOT NULL DEFAULT 5 CHECK(max_failed_attempts BETWEEN 3 AND 20),
 lockout_minutes integer NOT NULL DEFAULT 15 CHECK(lockout_minutes BETWEEN 1 AND 1440),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO md_password_policies(tenant_id) SELECT id FROM md_tenants ON CONFLICT DO NOTHING;
ALTER TABLE md_users ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE md_users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS md_password_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant_id uuid NOT NULL,
 user_id uuid NOT NULL,
 password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_password_history_user ON md_password_history(tenant_id,user_id,id DESC);
-- Unknown-account failures have no user identity; they still belong to the resolved tenant.
ALTER TABLE md_security_events ALTER COLUMN actor_user_id DROP NOT NULL;
ALTER TABLE md_security_events ADD COLUMN IF NOT EXISTS login_identifier text;
ALTER TABLE md_security_events ADD COLUMN IF NOT EXISTS source_ip text;
-- END LEGACY 20261121-login-password-policy.sql

-- BEGIN LEGACY 20261121-offline-briefcase.sql
ALTER TABLE md_tenant_settings
 DROP CONSTRAINT IF EXISTS md_tenant_settings_setting_key_check;
ALTER TABLE md_tenant_settings
 ADD CONSTRAINT md_tenant_settings_setting_key_check
 CHECK (setting_key IN ('company-profile','currencies','automation-settings','business-calendar','offline-briefcase'));
-- END LEGACY 20261121-offline-briefcase.sql

-- BEGIN LEGACY 20261122-identity-session-controls.sql
CREATE TABLE IF NOT EXISTS md_session_policies(
 tenant_id uuid PRIMARY KEY REFERENCES md_tenants(id),
 access_minutes integer NOT NULL DEFAULT 60 CHECK(access_minutes BETWEEN 5 AND 1440),
 refresh_minutes integer NOT NULL DEFAULT 43200 CHECK(refresh_minutes BETWEEN 5 AND 43200),
 idle_minutes integer NOT NULL DEFAULT 60 CHECK(idle_minutes BETWEEN 5 AND 1440),
 require_mfa boolean NOT NULL DEFAULT false,
 frame_policy text NOT NULL DEFAULT 'DENY' CHECK(frame_policy IN ('DENY','SAMEORIGIN')),
 csp_enabled boolean NOT NULL DEFAULT true
);
INSERT INTO md_session_policies(tenant_id) SELECT id FROM md_tenants ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS md_login_ip_ranges(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 profile_id uuid,kind text NOT NULL CHECK(kind IN ('login','trusted')),network cidr NOT NULL,
 FOREIGN KEY(tenant_id,profile_id) REFERENCES md_profiles(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_login_hours(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 profile_id uuid,weekday integer NOT NULL CHECK(weekday BETWEEN 1 AND 7),
 start_minute integer NOT NULL CHECK(start_minute BETWEEN 0 AND 1439),
 end_minute integer NOT NULL CHECK(end_minute BETWEEN 1 AND 1440),
 timezone text NOT NULL DEFAULT 'Europe/London',CHECK(start_minute<end_minute),
 FOREIGN KEY(tenant_id,profile_id) REFERENCES md_profiles(tenant_id,id)
);
ALTER TABLE md_sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE md_sessions ADD COLUMN IF NOT EXISTS source_ip inet;
-- Legacy access/refresh pairs cannot be safely reconstructed. Sign them out once.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='md_sessions' AND column_name='family_id') THEN
  UPDATE md_sessions SET revoked_at=now() WHERE revoked_at IS NULL;
 END IF;
END $$;
ALTER TABLE md_sessions ADD COLUMN IF NOT EXISTS family_id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE md_refresh_sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE md_refresh_sessions ADD COLUMN IF NOT EXISTS absolute_expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days';
ALTER TABLE md_refresh_sessions ADD COLUMN IF NOT EXISTS source_ip inet;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='md_refresh_sessions' AND column_name='family_id') THEN
  UPDATE md_refresh_sessions SET revoked_at=now() WHERE revoked_at IS NULL;
 END IF;
END $$;
ALTER TABLE md_refresh_sessions ADD COLUMN IF NOT EXISTS family_id uuid NOT NULL DEFAULT gen_random_uuid();
CREATE TABLE IF NOT EXISTS md_mfa_backup_codes(
 tenant_id uuid NOT NULL,user_id uuid NOT NULL,code_hash text NOT NULL,used_at timestamptz,
 PRIMARY KEY(tenant_id,user_id,code_hash),FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE
);
ALTER TABLE md_mfa_login_challenges ADD COLUMN IF NOT EXISTS source_ip inet;
CREATE TABLE IF NOT EXISTS md_webauthn_credentials(
 tenant_id uuid NOT NULL,user_id uuid NOT NULL,credential_id text NOT NULL,public_key bytea NOT NULL,
 counter bigint NOT NULL DEFAULT 0,label text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,credential_id),FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_webauthn_challenges(
 token_hash text PRIMARY KEY,tenant_id uuid NOT NULL,user_id uuid NOT NULL,
 purpose text NOT NULL CHECK(purpose IN ('register','authenticate')),challenge text NOT NULL,
 origin text NOT NULL,rp_id text NOT NULL,mfa_challenge_hash text,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',consumed_at timestamptz,
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_identity_providers(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 label text NOT NULL,protocol text NOT NULL CHECK(protocol IN ('oidc','saml')),enabled boolean NOT NULL DEFAULT false,
 issuer text NOT NULL,authorization_url text NOT NULL,token_url text NOT NULL DEFAULT '',jwks_url text NOT NULL DEFAULT '',
 client_id text NOT NULL DEFAULT '',secret_ciphertext bytea,key_id text,certificate text NOT NULL DEFAULT '',
 UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_federated_identities(
 tenant_id uuid NOT NULL,provider_id uuid NOT NULL,subject text NOT NULL,user_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,provider_id,subject),UNIQUE(tenant_id,provider_id,user_id),
 FOREIGN KEY(tenant_id,provider_id) REFERENCES md_identity_providers(tenant_id,id),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_federation_requests(
 state_hash text PRIMARY KEY,tenant_id uuid NOT NULL,provider_id uuid NOT NULL,
 browser_hash text NOT NULL,nonce text NOT NULL,verifier_ciphertext bytea,key_id text,origin text NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',consumed_at timestamptz,
 FOREIGN KEY(tenant_id,provider_id) REFERENCES md_identity_providers(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_saml_request_ids(
 tenant_id uuid NOT NULL,provider_id uuid NOT NULL,request_id text NOT NULL,value text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,provider_id,request_id),
 FOREIGN KEY(tenant_id,provider_id) REFERENCES md_identity_providers(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_federation_tickets(
 token_hash text PRIMARY KEY,tenant_id uuid NOT NULL,user_id uuid NOT NULL,origin text NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '1 minute',consumed_at timestamptz,
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id)
);
-- One reusable SQL boundary predicate for login, refresh and every authenticated request.
CREATE OR REPLACE FUNCTION md_login_boundary_allowed(t uuid,u uuid,ip inet)
RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH scopes AS (
  SELECT NULL::uuid AS profile_id UNION SELECT profile_id FROM md_user_profiles WHERE tenant_id=t AND user_id=u
 ), clock AS (SELECT h.*,now() AT TIME ZONE h.timezone AS local_time FROM md_login_hours h WHERE h.tenant_id=t)
 SELECT NOT EXISTS(SELECT 1 FROM scopes s WHERE
  (EXISTS(SELECT 1 FROM md_login_ip_ranges r WHERE r.tenant_id=t AND r.kind='login' AND r.profile_id IS NOT DISTINCT FROM s.profile_id)
   AND NOT EXISTS(SELECT 1 FROM md_login_ip_ranges r WHERE r.tenant_id=t AND r.kind='login' AND r.profile_id IS NOT DISTINCT FROM s.profile_id AND ip <<= r.network))
  OR (EXISTS(SELECT 1 FROM clock h WHERE h.profile_id IS NOT DISTINCT FROM s.profile_id)
   AND NOT EXISTS(SELECT 1 FROM clock h WHERE h.profile_id IS NOT DISTINCT FROM s.profile_id
    AND extract(isodow FROM h.local_time)=h.weekday
    AND extract(hour FROM h.local_time)*60+extract(minute FROM h.local_time)>=h.start_minute
    AND extract(hour FROM h.local_time)*60+extract(minute FROM h.local_time)<h.end_minute)))
$$;
-- END LEGACY 20261122-identity-session-controls.sql

-- BEGIN LEGACY 20261123-security-governance.sql
CREATE TABLE IF NOT EXISTS md_system_permission_catalogue(
 permission_key text PRIMARY KEY,label text NOT NULL,description text NOT NULL,resource text NOT NULL,action text NOT NULL
);
CREATE TABLE IF NOT EXISTS md_license_entitlements(
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),id uuid NOT NULL DEFAULT gen_random_uuid(),
 license_key text NOT NULL,label text NOT NULL,kind text NOT NULL CHECK(kind IN ('User','PermissionSet')),
 enabled boolean NOT NULL DEFAULT true,seat_limit integer CHECK(seat_limit>=0),expires_at timestamptz,
 auto_assign boolean NOT NULL DEFAULT false,PRIMARY KEY(tenant_id,id),UNIQUE(tenant_id,license_key)
);
CREATE TABLE IF NOT EXISTS md_license_capabilities(
 tenant_id uuid NOT NULL,entitlement_id uuid NOT NULL,resource text NOT NULL,action text NOT NULL,
 PRIMARY KEY(tenant_id,entitlement_id,resource,action),
 FOREIGN KEY(tenant_id,entitlement_id) REFERENCES md_license_entitlements(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_user_license_assignments(
 tenant_id uuid NOT NULL,user_id uuid NOT NULL,entitlement_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,user_id,entitlement_id),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id),
 FOREIGN KEY(tenant_id,entitlement_id) REFERENCES md_license_entitlements(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_permission_set_license_requirements(
 tenant_id uuid NOT NULL,permission_set_id uuid NOT NULL,entitlement_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,permission_set_id,entitlement_id),
 FOREIGN KEY(tenant_id,permission_set_id) REFERENCES md_permission_sets(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,entitlement_id) REFERENCES md_license_entitlements(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_governance_seed_receipts(tenant_id uuid PRIMARY KEY REFERENCES md_tenants(id));
INSERT INTO md_license_entitlements(tenant_id,license_key,label,kind,auto_assign)
 SELECT id,'CoreFull','Core platform user','User',true FROM md_tenants WHERE id NOT IN(SELECT tenant_id FROM md_governance_seed_receipts) ON CONFLICT DO NOTHING;
INSERT INTO md_license_capabilities SELECT tenant_id,id,'*','*' FROM md_license_entitlements WHERE license_key='CoreFull' AND tenant_id NOT IN(SELECT tenant_id FROM md_governance_seed_receipts) ON CONFLICT DO NOTHING;
INSERT INTO md_user_license_assignments SELECT u.tenant_id,u.id,e.id FROM md_users u
 JOIN md_license_entitlements e ON e.tenant_id=u.tenant_id AND e.license_key='CoreFull' WHERE u.tenant_id NOT IN(SELECT tenant_id FROM md_governance_seed_receipts) ON CONFLICT DO NOTHING;
INSERT INTO md_governance_seed_receipts SELECT id FROM md_tenants ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION md_user_licensed(t uuid,u uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM md_user_license_assignments a JOIN md_license_entitlements e ON e.tenant_id=a.tenant_id AND e.id=a.entitlement_id
  WHERE a.tenant_id=t AND a.user_id=u AND e.kind='User' AND e.enabled AND (e.expires_at IS NULL OR e.expires_at>now()))
$$;
CREATE OR REPLACE FUNCTION md_user_license_allows(t uuid,u uuid,res text,act text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM md_user_license_assignments a JOIN md_license_entitlements e ON e.tenant_id=a.tenant_id AND e.id=a.entitlement_id
  JOIN md_license_capabilities c ON c.tenant_id=e.tenant_id AND c.entitlement_id=e.id
  WHERE a.tenant_id=t AND a.user_id=u AND e.kind='User' AND e.enabled AND (e.expires_at IS NULL OR e.expires_at>now())
  AND c.resource IN(res,'*',CASE WHEN res LIKE 'Flow:%' THEN 'Flow' ELSE res END) AND c.action IN(act,'*'))
$$;
CREATE OR REPLACE FUNCTION md_permission_set_licensed(t uuid,u uuid,p uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT NOT EXISTS(SELECT 1 FROM md_permission_set_license_requirements r WHERE r.tenant_id=t AND r.permission_set_id=p AND NOT EXISTS(
  SELECT 1 FROM md_user_license_assignments a JOIN md_license_entitlements e ON e.tenant_id=a.tenant_id AND e.id=a.entitlement_id
  WHERE a.tenant_id=t AND a.user_id=u AND a.entitlement_id=r.entitlement_id AND e.kind='PermissionSet' AND e.enabled AND (e.expires_at IS NULL OR e.expires_at>now())))
$$;
CREATE OR REPLACE FUNCTION md_seed_governance_tenant() RETURNS trigger LANGUAGE plpgsql AS $$
 DECLARE eid uuid;
 BEGIN
  INSERT INTO md_license_entitlements(tenant_id,license_key,label,kind,auto_assign) VALUES(NEW.id,'CoreFull','Core platform user','User',true)
   ON CONFLICT(tenant_id,license_key) DO NOTHING;
  SELECT id INTO eid FROM md_license_entitlements WHERE tenant_id=NEW.id AND license_key='CoreFull';
  INSERT INTO md_license_capabilities VALUES(NEW.id,eid,'*','*') ON CONFLICT DO NOTHING;
  INSERT INTO md_governance_seed_receipts VALUES(NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
 END
$$;
DROP TRIGGER IF EXISTS md_seed_governance_tenant ON md_tenants;
CREATE TRIGGER md_seed_governance_tenant AFTER INSERT ON md_tenants FOR EACH ROW EXECUTE FUNCTION md_seed_governance_tenant();
CREATE OR REPLACE FUNCTION md_auto_assign_user_license() RETURNS trigger LANGUAGE plpgsql AS $$
 DECLARE e record;
 BEGIN
  FOR e IN SELECT * FROM md_license_entitlements WHERE tenant_id=NEW.tenant_id AND kind='User' AND auto_assign AND enabled
   AND (expires_at IS NULL OR expires_at>now()) ORDER BY id FOR UPDATE LOOP
   IF e.seat_limit IS NULL OR (SELECT count(*) FROM md_user_license_assignments WHERE tenant_id=e.tenant_id AND entitlement_id=e.id)<e.seat_limit THEN
    INSERT INTO md_user_license_assignments VALUES(NEW.tenant_id,NEW.id,e.id) ON CONFLICT DO NOTHING;
   END IF;
  END LOOP;
  RETURN NEW;
 END
$$;
DROP TRIGGER IF EXISTS md_auto_assign_user_license ON md_users;
CREATE TRIGGER md_auto_assign_user_license AFTER INSERT ON md_users FOR EACH ROW EXECUTE FUNCTION md_auto_assign_user_license();

CREATE TABLE IF NOT EXISTS md_setup_audit_events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,tenant_id uuid,actor_tenant_id uuid,actor_user_id uuid,
 correlation_id uuid,table_name text NOT NULL,operation text NOT NULL,row_identifier text NOT NULL,
 changed_fields text[] NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS md_setup_audit_tenant ON md_setup_audit_events(tenant_id,id DESC);
CREATE TABLE IF NOT EXISTS md_setup_audit_tables(table_name text PRIMARY KEY);
CREATE OR REPLACE FUNCTION md_capture_setup_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
 DECLARE before_row jsonb;after_row jsonb;row_data jsonb;fields text[];target_tenant uuid;
 BEGIN
  IF TG_OP='UPDATE' AND NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW;END IF;
  IF TG_OP<>'INSERT' THEN before_row=to_jsonb(OLD);END IF;
  IF TG_OP<>'DELETE' THEN after_row=to_jsonb(NEW);END IF;
  row_data=COALESCE(after_row,before_row);
  target_tenant=NULLIF(row_data->>'tenant_id','')::uuid;
  IF TG_TABLE_NAME='md_tenants' THEN target_tenant=(row_data->>'id')::uuid;END IF;
  SELECT array_agg(k ORDER BY k) INTO fields FROM jsonb_object_keys(row_data) k
   WHERE before_row IS NULL OR after_row IS NULL OR before_row->k IS DISTINCT FROM after_row->k;
  INSERT INTO md_setup_audit_events(tenant_id,actor_tenant_id,actor_user_id,correlation_id,table_name,operation,row_identifier,changed_fields)
  VALUES(target_tenant,NULLIF(current_setting('metadrive.actor_tenant',true),'')::uuid,NULLIF(current_setting('metadrive.actor_user',true),'')::uuid,
   NULLIF(current_setting('metadrive.correlation_id',true),'')::uuid,TG_TABLE_NAME,TG_OP,
   left(COALESCE(row_data->>'id',row_data->>'api_name',row_data->>'user_id',row_data->>'tenant_id','global'),200),COALESCE(fields,ARRAY[]::text[]));
  IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;
 END
$$;
CREATE OR REPLACE FUNCTION md_protect_setup_audit() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN RAISE EXCEPTION 'Setup audit trail is append-only';END
$$;
DROP TRIGGER IF EXISTS md_protect_setup_audit ON md_setup_audit_events;
CREATE TRIGGER md_protect_setup_audit BEFORE UPDATE OR DELETE ON md_setup_audit_events FOR EACH ROW EXECUTE FUNCTION md_protect_setup_audit();
CREATE TABLE IF NOT EXISTS md_monitor_settings(
 tenant_id uuid PRIMARY KEY REFERENCES md_tenants(id),enabled boolean NOT NULL DEFAULT true,
 retention_days integer NOT NULL DEFAULT 365 CHECK(retention_days BETWEEN 90 AND 3650)
);
CREATE TABLE IF NOT EXISTS md_monitor_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES md_tenants(id),actor_user_id uuid,
 correlation_id uuid NOT NULL,event_type text NOT NULL,resource text NOT NULL,method text NOT NULL,
 status_code integer NOT NULL,elapsed_ms integer NOT NULL,source_ip inet,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_monitor_events_tenant ON md_monitor_events(tenant_id,created_at DESC,id);
CREATE TABLE IF NOT EXISTS md_transaction_security_rules(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES md_tenants(id),label text NOT NULL,
 enabled boolean NOT NULL DEFAULT false,event_type text NOT NULL CHECK(event_type IN ('api','metadata','login')),
 method text NOT NULL CHECK(method IN ('*','GET','POST','PUT','PATCH','DELETE')),path_prefix text NOT NULL,
 threshold integer NOT NULL DEFAULT 1 CHECK(threshold BETWEEN 1 AND 100000),window_seconds integer NOT NULL DEFAULT 60 CHECK(window_seconds BETWEEN 1 AND 86400),
 response text NOT NULL CHECK(response IN ('Block','RevokeSessions','Flow')),flow_api text,service_user_id uuid,
 UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id,service_user_id) REFERENCES md_users(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_security_rule_windows(
 tenant_id uuid NOT NULL,rule_id uuid NOT NULL,user_id uuid NOT NULL,window_start timestamptz NOT NULL,count integer NOT NULL,
 PRIMARY KEY(tenant_id,rule_id,user_id),FOREIGN KEY(tenant_id,rule_id) REFERENCES md_transaction_security_rules(tenant_id,id) ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION md_rbac_decision(t uuid,u uuid,res text,act text)
RETURNS TABLE(allow_granted boolean,deny_granted boolean) LANGUAGE sql STABLE AS $$
 WITH assigned AS (
  SELECT permission_set_id,NULL::uuid AS group_id FROM md_permission_assignments WHERE tenant_id=t AND user_id=u
  UNION SELECT rp.permission_set_id,NULL::uuid FROM md_user_roles ur
   JOIN md_role_permission_sets rp ON rp.tenant_id=ur.tenant_id AND rp.role_id=ur.role_id
   WHERE ur.tenant_id=t AND ur.user_id=u
  UNION SELECT pp.permission_set_id,NULL::uuid FROM md_user_profiles up
   JOIN md_profile_permission_sets pp ON pp.tenant_id=up.tenant_id AND pp.profile_id=up.profile_id
   WHERE up.tenant_id=t AND up.user_id=u
  UNION SELECT gs.permission_set_id,ug.group_id FROM md_user_permission_groups ug
   JOIN md_permission_group_sets gs ON gs.tenant_id=ug.tenant_id AND gs.group_id=ug.group_id
   WHERE ug.tenant_id=t AND ug.user_id=u
 ), matched AS (
  SELECT r.effect,a.group_id FROM assigned a JOIN md_permission_rules r
   ON r.tenant_id=t AND r.permission_set_id=a.permission_set_id
   WHERE r.resource IN(res,'*',CASE WHEN res LIKE 'Flow:%' THEN 'Flow' ELSE res END)
   AND r.action IN(act,'*') AND (r.effect='deny' OR md_permission_set_licensed(t,u,a.permission_set_id))
  UNION ALL
  SELECT 'allow',a.group_id FROM assigned a JOIN md_permission_sets p ON p.tenant_id=t AND p.id=a.permission_set_id
   WHERE act='read' AND (res LIKE 'App:%' OR res LIKE 'Tab:%') AND p.navigation_default_access='Allow' AND md_permission_set_licensed(t,u,a.permission_set_id)
 )
 SELECT md_user_license_allows(t,u,res,act) AND COALESCE(bool_or(m.effect='allow' AND (m.group_id IS NULL OR NOT EXISTS(
  SELECT 1 FROM md_permission_group_mutes gm WHERE gm.tenant_id=t AND gm.group_id=m.group_id
   AND gm.resource IN(res,'*',CASE WHEN res LIKE 'Flow:%' THEN 'Flow' ELSE res END) AND gm.action IN(act,'*')
 ))),false) AND EXISTS(SELECT 1 FROM md_users WHERE tenant_id=t AND id=u AND enabled AND (user_type='internal' OR (act='read' AND (EXISTS(SELECT 1 FROM md_object_definitions o WHERE o.tenant_id=t AND o.api_name=res) OR EXISTS(SELECT 1 FROM md_field_definitions f WHERE f.tenant_id=t AND f.object_api||'.'||f.api_name=res) OR res LIKE 'RecordType:%')))),
 COALESCE(bool_or(m.effect='deny'),false)
 FROM matched m
$$;
CREATE OR REPLACE FUNCTION md_record_access(t uuid,u uuid,rid uuid,act text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT COALESCE((
 SELECT
 -- Object/record denies and restrictions also narrow ownership and broad grants.
 (NOT rec.is_deleted OR act='delete')
 AND NOT (SELECT deny_granted FROM md_rbac_decision(t,u,'Record:'||rec.id::text,act))
 AND md_rbac_allowed(t,u,rec.object_api,act)
 AND (rec.record_type_id IS NULL OR md_rbac_allowed(t,u,'RecordType:'||rec.object_api||'.'||rec.record_type_id,'read'))
 AND NOT EXISTS(SELECT 1 FROM md_record_policies rp WHERE rp.tenant_id=t AND rp.object_api=rec.object_api
  AND rp.kind='restriction' AND rp.enabled
  AND (rp.subject_type='all' OR (rp.subject_type='external' AND usr.user_type='external')
   OR (rp.subject_type='user' AND rp.subject_id=u) OR (rp.subject_type='role' AND EXISTS(
    SELECT 1 FROM md_user_roles ur WHERE ur.tenant_id=t AND ur.user_id=u AND ur.role_id=rp.subject_id)))
  AND NOT md_policy_matches(t,rp.id,rec.id))
 AND (CASE WHEN usr.user_type='external' THEN act='read' AND COALESCE(setting.portal_enabled,false)
   AND usr.external_account_id IS NOT NULL
   AND md_record_field(t,rec.id,setting.portal_account_field)=usr.external_account_id::text
 ELSE
 rec.owner_id=u OR (rec.owner_queue_id IS NOT NULL AND md_access_member(t,u,rec.owner_queue_id))
 OR md_rbac_allowed(t,u,'Record:'||rec.id::text,act)
 OR md_rbac_allowed(t,u,rec.object_api,'modifyAll') OR md_rbac_allowed(t,u,'Record','modifyAll')
 OR (act='read' AND (md_rbac_allowed(t,u,rec.object_api,'viewAll') OR md_rbac_allowed(t,u,'Record','viewAll')))
 OR (act='read' AND setting.default_access IN ('Public Read Only','Public Read/Write'))
 OR (act='edit' AND setting.default_access='Public Read/Write')
 OR (COALESCE(setting.use_hierarchy,true) AND EXISTS(
   SELECT 1 FROM md_user_role_tree(t,rec.owner_id) ancestor
   JOIN md_user_roles ur ON ur.tenant_id=t AND ur.user_id=u AND ur.role_id=ancestor.role_id
   WHERE NOT EXISTS(SELECT 1 FROM md_user_roles own WHERE own.tenant_id=t AND own.user_id=rec.owner_id AND own.role_id=ancestor.role_id)))
 OR (act IN ('read','edit') AND EXISTS(SELECT 1 FROM md_record_policies rp
  WHERE rp.tenant_id=t AND rp.object_api=rec.object_api AND rp.kind='share' AND rp.enabled
   AND (act='read' OR rp.access_level='Edit')
   AND (CASE rp.target_type WHEN 'User' THEN rp.target_id=u
    WHEN 'PublicGroup' THEN md_access_member(t,u,rp.target_id)
    WHEN 'Role' THEN EXISTS(SELECT 1 FROM md_user_roles ur WHERE ur.tenant_id=t AND ur.user_id=u AND ur.role_id=rp.target_id)
    WHEN 'RoleAndSubordinates' THEN rp.target_id IN(SELECT role_id FROM md_user_role_tree(t,u)) ELSE false END)
   AND (CASE rp.rule_type WHEN 'OwnerBased' THEN EXISTS(
    SELECT 1 FROM md_policy_owner_roles por JOIN md_user_roles own
     ON own.tenant_id=por.tenant_id AND own.role_id=por.role_id AND own.user_id=rec.owner_id
     WHERE por.tenant_id=t AND por.policy_id=rp.id)
    WHEN 'CriteriaBased' THEN md_policy_matches(t,rp.id,rec.id) ELSE false END)))
 END)
 FROM md_records rec JOIN md_users usr ON usr.tenant_id=t AND usr.id=u AND usr.enabled
 LEFT JOIN md_sharing_settings setting ON setting.tenant_id=t AND setting.object_api=rec.object_api
 WHERE rec.tenant_id=t AND rec.id=rid
 ),false)
$$;
-- END LEGACY 20261123-security-governance.sql

-- BEGIN LEGACY 20261124-connected-apps.sql
CREATE TABLE IF NOT EXISTS md_oauth_clients(
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),id uuid NOT NULL DEFAULT gen_random_uuid(),label text NOT NULL,
 enabled boolean NOT NULL DEFAULT false,client_type text NOT NULL CHECK(client_type IN ('public','confidential')),
 secret_hash text,require_mfa boolean NOT NULL DEFAULT true,PRIMARY KEY(tenant_id,id),UNIQUE(id)
);
CREATE TABLE IF NOT EXISTS md_oauth_redirects(
 tenant_id uuid NOT NULL,client_id uuid NOT NULL,uri text NOT NULL,origin text NOT NULL,
 PRIMARY KEY(tenant_id,client_id,uri),FOREIGN KEY(tenant_id,client_id) REFERENCES md_oauth_clients(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_oauth_client_scopes(
 tenant_id uuid NOT NULL,client_id uuid NOT NULL,scope text NOT NULL CHECK(scope IN ('records:read','records:write','metadata:read','flows:execute')),
 PRIMARY KEY(tenant_id,client_id,scope),FOREIGN KEY(tenant_id,client_id) REFERENCES md_oauth_clients(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_oauth_client_users(
 tenant_id uuid NOT NULL,client_id uuid NOT NULL,user_id uuid NOT NULL,PRIMARY KEY(tenant_id,client_id,user_id),
 FOREIGN KEY(tenant_id,client_id) REFERENCES md_oauth_clients(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_oauth_consents(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,client_id uuid NOT NULL,user_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),revoked_at timestamptz,UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,client_id) REFERENCES md_oauth_clients(tenant_id,id),FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_oauth_codes(
 code_hash text PRIMARY KEY,tenant_id uuid NOT NULL,consent_id uuid NOT NULL,redirect_uri text NOT NULL,challenge text NOT NULL,
 mfa_verified boolean NOT NULL,expires_at timestamptz NOT NULL DEFAULT now()+interval '2 minutes',consumed_at timestamptz,
 FOREIGN KEY(tenant_id,consent_id) REFERENCES md_oauth_consents(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_oauth_consent_scopes(
 tenant_id uuid NOT NULL,consent_id uuid NOT NULL,scope text NOT NULL,PRIMARY KEY(tenant_id,consent_id,scope),
 FOREIGN KEY(tenant_id,consent_id) REFERENCES md_oauth_consents(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS md_oauth_tokens(
 token_hash text PRIMARY KEY,tenant_id uuid NOT NULL,consent_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('access','refresh')),
 FOREIGN KEY(tenant_id,consent_id) REFERENCES md_oauth_consents(tenant_id,id)
);
CREATE OR REPLACE FUNCTION md_oauth_token_allowed(t uuid,u uuid,h text,path text,verb text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT NOT EXISTS(SELECT 1 FROM md_oauth_tokens WHERE token_hash=h)
 OR EXISTS(SELECT 1 FROM md_oauth_tokens b
  JOIN md_oauth_consents c ON c.tenant_id=b.tenant_id AND c.id=b.consent_id AND c.revoked_at IS NULL
  JOIN md_oauth_clients p ON p.tenant_id=c.tenant_id AND p.id=c.client_id AND p.enabled
  JOIN md_oauth_client_users a ON a.tenant_id=c.tenant_id AND a.client_id=c.client_id AND a.user_id=c.user_id
  JOIN md_oauth_consent_scopes s ON s.tenant_id=c.tenant_id AND s.consent_id=c.id
  JOIN md_oauth_client_scopes allowed ON allowed.tenant_id=c.tenant_id AND allowed.client_id=c.client_id AND allowed.scope=s.scope
  WHERE b.token_hash=h AND b.kind='access' AND b.tenant_id=t AND c.user_id=u AND md_rbac_allowed(t,u,'API','execute')
  AND (CASE s.scope
   WHEN 'records:read' THEN verb='GET' AND path ~ '^/(api/records(/|$)|services/data/v[0-9.]+/(query|queryAll|search|sobjects)(/|$))'
   WHEN 'records:write' THEN verb IN ('POST','PUT','PATCH','DELETE') AND path ~ '^/(api/records/|services/data/v[0-9.]+/sobjects/)'
   WHEN 'metadata:read' THEN verb='GET' AND path ~ '^/api/metadata/(objects|apps|pages|flows)(/|$)'
   WHEN 'flows:execute' THEN verb='POST' AND path ~ '^/api/flows/[A-Za-z][A-Za-z0-9_]*/run$'
   ELSE false END))
$$;
CREATE OR REPLACE FUNCTION md_oauth_refresh_allowed(h text,client uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT (client IS NULL AND NOT EXISTS(SELECT 1 FROM md_oauth_tokens WHERE token_hash=h))
 OR EXISTS(SELECT 1 FROM md_oauth_tokens b JOIN md_oauth_consents c ON c.tenant_id=b.tenant_id AND c.id=b.consent_id AND c.revoked_at IS NULL
  JOIN md_oauth_clients p ON p.tenant_id=c.tenant_id AND p.id=c.client_id AND p.enabled
  JOIN md_oauth_client_users a ON a.tenant_id=c.tenant_id AND a.client_id=c.client_id AND a.user_id=c.user_id
  WHERE b.token_hash=h AND b.kind='refresh' AND p.id=client AND md_user_licensed(c.tenant_id,c.user_id) AND md_rbac_allowed(c.tenant_id,c.user_id,'API','execute'))
$$;
-- END LEGACY 20261124-connected-apps.sql

-- BEGIN LEGACY 20261125-setup-audit-coverage.sql
-- Catalogue labels are SQL metadata; seeds preserve administrator customisations.
INSERT INTO md_system_permission_catalogue(permission_key,label,description,resource,action) VALUES
('metadata:read','View Setup','Central RBAC: ObjectDefinition / read','ObjectDefinition','read'),
('metadata:write','metadata — write','Central RBAC: ObjectDefinition / create','ObjectDefinition','create'),
('security:read','security — read','Central RBAC: Security / read','Security','read'),
('security:manage','Manage Users and Permissions','Central RBAC: Security / manage','Security','manage'),
('objects:manage','objects — manage','Central RBAC: ObjectDefinition / manage','ObjectDefinition','manage'),
('fields:create','fields — create','Central RBAC: FieldDefinition / create','FieldDefinition','create'),
('fields:delete','fields — delete','Central RBAC: FieldDefinition / delete','FieldDefinition','delete'),
('flows:manage','flows — manage','Central RBAC: FlowDefinition / manage','FlowDefinition','manage'),
('flows:run','flows — run','Central RBAC: Flow / execute','Flow','execute'),
('flows:system-context','flows — system-context','Central RBAC: FlowDefinition / system-context','FlowDefinition','system-context'),
('namedCredentials:manage','namedCredentials — manage','Central RBAC: NamedCredential / manage','NamedCredential','manage'),
('email:send','email — send','Central RBAC: Email / send','Email','send'),
('callouts:execute','callouts — execute','Central RBAC: NamedCredential / execute','NamedCredential','execute'),
('httpCallouts:execute','httpCallouts — execute','Central RBAC: HTTPCallout / execute','HTTPCallout','execute'),
('namedCredentials:read','namedCredentials — read','Central RBAC: NamedCredential / read','NamedCredential','read'),
('platformEvents:publish','platformEvents — publish','Central RBAC: PlatformEvent / publish','PlatformEvent','publish'),
('platformEvents:subscribe','platformEvents — subscribe','Central RBAC: PlatformEvent / subscribe','PlatformEvent','subscribe'),
('webhooks:manage','webhooks — manage','Central RBAC: WebhookSubscription / manage','WebhookSubscription','manage'),
('webhooks:read','webhooks — read','Central RBAC: WebhookSubscription / read','WebhookSubscription','read'),
('webhooks:execute','webhooks — execute','Central RBAC: WebhookSubscription / execute','WebhookSubscription','execute'),
('notifications:send','notifications — send','Central RBAC: Notification / send','Notification','send'),
('approvals:manage','approvals — manage','Central RBAC: ApprovalRequest / manage','ApprovalRequest','manage'),
('reports:manage','reports — manage','Central RBAC: SystemDefinition:reports / manage','SystemDefinition:reports','manage'),
('pages:manage','pages — manage','Central RBAC: PageDefinition / manage','PageDefinition','manage'),
('components:manage','components — manage','Central RBAC: ComponentDefinition / create','ComponentDefinition','create'),
('dashboards:manage','dashboards — manage','Central RBAC: SystemDefinition:dashboards / manage','SystemDefinition:dashboards','manage'),
('dashboards:viewTeam','dashboards — viewTeam','Central RBAC: SystemDefinition:dashboards / read','SystemDefinition:dashboards','read'),
('data:viewAll','View All Data','Central RBAC: Record / viewAll','Record','viewAll'),
('data:modifyAll','Modify All Data','Central RBAC: Record / modifyAll','Record','modifyAll'),
('api:enabled','API Enabled','Central RBAC: API / execute','API','execute'),
('users:read','users — read','Central RBAC: User / read','User','read'),
('users:create','users — create','Central RBAC: User / create','User','create'),
('users:edit','users — edit','Central RBAC: User / edit','User','edit'),
('users:delete','users — delete','Central RBAC: User / delete','User','delete'),
('audit:read','View Setup Audit Trail','Central RBAC: SetupAudit / read','SetupAudit','read'),
('audit:export','Export Setup Audit Trail','Central RBAC: SetupAudit / export','SetupAudit','export'),
('monitoring:read','monitoring — read','Central RBAC: SecurityMonitoring / read','SecurityMonitoring','read'),
('monitoring:manage','monitoring — manage','Central RBAC: SecurityMonitoring / manage','SecurityMonitoring','manage'),
('connectedApps:manage','Manage Connected Apps','Central RBAC: ConnectedApp / manage','ConnectedApp','manage')
ON CONFLICT(permission_key) DO NOTHING;
-- Default-deny classification for newly introduced md_* setup tables: all tables are
-- audited unless explicitly classified as business data, derived runtime state or logs.
CREATE OR REPLACE FUNCTION md_install_setup_audit() RETURNS void LANGUAGE plpgsql AS $$
DECLARE n text;
BEGIN
 FOR n IN SELECT tablename FROM pg_tables WHERE schemaname=current_schema() AND starts_with(tablename,'md_')
  AND tablename NOT IN('md_records','md_record_values','md_record_multi_values','md_deleted_lookup_links','md_record_files','md_record_activities','md_record_chatter_posts','md_record_chatter_comments','md_record_history','md_record_lifecycle_audit','md_record_retention_audit','md_auto_number_counters','md_sessions','md_refresh_sessions','md_security_events','md_setup_audit_events','md_setup_audit_tables','md_monitor_events','md_security_rule_windows','md_rbac_revisions','md_password_history','md_password_reset_challenges','md_mfa_login_challenges','md_mfa_enrollment_tokens','md_mfa_backup_codes','md_webauthn_challenges','md_federation_requests','md_federation_tickets','md_saml_request_ids','md_oauth_codes','md_oauth_tokens','md_oauth_consents','md_oauth_consent_scopes','md_notifications','md_approval_requests','md_dashboard_snapshots','md_flow_runs','md_flow_run_inputs','md_flow_interview_state','md_flow_interview_values','md_flow_interview_records','md_flow_interview_record_fields','md_flow_interview_loop_state','md_flow_execution_audit','md_flow_execution_requests','md_flow_execution_result_values','md_flow_email_jobs','md_http_callout_jobs','md_http_callout_job_values','md_platform_event_deliveries','md_platform_event_messages','md_platform_event_values','md_webhook_deliveries','md_durable_jobs','md_durable_job_events','md_durable_job_values','md_encrypted_field_access_audit','md_tenant_recovery_cases','md_tenant_recovery_case_proofs','md_tenant_recovery_approvals','md_tenant_lifecycle_audit','md_global_value_set_audit','md_tenant_provisioning_requests','md_bootstrap_password_repairs','md_initial_password_rotations','md_system_migrations','md_schema_migrations','md_migrations','md_tenant_api_usage_daily','md_api_usage_daily','md_api_request_counts','md_offline_sync_receipts','md_data_import_jobs','md_data_import_rows','md_data_export_jobs') LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS md_capture_setup_mutation ON %I',n);
  EXECUTE format('CREATE TRIGGER md_capture_setup_mutation AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION md_capture_setup_mutation()',n);
  INSERT INTO md_setup_audit_tables VALUES(n) ON CONFLICT DO NOTHING;
 END LOOP;
END
$$;
SELECT md_install_setup_audit();
DROP TRIGGER IF EXISTS md_protect_setup_audit_truncate ON md_setup_audit_events;
CREATE TRIGGER md_protect_setup_audit_truncate BEFORE TRUNCATE ON md_setup_audit_events FOR EACH STATEMENT EXECUTE FUNCTION md_protect_setup_audit();
-- END LEGACY 20261125-setup-audit-coverage.sql

-- BEGIN LEGACY 20261126-inbound-webhook-endpoints.sql
-- Universal tenant/app scoped inbound webhook registry. Outbound subscriptions remain independent.
CREATE TABLE IF NOT EXISTS md_inbound_webhook_endpoints (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 api_name text NOT NULL CHECK(api_name ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 app_id uuid NOT NULL REFERENCES md_apps(id),
 flow_api text NOT NULL CHECK(flow_api ~ '^[A-Za-z][A-Za-z0-9_]*$'),
 execution_user_id uuid NOT NULL,
 provider text NOT NULL DEFAULT 'Meta' CHECK(provider IN ('Meta','HmacSha256')),
 verify_token_digest bytea NOT NULL,
 signature_secret_ciphertext bytea NOT NULL,
 encryption_key_id text NOT NULL,
 enabled boolean NOT NULL DEFAULT false,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,id),
 UNIQUE(tenant_id,api_name),
 FOREIGN KEY(tenant_id,execution_user_id) REFERENCES md_users(tenant_id,id),
 FOREIGN KEY(tenant_id,created_by) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_inbound_webhook_endpoints_app
 ON md_inbound_webhook_endpoints(tenant_id,app_id) WHERE enabled=true;
CREATE TABLE IF NOT EXISTS md_inbound_webhook_events (
 tenant_id uuid NOT NULL,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 endpoint_id uuid NOT NULL,
 payload jsonb NOT NULL,
 payload_hash text NOT NULL,
 status text NOT NULL DEFAULT 'received' CHECK(status IN ('received','completed','failed')),
 error_code text,
 received_at timestamptz NOT NULL DEFAULT now(),
 processed_at timestamptz,
 PRIMARY KEY(tenant_id,id),
 UNIQUE(tenant_id,endpoint_id,payload_hash),
 FOREIGN KEY(tenant_id,endpoint_id) REFERENCES md_inbound_webhook_endpoints(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_inbound_webhook_events_status
 ON md_inbound_webhook_events(tenant_id,status,received_at);
-- END LEGACY 20261126-inbound-webhook-endpoints.sql

-- BEGIN LEGACY 20261126-mcp-connection.sql
-- MCP credentials are explicitly bound to one HTTPS resource and retain central RBAC.
ALTER TABLE md_oauth_consents ADD COLUMN IF NOT EXISTS resource text;
ALTER TABLE md_oauth_client_scopes DROP CONSTRAINT IF EXISTS md_oauth_client_scopes_scope_check;
ALTER TABLE md_oauth_client_scopes ADD CONSTRAINT md_oauth_client_scopes_scope_check
 CHECK(scope IN ('records:read','records:write','metadata:read','flows:execute','mcp:access','operations:manage'));
INSERT INTO md_system_permission_catalogue(permission_key,label,description,resource,action) VALUES
 ('platformOperations:read','Read server operations','Inspect server service status and logs','PlatformOperations','read'),
 ('platformOperations:manage','Manage server operations','Restart services and activate staged releases','PlatformOperations','manage')
ON CONFLICT(permission_key) DO NOTHING;
CREATE OR REPLACE FUNCTION md_oauth_token_allowed(t uuid,u uuid,h text,path text,verb text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT NOT EXISTS(SELECT 1 FROM md_oauth_tokens WHERE token_hash=h)
 OR EXISTS(SELECT 1 FROM md_oauth_tokens b
  JOIN md_oauth_consents c ON c.tenant_id=b.tenant_id AND c.id=b.consent_id AND c.revoked_at IS NULL
  JOIN md_oauth_clients p ON p.tenant_id=c.tenant_id AND p.id=c.client_id AND p.enabled
  JOIN md_oauth_client_users a ON a.tenant_id=c.tenant_id AND a.client_id=c.client_id AND a.user_id=c.user_id
  JOIN md_oauth_consent_scopes s ON s.tenant_id=c.tenant_id AND s.consent_id=c.id
  JOIN md_oauth_client_scopes allowed ON allowed.tenant_id=c.tenant_id AND allowed.client_id=c.client_id AND allowed.scope=s.scope
  WHERE b.token_hash=h AND b.kind='access' AND b.tenant_id=t AND c.user_id=u AND md_rbac_allowed(t,u,'API','execute')
  AND (CASE s.scope
   WHEN 'mcp:access' THEN path='/api/mcp' AND verb IN ('POST','GET','DELETE')
   WHEN 'operations:manage' THEN false
   WHEN 'records:read' THEN verb='GET' AND path ~ '^/(api/records(/|$)|services/data/v[0-9.]+/(query|queryAll|search|sobjects)(/|$))'
   WHEN 'records:write' THEN verb IN ('POST','PUT','PATCH','DELETE') AND path ~ '^/(api/records/|services/data/v[0-9.]+/sobjects/)'
   WHEN 'metadata:read' THEN verb='GET' AND path ~ '^/api/metadata/(objects|apps|pages|flows)(/|$)'
   WHEN 'flows:execute' THEN verb='POST' AND path ~ '^/api/flows/[A-Za-z][A-Za-z0-9_]*/run$'
   ELSE false END))
$$;
-- END LEGACY 20261126-mcp-connection.sql

-- BEGIN LEGACY 20261126-metadata-loader-hard-delete-permissions.sql
-- Explicit OneEngine privileges for metadata purge. No role receives these automatically.
INSERT INTO md_system_permission_catalogue(permission_key,label,description,resource,action) VALUES
 ('objects:hardDelete','Permanently Delete Objects','Permanent metadata deletion (requires OneEngine grant)','ObjectDefinition','hard-delete'),
 ('fields:hardDelete','Permanently Delete Fields','Permanent metadata deletion (requires OneEngine grant)','FieldDefinition','hard-delete')
ON CONFLICT(permission_key) DO NOTHING;
-- END LEGACY 20261126-metadata-loader-hard-delete-permissions.sql

-- BEGIN LEGACY 20261127-credential-webhooks.sql
-- Optional inbound webhooks belong to a Named Credential, not to a Flow or app.
-- Older app/Flow webhook endpoints remain valid.
ALTER TABLE md_inbound_webhook_endpoints
  ADD COLUMN IF NOT EXISTS credential_id uuid;
ALTER TABLE md_inbound_webhook_endpoints ALTER COLUMN app_id DROP NOT NULL;
ALTER TABLE md_inbound_webhook_endpoints ALTER COLUMN flow_api DROP NOT NULL;
ALTER TABLE md_inbound_webhook_endpoints ALTER COLUMN execution_user_id DROP NOT NULL;
ALTER TABLE md_inbound_webhook_endpoints
  ADD CONSTRAINT md_inbound_webhook_credential_fk
  FOREIGN KEY (tenant_id,credential_id)
  REFERENCES md_named_credentials(tenant_id,id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS md_inbound_webhook_credential_one
  ON md_inbound_webhook_endpoints(tenant_id,credential_id)
  WHERE credential_id IS NOT NULL;
-- END LEGACY 20261127-credential-webhooks.sql

-- BEGIN LEGACY 20261127-flow-parse-json.sql
-- Shared, no-code Flow JSON selector for signed webhook and HTTP payloads.
INSERT INTO md_flow_capability_elements
(element_type,display_group,display_icon,sort_order,builder_enabled,before_save_allowed,
 config_schema_key,validator_key,runtime_handler_key,debug_behavior,registry_version)
VALUES('Parse JSON','Data','{}',185,true,false,'flow:Parse JSON',
 'Parse JSON','Parse JSON','simulate',4)
ON CONFLICT(element_type) DO NOTHING;
INSERT INTO md_flow_capability_element_flows(element_type,flow_type,builder_allowed)
SELECT 'Parse JSON',flow_type,true FROM md_flow_capability_flow_types
 WHERE flow_type IN ('Autolaunched Flow','Screen Flow','Record-Triggered Flow')
ON CONFLICT(element_type,flow_type) DO NOTHING;
INSERT INTO md_flow_capability_properties(element_type,property_name,value_type,required,sort_order)
VALUES('Parse JSON','source','resource',true,10),
      ('Parse JSON','assignments','list',true,20)
ON CONFLICT(element_type,property_name) DO NOTHING;
-- END LEGACY 20261127-flow-parse-json.sql

-- BEGIN LEGACY 20261127-platform-deployment-owner-bootstrap.sql
-- A one-time, append-only receipt for the provisioned platform deploy owner.
-- Never use bootstrap credentials as runtime authorization. Runtime checks only SQL
-- assignments and revocable OneEngine RBAC grants.
CREATE TABLE IF NOT EXISTS md_platform_deployment_owner_receipts (
 tenant_id uuid PRIMARY KEY REFERENCES md_tenants(id),
 user_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,user_id) REFERENCES md_users(tenant_id,id)
);
-- END LEGACY 20261127-platform-deployment-owner-bootstrap.sql

-- BEGIN LEGACY 20261128-approved-oci-platform-owner.sql
-- One-time OCI platform-owner approval from the authenticated repository owner.
-- Selector is a SHA-256 digest of the explicitly supplied account identifier;
-- no plaintext user identifiers or runtime email bypass are introduced.
-- This does not change OneEngine or grant platform rights to other tenant users.
-- Platform runtime checks continue to require PlatformDeveloper + central RBAC.
-- The existing append-only receipt prevents silently restoring revoked grants.
DO $platform_owner$
DECLARE
 target_tenant uuid;
 target_user uuid;
 policy_id uuid;
 policy_effect text;
BEGIN
 IF EXISTS(SELECT 1 FROM md_platform_deployment_owner_receipts) THEN
  RAISE NOTICE 'Platform deployment owner already bootstrapped; no changes';
  RETURN;
 END IF;
 IF (SELECT count(*) FROM md_tenants) <> 1 THEN
  RAISE NOTICE 'Platform owner approval skipped: not a single-tenant OCI platform';
  RETURN;
 END IF;
 SELECT u.tenant_id,u.id INTO target_tenant,target_user
 FROM md_users u
 JOIN md_tenants t ON t.id=u.tenant_id
 JOIN md_tenant_domains d ON d.tenant_id=t.id
 WHERE d.domain='unesolutions.co.uk'
   AND t.status='ACTIVE' AND u.enabled=true AND u.user_type='internal'
   AND encode(sha256(convert_to(lower(u.email),'UTF8')),'hex')=
     '1aaeebc4119ff93bf2deadf59584c50f517633871c355fa05999429cc1479819'
   AND EXISTS (
    SELECT 1 FROM md_permission_assignments a
    JOIN md_permission_sets p ON p.tenant_id=a.tenant_id AND p.id=a.permission_set_id
    WHERE a.tenant_id=u.tenant_id AND a.user_id=u.id AND p.api_name='OneEngine')
   AND md_rbac_allowed(u.tenant_id,u.id,'Tenant','manage');
 IF target_user IS NULL THEN
  RAISE NOTICE 'Platform owner approval skipped: selected account not uniquely eligible';
  RETURN;
 END IF;
 -- Never overwrite an existing policy, explicit deny or tenant customisation.
 INSERT INTO md_permission_sets(tenant_id,api_name)
 VALUES(target_tenant,'PlatformDeveloper')
 ON CONFLICT(tenant_id,api_name) DO NOTHING;
 SELECT id INTO policy_id FROM md_permission_sets
 WHERE tenant_id=target_tenant AND api_name='PlatformDeveloper';
 INSERT INTO md_permission_rules(tenant_id,permission_set_id,resource,action,effect)
 VALUES(target_tenant,policy_id,'PlatformOperations','manage','allow')
 ON CONFLICT(tenant_id,permission_set_id,resource,action) DO NOTHING;
 SELECT effect INTO policy_effect FROM md_permission_rules
 WHERE tenant_id=target_tenant AND permission_set_id=policy_id
   AND resource='PlatformOperations' AND action='manage';
 IF policy_effect IS DISTINCT FROM 'allow' THEN
  RAISE NOTICE 'Platform owner approval skipped: existing policy denies operations';
  RETURN;
 END IF;
 INSERT INTO md_permission_assignments(tenant_id,user_id,permission_set_id)
 VALUES(target_tenant,target_user,policy_id)
 ON CONFLICT(tenant_id,user_id,permission_set_id) DO NOTHING;
 -- SQL is the source of truth. No email-based request bypass or hidden role.
 INSERT INTO md_platform_deployment_owner_receipts(tenant_id,user_id)
 VALUES(target_tenant,target_user);
 INSERT INTO md_security_events(tenant_id,actor_user_id,subject_user_id,action,details)
 VALUES(target_tenant,NULL,target_user,'platform.production-deploy.bootstrap-granted',
  '{"source":"approved-oci-owner-bootstrap","policy":"PlatformDeveloper","resource":"PlatformOperations","action":"manage"}'::jsonb);
 RAISE NOTICE 'Approved OCI platform owner policy granted; runtime RBAC remains authoritative';
END $platform_owner$;
-- END LEGACY 20261128-approved-oci-platform-owner.sql

-- BEGIN LEGACY 20261128-connector-app-metadata.sql
-- Connector app ownership and non-secret, independently editable tenant configuration fields.
CREATE TABLE IF NOT EXISTS md_connector_app_credentials (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 app_id uuid NOT NULL REFERENCES md_apps(id),
 credential_id uuid NOT NULL,
 credential_name text NOT NULL,
 provisioned boolean NOT NULL DEFAULT false,
 PRIMARY KEY(tenant_id,app_id,credential_name),
 FOREIGN KEY (tenant_id,credential_id) REFERENCES md_named_credentials(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_connector_app_credentials_ref
 ON md_connector_app_credentials(tenant_id,credential_id);
CREATE TABLE IF NOT EXISTS md_connector_app_fields (
 tenant_id uuid NOT NULL REFERENCES md_tenants(id),
 app_id uuid NOT NULL REFERENCES md_apps(id),
 credential_name text NOT NULL,
 field_api text NOT NULL CHECK(field_api ~ '^public_[A-Za-z][A-Za-z0-9_]*$'),
 label text NOT NULL,
 required boolean NOT NULL DEFAULT false,
 default_value text NOT NULL DEFAULT '',
 PRIMARY KEY(tenant_id,app_id,credential_name,field_api),
 FOREIGN KEY(tenant_id,app_id,credential_name)
 REFERENCES md_connector_app_credentials(tenant_id,app_id,credential_name)
);
-- END LEGACY 20261128-connector-app-metadata.sql

-- BEGIN LEGACY 20261128-universal-context-flows.sql
-- Metadata-only registration: reuse the shared Flow runtime and SQL user contexts.
INSERT INTO md_flow_capability_elements
(element_type,display_group,display_icon,sort_order,builder_enabled,before_save_allowed,
 config_schema_key,validator_key,runtime_handler_key,debug_behavior,registry_version)
VALUES('Get Context','Data','C',166,true,false,'flow:Get Context','Get Context','Get Context','simulate',1),
 ('Set Context','Data','C',167,true,false,'flow:Set Context','Set Context','Set Context','simulate',1),
 ('Clear Context','Data','C',168,true,false,'flow:Clear Context','Clear Context','Clear Context','simulate',1)
ON CONFLICT(element_type) DO NOTHING;
INSERT INTO md_flow_capability_element_flows(element_type,flow_type,builder_allowed)
SELECT e.element_type,f.flow_type,true FROM md_flow_capability_elements e
CROSS JOIN md_flow_capability_flow_types f
WHERE e.element_type IN('Get Context','Set Context','Clear Context')
 AND f.flow_type IN('Autolaunched Flow','Screen Flow','In-Screen Flow','Record-Triggered Flow')
ON CONFLICT(element_type,flow_type) DO NOTHING;
INSERT INTO md_flow_capability_properties(element_type,property_name,value_type,required,sort_order)
VALUES('Get Context','contextApiName','text',true,10),
 ('Get Context','outputVariable','resource',true,20),
 ('Set Context','contextApiName','text',true,10),
 ('Set Context','recordId','resource',true,20),
 ('Clear Context','contextApiName','text',true,10)
ON CONFLICT(element_type,property_name) DO NOTHING;
-- END LEGACY 20261128-universal-context-flows.sql

-- BEGIN LEGACY 20261128-webhook-verify-token-vault.sql
-- Preserve separately generated webhook verify tokens for audited, RBAC-restricted retrieval.
-- Older hash-only endpoints remain valid but require resetting the verification token to make it revealable.
ALTER TABLE md_inbound_webhook_endpoints ADD COLUMN IF NOT EXISTS verify_token_ciphertext bytea;
-- END LEGACY 20261128-webhook-verify-token-vault.sql

-- BEGIN LEGACY 20261129-oneengine-oci-deployment.sql
-- Transfer OCI deployment authority to the existing OneEngine permission set,
-- only in the canonical platform tenant. All other tenants are excluded.
-- Preserve existing explicit deny/customisation; no user assignments, records,
-- legacy permission sets or privileges are removed.
WITH granted AS (
 INSERT INTO md_permission_rules(tenant_id,permission_set_id,resource,action,effect)
 SELECT p.tenant_id,p.id,'PlatformOperations','manage','allow'
 FROM md_permission_sets p
 JOIN md_tenant_domains d ON d.tenant_id=p.tenant_id
 JOIN md_tenants t ON t.id=d.tenant_id
 WHERE p.api_name='OneEngine' AND d.domain='unesolutions.co.uk'
  AND t.status='ACTIVE'
 ON CONFLICT(tenant_id,permission_set_id,resource,action) DO NOTHING
 RETURNING tenant_id
)
INSERT INTO md_security_events(tenant_id,actor_user_id,action,details)
SELECT tenant_id,NULL,'platform.oneengine-deploy-grant.migrated',
 '{"policy":"OneEngine","resource":"PlatformOperations","action":"manage"}'::jsonb
FROM granted;
-- END LEGACY 20261129-oneengine-oci-deployment.sql

-- BEGIN LEGACY 20261129-required-connector-fields.sql
-- Remove obsolete connector-installed optional field declarations for existing tenants.
-- Named Credential configuration ciphertext and secrets are never modified.
DELETE FROM md_connector_app_fields f
USING md_apps a
WHERE f.app_id=a.id
  AND a.tenant_owner_id IS NULL
  AND a.api_name IN ('WhatsAppConnector','SmsGateConnector','BrevoConnector',
                     'UberEatsConnector','DeliverooConnector','JustEatConnector')
  AND NOT (a.api_name='WhatsAppConnector' AND f.field_api='public_phoneNumberId');
-- END LEGACY 20261129-required-connector-fields.sql
