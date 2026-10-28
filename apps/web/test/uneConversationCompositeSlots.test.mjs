import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {conversationPartSlots,conversationRootDefinition,conversationPartDefinition,
  conversationPartEditorProperties,updateConversationPartProperties,readConversationPart}
  from '../src/one/une_conversation/conversationParts.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const manifest=name=>JSON.parse(read('../src/one/'+name+'/component.json'));
const parent=manifest('une_conversation');
const children=['une_text','une_button','une_search','une_input'].map(manifest);
test('conversation slot definitions reuse actual UNE child contracts',()=>{
 for(const part of conversationPartSlots){
  const definition=conversationPartDefinition(part.id,parent,children);
  assert.ok(definition,part.id);
  assert.equal(definition.apiName,part.component);
  for(const nativeKey of Object.keys(part.bindings))
   assert.ok(definition.propertyDefinitions.some(def=>def.propertyKey===nativeKey),part.id+' '+nativeKey);
 }
});
test('parent inspector excludes child labels, but persists backward-compatible definitions',()=>{
 const root=conversationRootDefinition(parent);
 const keys=new Set(root.propertyDefinitions.map(def=>def.propertyKey));
 for(const slot of conversationPartSlots)for(const oldKey of Object.values(slot.bindings)){
  assert.equal(keys.has(oldKey),false,oldKey);
  assert.ok(parent.propertyDefinitions.some(def=>def.propertyKey===oldKey));
 }
 for(const key of ['canSend','conversationIdFieldApiName','showRefresh'])assert.ok(keys.has(key),key);
});
test('editing a child retains saved settings, permissions and Flow actions',()=>{
 const props={refreshLabel:'Reload',newMessageNoticeLabel:'Latest',title:'Chats',
   showRefresh:true,canSend:false,actionFlows:{refresh:'ReadFlow'},messageMaxLength:4096};
 assert.deepEqual(conversationPartEditorProperties(props,'refresh'),{label:'Reload'});
 const edited=updateConversationPartProperties(props,'refresh',{label:'Refresh now'});
 assert.equal(edited.refreshLabel,'Refresh now');
 assert.equal(edited.newMessageNoticeLabel,'Latest');
 assert.equal(edited.canSend,false);
 assert.equal(edited.actionFlows,props.actionFlows);
 assert.equal(readConversationPart(edited,'refresh','label'),'Refresh now');
 assert.equal(readConversationPart(edited,'composer','maxLength'),4096);
});
test('conversation keeps its existing shell and authorised actions',()=>{
 const jsx=read('../src/one/OneConversation/OneConversation.jsx');
 const adapters=read('../src/one/une_conversation/ConversationParts.jsx');
 const builder=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 for(const token of ['one-conversation-inbox','one-conversation-thread',
   'one-conversation-compose','one-conversation-messages',
   'optionalAction("refresh",{selectedConversationId:activeId})',
   'followLatest.current=true;setHasNewMessages(false)'])
   assert.ok(jsx.includes(token),token);
 assert.match(adapters,/return <button \{\.\.\.props\}\/>/);
 assert.match(adapters,/return <input \{\.\.\.props\}\/>/);
 assert.match(builder,/Edit conversation element/);
 assert.match(builder,/conversationPartDefinition\(/);
});
