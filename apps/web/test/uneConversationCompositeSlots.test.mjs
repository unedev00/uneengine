import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildBundledComponent} from '../../../scripts/component-catalog.mjs';
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

test('rendered Conversation retains native controls, classes, content and wired actions',async()=>{
 const built=await buildBundledComponent(parent);
 const context={React,module:{exports:{}},Intl,Date,URL,crypto:globalThis.crypto};
 vm.runInNewContext(built.compiledJs,context);
 const html=renderToStaticMarkup(React.createElement(context.module.exports.default,{
  viewMode:'inbox',title:'My Inbox',showRefresh:true,refreshLabel:'Reload chats',
  actionFlows:{refresh:'RefreshFlow'},enableNewConversation:true,
  newConversationLabel:'New chat',channelAccounts:[{id:'a1',name:'Work',canSend:true}],
  allowedAccountIds:['a1'],showAccountSelector:false,showFilterTabs:false,
  searchLabel:'Search label',searchPlaceholder:'Find chat',controlledSelection:true,
  selectedConversationId:'c1',showComposer:true,placeholder:'Type chat',messageMaxLength:144,
  conversations:[{id:'c1',contactName:'Alice',channelAccountId:'a1',canSend:false}],
  messages:[{id:'m1',conversationId:'c1',direction:'inbound',body:'Hello',sentAt:'2026-10-28T12:00:00Z'}]
 }));
 for(const token of ['one-conversation-inbox','one-conversation-thread',
   'one-conversation-list','one-conversation-messages','one-conversation-compose',
   'My Inbox','Reload chats','New chat','Find chat','Search label','Type chat','Hello'])
   assert.ok(html.includes(token),token);
 assert.match(html,/<button[^>]*class="one-btn one-btn--ghost"[^>]*>Reload chats<\/button>/);
 assert.match(html,/maxLength="144"/);
 assert.match(html,/aria-label="Search label"/);
 // A child renderer's extra root wrapper must never be introduced.
 assert.equal((html.match(/class="une-ui"/g)||[]).length,1);
 assert.equal((html.match(/one-conversation-root/g)||[]).length,1);
});
