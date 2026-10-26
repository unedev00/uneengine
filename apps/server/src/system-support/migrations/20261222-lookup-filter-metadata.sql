-- Tenant-scoped lookup filter metadata, shared by Record Engine and Object Manager.
CREATE TABLE IF NOT EXISTS md_object_lookup_filters (
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 filter_id text NOT NULL CHECK(length(filter_id) BETWEEN 1 AND 128),
 field_api text NOT NULL,
 related_field_api text NOT NULL,
 operator text NOT NULL CHECK(operator IN ('Equals','Not Equal To','Contains','Starts With','Greater Than','Less Than','Is Null','Is Not Null')),
 value_text text NOT NULL DEFAULT '',
 value_field_api text,
 required boolean NOT NULL DEFAULT false,
 sort_order integer NOT NULL DEFAULT 0,
 PRIMARY KEY(tenant_id,object_api,filter_id),
 FOREIGN KEY(tenant_id,object_api,field_api)
  REFERENCES md_field_definitions(tenant_id,object_api,api_name),
 FOREIGN KEY(tenant_id,object_api,value_field_api)
  REFERENCES md_field_definitions(tenant_id,object_api,api_name)
);
CREATE INDEX IF NOT EXISTS md_object_lookup_filters_field
 ON md_object_lookup_filters(tenant_id,object_api,field_api,sort_order);
CREATE TABLE IF NOT EXISTS md_object_lookup_filter_logic (
 tenant_id uuid NOT NULL,
 object_api text NOT NULL,
 field_api text NOT NULL,
 logic text NOT NULL CHECK(logic IN ('All','Any')),
 PRIMARY KEY(tenant_id,object_api,field_api),
 FOREIGN KEY(tenant_id,object_api,field_api)
  REFERENCES md_field_definitions(tenant_id,object_api,api_name)
);
