import type {PoolClient} from 'pg';
import {encodeMetadataValue} from '../system-files/component-runtime.js';

export const ACEASSIST_BOOKING_FLOW_API='AceAssistBooking';
export const ACEASSIST_BOOKING_DEFAULT_GRAPH={
  "apiName":"AceAssistBooking",
  "label":"AceAssist Booking",
  "appApiName":"AceAssist",
  "flowType":"Record-Triggered Flow",
  "triggerObject":"Communication",
  "status":"Draft",
  "version":1,
  "startConfig":{"object":"Communication","trigger":"created","runWhen":"after-save","executionContext":"User","triggerOrder":150,"conditionLogic":"All","entryConditions":[{"field":"Channel","operator":"Equals","value":"WhatsApp"},{"field":"Direction","operator":"Equals","value":"Inbound"},{"field":"RelatedObject","operator":"Equals","value":"InboundWebhookEndpoint"}]},
  "tests":[],
  "resources":[
    {"name":"reply","type":"Formula","dataType":"Text","value":"UPPER(TRIM({!$Record.Body}))"},
    {"name":"selectedDate","type":"Formula","dataType":"Date","value":"IF(OR({!reply} = \"1\", {!reply} = \"TODAY\"), TODAY(), IF(OR({!reply} = \"2\", {!reply} = \"TOMORROW\"), ADDDAYS(TODAY(), 1), IFERROR(DATE(2000 + VALUE(RIGHT({!reply},2)), VALUE(MID(RIGHT({!reply},8),4,2)), VALUE(LEFT(RIGHT({!reply},8),2))), DATE(1900,1,1))))"},
    {"name":"dateValid","type":"Formula","dataType":"Boolean","value":"AND({!selectedDate} >= TODAY(), {!selectedDate} <= ADDDAYS(TODAY(), 365))"},
    {"name":"session","type":"Record","dataType":"AceAssistBookingSession"},
    {"name":"customer","type":"Record","dataType":"Customer"},
    {"name":"slotList","type":"Variable","dataType":"Text"},
    {"name":"slotKeys","type":"Variable","dataType":"Text"},
    {"name":"customerId","type":"Variable","dataType":"Text"},
    {"name":"bookingStart","type":"Variable","dataType":"Text"},
    {"name":"bookingEnd","type":"Variable","dataType":"Text"},
    {"name":"appointmentId","type":"Variable","dataType":"Text"},
    {"name":"slotExists","type":"Variable","dataType":"Boolean"},
    {"name":"slotValid","type":"Variable","dataType":"Boolean"},
    {"name":"phone","type":"Variable","dataType":"Text"},
    {"name":"messageId","type":"Variable","dataType":"Text"}
  ],
  "elements":[
    {"id":1,"type":"Start","label":"Incoming WhatsApp Communication","config":{"object":"Communication","trigger":"created","runWhen":"after-save","executionContext":"User","triggerOrder":150,"conditionLogic":"All","entryConditions":[{"field":"Channel","operator":"Equals","value":"WhatsApp"},{"field":"Direction","operator":"Equals","value":"Inbound"},{"field":"RelatedObject","operator":"Equals","value":"InboundWebhookEndpoint"}]}},
    {"id":2,"type":"Get Records","label":"Find booking conversation","config":{"object":"AceAssistBookingSession","recordLimit":"1","outputVariable":"session","conditions":[{"field":"Phone","operator":"Equals","value":"{!$Record.ConversationId}"}]}},
    {"id":3,"type":"Decision","label":"Conversation found?","config":{"outcomes":[{"name":"Existing","label":"Existing","conditions":[{"field":"{!session}","operator":"IsNotNull"}]}]}},
    {"id":4,"type":"Decision","label":"Does message say BOOKING?","config":{"outcomes":[{"name":"Booking","label":"Booking","conditions":[{"field":"{!reply}","operator":"Contains","value":"BOOKING"}]}]}},
    {"id":5,"type":"Create Records","label":"Start a new booking session","config":{"object":"AceAssistBookingSession","recordSource":"fields","uniqueInputGuard":{"field":"Phone"},"fieldValues":[{"field":"Name","value":"WhatsApp booking"},{"field":"Phone","value":"{!$Record.ConversationId}"},{"field":"Stage","value":"AwaitingDate"},{"field":"AssignedTo","value":"__ASSIGNEE_ID__"},{"field":"BookingToken","value":"{!messageId}"}]}},
    {"id":6,"type":"HTTP Callout","label":"Welcome — editable message","config":{"method":"POST","namedCredentialId":"__WA_CREDENTIAL__","path":"v26.0/{!public_phoneNumberId}/messages","deliveryMode":"DURABLE_ASYNC","onError":"FAULT_PATH","idempotencyKey":"{!messageId}","body":"{\"messaging_product\":\"whatsapp\",\"to\":\"{!phone}\",\"type\":\"text\",\"text\":{\"preview_url\":false,\"body\":\"Welcome, we are glad that you reached us. Please select when you want to book us:\\n1. TODAY\\n2. TOMORROW\\n3. DD/MM/YY\"}}","messageTextField":"text.body"}},
    {"id":7,"type":"Decision","label":"Route customer reply","config":{"outcomes":[{"name":"Restart","label":"Restart","conditions":[{"field":"{!reply}","operator":"Contains","value":"BOOKING"}]},{"name":"Date","label":"Date","conditions":[{"field":"{!session.Stage}","operator":"Equals","value":"AwaitingDate"}]},{"name":"Time","label":"Time","conditions":[{"field":"{!session.Stage}","operator":"Equals","value":"AwaitingTime"}]}]}},
    {"id":8,"type":"Update Records","label":"Restart conversation","config":{"object":"AceAssistBookingSession","recordSource":"record","recordVariable":"session","fieldValues":[{"field":"Stage","value":"AwaitingDate"},{"field":"OfferedSlots","value":""},{"field":"BookingToken","value":"{!messageId}"}]}},
    {"id":9,"type":"Decision","label":"Date is valid?","config":{"outcomes":[{"name":"Valid","label":"Valid","conditions":[{"field":"{!dateValid}","operator":"Equals","value":true}]}]}},
    {"id":10,"type":"Update Records","label":"Store date choice","config":{"object":"AceAssistBookingSession","recordSource":"record","recordVariable":"session","fieldValues":[{"field":"BookingDate","value":"{!selectedDate}"},{"field":"Stage","value":"AwaitingTime"}]}},
    {"id":11,"type":"Get Available Slots","label":"Calculate free appointment slots","config":{"mode":"list","date":"{!selectedDate}","staffId":"{!session.AssignedTo}","durationMinutes":30,"maximumSlots":12,"outputVariable":"slotList","allowedVariable":"slotKeys","availableVariable":"slotExists","appointmentObject":"Appointment","scheduleObject":"StaffAvailability","businessCalendarGuard":{"startInput":"StartDateTime","endInput":"EndDateTime"},"overlapGuard":{"startField":"StartDateTime","endField":"EndDateTime","groupFields":["AssignedTo"],"statusField":"Status","excludedStatuses":["Cancelled","No Show","Completed"]},"availabilityGuard":{"startField":"StartDateTime","endField":"EndDateTime","staffFields":["AssignedTo"],"statusField":"Status","excludedStatuses":["Cancelled","No Show","Completed"],"schedule":{"object":"StaffAvailability","staff":"OwnerId","active":"Active","weekday":"Weekday","start":"StartTime","end":"EndTime"},"exception":{"object":"AvailabilityException","staff":"OwnerId","resource":"Resource","active":"Active","start":"StartDateTime","end":"EndDateTime"}},"startField":"StartDateTime","endField":"EndDateTime","staffField":"AssignedTo","statusField":"Status","bookingStatus":"Scheduled"}},
    {"id":12,"type":"Decision","label":"Free times available?","config":{"outcomes":[{"name":"Available","label":"Available","conditions":[{"field":"{!slotExists}","operator":"Equals","value":true}]}]}},
    {"id":13,"type":"Update Records","label":"Remember offered time slots","config":{"object":"AceAssistBookingSession","recordSource":"record","recordVariable":"session","fieldValues":[{"field":"OfferedSlots","value":"{!slotKeys}"}]}},
    {"id":14,"type":"HTTP Callout","label":"Available times — editable message","config":{"method":"POST","namedCredentialId":"__WA_CREDENTIAL__","path":"v26.0/{!public_phoneNumberId}/messages","deliveryMode":"DURABLE_ASYNC","onError":"FAULT_PATH","idempotencyKey":"{!messageId}","body":"{\"messaging_product\":\"whatsapp\",\"to\":\"{!phone}\",\"type\":\"text\",\"text\":{\"preview_url\":false,\"body\":\"These appointment times are available:\\n{!slotList}\\nReply with the slot number (e.g. 1) or a time in HH:MM format (e.g. 10:30).\"}}","messageTextField":"text.body"}},
    {"id":15,"type":"Update Records","label":"Request another date","config":{"object":"AceAssistBookingSession","recordSource":"record","recordVariable":"session","fieldValues":[{"field":"Stage","value":"AwaitingDate"},{"field":"OfferedSlots","value":""}]}},
    {"id":16,"type":"HTTP Callout","label":"No slots — editable message","config":{"method":"POST","namedCredentialId":"__WA_CREDENTIAL__","path":"v26.0/{!public_phoneNumberId}/messages","deliveryMode":"DURABLE_ASYNC","onError":"FAULT_PATH","idempotencyKey":"{!messageId}","body":"{\"messaging_product\":\"whatsapp\",\"to\":\"{!phone}\",\"type\":\"text\",\"text\":{\"preview_url\":false,\"body\":\"Sorry, there are no free times on that date. Reply 1 for TODAY, 2 for TOMORROW or enter another DD/MM/YY.\"}}","messageTextField":"text.body"}},
    {"id":17,"type":"HTTP Callout","label":"Invalid date — editable message","config":{"method":"POST","namedCredentialId":"__WA_CREDENTIAL__","path":"v26.0/{!public_phoneNumberId}/messages","deliveryMode":"DURABLE_ASYNC","onError":"FAULT_PATH","idempotencyKey":"{!messageId}","body":"{\"messaging_product\":\"whatsapp\",\"to\":\"{!phone}\",\"type\":\"text\",\"text\":{\"preview_url\":false,\"body\":\"Please reply 1 for TODAY, 2 for TOMORROW or enter a date DD/MM/YY.\"}}","messageTextField":"text.body"}},
    {"id":18,"type":"Get Available Slots","label":"Validate selected slot","config":{"mode":"validate","date":"{!session.BookingDate}","staffId":"{!session.AssignedTo}","selectedTime":"{!reply}","allowedSlots":"{!session.OfferedSlots}","durationMinutes":30,"startVariable":"bookingStart","endVariable":"bookingEnd","validVariable":"slotValid","appointmentObject":"Appointment","scheduleObject":"StaffAvailability","businessCalendarGuard":{"startInput":"StartDateTime","endInput":"EndDateTime"},"overlapGuard":{"startField":"StartDateTime","endField":"EndDateTime","groupFields":["AssignedTo"],"statusField":"Status","excludedStatuses":["Cancelled","No Show","Completed"]},"availabilityGuard":{"startField":"StartDateTime","endField":"EndDateTime","staffFields":["AssignedTo"],"statusField":"Status","excludedStatuses":["Cancelled","No Show","Completed"],"schedule":{"object":"StaffAvailability","staff":"OwnerId","active":"Active","weekday":"Weekday","start":"StartTime","end":"EndTime"},"exception":{"object":"AvailabilityException","staff":"OwnerId","resource":"Resource","active":"Active","start":"StartDateTime","end":"EndDateTime"}},"startField":"StartDateTime","endField":"EndDateTime","staffField":"AssignedTo","statusField":"Status","bookingStatus":"Scheduled"}},
    {"id":19,"type":"Decision","label":"Reply matches a free offered time?","config":{"outcomes":[{"name":"Valid","label":"Valid","conditions":[{"field":"{!slotValid}","operator":"Equals","value":true}]}]}},
    {"id":20,"type":"HTTP Callout","label":"Invalid time — editable message","config":{"method":"POST","namedCredentialId":"__WA_CREDENTIAL__","path":"v26.0/{!public_phoneNumberId}/messages","deliveryMode":"DURABLE_ASYNC","onError":"FAULT_PATH","idempotencyKey":"{!messageId}","body":"{\"messaging_product\":\"whatsapp\",\"to\":\"{!phone}\",\"type\":\"text\",\"text\":{\"preview_url\":false,\"body\":\"Please reply with one of the offered available times in HH:MM format. Type BOOKING to restart.\"}}","messageTextField":"text.body"}},
    {"id":21,"type":"Get Records","label":"Find customer by phone","config":{"object":"Customer","recordLimit":"1","outputVariable":"customer","conditions":[{"field":"Phone","operator":"Equals","value":"{!$Record.ConversationId}"}]}},
    {"id":22,"type":"Decision","label":"Customer exists?","config":{"outcomes":[{"name":"Existing","label":"Existing","conditions":[{"field":"{!customer}","operator":"IsNotNull"}]}]}},
    {"id":23,"type":"Assignment","label":"Reuse customer","config":{"variable":"customerId","operator":"Assign","value":"{!customer.Id}"}},
    {"id":24,"type":"Create Records","label":"Create customer","config":{"object":"Customer","recordSource":"fields","resultVariable":"customerId","uniqueInputGuard":{"field":"Phone"},"fieldValues":[{"field":"Name","value":"WhatsApp customer"},{"field":"Phone","value":"{!$Record.ConversationId}"},{"field":"Active","value":true}]}},
    {"id":25,"type":"Create Records","label":"Book appointment","config":{"object":"Appointment","recordSource":"fields","resultVariable":"appointmentId","uniqueInputGuard":{"field":"ExternalBookingId"},"businessCalendarGuard":{"startInput":"StartDateTime","endInput":"EndDateTime"},"overlapGuard":{"startField":"StartDateTime","endField":"EndDateTime","groupFields":["AssignedTo"],"statusField":"Status","excludedStatuses":["Cancelled","No Show","Completed"]},"availabilityGuard":{"startField":"StartDateTime","endField":"EndDateTime","staffFields":["AssignedTo"],"statusField":"Status","excludedStatuses":["Cancelled","No Show","Completed"],"schedule":{"object":"StaffAvailability","staff":"OwnerId","active":"Active","weekday":"Weekday","start":"StartTime","end":"EndTime"},"exception":{"object":"AvailabilityException","staff":"OwnerId","resource":"Resource","active":"Active","start":"StartDateTime","end":"EndDateTime"}},"fieldValues":[{"field":"Name","value":"WhatsApp booking"},{"field":"Customer","value":"{!customerId}"},{"field":"StartDateTime","value":"{!bookingStart}"},{"field":"EndDateTime","value":"{!bookingEnd}"},{"field":"AssignedTo","value":"{!session.AssignedTo}"},{"field":"ExternalBookingId","value":"{!session.BookingToken}"},{"field":"Status","value":"Scheduled"}]}},
    {"id":26,"type":"Update Records","label":"Link appointment to conversation","config":{"object":"AceAssistBookingSession","recordSource":"record","recordVariable":"session","fieldValues":[{"field":"Stage","value":"Confirmed"},{"field":"Appointment","value":"{!appointmentId}"}]}},
    {"id":27,"type":"HTTP Callout","label":"Confirmation SMS — editable message","config":{"method":"POST","namedCredentialId":"__SMS_CREDENTIAL__","path":"CONFIGURE_SMS_PROVIDER_PATH","deliveryMode":"DURABLE_ASYNC","onError":"FAULT_PATH","idempotencyKey":"{!messageId}","body":"{\"to\":\"{!phone}\",\"message\":\"Your Booking is confirmed\"}","messageTextField":"message"}},
    {"id":28,"type":"End","label":"Done","config":{}},
    {"id":29,"type":"Custom Error","label":"Booking unavailable","config":{"errorLocation":"Page","errorMessage":"Could not save appointment; no confirmation has been sent."}},
    {"id":30,"type":"Assignment","label":"Read verified incoming customer phone","config":{"variable":"phone","operator":"Assign","value":"{!$Record.ConversationId}"}},
    {"id":31,"type":"Assignment","label":"Read verified inbound provider message ID","config":{"variable":"messageId","operator":"Assign","value":"{!$Record.ExternalMessageId}"}}
  ],
  "connectors":[
    {"from":1,"to":30,"label":"Next","kind":"normal"},
    {"from":2,"to":3,"label":"Next","kind":"normal"},
    {"from":3,"to":7,"label":"Existing","kind":"normal"},
    {"from":3,"to":4,"label":"Default","kind":"normal"},
    {"from":4,"to":5,"label":"Booking","kind":"normal"},
    {"from":4,"to":28,"label":"Default","kind":"normal"},
    {"from":5,"to":6,"label":"Next","kind":"normal"},
    {"from":6,"to":28,"label":"Next","kind":"normal"},
    {"from":6,"to":28,"label":"Delivery fault","kind":"fault"},
    {"from":7,"to":8,"label":"Restart","kind":"normal"},
    {"from":8,"to":6,"label":"Next","kind":"normal"},
    {"from":7,"to":9,"label":"Date","kind":"normal"},
    {"from":7,"to":18,"label":"Time","kind":"normal"},
    {"from":7,"to":28,"label":"Default","kind":"normal"},
    {"from":9,"to":10,"label":"Valid","kind":"normal"},
    {"from":9,"to":17,"label":"Default","kind":"normal"},
    {"from":10,"to":11,"label":"Next","kind":"normal"},
    {"from":11,"to":12,"label":"Next","kind":"normal"},
    {"from":12,"to":13,"label":"Available","kind":"normal"},
    {"from":12,"to":15,"label":"Default","kind":"normal"},
    {"from":13,"to":14,"label":"Next","kind":"normal"},
    {"from":14,"to":28,"label":"Next","kind":"normal"},
    {"from":14,"to":28,"label":"Delivery fault","kind":"fault"},
    {"from":15,"to":16,"label":"Next","kind":"normal"},
    {"from":16,"to":28,"label":"Next","kind":"normal"},
    {"from":16,"to":28,"label":"Delivery fault","kind":"fault"},
    {"from":17,"to":28,"label":"Next","kind":"normal"},
    {"from":17,"to":28,"label":"Delivery fault","kind":"fault"},
    {"from":18,"to":19,"label":"Next","kind":"normal"},
    {"from":19,"to":21,"label":"Valid","kind":"normal"},
    {"from":19,"to":20,"label":"Default","kind":"normal"},
    {"from":20,"to":28,"label":"Next","kind":"normal"},
    {"from":20,"to":28,"label":"Delivery fault","kind":"fault"},
    {"from":21,"to":22,"label":"Next","kind":"normal"},
    {"from":22,"to":23,"label":"Existing","kind":"normal"},
    {"from":22,"to":24,"label":"Default","kind":"normal"},
    {"from":23,"to":25,"label":"Next","kind":"normal"},
    {"from":24,"to":25,"label":"Next","kind":"normal"},
    {"from":25,"to":26,"label":"Next","kind":"normal"},
    {"from":25,"to":29,"label":"Booking fault","kind":"fault"},
    {"from":26,"to":27,"label":"Next","kind":"normal"},
    {"from":27,"to":28,"label":"Next","kind":"normal"},
    {"from":27,"to":28,"label":"SMS fault","kind":"fault"},
    {"from":30,"to":31,"label":"Next","kind":"normal"},
    {"from":31,"to":2,"label":"Next","kind":"normal"}
  ]
};

export async function seedAceAssistBookingConversation(client:PoolClient,tenantId:string):Promise<number>{
 const obj='AceAssistBookingSession';
 await client.query('INSERT INTO md_object_definitions(tenant_id,api_name,label,is_system) VALUES($1,$2,$3,false) ON CONFLICT(tenant_id,api_name) DO NOTHING',[tenantId,obj,'AceAssist Booking Session']);
 const fields:[string,string,string,string|null][]=[
  ['Name','Name','text',null],['Phone','WhatsApp Number','text',null],['Stage','Booking Stage','text',null],
  ['BookingDate','Booking Date','date',null],['OfferedSlots','Offered Time Slots','text',null],
  ['AssignedTo','Assigned Staff','text',null],['BookingToken','Booking Attempt Reference','text',null],['Customer','Customer','reference','Customer'],
  ['Appointment','Appointment','reference','Appointment']];
 for(const [name,label,type,ref] of fields)await client.query(
  'INSERT INTO md_field_definitions(tenant_id,object_api,api_name,label,data_type,related_object,required) VALUES($1,$2,$3,$4,$5,$6,false) ON CONFLICT(tenant_id,object_api,api_name) DO NOTHING',
  [tenantId,obj,name,label,type,ref]);
 await client.query(`INSERT INTO md_permission_sets
  (tenant_id,api_name,label,description,navigation_default_access)
  VALUES($1,'AceAssistBookingAutomation','AceAssist Booking Automation',
   'Explicit tenant-scoped permission set for authorised booking webhook execution accounts','Deny')
  ON CONFLICT(tenant_id,api_name) DO NOTHING`,[tenantId]);
 const rights:[string,string][]=[
  ['Flow:AceAssistBooking','execute'],['Communication','read'],['AceAssistBookingSession','read'],
  ['AceAssistBookingSession','create'],['AceAssistBookingSession','edit'],
  ['Appointment','read'],['Appointment','create'],['Customer','read'],['Customer','create'],
  ['StaffAvailability','read'],['HTTPCallout','execute'],['NamedCredential','read'],
  ...fields.flatMap(([field])=>['read','create','edit'].map(action=>[obj+'.'+field,action] as [string,string])),
  ...['Channel','Direction','RelatedObject','ConversationId','Body','ExternalMessageId']
   .map(field=>['Communication.'+field,'read'] as [string,string]),
  ...['Name','Phone','Active'].flatMap(field=>['read','create'].map(action=>['Customer.'+field,action] as [string,string])),
  ...['Name','Customer','StartDateTime','EndDateTime','AssignedTo','ExternalBookingId','Status']
   .flatMap(field=>['read','create'].map(action=>['Appointment.'+field,action] as [string,string])),
  ...['Active','Weekday','StartTime','EndTime']
   .map(field=>['StaffAvailability.'+field,'read'] as [string,string])];
 for(const [resource,action] of rights)await client.query(
  "INSERT INTO md_permission_rules(tenant_id,permission_set_id,resource,action,effect) SELECT $1,p.id,$2,$3,'allow' FROM md_permission_sets p WHERE p.tenant_id=$1 AND p.api_name='AceAssistBookingAutomation' ON CONFLICT DO NOTHING",
  [tenantId,resource,action]);
 const existing=await client.query('SELECT 1 FROM md_flow_definitions WHERE tenant_id=$1 AND api_name=$2',[tenantId,ACEASSIST_BOOKING_FLOW_API]);
 if(existing.rowCount)return 0;
 const {rows:developers}=await client.query<{user_id:string}>('SELECT user_id FROM md_tenant_developer_accounts WHERE tenant_id=$1 LIMIT 1',[tenantId]);
 const {rows:credentials}=await client.query<{id:string;name:string}>(
  "SELECT id,name FROM md_named_credentials WHERE tenant_id=$1 AND name=ANY(ARRAY['WhatsApp_Cloud_API','SmsGate_API']) AND enabled=true AND protocol='HTTPS'",[tenantId]);
 const graph=JSON.parse(JSON.stringify(ACEASSIST_BOOKING_DEFAULT_GRAPH)
  .replaceAll('__ASSIGNEE_ID__',developers[0]?.user_id??'')
  .replaceAll('__WA_CREDENTIAL__',credentials.find(item=>item.name==='WhatsApp_Cloud_API')?.id??'')
  .replaceAll('__SMS_CREDENTIAL__',credentials.find(item=>item.name==='SmsGate_API')?.id??'')) as typeof ACEASSIST_BOOKING_DEFAULT_GRAPH;
 const {rows:created}=await client.query<{id:string}>(
  "INSERT INTO md_flow_definitions(tenant_id,api_name,label,flow_type,version,active) VALUES($1,$2,$3,'Record-Triggered Flow',1,false) RETURNING id",
  [tenantId,graph.apiName,graph.label]);
 const props:Array<{path:string;kind:string;text:string|null}>=[];
 encodeMetadataValue(graph,'/builder',props);
 for(const prop of props)await client.query(
  'INSERT INTO md_flow_editor_values(tenant_id,flow_id,property_path,value_kind,value_text) VALUES($1,$2,$3,$4,$5)',
  [tenantId,created[0].id,prop.path,prop.kind,prop.text]);
 return 1;
}
