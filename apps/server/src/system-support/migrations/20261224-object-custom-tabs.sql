-- Object tab settings are tenant-scoped metadata; absence means no custom tab.
CREATE TABLE IF NOT EXISTS md_object_custom_tabs (
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 style text NOT NULL CHECK(style IN ('Blue','Green','Orange','Purple','Red','Teal','Yellow')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,object_api),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE
);
