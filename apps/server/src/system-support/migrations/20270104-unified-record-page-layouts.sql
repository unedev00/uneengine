-- One-way, tenant-safe migration of untouched Object Page Layout baselines into
-- versioned Object-owned Record View/Edit canvases. Old layout tables are retained
-- as read-only compatibility data for other assignments and earlier revisions.
-- A customer's authored Record Page (or version audit) is NEVER rewritten.
DO $migration$
DECLARE
  obj record;
  pg record;
  section_row record;
  related_row record;
  v_variant text;
  v_layout text;
  v_version integer;
  v_existing integer;
  v_fields text[];
  v_index integer;
  v_relations text[];
BEGIN
  FOR obj IN SELECT tenant_id,api_name FROM md_object_definitions LOOP
    SELECT l.layout_id INTO v_layout FROM md_object_page_layouts l
      WHERE l.tenant_id=obj.tenant_id AND l.object_api=obj.api_name
      ORDER BY CASE WHEN EXISTS(
        SELECT 1 FROM md_object_page_layout_assignments a
        WHERE a.tenant_id=l.tenant_id AND a.object_api=l.object_api
          AND a.layout_id=l.layout_id AND a.profile_id='*' AND a.record_type_id='*'
      ) THEN 0 ELSE 1 END,l.sort_order LIMIT 1;
    IF v_layout IS NULL THEN CONTINUE; END IF;
    -- A single canonical layout can be migrated automatically. Multiple
    -- assigned legacy layouts need individual Record Page activation rules;
    -- keep their existing SQL-backed profile/record-type behavior intact until
    -- an administrator imports each layout and publishes its assignment.
    IF (SELECT COUNT(*) FROM md_object_page_layouts l
        WHERE l.tenant_id=obj.tenant_id AND l.object_api=obj.api_name)>1
      OR EXISTS(SELECT 1 FROM md_object_page_layout_assignments a
        WHERE a.tenant_id=obj.tenant_id AND a.object_api=obj.api_name
          AND a.layout_id<>v_layout)
    THEN CONTINUE; END IF;
    FOR pg IN SELECT d.page_id,d.record_mode,d.status,p.title
      FROM md_lightning_page_details d
      JOIN md_page_definitions p ON p.tenant_id=d.tenant_id AND p.id=d.page_id
      WHERE d.tenant_id=obj.tenant_id AND d.target_object=obj.api_name
        AND d.page_type='Record Page' AND p.enabled=true
        AND p.api_name='Record_'||substr(md5(obj.tenant_id::text||':'||obj.api_name),1,20)||'_'||d.record_mode
      LOOP
      -- Keep tenant edits and version history intact. Only the scaffold from
      -- md_ensure_object_record_pages qualifies for automatic conversion.
      IF EXISTS(SELECT 1 FROM md_page_layout_audit a
          WHERE a.tenant_id=obj.tenant_id AND a.page_id=pg.page_id)
        OR EXISTS(SELECT 1 FROM md_lightning_page_nodes n
          WHERE n.tenant_id=obj.tenant_id AND n.page_id=pg.page_id
            AND (n.component_key<>'record-detail' OR n.component_type<>'Record Detail'))
        OR EXISTS(SELECT 1 FROM md_lightning_page_node_properties custom
          WHERE custom.tenant_id=obj.tenant_id AND custom.page_id=pg.page_id)
        OR EXISTS(SELECT 1 FROM md_page_layout_version_nodes migrated
          WHERE migrated.tenant_id=obj.tenant_id AND migrated.page_id=pg.page_id
            AND migrated.component_key LIKE 'layout-section-%')
        OR EXISTS(SELECT 1 FROM md_page_layout_heads h
          WHERE h.tenant_id=obj.tenant_id AND h.page_id=pg.page_id
            AND (coalesce(h.draft_version,0)>1 OR coalesce(h.published_version,0)>1))
      THEN CONTINUE; END IF;
      FOR v_variant IN SELECT name FROM (VALUES ('Mobile'),('Desktop'),('Tablet'),('Custom')) v(name) LOOP
        SELECT h.draft_version INTO v_existing FROM md_page_layout_heads h
          WHERE h.tenant_id=obj.tenant_id AND h.page_id=pg.page_id AND h.variant=v_variant;
        v_version=CASE WHEN v_existing IS NULL THEN 1 ELSE 2 END;
        -- An existing revision 2 means this migration already ran.
        IF EXISTS(SELECT 1 FROM md_page_layout_versions v
          WHERE v.tenant_id=obj.tenant_id AND v.page_id=pg.page_id
            AND v.variant=v_variant AND v.version=v_version) THEN CONTINUE; END IF;
        INSERT INTO md_page_layout_versions
          (tenant_id,page_id,variant,version,page_label,layout_mode,template,canvas_width,canvas_height)
          SELECT d.tenant_id,d.page_id,v_variant,v_version,p.title,d.layout_mode,d.template,
            CASE v_variant WHEN 'Mobile' THEN 390 WHEN 'Tablet' THEN 1024 ELSE d.canvas_width END,
            CASE v_variant WHEN 'Mobile' THEN 844 WHEN 'Tablet' THEN 768 ELSE d.canvas_height END
          FROM md_lightning_page_details d
          JOIN md_page_definitions p ON p.tenant_id=d.tenant_id AND p.id=d.page_id
          WHERE d.tenant_id=obj.tenant_id AND d.page_id=pg.page_id
          ON CONFLICT DO NOTHING;
        FOR section_row IN SELECT section_id,label,columns,sort_order
          FROM md_object_page_layout_sections
          WHERE tenant_id=obj.tenant_id AND object_api=obj.api_name AND layout_id=v_layout
          ORDER BY sort_order LOOP
          SELECT coalesce(array_agg(field_api ORDER BY sort_order),ARRAY[]::text[])
          INTO v_fields FROM md_object_page_layout_fields
          WHERE tenant_id=obj.tenant_id AND object_api=obj.api_name
            AND layout_id=v_layout AND section_id=section_row.section_id;
          INSERT INTO md_page_layout_version_nodes
            (tenant_id,page_id,variant,version,component_key,component_type,label,region,visible,sort_order)
          VALUES(obj.tenant_id,pg.page_id,v_variant,v_version,
            'layout-section-'||substr(md5(section_row.section_id),1,20),
            'Field Section',section_row.label,'main',true,section_row.sort_order)
          ON CONFLICT DO NOTHING;
          INSERT INTO md_page_layout_version_properties
            (tenant_id,page_id,variant,version,component_key,property_path,value_kind,value_text)
          VALUES
            (obj.tenant_id,pg.page_id,v_variant,v_version,'layout-section-'||substr(md5(section_row.section_id),1,20),'/props','object',NULL),
            (obj.tenant_id,pg.page_id,v_variant,v_version,'layout-section-'||substr(md5(section_row.section_id),1,20),'/props/columns','number',section_row.columns::text),
            (obj.tenant_id,pg.page_id,v_variant,v_version,'layout-section-'||substr(md5(section_row.section_id),1,20),'/props/fieldApiNames','array',NULL)
          ON CONFLICT DO NOTHING;
          FOR v_index IN 1..coalesce(array_length(v_fields,1),0) LOOP
            INSERT INTO md_page_layout_version_properties
              (tenant_id,page_id,variant,version,component_key,property_path,value_kind,value_text)
            VALUES(obj.tenant_id,pg.page_id,v_variant,v_version,
              'layout-section-'||substr(md5(section_row.section_id),1,20),
              '/props/fieldApiNames/'||(v_index-1),'string',v_fields[v_index])
            ON CONFLICT DO NOTHING;
          END LOOP;
        END LOOP;
        SELECT coalesce(array_agg(list_name ORDER BY sort_order),ARRAY[]::text[])
        INTO v_relations FROM md_object_page_layout_related_lists
        WHERE tenant_id=obj.tenant_id AND object_api=obj.api_name AND layout_id=v_layout;
        IF cardinality(v_relations)>0 THEN
          INSERT INTO md_page_layout_version_nodes
            (tenant_id,page_id,variant,version,component_key,component_type,label,region,visible,sort_order)
          VALUES(obj.tenant_id,pg.page_id,v_variant,v_version,'legacy-related-lists',
            'Related List','Related Lists','main',true,10000)
          ON CONFLICT DO NOTHING;
          INSERT INTO md_page_layout_version_properties
            (tenant_id,page_id,variant,version,component_key,property_path,value_kind,value_text)
          VALUES(obj.tenant_id,pg.page_id,v_variant,v_version,'legacy-related-lists','/props','object',NULL),
            (obj.tenant_id,pg.page_id,v_variant,v_version,'legacy-related-lists','/props/relatedLists','array',NULL)
          ON CONFLICT DO NOTHING;
          FOR v_index IN 1..cardinality(v_relations) LOOP
            INSERT INTO md_page_layout_version_properties
              (tenant_id,page_id,variant,version,component_key,property_path,value_kind,value_text)
            VALUES(obj.tenant_id,pg.page_id,v_variant,v_version,'legacy-related-lists',
              '/props/relatedLists/'||(v_index-1),'string',v_relations[v_index])
            ON CONFLICT DO NOTHING;
          END LOOP;
        END IF;
        INSERT INTO md_page_layout_version_activation
          (tenant_id,page_id,variant,version,assignment_id,scope,app_api,
            profile_id,record_type_id,desktop,phone,tablet,custom,sort_order)
          SELECT a.tenant_id,a.page_id,v_variant,v_version,a.assignment_id,a.scope,a.app_api,
            a.profile_id,a.record_type_id,a.desktop,a.phone,a.tablet,a.custom,a.sort_order
          FROM md_lightning_page_activation a WHERE a.tenant_id=obj.tenant_id AND a.page_id=pg.page_id
          ON CONFLICT DO NOTHING;
        INSERT INTO md_page_layout_heads
          (tenant_id,page_id,variant,draft_version,published_version)
        VALUES(obj.tenant_id,pg.page_id,v_variant,v_version,
          CASE WHEN pg.status='Active' THEN v_version ELSE NULL END)
        ON CONFLICT(tenant_id,page_id,variant) DO UPDATE
          SET draft_version=excluded.draft_version,
              published_version=excluded.published_version,updated_at=now();
      END LOOP;
    END LOOP;
  END LOOP;
END $migration$;
