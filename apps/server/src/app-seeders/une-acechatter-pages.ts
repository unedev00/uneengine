import type {PoolClient} from 'pg';
import {encodeMetadataValue} from '../system-files/component-runtime.js';
import {UNE_ACECHATTER_APP as APP} from './une-acechatter-catalog.js';

type Client=Pick<PoolClient,'query'>;
type Node={key:string;type:string;label:string;region:'header'|'main'|'sidebar';props:Record<string,unknown>};
const flow=(name:string,inputs:Record<string,unknown>,outputs?:Record<string,string>)=>({
 actionType:'Flow',flowApiName:name,inputs,...(outputs?{outputs}:{}),
 mutatesData:!/^AceChatter(?:Load|Find)/.test(name)
});
const state=(key:string,value:unknown)=>({actionType:'PageState',stateKey:key,value});
const layoutSpecs=[
 {factor:'desktop',api:APP.pages.desktop,title:'UNE - Chats Workspace - Desktop',width:1440,height:900,devices:['Desktop'],desktop:true,phone:false},
 {factor:'tablet',api:APP.pages.tablet,title:'UNE - Chats Workspace - Tablet',width:1024,height:900,devices:['Desktop'],desktop:true,phone:false},
 {factor:'phone',api:APP.pages.phone,title:'UNE - Chats Workspace - Mobile',width:390,height:844,devices:['Phone'],desktop:false,phone:true},
 {factor:'custom',api:APP.pages.custom,title:'UNE - Chats Workspace - Custom',width:1280,height:800,devices:['Desktop','Phone'],desktop:true,phone:true}
] as const;
const sharedFlows=['AceChatterLoadConversations','AceChatterLoadCommunications',
 'AceChatterLoadContacts','AceChatterCreateConversation',
 'AceChatterFindConversationByPhone','AceChatterSendMessage'] as const;
const requiredComponents=['uneacechatter_conversation','uneacechatter_modal','uneacechatter_tabs','uneacechatter_stack',
 'uneacechatter_lookup','uneacechatter_input','uneacechatter_button','uneacechatter_search'] as const;

function nodes(active:Set<string>,device:string):Node[]{
 const enabled=(name:string)=>active.has(name),isMobile=device==='phone';
 const loadConversations=flow('AceChatterLoadConversations',{searchTerm:'',limit:100},{conversations:'chatConversations'});
 const loadCommunications=flow('AceChatterLoadCommunications',{searchTerm:'',limit:200},{communications:'chatMessages'});
 const loadContacts=flow('AceChatterLoadContacts',{searchTerm:'',limit:200},
  {contacts:'chatContacts',sourceObjectApi:'chatContactObject'});
 const newConversation=flow('AceChatterCreateConversation',{
  chatName:{source:'FirstNonEmpty',values:['$state.chatName','$state.chatPhone']},
  phoneNumber:{source:'NormalizePhone',value:'$state.chatPhone'},
  sourceObjectApi:'',sourceRecordId:''
 });
 const contactConversation=flow('AceChatterCreateConversation',{
  chatName:'$state.contactSelection.contactName',
  phoneNumber:'$state.contactSelection.phoneNumber',
  sourceObjectApi:'$state.chatContactObject',
  sourceRecordId:'$state.contactSelection.value'
 });
 const actions={
  start:loadConversations,
  refresh:loadCommunications,
  refreshConversations:loadConversations,
  refreshContacts:loadContacts,
  search:flow('AceChatterLoadConversations',{searchTerm:'$event.searchTerm'},{conversations:'chatConversations'}),
  select:state('selectedConversation','$event.id'),
  newConversationOpen:state('chatNewOpen',true),
  create:flow('AceChatterCreateConversation',{chatName:'$event.chatName',
   phoneNumber:'$event.phoneNumber',sourceObjectApi:'$event.sourceObjectApi',
   sourceRecordId:'$event.sourceRecordId'}),
  resolve:flow('AceChatterFindConversationByPhone',{phoneNumber:'$event.phoneNumber'}),
  send:flow('AceChatterSendMessage',{conversationId:'$event.conversationId',
   message:'$event.body',recipientPhone:'$event.recipientPhone'})
 };
 const root:Node[]=[
  {key:'workspaceHeading',type:'uneacechatter_input',label:'UNE - Chats Workspace',region:'header',
   props:{text:'UNE AceChatter',fontSize:isMobile?19:26,fontWeight:'700',textColor:'#075E54',
    actionFlows:{start:loadCommunications}}},
  {key:'inbox',type:'uneacechatter_conversation',label:'UNE - Chats List and Conversation',region:'main',
   props:{viewMode:'inbox',title:'Chats',placeholder:'Type a message',searchPlaceholder:'Search chats',
    conversationSourceMode:'flowRecords',conversationAccessMode:'flowPermissions',
    controlledSelection:true,selectedConversationId:'',canSend:enabled('AceChatterSendMessage')
     &&enabled('AceChatterCreateConversation')&&enabled('AceChatterFindConversationByPhone'),
    enableSendPreparation:true,enableNewConversation:true,requireChannelAccountForNew:false,
    conversationNormalizePhoneNumbers:true,conversationDefaultAccount:'WhatsApp',
    conversationIncomingValue:'Inbound',conversationOutgoingValue:'Outbound',
    messageChannelValue:'WhatsApp',messageRequireBody:true,
    conversationIdFieldApiName:'Id',conversationPhoneFieldApiName:'PhoneNumber',
    conversationNameFieldApiName:'Name',messageIdFieldApiName:'Id',
    messageDirectionFieldApiName:'Direction',messageSenderFieldApiName:'Sender',
    messageRecipientFieldApiName:'Recipient',messageBodyFieldApiName:'Body',
    messageSentAtFieldApiName:'SentAt',messageReceivedAtFieldApiName:'ReceivedAt',
    messageChannelFieldApiName:'Channel',messageStatusFieldApiName:'Status',
    messageExternalIdFieldApiName:'ExternalMessageId',
    messageStatusPrefixToIgnore:'wa-status-',
    showFilterTabs:false,showAccountSelector:false,showRefresh:true,searchMode:'event',
    newConversationPresentation:'event',showDeliveryStatus:true,
    emptyConversationsText:'No WhatsApp chats to show.',
    messageStatusNamePrefixToIgnore:'WhatsApp delivery status:',
    liveFlowRefreshEnabled:true,liveFlowRefreshIntervalMs:15000,
    liveFlowRefreshEvents:'refresh,refreshConversations,refreshContacts',
    contactDisplayNameFieldApiNames:'Name,DisplayName,ContactName,FirstName',
    contactPhoneFieldApiNames:'WhatsAppPhoneNumber,WhatsAppPhone,Mobile,MobilePhone,PhoneNumber,Phone',
    autoScrollOnNewMessage:true,showNewMessageNotice:true,avoidKeyboardOverlap:true,
    conversations:[],messages:[],contactChoices:[],
    stateBindings:{conversations:'chatConversations',messages:'chatMessages',
     contactChoices:'chatContacts',selectedConversationId:'selectedConversation',
     contactSourceObjectApi:'chatContactObject'},
    actionFlows:actions}},
  {key:'threadSearch',type:'uneacechatter_search',label:'UNE - Search Messages',region:'header',
   props:{label:'Find a conversation',placeholder:'Search name or number',
    showSubmitButton:true,submitLabel:'Search',searchKey:'chatSearch',
    actionFlows:{submit:flow('AceChatterLoadCommunications',
     {searchTerm:'$event.value'},{communications:'chatMessages'})}}},
  {key:'newChatModal',type:'uneacechatter_modal',label:'UNE - New Chat',region:'main',
   props:{title:'New chat',openLabel:'New chat',layoutContainer:true,
    controlledOpen:true,isOpen:false,showTrigger:false,fullScreenOnMobile:isMobile,
    stateBindings:{isOpen:'chatNewOpen'},actionFlows:{close:state('chatNewOpen',false)}}},
  {key:'newChatTabs',type:'uneacechatter_tabs',label:'UNE - New Chat Methods',region:'main',
   props:{tabs:'Contacts, Phone number',tabLabel:'Start a new chat',
    layoutContainer:true,layoutParentId:'newChatModal'}},
  {key:'contactPanel',type:'uneacechatter_stack',label:'UNE - Contact Picker',region:'main',
   props:{layoutContainer:true,layoutParentId:'newChatTabs',direction:'column',gap:12}},
  {key:'contacts',type:'uneacechatter_lookup',label:'UNE - Choose Contact',region:'main',
   props:{layoutParentId:'contactPanel',label:'Find contact',placeholder:'Search contacts',
    items:[],recordTitleFieldApiName:'Name',recordValueFieldApiName:'Id',
    recordSubtitleFieldApiName:'Phone',selectionPayload:'record',
    recordPhoneFieldApiNames:'WhatsAppPhoneNumber,WhatsAppPhone,Mobile,MobilePhone,PhoneNumber,Phone',
    recordNameFieldApiNames:'Name,DisplayName,ContactName,FirstName',
    normaliseSelectedPhone:true,
    stateBindings:{items:'chatContacts'},
    actionFlows:{start:loadContacts,search:flow('AceChatterLoadContacts',
     {searchTerm:'$event.value'},{contacts:'chatContacts',sourceObjectApi:'chatContactObject'}),
     change:state('contactSelection','$event')}}},
  {key:'createFromContact',type:'uneacechatter_button',label:'UNE - Start Contact Chat',region:'main',
   props:{layoutParentId:'contactPanel',label:'Start chat with contact',variant:'primary',
    actionFlows:{click:{...contactConversation,
      inputRules:{phoneNumber:'E164',chatName:'NonEmpty',sourceObjectApi:'NonEmpty',sourceRecordId:'NonEmpty'},
      successState:{chatNewOpen:false}}}}},
  {key:'phonePanel',type:'uneacechatter_stack',label:'UNE - Phone Number',region:'main',
   props:{layoutContainer:true,layoutParentId:'newChatTabs',direction:'column',gap:12}},
  {key:'name',type:'uneacechatter_input',label:'UNE - Contact Name',region:'main',
   props:{layoutParentId:'phonePanel',label:'Name',placeholder:'Optional contact name',
    value:'',actionFlows:{change:state('chatName','$event.value')},
    stateBindings:{value:'chatName'}}},
  {key:'phone',type:'uneacechatter_input',label:'UNE - Phone Number',region:'main',
   props:{layoutParentId:'phonePanel',label:'International phone number',inputType:'tel',
    inputMode:'tel',placeholder:'+44 7700 900123',required:true,maxLength:20,
    helpText:'Include country code.',value:'',
    actionFlows:{change:state('chatPhone','$event.value')},
    stateBindings:{value:'chatPhone'}}},
  {key:'createFromPhone',type:'uneacechatter_button',label:'UNE - Start Phone Chat',region:'main',
   props:{layoutParentId:'phonePanel',label:'Create chat',variant:'primary',
    actionFlows:{click:{...newConversation,
      inputRules:{phoneNumber:'E164',chatName:'NonEmpty'},
      successState:{chatNewOpen:false}}}}}
 ];
 return root;
}
/** Install only when the tenant has chosen/licensed UNE AceChatter.
 * Existing pages are treated as customer-owned customisations and never overwritten. */
export async function seedUneAceChatterInstalledPages(client:Client,tenantId:string):Promise<boolean>{
 await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[tenantId+':app-page:UNEAceChatter']);
 const {rows:apps}=await client.query<{id:string}>(`SELECT a.id FROM md_apps a
  JOIN md_app_installations i ON i.app_id=a.id AND i.tenant_id=$1
  JOIN md_app_entitlements e ON e.app_id=a.id AND e.tenant_id=$1
  WHERE a.api_name=$2 AND a.enabled=true AND e.active=true
    AND (e.expires_at IS NULL OR e.expires_at>now()) LIMIT 1`,[tenantId,APP.apiName]);
 if(!apps[0])return false;
 const appId=apps[0].id;
 // The SQL package dependency requires installed, entitled standalone AceChatter.
 const {rows:source}=await client.query(`SELECT 1 FROM md_app_installations i
  JOIN md_apps a ON a.id=i.app_id
  JOIN md_app_entitlements e ON e.app_id=a.id AND e.tenant_id=i.tenant_id
  WHERE i.tenant_id=$1 AND a.api_name='AceChatter'
    AND e.active=true AND (e.expires_at IS NULL OR e.expires_at>now()) LIMIT 1`,[tenantId]);
 if(!source.length)throw Error('UNE AceChatter requires an active AceChatter Flow-owner installation');
  // Private renderers installed only with their owning app; no shared property catalog.
  for(const apiName of ["uneacechatter_input","uneacechatter_conversation","uneacechatter_modal","uneacechatter_tabs","uneacechatter_stack","uneacechatter_lookup","uneacechatter_button","uneacechatter_search"])await client.query(
    'INSERT INTO md_component_definitions(tenant_id,api_name,renderer_key,enabled) VALUES($1,$2,$3,true) ON CONFLICT(tenant_id,api_name) DO NOTHING',
    [tenantId,apiName,'one-bundled:'+apiName]);
 const {rows:availableComponents}=await client.query<{api_name:string}>(`SELECT api_name
  FROM md_component_definitions WHERE tenant_id=$1 AND api_name=ANY($2::text[]) AND enabled=true`,
  [tenantId,requiredComponents]);
 const componentNames=new Set(availableComponents.map(row=>row.api_name));
 for(const name of requiredComponents)if(!componentNames.has(name))throw Error('Shared UNE component unavailable: '+name);
 const {rows:flows}=await client.query<{api_name:string}>(`SELECT DISTINCT api_name
  FROM md_flow_definitions WHERE tenant_id=$1 AND api_name=ANY($2::text[])
    AND active=true AND archived=false`,[tenantId,sharedFlows]);
 const active=new Set(flows.map(row=>row.api_name));
 const missingRead=['AceChatterLoadConversations','AceChatterLoadCommunications','AceChatterLoadContacts']
  .filter(name=>!active.has(name));
 if(missingRead.length)throw Error('Required existing AceChatter read Flows inactive: '+missingRead.join(', '));
 for(const spec of layoutSpecs){
  const {rows:created}=await client.query<{id:string}>(`INSERT INTO md_page_definitions
    (tenant_id,api_name,title,enabled) VALUES($1,$2,$3,true)
    ON CONFLICT(tenant_id,api_name) DO NOTHING RETURNING id`,[tenantId,spec.api,spec.title]);
  const {rows:pages}=await client.query<{id:string}>(`SELECT id FROM md_page_definitions
    WHERE tenant_id=$1 AND api_name=$2 AND enabled=true`,[tenantId,spec.api]);
  const pageId=pages[0]?.id;if(!pageId)throw Error('UNE AceChatter Page API conflict: '+spec.api);
  if(created.length){
   await client.query(`INSERT INTO md_lightning_page_details
    (tenant_id,page_id,page_type,target_object,layout_mode,template,canvas_width,canvas_height,status,devices,revision)
    VALUES($1,$2,'App Page','','template','main-sidebar',$3,$4,'Active',$5::text[],1)`,
    [tenantId,pageId,spec.width,spec.height,[...spec.devices]]);
   await client.query(`INSERT INTO md_lightning_page_activation
    (tenant_id,page_id,assignment_id,scope,app_api,desktop,phone,sort_order)
    VALUES($1,$2,$3,'App Default',$4,$5,$6,0)`,
    [tenantId,pageId,'une-chat-'+spec.factor,APP.apiName,spec.desktop,spec.phone]);
   for(const [index,node] of nodes(active,spec.factor).entries()){
    await client.query(`INSERT INTO md_lightning_page_nodes
      (tenant_id,page_id,component_key,component_type,label,region,visible,sort_order)
      VALUES($1,$2,$3,$4,$5,$6,true,$7)`,
      [tenantId,pageId,node.key,'Custom:'+node.type,node.label,node.region,index]);
    const encoded:Array<{path:string;kind:string;text:string|null}>=[];
    encodeMetadataValue(node.props,'/props',encoded);encodeMetadataValue({},'/extra',encoded);
    for(const item of encoded)await client.query(`INSERT INTO md_lightning_page_node_properties
      (tenant_id,page_id,component_key,property_path,value_kind,value_text)
      VALUES($1,$2,$3,$4,$5,$6)`,
      [tenantId,pageId,node.key,item.path,item.kind,item.text]);
   }
  }else{
   const {rows:owned}=await client.query<{allowed:boolean}>(`SELECT EXISTS(
    SELECT 1 FROM md_lightning_page_details d
    JOIN md_lightning_page_activation a ON a.tenant_id=d.tenant_id AND a.page_id=d.page_id
    WHERE d.tenant_id=$1 AND d.page_id=$2 AND d.page_type='App Page' AND a.app_api=$3
   ) AS allowed`,[tenantId,pageId,APP.apiName]);
   if(!owned[0]?.allowed)throw Error('UNE AceChatter Page API owned by another app');
  }
  await client.query(`INSERT INTO md_tenant_app_navigation(tenant_id,app_id,entry_type,api_name,sort_order)
    VALUES($1,$2,'App Page',$3,$4)
    ON CONFLICT(tenant_id,app_id,entry_type,api_name) DO NOTHING`,
    [tenantId,appId,spec.api,layoutSpecs.indexOf(spec)]);
  if(spec.factor!=='custom')await client.query(`INSERT INTO md_app_home_pages
    (tenant_id,app_id,form_factor,page_id) VALUES($1,$2,$3,$4)
    ON CONFLICT(tenant_id,app_id,form_factor) DO NOTHING`,
    [tenantId,appId,spec.factor,pageId]);
 }
 await client.query(`INSERT INTO md_permission_sets
  (tenant_id,api_name,label,description,navigation_default_access)
  VALUES($1,'UNEAceChatterUser','UNE AceChatter User',
    'Authorised access to Page Builder chat UI and existing AceChatter Flows','Deny')
  ON CONFLICT(tenant_id,api_name) DO NOTHING`,[tenantId]);
 const rights:Array<[string,string]>=[
  ['App:'+APP.apiName,'read'],['PageDefinition','read'],['ComponentDefinition','read'],
  ['Communication','read'],['ChatConversation','read'],['ChatConversation','create'],
  ...['Name','Channel','Direction','Status','Sender','Recipient','Body','ReceivedAt','SentAt',
   'ExternalMessageId','Provider'].map(field=>['Communication.'+field,'read'] as [string,string]),
  ...['Name','PhoneNumber','Status','SourceObjectApi','SourceRecordId']
   .flatMap(field=>[['ChatConversation.'+field,'read'],['ChatConversation.'+field,'create']] as [string,string][]),
  ...sharedFlows.map(name=>['Flow:'+name,'execute'] as [string,string])
 ];
 for(const [resource,action] of rights)await client.query(`INSERT INTO md_permission_rules
  (tenant_id,permission_set_id,resource,action,effect)
  SELECT $1,p.id,$2,$3,'allow' FROM md_permission_sets p
  WHERE p.tenant_id=$1 AND p.api_name='UNEAceChatterUser'
  ON CONFLICT DO NOTHING`,[tenantId,resource,action]);
 return true;
}
