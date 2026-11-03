-- Configure the ten tenant-authored kiosk pages for a Custom 1080x1920 portrait canvas.
-- Preserve all Desktop/Tablet/Mobile layouts, components, coordinates, data bindings,
-- Flow actions, immutable history, and independently edited draft/published snapshots.
-- Deliberately refuse ambiguous cross-tenant matches and application-managed pages.
-- On systems where the ten pages are not installed, this is a safe no-op.
DO $kiosk_portrait$
DECLARE
  page_apis text[] := ARRAY[
  'smart_kiosk_welcome',
  'smart_kiosk_order_type',
  'smart_kiosk_menu',
  'smart_kiosk_product',
  'smart_kiosk_customise',
  'smart_kiosk_basket',
  'smart_kiosk_upsell',
  'smart_kiosk_review',
  'smart_kiosk_payment',
  'smart_kiosk_confirmation'
  ];
  candidate_tenants integer;
  target_tenant uuid;
  target_page record;
  source_revision record;
  next_revision integer;
  updated_pages integer := 0;
BEGIN
  SELECT count(*)::integer,min(found.tenant_id)
    INTO candidate_tenants,target_tenant
  FROM (
    SELECT p.tenant_id
    FROM md_page_definitions p
    JOIN md_lightning_page_details d
      ON d.tenant_id=p.tenant_id AND d.page_id=p.id
    WHERE p.enabled=true
      AND p.api_name=ANY(page_apis)
      AND d.page_type IN ('App Page','Home Page','In-Screen Page')
      AND NOT EXISTS (
        SELECT 1 FROM md_app_seed_pages managed
        WHERE managed.tenant_id=p.tenant_id AND managed.page_id=p.id
      )
    GROUP BY p.tenant_id
    HAVING count(DISTINCT p.api_name)=cardinality(page_apis)
  ) found;
  IF candidate_tenants <> 1 THEN
    RAISE NOTICE 'Kiosk portrait: expected exactly one tenant with all ten editable pages, found %. No pages changed.', candidate_tenants;
    RETURN;
  END IF;

  FOR target_page IN
    SELECT p.tenant_id,p.id AS page_id,p.api_name,p.title,
           d.layout_mode,d.template,d.canvas_width,d.canvas_height,
           d.canvas_fill_color,d.status
    FROM md_page_definitions p
    JOIN md_lightning_page_details d
      ON d.tenant_id=p.tenant_id AND d.page_id=p.id
    WHERE p.tenant_id=target_tenant AND p.enabled=true
      AND p.api_name=ANY(page_apis)
    ORDER BY p.api_name
  LOOP
    -- New Page Builder pages may not yet have saved a Custom layout.
    -- Seed only the missing Custom baseline from existing legacy metadata.
    IF NOT EXISTS (
      SELECT 1 FROM md_page_layout_heads h
      WHERE h.tenant_id=target_page.tenant_id
        AND h.page_id=target_page.page_id AND h.variant='Custom'
    ) THEN
      INSERT INTO md_page_layout_versions
        (tenant_id,page_id,variant,version,page_label,layout_mode,template,
         canvas_width,canvas_height,canvas_fill_color)
      VALUES
        (target_page.tenant_id,target_page.page_id,'Custom',1,target_page.title,
         target_page.layout_mode,target_page.template,
         target_page.canvas_width,target_page.canvas_height,
         COALESCE(target_page.canvas_fill_color,'#ffffff'))
      ON CONFLICT DO NOTHING;

      INSERT INTO md_page_layout_version_nodes
        (tenant_id,page_id,variant,version,component_key,component_type,
         label,region,visible,sort_order)
      SELECT n.tenant_id,n.page_id,'Custom',1,n.component_key,n.component_type,
             n.label,n.region,n.visible,n.sort_order
      FROM md_lightning_page_nodes n
      WHERE n.tenant_id=target_page.tenant_id AND n.page_id=target_page.page_id
      ON CONFLICT DO NOTHING;

      INSERT INTO md_page_layout_version_properties
        (tenant_id,page_id,variant,version,component_key,property_path,value_kind,value_text)
      SELECT x.tenant_id,x.page_id,'Custom',1,x.component_key,x.property_path,x.value_kind,x.value_text
      FROM md_lightning_page_node_properties x
      WHERE x.tenant_id=target_page.tenant_id AND x.page_id=target_page.page_id
      ON CONFLICT DO NOTHING;

      INSERT INTO md_page_layout_version_activation
        (tenant_id,page_id,variant,version,assignment_id,scope,app_api,
         profile_id,record_type_id,desktop,phone,tablet,custom,sort_order)
      SELECT a.tenant_id,a.page_id,'Custom',1,a.assignment_id,a.scope,a.app_api,
             a.profile_id,a.record_type_id,a.desktop,a.phone,a.tablet,a.custom,a.sort_order
      FROM md_lightning_page_activation a
      WHERE a.tenant_id=target_page.tenant_id AND a.page_id=target_page.page_id
      ON CONFLICT DO NOTHING;

      INSERT INTO md_page_layout_heads
        (tenant_id,page_id,variant,draft_version,published_version)
      VALUES
        (target_page.tenant_id,target_page.page_id,'Custom',1,
         CASE WHEN target_page.status='Active' THEN 1 ELSE NULL END)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Clone each independent head (draft and published) as necessary.
    -- Never publish unrelated unsaved draft changes by collapsing both heads.
    FOR source_revision IN
      SELECT DISTINCT versions.version,versions.canvas_width,versions.canvas_height
      FROM md_page_layout_heads heads
      JOIN md_page_layout_versions versions
        ON versions.tenant_id=heads.tenant_id
        AND versions.page_id=heads.page_id
        AND versions.variant=heads.variant
        AND versions.version IN (heads.draft_version,heads.published_version)
      WHERE heads.tenant_id=target_page.tenant_id AND heads.page_id=target_page.page_id
        AND heads.variant='Custom'
      ORDER BY versions.version
    LOOP
      IF source_revision.canvas_width=1080 AND source_revision.canvas_height=1920 THEN
        CONTINUE;
      END IF;

      SELECT COALESCE(max(version),0)+1 INTO next_revision
      FROM md_page_layout_versions
      WHERE tenant_id=target_page.tenant_id
        AND page_id=target_page.page_id AND variant='Custom';

      INSERT INTO md_page_layout_versions
        (tenant_id,page_id,variant,version,page_label,layout_mode,template,
         canvas_width,canvas_height,canvas_fill_color,
         custom_target_enabled,custom_target_min_width,custom_target_max_width,
         inherits_desktop,canvas_fill_override,desktop_base_version)
      SELECT tenant_id,page_id,variant,next_revision,page_label,layout_mode,template,
             1080,1920,canvas_fill_color,
             custom_target_enabled,custom_target_min_width,custom_target_max_width,
             inherits_desktop,canvas_fill_override,desktop_base_version
      FROM md_page_layout_versions
      WHERE tenant_id=target_page.tenant_id AND page_id=target_page.page_id
        AND variant='Custom' AND version=source_revision.version;

      INSERT INTO md_page_layout_version_nodes
        (tenant_id,page_id,variant,version,component_key,component_type,
         label,region,visible,sort_order)
      SELECT tenant_id,page_id,variant,next_revision,component_key,component_type,
             label,region,visible,sort_order
      FROM md_page_layout_version_nodes
      WHERE tenant_id=target_page.tenant_id AND page_id=target_page.page_id
        AND variant='Custom' AND version=source_revision.version;

      INSERT INTO md_page_layout_version_properties
        (tenant_id,page_id,variant,version,component_key,property_path,value_kind,value_text)
      SELECT tenant_id,page_id,variant,next_revision,component_key,property_path,value_kind,value_text
      FROM md_page_layout_version_properties
      WHERE tenant_id=target_page.tenant_id AND page_id=target_page.page_id
        AND variant='Custom' AND version=source_revision.version;

      INSERT INTO md_page_layout_version_activation
        (tenant_id,page_id,variant,version,assignment_id,scope,app_api,
         profile_id,record_type_id,desktop,phone,tablet,custom,sort_order)
      SELECT tenant_id,page_id,variant,next_revision,assignment_id,scope,app_api,
             profile_id,record_type_id,desktop,phone,tablet,custom,sort_order
      FROM md_page_layout_version_activation
      WHERE tenant_id=target_page.tenant_id AND page_id=target_page.page_id
        AND variant='Custom' AND version=source_revision.version;

      UPDATE md_page_layout_heads
      SET draft_version=CASE WHEN draft_version=source_revision.version THEN next_revision
                             ELSE draft_version END,
          published_version=CASE WHEN published_version=source_revision.version THEN next_revision
                                 ELSE published_version END,
          updated_at=now()
      WHERE tenant_id=target_page.tenant_id AND page_id=target_page.page_id
        AND variant='Custom';
    END LOOP;

    -- Make Custom selectable without dropping any existing device assignments.
    UPDATE md_lightning_page_details
    SET devices=array_append(devices,'Custom'),revision=revision+1,updated_at=now()
    WHERE tenant_id=target_page.tenant_id AND page_id=target_page.page_id
      AND NOT ('Custom'=ANY(devices));

    IF EXISTS (
      SELECT 1 FROM md_page_layout_heads h
      JOIN md_page_layout_versions v
        ON v.tenant_id=h.tenant_id AND v.page_id=h.page_id
        AND v.variant=h.variant AND v.version=h.draft_version
      WHERE h.tenant_id=target_page.tenant_id AND h.page_id=target_page.page_id
        AND h.variant='Custom'
        AND (v.canvas_width<>1080 OR v.canvas_height<>1920)
    ) OR EXISTS (
      SELECT 1 FROM md_page_layout_heads h
      JOIN md_page_layout_versions v
        ON v.tenant_id=h.tenant_id AND v.page_id=h.page_id
        AND v.variant=h.variant AND v.version=h.published_version
      WHERE h.tenant_id=target_page.tenant_id AND h.page_id=target_page.page_id
        AND h.variant='Custom'
        AND (v.canvas_width<>1080 OR v.canvas_height<>1920)
    ) THEN
      RAISE EXCEPTION 'Kiosk portrait layout verification failed for %',target_page.api_name;
    END IF;
    updated_pages := updated_pages+1;
  END LOOP;
  IF updated_pages<>cardinality(page_apis) THEN
    RAISE EXCEPTION 'Kiosk portrait update expected % pages but processed %',
      cardinality(page_apis),updated_pages;
  END IF;
  RAISE NOTICE 'Kiosk portrait: all % Custom canvases set to 1080x1920 for tenant %.',
    updated_pages,target_tenant;
END
$kiosk_portrait$;
