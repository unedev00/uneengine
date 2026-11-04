-- Explicit OneEngine privileges for metadata purge. No role receives these automatically.
INSERT INTO md_system_permission_catalogue(permission_key,label,description,resource,action) VALUES
 ('objects:hardDelete','Permanently Delete Objects','Permanent metadata deletion (requires OneEngine grant)','ObjectDefinition','hard-delete'),
 ('fields:hardDelete','Permanently Delete Fields','Permanent metadata deletion (requires OneEngine grant)','FieldDefinition','hard-delete')
ON CONFLICT(permission_key) DO NOTHING;
