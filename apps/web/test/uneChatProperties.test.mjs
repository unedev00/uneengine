import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadComponentCatalog,buildBundledComponent} from '../../../scripts/component-catalog.mjs';
import {presentFlowConversationCollections} from '../src/one/une_conversation/flowConversationPresenter.js';

const p={
 conversationSourceMode:'flowRecords',conversationNormalizePhoneNumbers:true,
 conversationDefaultAccount:'WhatsApp',messageChannelValue:'WhatsApp',
 conversationIncomingValue:'Inbound',conversationOutgoingValue:'Outbound',
 messageStatusPrefixToIgnore:'wa-status-',messageRequireBody:true
};

test('generic Flow conversation presentation groups sender/recipient, preserves saved empty chats and suppresses status/log entries',()=>{
 const model=presentFlowConversationCollections({...p,contactChoices:[
  {Id:'contact-1',Name:'Alice',Mobile:'+44 7700 900123'}
 ],conversations:[
  {Id:'c1',Name:'Alice',PhoneNumber:'+447700900123'},
  {Id:'c3',Name:'Charlie',PhoneNumber:'+447700900999'}
 ],messages:[
  {Id:'m1',Channel:'WhatsApp',Direction:'Inbound',Sender:'Alice (+44 7700 900123)',Recipient:'123456789',
   Body:'Hello',ReceivedAt:'2026-10-24T12:00:00Z',ExternalMessageId:'wa1'},
  {Id:'m2',Channel:'WhatsApp',Direction:'Outbound',Sender:'Business',Recipient:'+44 7700 900123',
   Body:'Hi there',SentAt:'2026-10-24T12:05:00Z',ExternalMessageId:'wa2'},
  {Id:'m3',Channel:'WhatsApp',Direction:'Inbound',Sender:'+44 7700 900888',
   Body:'New customer',ReceivedAt:'2026-10-24T12:10:00Z',ExternalMessageId:'wa3'},
  {Id:'m4',Channel:'WhatsApp',Direction:'Inbound',Sender:'+44 7700 900123',
   Body:'Status',ExternalMessageId:'wa-status-1'},
  {Id:'m5',Channel:'WhatsApp',Direction:'Inbound',Sender:'+44 7700 900123',
   Body:'',ExternalMessageId:'wa4'},
  {Id:'m6',Channel:'Email',Direction:'Inbound',Sender:'+44 7700 900123',
   Body:'Email',ExternalMessageId:'wa5'},
  {Id:'m7',Channel:'WhatsApp',Direction:'Outbound',Sender:'Business',Recipient:'+44 7700 900123',
   Body:'Duplicate',ExternalMessageId:'wa2'}
 ]});
 assert.equal(model.conversations.length,3);
 const alice=model.conversations.find(c=>c.phoneNumber==='447700900123');
 assert.equal(alice.id,'c1');assert.equal(alice.contactName,'Alice');
 assert.equal(alice.preview,'Hi there');
 assert.equal(model.conversations.find(c=>c.phoneNumber==='447700900999')?.preview,'');
 assert.equal(model.conversations.find(c=>c.phoneNumber==='447700900888')?.id,'communication:447700900888');
 assert.deepEqual(model.messages.map(m=>m.id),['m1','m2','m3']);
 assert.deepEqual(model.messages.filter(m=>m.conversationId==='c1').map(m=>m.direction),['inbound','outbound']);
 assert.equal(model.channelAccounts.length,1);
});

test('field roles stay metadata-configurable and no source records are mutated',()=>{
 const rows=[{RecordKey:'a',Mobile:'447700999000',Label:'Mapped'}];
 const before=JSON.stringify(rows);
 const result=presentFlowConversationCollections({
  ...p,contactChoices:[{Id:'contact-1',Label:'Mapped',Mobile:'447700999000'}],
  contactDisplayNameFieldApiNames:'Label',conversations:rows,messages:[],conversationIdFieldApiName:'RecordKey',
  conversationPhoneFieldApiName:'Mobile',conversationNameFieldApiName:'Label'
 });
 assert.equal(result.conversations[0].id,'a');
 assert.equal(result.conversations[0].contactName,'Mapped');
 assert.equal(JSON.stringify(rows),before);
 assert.deepEqual(presentFlowConversationCollections({...p,conversations:[],messages:[
  {Id:'x',Channel:'Email',Direction:'Inbound',Sender:'447700999000',Body:'No'}
 ]}).conversations,[]);
});

const {components}=await loadComponentCatalog();
const build=async(apiName,props)=>{
 const definition=components.find(x=>x.apiName===apiName);
 assert.ok(definition,apiName);
 const {compiledJs}=await buildBundledComponent(definition);
 const context={React,module:{exports:{}},Intl,Date,URL,crypto:globalThis.crypto};
 vm.runInNewContext(compiledJs,context);
 return renderToStaticMarkup(React.createElement(context.module.exports.default,props));
};

test('UNE chat components expose editable metadata, flow events and mapped collections',async()=>{
 const convo=components.find(x=>x.apiName==='une_conversation');
 const keys=new Set(convo.propertyDefinitions.map(x=>x.propertyKey));
 for(const field of ['conversations','messages','contactChoices','selectedConversationId','conversationSourceMode',
  'contactSourceObjectApi','messageChannelValue','showFilterTabs','canSend'])
  assert.ok(!keys.has(field),field+' must be internal AceChatter code');
 for(const key of ['showRefresh','refreshLabel','newMessageNoticeLabel'])assert.ok(!keys.has(key),key+' still public');
 for(const event of ['start','select','search','refresh','create','resolve','send','contactSelect','contactSearch','newConversationOpen'])
  assert.ok(convo.eventDefinitions.some(x=>x.apiName===event),event);
 const html=await build('une_conversation',{...p,viewMode:'inbox',showFilterTabs:false,showAccountSelector:false,
  contactChoices:[{Id:'c1-contact',Name:'Alice',Mobile:'447700900123'}],
  conversations:[{Id:'c1',Name:'Alice',PhoneNumber:'447700900123'}],
  messages:[{Id:'m1',Direction:'Inbound',Channel:'WhatsApp',Sender:'447700900123',Body:'Hello'}]});
 assert.match(html,/Alice/);
 assert.match(html,/Hello/);
 assert.doesNotMatch(html,/Conversation filters/);
});

test('UNE search, modal, input, repeater, lookup respect configured properties',async()=>{
 const search=await build('une_search',{showSubmitButton:true,submitLabel:'Find contact'});
 assert.match(search,/Find contact/);
 const modal=await build('une_modal',{controlledOpen:true,isOpen:true,showTrigger:false,title:'New Chat'});
 assert.match(modal,/role="dialog"/);assert.match(modal,/New Chat/);assert.doesNotMatch(modal,/>Open</);
 const input=await build('une_input',{inputType:'tel',label:'Phone',maxLength:16,
  pattern:'[+]?[0-9 ]+',inputMode:'tel',helpText:'Country code required'});
 assert.match(input,/maxLength="16"/i);assert.match(input,/Country code required/);
 const rows=await build('une_repeater',{items:[{Id:'1',Name:'Alice',Phone:'447700900123',Status:'New'}],
  recordSubtitleFieldApiName:'Phone',recordBadgeFieldApiName:'Status',selectedValue:'1'});
 assert.match(rows,/447700900123/);assert.match(rows,/New/);assert.match(rows,/aria-pressed="true"/);
 const loading=await build('une_repeater',{loading:true,loadingText:'Retrieving contacts'});
 assert.match(loading,/Retrieving contacts/);
 const lookup=await build('une_lookup',{items:[{Id:'1',Name:'Alice',Phone:'447700900123'}],
   recordSubtitleFieldApiName:'Phone',label:'Contacts'});
 assert.match(lookup,/Alice/);assert.match(lookup,/447700900123/);
});
