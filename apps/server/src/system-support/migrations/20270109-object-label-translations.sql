-- Tenant-specific object and field labels, without changing canonical API names.
-- Empty field_api translates Object.label. '*' translates Object.pluralLabel.
CREATE TABLE IF NOT EXISTS md_object_label_translations (
 tenant_id uuid NOT NULL, object_api text NOT NULL,
 field_api text NOT NULL DEFAULT '',
 language text NOT NULL CHECK(language ~ '^[a-z]{2,8}(-[a-z0-9]{1,8})*$'),
 value_text text NOT NULL CHECK(length(trim(value_text)) BETWEEN 1 AND 255),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,object_api,language,field_api),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE,
 CHECK(field_api IN ('','*') OR field_api ~ '^[A-Za-z][A-Za-z0-9_]*$')
);
CREATE INDEX IF NOT EXISTS md_object_label_translations_language
 ON md_object_label_translations(tenant_id,language,object_api);

CREATE TABLE IF NOT EXISTS md_object_label_translation_revisions (
 tenant_id uuid NOT NULL,object_api text NOT NULL,language text NOT NULL,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,object_api,language),
 FOREIGN KEY(tenant_id,object_api) REFERENCES md_object_definitions(tenant_id,api_name) ON DELETE CASCADE
);
