-- Idempotent permission-set presets for Setup navigation.
-- Do not rewrite an existing Administrator/Developer/User policy or any assignments.
-- Assign a new preset explicitly through the existing Users & Permissions editor.
-- Record-level read/edit must be granted separately on the relevant object/record.
CREATE OR REPLACE FUNCTION md_seed_setup_menu_permission_sets(target_tenant uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  preset record;
  preset_id uuid;
BEGIN
  FOR preset IN SELECT * FROM (VALUES
    ('Administrator',ARRAY['CompanySettings','SecurityRecovery','ConnectedApps','AuditTrail','ObjectManager','Records','DataLoader','AppExchange','ReportsBuilder','DashboardBuilder','ReportsView','DashboardsView','Users','Roles','Profiles','PermissionSets','PermissionSetGroups']::text[],ARRAY['ObjectDefinition|read','ObjectDefinition|create','ObjectDefinition|manage','Security|read','Security|manage','ConnectedApp|manage','SetupAudit|read','User|read','User|create','User|edit','User|delete','SystemDefinition:reports|read','SystemDefinition:reports|manage','SystemDefinition:dashboards|read','SystemDefinition:dashboards|manage']::text[]),
    ('Developer',ARRAY['CompanySettings','SecurityRecovery','ConnectedApps','AuditTrail','ObjectManager','Records','DataLoader','AppExchange','ReportsBuilder','DashboardBuilder','ReportsView','DashboardsView','Users','Roles','Profiles','PermissionSets','PermissionSetGroups','AppManager','NamedCredentials','WebhookEndpoints','Flows','PausedInterviews','ScheduledFlows','FlowHistory','ProcessAutomation','PublicGroups','SharingSettings','SharingRules']::text[],ARRAY['ObjectDefinition|read','ObjectDefinition|create','ObjectDefinition|manage','Security|read','Security|manage','ConnectedApp|manage','SetupAudit|read','User|read','User|create','User|edit','User|delete','SystemDefinition:reports|read','SystemDefinition:reports|manage','SystemDefinition:dashboards|read','SystemDefinition:dashboards|manage','NamedCredential|read','NamedCredential|manage','WebhookSubscription|read','WebhookSubscription|manage','FlowDefinition|manage','Flow|execute','ApprovalRequest|manage']::text[]),
    ('User',ARRAY['Records','ReportsView','DashboardsView']::text[],ARRAY['SystemDefinition:reports|read','SystemDefinition:dashboards|read']::text[])
  ) AS p(api_name,visible_menus,api_rights)
  LOOP
    INSERT INTO md_permission_sets(tenant_id,api_name,label,description,navigation_default_access)
    VALUES(target_tenant,preset.api_name,preset.api_name,
      'Standard Setup navigation preset; assign explicitly to users, profiles or groups','Deny')
    ON CONFLICT(tenant_id,api_name) DO NOTHING;
    -- Preserve customer-modified presets. Only initialise newly inserted ones.
    IF FOUND THEN
      SELECT id INTO preset_id FROM md_permission_sets
        WHERE tenant_id=target_tenant AND api_name=preset.api_name;
      INSERT INTO md_permission_rules(tenant_id,permission_set_id,resource,action,effect)
      SELECT target_tenant,preset_id,'SetupMenu:'||menu,'read','allow'
        FROM unnest(preset.visible_menus) AS menu
      ON CONFLICT(tenant_id,permission_set_id,resource,action) DO NOTHING;
      INSERT INTO md_permission_rules(tenant_id,permission_set_id,resource,action,effect)
      SELECT target_tenant,preset_id,split_part(capability,'|',1),split_part(capability,'|',2),'allow'
        FROM unnest(preset.api_rights) AS capability
      ON CONFLICT(tenant_id,permission_set_id,resource,action) DO NOTHING;
    END IF;
  END LOOP;
END
$$;

-- Safe backfill: only creates missing preset permission sets for existing tenants.
SELECT md_seed_setup_menu_permission_sets(id) FROM md_tenants;
