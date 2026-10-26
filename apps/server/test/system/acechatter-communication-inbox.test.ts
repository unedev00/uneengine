import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  buildCommunicationInbox,
  communicationSenderPhone,
  mergeCommunicationMessages
} from '../../../acechatter/src/communicationInbox.js';

test('AceChatter groups inbound Communication records by WhatsApp sender number and filters by number',()=>{
  const communications=[
    {Id:'comm-1',Channel:'WhatsApp',Direction:'Inbound',Status:'Received',
      Sender:'Test Customer (447700900123)',Recipient:'15551234567',
      Body:'First message',ExternalMessageId:'wamid.1',ReceivedAt:'2026-10-22T22:15:00.000Z'},
    {Id:'comm-2',Channel:'WhatsApp',Direction:'Inbound',Status:'Received',
      Sender:'Test Customer (447700900123)',Recipient:'15551234567',
      Body:'Second message',ExternalMessageId:'wamid.2',ReceivedAt:'2026-10-22T22:16:00.000Z'},
    {Id:'comm-3',Channel:'WhatsApp',Direction:'Inbound',Status:'Received',
      Sender:'Other Customer (447700900124)',Recipient:'15551234567',
      Body:'Different chat',ExternalMessageId:'wamid.3',ReceivedAt:'2026-10-22T22:17:00.000Z'}
  ];
  assert.equal(communicationSenderPhone(communications[0]),'447700900123');
  const inbox=buildCommunicationInbox([],communications,'+44 7700 900123');
  assert.equal(inbox.length,1);
  assert.equal(inbox[0].Id,'communication:447700900123');
  assert.equal(inbox[0].PhoneNumber,'447700900123');
  assert.equal(inbox[0].Name,'447700900123','No Contact match means show the phone number');
  assert.equal(inbox[0].__lastMessageBody,'Second message');
});

test('AceChatter groups inbound and outbound Communication by the same customer number',()=>{
  const communications=[
    {Id:'incoming',Channel:'WhatsApp',Direction:'Inbound',Sender:'Customer Name (447700900123)',
      Recipient:'15551234567',Body:'Hello',ExternalMessageId:'wamid.in',
      ReceivedAt:'2026-10-22T10:00:00.000Z'},
    {Id:'outgoing',Channel:'WhatsApp',Direction:'Outbound',Sender:'WhatsApp Business',
      Recipient:'447700900123',Body:'Hi there',ExternalMessageId:'wamid.out',
      SentAt:'2026-10-22T10:01:00.000Z'},
    {Id:'sms',Channel:'SMS',Direction:'Inbound',Sender:'Customer Name (447700900123)',
      Body:'This is not a WhatsApp message',ExternalMessageId:'sms.1',
      ReceivedAt:'2026-10-22T10:02:00.000Z'}
  ];
  assert.equal(communicationSenderPhone(communications[0]),'447700900123');
  assert.equal(communicationSenderPhone(communications[1]),'447700900123');
  const inbox=buildCommunicationInbox([],communications);
  assert.equal(inbox.length,1);
  assert.equal(inbox[0].PhoneNumber,'447700900123');
  const thread=mergeCommunicationMessages(communications,[],'447700900123');
  assert.deepEqual(thread.map(row=>row.Id),['incoming','outgoing']);
  assert.deepEqual(thread.map(row=>row.Direction),['Inbound','Outbound']);
});

test('AceChatter links Communication threads to authorised ChatConversation and deduplicates legacy copies',()=>{
  const communications=[
    {Id:'comm-1',Channel:'WhatsApp',Direction:'Inbound',Status:'Received',
      Sender:'Test Customer (447700900123)',Body:'Hello',ExternalMessageId:'wamid.1',
      ReceivedAt:'2026-10-22T22:15:00.000Z'},
    {Id:'comm-2',Channel:'WhatsApp',Direction:'Inbound',Status:'Received',
      Sender:'Other Customer (447700900124)',Body:'Other chat',ExternalMessageId:'wamid.2',
      ReceivedAt:'2026-10-22T22:16:00.000Z'}
  ];
  const inbox=buildCommunicationInbox([
    {Id:'conversation-1',Name:'Saved contact',PhoneNumber:'+44 7700 900123',Status:'Open'}
  ],communications,'447700900123');
  assert.equal(inbox.length,1);
  assert.equal(inbox[0].Id,'conversation-1');
  assert.equal(inbox[0].PhoneNumber,'447700900123');
  assert.equal(inbox[0].Name,'447700900123','ChatConversation.Name must not override Contact source');
  const byContactName=buildCommunicationInbox([
    {Id:'conversation-1',Name:'Saved chat',PhoneNumber:'+44 7700 900123',Status:'Open'}
  ],communications,'Contact Alice',[
    {Id:'contact-a',Name:'Contact Alice',Mobile:'+44 7700 900123'}
  ]);
  assert.equal(byContactName.length,1,'filter should match the Contact name, not the WhatsApp profile');
  assert.equal(byContactName[0].Name,'Contact Alice');
  assert.equal(buildCommunicationInbox([],communications,'Test Customer').length,0,
    'WhatsApp profile names must not influence chat name searches');

  const merged=mergeCommunicationMessages(communications,[
    {Id:'legacy-copy',Direction:'Inbound',Body:'Hello',ExternalMessageId:'wamid.1',
      SentAt:'2026-10-22T22:15:00.000Z'},
    {Id:'outbound-1',Direction:'Outbound',Body:'Reply',ExternalMessageId:'wamid.out',
      SentAt:'2026-10-22T22:18:00.000Z'}
  ],'447700900123');
  assert.deepEqual(merged.map(row=>row.Id),['comm-1','outbound-1']);
  assert.equal(merged[0].Body,'Hello');
  assert.equal(merged[1].Direction,'Outbound');
});

test('delivery callbacks never become customer chats or message bubbles',()=>{
 const records=[
  {Id:'real-in',Channel:'WhatsApp',Direction:'Inbound',Sender:'Client (447440751016)',
   Recipient:'447721342177',Body:'Hehehe',ExternalMessageId:'wamid.in',
   ReceivedAt:'2026-10-25T08:17:44Z'},
  {Id:'real-out',Channel:'WhatsApp',Direction:'Outbound',Sender:'WhatsApp Business',
   Recipient:'447440751016',Body:'lol',ExternalMessageId:'wamid.out',
   SentAt:'2026-10-25T08:18:19Z'},
  ...['sent','delivered','read'].map((status,index)=>({
   Id:'status-'+index,Channel:'WhatsApp',Direction:'Inbound',
   Sender:'447721342177',Recipient:'447440751016',Body:undefined,
   Name:'WhatsApp delivery status: '+status,ExternalMessageId:'wa-status-'+status,
   ReceivedAt:'2026-10-25T08:18:20Z'
  }))
 ];
 const inbox=buildCommunicationInbox([],records);
 assert.equal(inbox.length,1,'Statuses must not create a business-number chat');
 assert.equal(inbox[0].PhoneNumber,'447440751016');
 assert.equal(inbox[0].__lastMessageBody,'lol');
 assert.deepEqual(mergeCommunicationMessages(records,[],'447440751016')
  .map(item=>item.Body),['Hehehe','lol']);
});

test('AceChatter hides an old persisted business-number chat caused by status receipts',()=>{
 const communications=[
  {Channel:'WhatsApp',Direction:'Inbound',Sender:'447721342177',
   Recipient:'447440751016',ExternalMessageId:'wa-status-delivered',
   Name:'WhatsApp delivery status: delivered'},
  {Channel:'WhatsApp',Direction:'Inbound',Sender:'Customer (447440751016)',
   Recipient:'447721342177',Body:'Hehehe',ExternalMessageId:'wamid.in',
   ReceivedAt:'2026-10-25T08:17:44Z'},
  {Channel:'WhatsApp',Direction:'Outbound',Sender:'WhatsApp Business',
   Recipient:'447440751016',Body:'lol',ExternalMessageId:'wamid.out',
   SentAt:'2026-10-25T08:18:19Z'}
 ];
 const inbox=buildCommunicationInbox([
  {Id:'business-phantom',Name:'447721342177',PhoneNumber:'447721342177'},
  {Id:'real-conversation',Name:'New',PhoneNumber:'447440751016'}
 ],communications);
 assert.deepEqual(inbox.map(row=>row.Id),['real-conversation']);
 assert.equal(inbox[0].__lastMessageBody,'lol');
});

test('business-owned number is hidden even when no status callbacks are included',()=>{
 const communications=[
  {Id:'out',Channel:'WhatsApp',Direction:'Outbound',
    Sender:'WhatsApp Business',Recipient:'447440751016',
    Body:'Working ?',SentAt:'2026-10-25T09:12:50Z',ExternalMessageId:'wamid.out'},
  {Id:'in',Channel:'WhatsApp',Direction:'Inbound',
    Sender:'Customer Profile (447440751016)',Recipient:'447721342177',
    Body:'Yes',ReceivedAt:'2026-10-25T09:13:27Z',ExternalMessageId:'wamid.in'}
 ];
 const inbox=buildCommunicationInbox([
  {Id:'saved-customer',Name:'New',PhoneNumber:'447440751016',Status:'Open'},
  {Id:'saved-own-number',Name:'447721342177',PhoneNumber:'447721342177',Status:'Open'}
 ],communications);
 assert.equal(inbox.length,1);
 assert.equal(inbox[0].Id,'saved-customer');
 assert.equal(inbox[0].Name,'447440751016');
 assert.equal(inbox[0].__lastMessageBody,'Yes');
});

test('changing WhatsApp profile name never splits a phone-number conversation',()=>{
 const communications=[
  {Id:'old',Channel:'WhatsApp',Direction:'Inbound',
   Sender:'Old Profile (447700900123)',Recipient:'447700900999',
   Body:'Hello',ReceivedAt:'2026-10-22T08:00:00Z'},
  {Id:'new',Channel:'WhatsApp',Direction:'Inbound',
   Sender:'Renamed Profile (447700900123)',Recipient:'447700900999',
   Body:'New message',ReceivedAt:'2026-10-25T08:00:00Z'},
  {Id:'reply',Channel:'WhatsApp',Direction:'Outbound',
   Sender:'WhatsApp Business',Recipient:'447700900123',
   Body:'Hi',SentAt:'2026-10-25T08:01:00Z'}
 ];
 const contacts=[{Id:'contact',Name:'My Saved Contact',Mobile:'+44 7700 900123'}];
 const inbox=buildCommunicationInbox([
  {Id:'saved',Name:'New',PhoneNumber:'447700900123'}
 ],communications,'',contacts);
 assert.equal(inbox.length,1);
 assert.equal(inbox[0].Id,'saved');
 assert.equal(inbox[0].Name,'My Saved Contact');
 assert.equal(inbox[0].__lastMessageBody,'Hi');
 assert.deepEqual(mergeCommunicationMessages(communications,[],'447700900123')
  .map(row=>row.Id),['old','new','reply']);
 assert.equal(buildCommunicationInbox([],communications,'Old Profile',contacts).length,0,
  'Profile names are never lookup keys');
 assert.equal(buildCommunicationInbox([],communications,'My Saved Contact',contacts).length,1);

 const withoutContact=buildCommunicationInbox([
  {Id:'saved',Name:'Custom Saved Chat',PhoneNumber:'447700900123'}
 ],communications);
 assert.equal(withoutContact.length,1);
 assert.equal(withoutContact[0].Name,'447700900123',
   'Fallback is the number, not stored labels or WhatsApp profile names');
});

test('Contact phone fields and identity resolution support exact numbers and partial contact records',()=>{
 const communications=[{
  Id:'msg',Channel:'WhatsApp',Direction:'Inbound',
  Sender:'Whatever (447700900123)',Recipient:'447700900999',
  Body:'Hello',ReceivedAt:'2026-10-25T10:00:00Z'
 }];
 const contacts=[
  {Id:'contact-a',Name:'Alice',Phone:'020 7000 1111',Mobile:'+44 7700 900123'},
  {Id:'contact-b',Name:'',FirstName:'Other',LastName:'Contact',Mobile:'+44 7700 900222'},
  {Id:'contact-c',Name:'Wrong Person',Mobile:'+44 7700 900999'}
 ];
 const found=buildCommunicationInbox([],communications,'',contacts);
 assert.equal(found.length,1);
 assert.equal(found[0].Name,'Alice');
 assert.equal(buildCommunicationInbox([],communications,'Other Contact',contacts).length,0);
 const firstLast=buildCommunicationInbox([],communications,'',[
  {Id:'contact-name',Name:'',FirstName:'First',LastName:'Last',
   Phone:'+44 7700 900123'}
 ]);
 assert.equal(firstLast[0].Name,'First Last');
});
