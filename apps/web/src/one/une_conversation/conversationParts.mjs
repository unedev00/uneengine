/**
 * Logical children of UNE Conversation. The child's property names are taken
 * from the existing UNE Input, Search and Button contracts.
 * Bindings point to existing persisted properties to preserve published pages.
 */
export const conversationPartSlots = Object.freeze([
 {id:'heading',label:'Conversation title',component:'une_input',bindings:{value:'title'}},
 {id:'emptyThread',label:'Empty thread title',component:'une_input',bindings:{value:'emptyTitle'}},
 {id:'emptyInbox',label:'Empty inbox message',component:'une_input',bindings:{value:'emptyConversationsText'}},
 {id:'submissionNotice',label:'Submission notice',component:'une_input',bindings:{value:'sentNoticeText'}},
 {id:'filterHeading',label:'Filter group label',component:'une_input',bindings:{value:'filterLabel'}},
 {id:'newConversation',label:'New conversation button',component:'une_button',bindings:{label:'newConversationLabel'}},
 {id:'refresh',label:'Refresh button',component:'une_button',bindings:{label:'refreshLabel'}},
 {id:'newMessages',label:'New messages button',component:'une_button',bindings:{label:'newMessageNoticeLabel'}},
 {id:'inboxSearch',label:'Inbox search',component:'une_search',bindings:{label:'searchLabel',placeholder:'searchPlaceholder'}},
 {id:'contactSearch',label:'Contact search',component:'une_search',bindings:{label:'contactSearchLabel'}},
 {id:'composer',label:'Message composer',component:'une_input',bindings:{placeholder:'placeholder',maxLength:'messageMaxLength'}}
]);
const byId=new Map(conversationPartSlots.map(part=>[part.id,part]));
const childKeys=new Set(conversationPartSlots.flatMap(part=>Object.values(part.bindings)));
export function conversationRootDefinition(definition){
 if(!definition)return definition;
 return {...definition,propertyDefinitions:(definition.propertyDefinitions||[])
   .filter(property=>!childKeys.has(property.propertyKey))};
}
export function conversationPartDefinition(id,parent,catalog){
 const part=byId.get(id);
 if(!part||!parent)return undefined;
 const child=catalog.find(item=>item.apiName===part.component);
 if(!child)return undefined;
 const fields=Object.keys(part.bindings).map(key=>{
   const def=child.propertyDefinitions?.find(item=>item.propertyKey===key);
   const legacy=parent.propertyDefinitions?.find(item=>item.propertyKey===part.bindings[key]);
   // Search's reusable UI contract is now private code, not public ribbon metadata.
   // Keep the AceChatter composite editor's named child slots operational.
   const internal=part.component==='une_search'&&['label','placeholder'].includes(key)
     ?{propertyKey:key,label:key==='label'?'Search label':'Search placeholder',kind:'TEXT',defaultValue:key==='label'?'Search':'Search'}:null;
   const effective=def??internal;
   return effective?{...effective,defaultValue:legacy?.defaultValue??effective.defaultValue}:null;
 }).filter(Boolean);
 if(!fields.length)return undefined;
 return {...child,label:part.label,propertyDefinitions:fields};
}
export function conversationPartEditorProperties(parent,id){
 const fields=byId.get(id)?.bindings||{};
 return Object.fromEntries(Object.entries(fields)
   .filter(([,oldKey])=>Object.hasOwn(parent,oldKey))
   .map(([key,oldKey])=>[key,parent[oldKey]]));
}
export function updateConversationPartProperties(parent,id,edited){
 const fields=byId.get(id)?.bindings||{};
 const next={...parent};
 for(const [key,oldKey] of Object.entries(fields))
   if(Object.hasOwn(edited,key))next[oldKey]=edited[key];
 return next;
}
export function readConversationPart(props,id,key){
 const oldKey=byId.get(id)?.bindings?.[key];
 return oldKey?props?.[oldKey]:undefined;
}
