-- Independent, immutable, tenant-scoped Page Builder revisions. Existing published pages remain unchanged.
-- The four layout identities share their page_id, Flows, permissions and activation assignments.
CREATE TABLE IF NOT EXISTS md_page_layout_versions (
 tenant_id uuid NOT NULL, page_id uuid NOT NULL,
 variant text NOT NULL CHECK(variant IN ('Mobile','Desktop','Tablet','Custom')),
 version integer NOT NULL CHECK(version>0),
 page_label text NOT NULL CHECK(length(page_label) BETWEEN 1 AND 200),
 layout_mode text NOT NULL CHECK(layout_mode IN ('template','free-canvas')),
 template text,
 canvas_width integer NOT NULL CHECK(canvas_width BETWEEN 320 AND 10000),
 canvas_height integer NOT NULL CHECK(canvas_height BETWEEN 320 AND 10000),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,page_id,variant,version),
 FOREIGN KEY(tenant_id,page_id) REFERENCES md_lightning_page_details(tenant_id,page_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_page_layout_heads (
 tenant_id uuid NOT NULL, page_id uuid NOT NULL,
 variant text NOT NULL CHECK(variant IN ('Mobile','Desktop','Tablet','Custom')),
 draft_version integer,
 published_version integer,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,page_id,variant),
 FOREIGN KEY(tenant_id,page_id) REFERENCES md_lightning_page_details(tenant_id,page_id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,page_id,variant,draft_version) REFERENCES md_page_layout_versions(tenant_id,page_id,variant,version),
 FOREIGN KEY(tenant_id,page_id,variant,published_version) REFERENCES md_page_layout_versions(tenant_id,page_id,variant,version)
);
CREATE TABLE IF NOT EXISTS md_page_layout_version_nodes (
 tenant_id uuid NOT NULL, page_id uuid NOT NULL, variant text NOT NULL,
 version integer NOT NULL,
 component_key text NOT NULL CHECK(length(component_key) BETWEEN 1 AND 128),
 component_type text NOT NULL CHECK(length(component_type) BETWEEN 1 AND 128),
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 200),
 region text NOT NULL DEFAULT 'main',
 visible boolean NOT NULL DEFAULT true,
 sort_order integer NOT NULL,
 PRIMARY KEY(tenant_id,page_id,variant,version,component_key),
 FOREIGN KEY(tenant_id,page_id,variant,version)
  REFERENCES md_page_layout_versions(tenant_id,page_id,variant,version) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_page_layout_version_properties (
 tenant_id uuid NOT NULL, page_id uuid NOT NULL, variant text NOT NULL,
 version integer NOT NULL, component_key text NOT NULL,
 property_path text NOT NULL CHECK(length(property_path) BETWEEN 1 AND 1024),
 value_kind text NOT NULL CHECK(value_kind IN ('string','number','boolean','null','array','object')),
 value_text text,
 PRIMARY KEY(tenant_id,page_id,variant,version,component_key,property_path),
 FOREIGN KEY(tenant_id,page_id,variant,version,component_key)
  REFERENCES md_page_layout_version_nodes(tenant_id,page_id,variant,version,component_key) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_page_layout_version_activation (
 tenant_id uuid NOT NULL, page_id uuid NOT NULL, variant text NOT NULL,
 version integer NOT NULL,
 assignment_id text NOT NULL CHECK(length(assignment_id) BETWEEN 1 AND 128),
 scope text NOT NULL CHECK(scope IN ('Org Default','App Default','App and Profile','App, Record Type, and Profile')),
 app_api text, profile_id text, record_type_id text,
 desktop boolean NOT NULL DEFAULT true,
 phone boolean NOT NULL DEFAULT false,
 sort_order integer NOT NULL,
 PRIMARY KEY(tenant_id,page_id,variant,version,assignment_id),
 FOREIGN KEY(tenant_id,page_id,variant,version)
  REFERENCES md_page_layout_versions(tenant_id,page_id,variant,version) ON DELETE CASCADE,
 CHECK(desktop OR phone)
);
CREATE INDEX IF NOT EXISTS md_page_layout_history ON md_page_layout_versions(tenant_id,page_id,variant,version DESC);

CREATE TABLE IF NOT EXISTS md_page_layout_audit (
 tenant_id uuid NOT NULL,
 page_id uuid NOT NULL,
 actor_user_id uuid NOT NULL,
 variant text NOT NULL CHECK(variant IN ('Mobile','Desktop','Tablet','Custom')),
 version integer NOT NULL CHECK(version>0),
 operation text NOT NULL CHECK(operation IN ('SaveDraft','Publish','RestoreDraft')),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,page_id) REFERENCES md_lightning_page_details(tenant_id,page_id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,actor_user_id) REFERENCES md_users(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS md_page_layout_audit_tenant_page
 ON md_page_layout_audit(tenant_id,page_id,occurred_at DESC);
