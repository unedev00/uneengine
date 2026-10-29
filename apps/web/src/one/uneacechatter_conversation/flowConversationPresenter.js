/** Generic, metadata-mapped read presentation for authorised Flow record collections.
 * Does not query Objects, dispatch Flows, grant permissions or mutate records. */
const pick=(record,key)=>typeof key==="string"&&/^[A-Za-z][A-Za-z0-9_]*$/.test(key)
  ?record?.[key]:undefined;
const str=value=>value==null?"":String(value).trim();
const field=(row,p,key,fallback)=>str(pick(row,p[key]||fallback));
const digits=text=>String(text??"").replace(/\D/g,"");
const participantPhone=(value,normalise)=>{
 const raw=str(value),wrapped=raw.match(/\((\+?[0-9\s()-]{7,22})\)\s*$/);
 const phone=normalise?digits(wrapped?.[1]??raw):raw;
 return normalise&&!/^[1-9][0-9]{6,14}$/.test(phone)?"":phone;
};
const participantName=(value,phone)=>{
 const text=str(value);
 const m=text.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
 const name=(m?.[1]||text).trim();
 return name&&digits(name)!==phone?name:phone;
};
const occurredAt=(row,p,direction)=>{
 const received=field(row,p,"messageReceivedAtFieldApiName","ReceivedAt");
 const sent=field(row,p,"messageSentAtFieldApiName","SentAt");
 return direction==="outbound"?sent||received:received||sent;
};
/** The visible source always comes from Page State's Flow outputs (or a permission-checked
 * generic Object read). The field mappings and display exclusions are Builder properties. */
export function presentFlowConversationCollections(p){
 const saved=Array.isArray(p.conversations)?p.conversations:[],
  incoming=Array.isArray(p.messages)?p.messages:[],
  normalise=p.conversationNormalizePhoneNumbers!==false,
  inbox=new Map(),messages=[],seen=new Set(),
  channels=new Map();
 const defaultChannel=str(p.conversationDefaultAccount||p.messageChannelValue);
 const listFields=(value,fallback)=>String(value||fallback).split(',').map(x=>x.trim())
   .filter(x=>/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(x)).slice(0,10);
 const contactNameFields=listFields(p.contactDisplayNameFieldApiNames,'Name,DisplayName,ContactName,FirstName');
 const contactPhoneFields=listFields(p.contactPhoneFieldApiNames,'WhatsAppPhoneNumber,WhatsAppPhone,Mobile,MobilePhone,PhoneNumber,Phone');
 const contactNames=new Map(),ownNumbers=new Set(),customerNumbers=new Set();
 const contacts=Array.isArray(p.contactChoices)?p.contactChoices:[];
 for(const contact of [...contacts].sort((a,b)=>str(a?.Id).localeCompare(str(b?.Id)))){
   if(!contact||typeof contact!=='object'||Array.isArray(contact))continue;
   const display=contactNameFields.map(key=>str(pick(contact,key))).find(Boolean)
      ||[pick(contact,'FirstName'),pick(contact,'LastName')].map(str).filter(Boolean).join(' ');
   if(!display)continue;
   for(const key of contactPhoneFields){
     const phone=participantPhone(pick(contact,key),normalise);
     if(phone&&!contactNames.has(phone))contactNames.set(phone,display);
   }
 }
 // Derive business-side numbers only from authorised Communication records.
 if(p.filterInboxBusinessNumber!==false)for(const row of incoming){
   if(!row||typeof row!=='object'||Array.isArray(row))continue;
   const direction=field(row,p,'messageDirectionFieldApiName','Direction').toLowerCase();
   const statusId=field(row,p,'messageExternalIdFieldApiName','ExternalMessageId');
   if(direction.startsWith('in')&&p.messageChannelValue===field(row,p,'messageChannelFieldApiName','Channel')){
     const own=participantPhone(field(row,p,'messageRecipientFieldApiName','Recipient'),normalise);
     if(own)ownNumbers.add(own);
   }
   if(statusId.startsWith(str(p.messageStatusPrefixToIgnore)||'\u0000')){
     const own=participantPhone(field(row,p,'messageSenderFieldApiName','Sender'),normalise);
     if(own)ownNumbers.add(own);
   }
   if(direction.startsWith('in')||direction.startsWith('out')){
     const contact=participantPhone(field(row,p,direction.startsWith('out')?
       'messageRecipientFieldApiName':'messageSenderFieldApiName',direction.startsWith('out')?'Recipient':'Sender'),normalise);
     if(contact)customerNumbers.add(contact);
   }
 }

 const idKey=p.conversationIdFieldApiName||"Id";
 const ignoreId=str(p.messageStatusPrefixToIgnore),ignoreName=str(p.messageStatusNamePrefixToIgnore);
 const displayNameKey=p.conversationNameFieldApiName||"Name";
 const savePhoneKey=p.conversationPhoneFieldApiName||"PhoneNumber";
 for(const row of saved){
  if(!row||typeof row!=="object"||Array.isArray(row))continue;
  const phone=participantPhone(pick(row,savePhoneKey),normalise);
  if(!phone||inbox.has(phone)||(ownNumbers.has(phone)&&!customerNumbers.has(phone)))continue;
  const name=contactNames.get(phone)||phone;
  const account=defaultChannel;
  inbox.set(phone,{id:str(pick(row,idKey))||"conversation:"+phone,
   contactName:name,phoneNumber:phone,channelAccountId:account,
   preview:"",lastMessageAt:"",unreadCount:0,canSend:p.canSend===true,
   assignedUserId:null});
  if(account)channels.set(account,{id:account,name:account,canSend:p.canSend===true});
 }
 const incomingValue=str(p.conversationIncomingValue||"Inbound").toLowerCase(),
  outgoingValue=str(p.conversationOutgoingValue||"Outbound").toLowerCase();
 for(const row of incoming){
  if(!row||typeof row!=="object"||Array.isArray(row))continue;
  const channel=field(row,p,"messageChannelFieldApiName","Channel");
  if(p.messageChannelValue&&channel!==p.messageChannelValue)continue;
  const direction=field(row,p,"messageDirectionFieldApiName","Direction").toLowerCase();
  if(direction!==incomingValue&&direction!==outgoingValue)continue;
  const outbound=direction===outgoingValue;
  const externalId=field(row,p,"messageExternalIdFieldApiName","ExternalMessageId");
  const name=str(row.Name);
  if((ignoreId&&externalId.startsWith(ignoreId))||(ignoreName&&name.startsWith(ignoreName)))continue;
  const body=field(row,p,"messageBodyFieldApiName","Body");
  if(p.messageRequireBody!==false&&!body)continue;
  const participant=field(row,p,outbound?"messageRecipientFieldApiName":"messageSenderFieldApiName",
   outbound?"Recipient":"Sender");
  const phone=participantPhone(participant,normalise);
  if(!phone||(ownNumbers.has(phone)&&!customerNumbers.has(phone)))continue;
  if(externalId&&seen.has(externalId))continue;
  if(externalId)seen.add(externalId);
  const account=channel||defaultChannel,occurred=occurredAt(row,p,outbound?"outbound":"inbound");
  if(account)channels.set(account,{id:account,name:account,canSend:p.canSend===true});
  let chat=inbox.get(phone);
  if(!chat){
   chat={id:"communication:"+phone,contactName:contactNames.get(phone)||phone,
    phoneNumber:phone,channelAccountId:account,preview:"",lastMessageAt:"",
    unreadCount:0,canSend:p.canSend===true,assignedUserId:null};
   inbox.set(phone,chat);
  }
  if(!chat.lastMessageAt||occurred>=chat.lastMessageAt){
   chat.preview=body;chat.lastMessageAt=occurred;
   chat.contactName=contactNames.get(phone)||phone;
  }
  const id=field(row,p,"messageIdFieldApiName","Id")||externalId;
  messages.push({id:id||phone+":"+messages.length,conversationId:chat.id,
   direction:outbound?"outbound":"inbound",body,sentAt:occurred,
   status:field(row,p,"messageStatusFieldApiName","Status"),
   mediaUrl:"",mediaName:"",mediaType:""});
 }
 messages.sort((a,b)=>a.sentAt.localeCompare(b.sentAt));
 return {conversations:[...inbox.values()].sort((a,b)=>b.lastMessageAt.localeCompare(a.lastMessageAt)
   ||a.contactName.localeCompare(b.contactName)),
  messages,channelAccounts:[...channels.values()]};
}
