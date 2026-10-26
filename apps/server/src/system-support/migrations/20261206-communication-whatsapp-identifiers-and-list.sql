-- Future provider message/receipt capture carries scoped IDs through durable SQL outbox.
-- Preserve existing rows and tenant field customisations; no customer data rewrites.
ALTER TABLE md_communication_delivery_outbox
 ADD COLUMN IF NOT EXISTS phone_number_id text CHECK(phone_number_id IS NULL OR length(phone_number_id)<=500),
 ADD COLUMN IF NOT EXISTS waba_id text CHECK(waba_id IS NULL OR length(waba_id)<=500);

INSERT INTO md_field_definitions(tenant_id,object_api,api_name,label,data_type,max_length,required)
SELECT o.tenant_id,'Communication',x.api_name,x.label,'text',500,false
FROM md_object_definitions o CROSS JOIN (VALUES
 ('PhoneNumberId','WhatsApp Phone Number ID'),
 ('WabaId','WhatsApp Business Account ID')
) AS x(api_name,label)
WHERE o.api_name='Communication'
ON CONFLICT(tenant_id,object_api,api_name) DO NOTHING;

-- Follow existing Communication field read grants without granting new object
-- permissions; explicit OneEngine deny rules continue to override.
INSERT INTO md_permission_rules(tenant_id,permission_set_id,resource,action,effect)
SELECT rule.tenant_id,rule.permission_set_id,'Communication.'||field.api_name,'read','allow'
FROM md_permission_rules rule
JOIN md_field_definitions field ON field.tenant_id=rule.tenant_id
 AND field.object_api='Communication'
 AND field.api_name IN ('PhoneNumberId','WabaId') AND field.deleted_at IS NULL
WHERE rule.resource='Communication.Subject' AND rule.action='read' AND rule.effect='allow'
ON CONFLICT DO NOTHING;

-- Default Communication list columns are metadata; never override an existing
-- tenant-defined search layout or a saved list-view preference.
WITH desired(field_api,position) AS (
 VALUES ('OccurredAt',0),
        ('Direction',1),
        ('Transport',2),
        ('RequestMethod',3),
        ('ResponseStatusCode',4),
        ('Body',5),
        ('Provider',6),
        ('Outcome',7),
        ('ReceivedAt',8),
        ('ErrorMessage',9),
        ('Channel',10),
        ('Contact',11),
        ('ConversationId',12),
        ('Customer',13),
        ('DeliveredAt',14),
        ('DurationMs',15),
        ('Endpoint',16),
        ('ExternalMessageId',17),
        ('Name',18),
        ('Recipient',19),
        ('RelatedObject',20),
        ('RelatedRecordId',21),
        ('RequestBytes',22),
        ('ResponseBytes',23),
        ('Sender',24),
        ('SentAt',25),
        ('Status',26),
        ('Subject',27)
)
INSERT INTO md_search_layout_columns(tenant_id,object_api,layout_key,position,field_api)
SELECT o.tenant_id,'Communication','searchResults',desired.position,desired.field_api
FROM md_object_definitions o CROSS JOIN desired
JOIN md_field_definitions field ON field.tenant_id=o.tenant_id
 AND field.object_api='Communication' AND field.api_name=desired.field_api AND field.deleted_at IS NULL
WHERE o.api_name='Communication'
 AND NOT EXISTS (SELECT 1 FROM md_search_layout_columns configured
  WHERE configured.tenant_id=o.tenant_id AND configured.object_api='Communication'
    AND configured.layout_key='searchResults')
ON CONFLICT DO NOTHING;
