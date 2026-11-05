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

-- Registration makes each capability editable in the existing permission-set UI.
-- The later governance migration's CREATE TABLE IF NOT EXISTS is harmless.
CREATE TABLE IF NOT EXISTS md_system_permission_catalogue(
 permission_key text PRIMARY KEY,label text NOT NULL,description text NOT NULL,resource text NOT NULL,action text NOT NULL
);
INSERT INTO md_system_permission_catalogue(permission_key,label,description,resource,action) VALUES
 ('setup:TenantManagement:view','Setup / Tenant Management','Show the Tenant Management destination in Settings navigation','SetupMenu:TenantManagement','read'),
 ('setup:CompanySettings:view','Setup / Company Settings','Show the Company Settings destination in Settings navigation','SetupMenu:CompanySettings','read'),
 ('setup:SecurityRecovery:view','Setup / Security & Recovery','Show the Security & Recovery destination in Settings navigation','SetupMenu:SecurityRecovery','read'),
 ('setup:ConnectedApps:view','Setup / Connected Apps','Show the Connected Apps destination in Settings navigation','SetupMenu:ConnectedApps','read'),
 ('setup:AuditTrail:view','Setup / Audit Trail','Show the Audit Trail destination in Settings navigation','SetupMenu:AuditTrail','read'),
 ('setup:ObjectManager:view','Setup / Object Manager','Show the Object Manager destination in Settings navigation','SetupMenu:ObjectManager','read'),
 ('setup:Records:view','Setup / Records','Show the Records destination in Settings navigation','SetupMenu:Records','read'),
 ('setup:DataLoader:view','Setup / Data Loader','Show the Data Loader destination in Settings navigation','SetupMenu:DataLoader','read'),
 ('setup:PageBuilder:view','Setup / Page Builder','Show the Page Builder destination in Settings navigation','SetupMenu:PageBuilder','read'),
 ('setup:AppManager:view','Setup / App Manager','Show the App Manager destination in Settings navigation','SetupMenu:AppManager','read'),
 ('setup:AppExchange:view','Setup / AppExchange','Show the AppExchange destination in Settings navigation','SetupMenu:AppExchange','read'),
 ('setup:NamedCredentials:view','Setup / Named Credentials','Show the Named Credentials destination in Settings navigation','SetupMenu:NamedCredentials','read'),
 ('setup:WebhookEndpoints:view','Setup / Webhook Endpoints','Show the Webhook Endpoints destination in Settings navigation','SetupMenu:WebhookEndpoints','read'),
 ('setup:NamedDevices:view','Setup / Named Devices','Show the Named Devices destination in Settings navigation','SetupMenu:NamedDevices','read'),
 ('setup:Flows:view','Setup / Flows','Show the Flows destination in Settings navigation','SetupMenu:Flows','read'),
 ('setup:PausedInterviews:view','Setup / Paused Interviews','Show the Paused Interviews destination in Settings navigation','SetupMenu:PausedInterviews','read'),
 ('setup:ScheduledFlows:view','Setup / Scheduled Flows','Show the Scheduled Flows destination in Settings navigation','SetupMenu:ScheduledFlows','read'),
 ('setup:FlowHistory:view','Setup / Flow History','Show the Flow History destination in Settings navigation','SetupMenu:FlowHistory','read'),
 ('setup:ProcessAutomation:view','Setup / Process Automation','Show the Process Automation destination in Settings navigation','SetupMenu:ProcessAutomation','read'),
 ('setup:ReportsBuilder:view','Setup / Reports Builder','Show the Reports Builder destination in Settings navigation','SetupMenu:ReportsBuilder','read'),
 ('setup:DashboardBuilder:view','Setup / Dashboard Builder','Show the Dashboard Builder destination in Settings navigation','SetupMenu:DashboardBuilder','read'),
 ('setup:ReportsView:view','Setup / Reports View','Show the Reports View destination in Settings navigation','SetupMenu:ReportsView','read'),
 ('setup:DashboardsView:view','Setup / Dashboard View','Show the Dashboard View destination in Settings navigation','SetupMenu:DashboardsView','read'),
 ('setup:Users:view','Setup / Users','Show the Users destination in Settings navigation','SetupMenu:Users','read'),
 ('setup:Roles:view','Setup / Roles','Show the Roles destination in Settings navigation','SetupMenu:Roles','read'),
 ('setup:PublicGroups:view','Setup / Public Groups','Show the Public Groups destination in Settings navigation','SetupMenu:PublicGroups','read'),
 ('setup:Profiles:view','Setup / Profiles','Show the Profiles destination in Settings navigation','SetupMenu:Profiles','read'),
 ('setup:PermissionSets:view','Setup / Permission Sets','Show the Permission Sets destination in Settings navigation','SetupMenu:PermissionSets','read'),
 ('setup:PermissionSetGroups:view','Setup / Permission Set Groups','Show the Permission Set Groups destination in Settings navigation','SetupMenu:PermissionSetGroups','read'),
 ('setup:SharingSettings:view','Setup / Sharing Settings','Show the Sharing Settings destination in Settings navigation','SetupMenu:SharingSettings','read'),
 ('setup:SharingRules:view','Setup / Sharing Rules','Show the Sharing Rules destination in Settings navigation','SetupMenu:SharingRules','read')
ON CONFLICT(permission_key) DO NOTHING;
