-- Object-owned Record View and Record Edit pages. Reuses the existing Page
-- metadata/versions/activation tables; never changes existing customer pages.
ALTER TABLE md_lightning_page_details
  ADD COLUMN IF NOT EXISTS record_mode text NOT NULL DEFAULT 'View';
ALTER TABLE md_lightning_page_details
  DROP CONSTRAINT IF EXISTS md_lightning_page_details_record_mode_check;
ALTER TABLE md_lightning_page_details
  ADD CONSTRAINT md_lightning_page_details_record_mode_check
  CHECK (record_mode IN ('View','Edit'));
CREATE INDEX IF NOT EXISTS md_record_page_mode_resolution
  ON md_lightning_page_details (tenant_id,target_object,record_mode,status)
  WHERE page_type='Record Page';

-- Stable per-tenant names avoid colliding with customer-created pages.
-- Existing View pages retain their exact metadata, versions and assignments.
CREATE OR REPLACE FUNCTION md_ensure_object_record_pages(p_tenant uuid,p_object text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_mode text;
  v_api text;
  v_label text;
  v_page uuid;
BEGIN
  FOR v_mode IN SELECT mode_name FROM (VALUES ('View'),('Edit')) AS modes(mode_name) LOOP
    IF EXISTS (
      SELECT 1 FROM md_lightning_page_details d
      JOIN md_page_definitions p ON p.tenant_id=d.tenant_id AND p.id=d.page_id
      WHERE d.tenant_id=p_tenant AND d.target_object=p_object
        AND d.page_type='Record Page' AND d.record_mode=v_mode
        AND p.enabled=true
    ) THEN CONTINUE; END IF;

    v_api='Record_'||substr(md5(p_tenant::text||':'||p_object),1,20)||'_'||v_mode;
    SELECT label||' Record '||v_mode INTO v_label FROM md_object_definitions
      WHERE tenant_id=p_tenant AND api_name=p_object;
    IF v_label IS NULL THEN RAISE EXCEPTION 'Record Page object not found'; END IF;
    INSERT INTO md_page_definitions(tenant_id,api_name,title,enabled)
      VALUES(p_tenant,v_api,v_label,true) ON CONFLICT DO NOTHING;
    SELECT id INTO v_page FROM md_page_definitions
      WHERE tenant_id=p_tenant AND api_name=v_api AND enabled=true;
    IF v_page IS NULL THEN RAISE EXCEPTION 'Default Record Page name unavailable'; END IF;
    INSERT INTO md_lightning_page_details
      (tenant_id,page_id,page_type,target_object,record_mode,layout_mode,template,
       canvas_width,canvas_height,status,devices,revision)
      VALUES(p_tenant,v_page,'Record Page',p_object,v_mode,'template','header-main-sidebar',
             1440,900,'Active',ARRAY['Desktop','Phone'],1)
      ON CONFLICT DO NOTHING;
    INSERT INTO md_lightning_page_nodes
      (tenant_id,page_id,component_key,component_type,label,region,visible,sort_order)
      VALUES(p_tenant,v_page,'record-detail','Record Detail','Record Details','main',true,0)
      ON CONFLICT DO NOTHING;
    INSERT INTO md_lightning_page_activation
      (tenant_id,page_id,assignment_id,scope,app_api,profile_id,record_type_id,desktop,phone,sort_order)
      VALUES(p_tenant,v_page,'record-default','Org Default',NULL,NULL,NULL,true,true,0)
      ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION md_object_record_pages_after_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM md_ensure_object_record_pages(NEW.tenant_id,NEW.api_name);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS md_object_record_pages_insert ON md_object_definitions;
CREATE TRIGGER md_object_record_pages_insert
AFTER INSERT ON md_object_definitions FOR EACH ROW
EXECUTE FUNCTION md_object_record_pages_after_insert();

-- Tenant-isolated, idempotent migration for existing Objects. On re-run it
-- does not overwrite a tenant's Record Page or create duplicate pages.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tenant_id,api_name FROM md_object_definitions LOOP
    PERFORM md_ensure_object_record_pages(r.tenant_id,r.api_name);
  END LOOP;
END $$;
