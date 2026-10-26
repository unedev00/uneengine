-- Extend the shared tenant media store to safe PDF documents. Images retain
-- their existing limits and validation; existing assets are preserved.
ALTER TABLE md_tenant_media_assets
 DROP CONSTRAINT IF EXISTS md_tenant_media_assets_content_type_check;
ALTER TABLE md_tenant_media_assets
 ADD CONSTRAINT md_tenant_media_assets_content_type_check
 CHECK (content_type IN ('image/jpeg','image/png','image/gif','image/webp','application/pdf'));
