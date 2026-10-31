-- Authorise Page Builder authoring independently from business-record CRUD.
-- No existing OAuth client receives the new scope automatically; the owner must
-- explicitly grant the capability and renew consent. Existing grants are preserved.
ALTER TABLE md_oauth_client_scopes
 DROP CONSTRAINT IF EXISTS md_oauth_client_scopes_scope_check;
ALTER TABLE md_oauth_client_scopes
 ADD CONSTRAINT md_oauth_client_scopes_scope_check
 CHECK (scope IN ('records:read','records:write','metadata:read','metadata:write',
                 'flows:execute','mcp:access','operations:manage'));
