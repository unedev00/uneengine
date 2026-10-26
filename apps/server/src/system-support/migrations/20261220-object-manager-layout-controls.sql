-- Persist Object Manager compact highlights and list-view action configuration.
-- Additive, tenant-scoped, and safe for existing records and customisations.
CREATE TABLE IF NOT EXISTS md_object_compact_layouts (
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 layout_id text NOT NULL CHECK(length(layout_id) BETWEEN 1 AND 128),
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 200),
 sort_order integer NOT NULL DEFAULT 0,
 PRIMARY KEY(tenant_id,object_api,layout_id),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_object_compact_layout_fields (
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 layout_id text NOT NULL,
 field_api text NOT NULL,
 sort_order integer NOT NULL CHECK(sort_order >= 0),
 PRIMARY KEY(tenant_id,object_api,layout_id,field_api),
 UNIQUE(tenant_id,object_api,layout_id,sort_order),
 FOREIGN KEY(tenant_id,object_api,layout_id)
   REFERENCES md_object_compact_layouts(tenant_id,object_api,layout_id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,object_api,field_api)
   REFERENCES md_field_definitions(tenant_id,object_api,api_name)
);
CREATE TABLE IF NOT EXISTS md_object_compact_layout_assignments (
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 profile_id text NOT NULL,
 record_type_id text NOT NULL,
 layout_id text NOT NULL,
 PRIMARY KEY(tenant_id,object_api,profile_id,record_type_id),
 FOREIGN KEY(tenant_id,object_api,layout_id)
   REFERENCES md_object_compact_layouts(tenant_id,object_api,layout_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS md_object_list_view_buttons (
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 button_name text NOT NULL CHECK(button_name IN ('New','Change Owner','Printable View')),
 enabled boolean NOT NULL,
 sort_order integer NOT NULL,
 PRIMARY KEY(tenant_id,object_api,button_name),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE
);
