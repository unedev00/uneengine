import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import type {IntegrationActivityInput} from '../../src/system-support/integration-api-log.js';
import {MailInboxCommunicationSync} from '../../src/system-support/mail-inbox-communication-sync.js';
import {incomingMailIdentity} from '../../src/system-support/mail-communication-recording.js';

const tenant='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const email='support@unesolutions.co.uk';
const message={fingerprint:'a'.repeat(64),messageId:'<msg-1@sender.example>',
 from:'Sender <sender@example.net>',to:email,subject:'Customer enquiry',
 body:'Hello, this is a real incoming email.',receivedAt:'2026-10-25T00:00:00.000Z'};

test('worker records inbound Email from SQL-owned Maildir, never needs mailbox password',async()=>{
 const calls:Array<{sql:string;values:unknown[]}>=[],events:IntegrationActivityInput[]=[];
 let offset=0,recorded=false;
 const db={query:async(sql:string,values:unknown[]=[])=>{
  calls.push({sql,values});
  if(sql.includes('FROM md_mail_accounts a'))
   return {rows:[{tenant_id:tenant,email,next_offset:offset}]};
  if(sql.includes('SELECT 1 FROM md_record_values'))
   return {rows:recorded?[{exists:true}]:[]};
  if(sql.includes('SELECT 1 FROM md_communication_delivery_outbox'))
   return {rows:[]};
  if(sql.includes('INSERT INTO md_mail_inbox_scan_offsets')){
   offset=Number(values[2]);return {rows:[]};
  }
  throw Error('unexpected query');
 }};
 const scan=async(address:string,from:number)=>{
  assert.equal(address,email);assert.equal(from,0);
  return {messages:[message],nextOffset:0,total:1};
 };
 const worker=new MailInboxCommunicationSync(db as unknown as SqlPersistence,
  async e=>{events.push(e);recorded=true;},scan);
 assert.equal(await worker.runOnce(),1);
 assert.equal(await worker.runOnce(),0);
 assert.equal(events.length,1);
 assert.equal(events[0].tenantId,tenant);
 assert.equal(events[0].direction,'Inbound');
 assert.equal(events[0].communication?.channel,'Email');
 assert.equal(events[0].communication?.body,message.body);
 assert.equal(events[0].communication?.subject,message.subject);
 assert.equal(events[0].communication?.externalMessageId,
  incomingMailIdentity(email,message.messageId,'maildir:'+message.fingerprint));
 assert.ok(calls.every(c=>!JSON.stringify(c).includes(message.body)));
});

test('mail scanner does not advance cursor if Communication persistence fails',async()=>{
 const calls:string[]=[];
 const db={query:async(sql:string)=>{
  calls.push(sql);
  if(sql.includes('FROM md_mail_accounts a'))return {rows:[{
   tenant_id:tenant,email,next_offset:5
  }]};
  return {rows:[]};
 }};
 const sync=new MailInboxCommunicationSync(db as unknown as SqlPersistence,
  async()=>{throw Error('SQL writer not ready');},
  async(_address,offset)=>{
   assert.equal(offset,5);
   return {messages:[message],nextOffset:10,total:20};
  });
 assert.equal(await sync.runOnce(),0);
 assert.equal(calls.some(c=>c.includes('INSERT INTO md_mail_inbox_scan_offsets')),false);
});

test('no installed mailboxes causes no privileged Docker scans',async()=>{
 let scanned=0;
 const sync=new MailInboxCommunicationSync(
  {query:async()=>({rows:[]})} as unknown as SqlPersistence,
  async()=>{},async()=>{scanned++;return {messages:[],nextOffset:0,total:0};});
 assert.equal(await sync.runOnce(),0);
 assert.equal(scanned,0);
});

test('mailbox and Message-ID identities are tenant-bound and stable',()=>{
 assert.equal(incomingMailIdentity(email,message.messageId,'INBOX:9:1'),
  incomingMailIdentity(email,message.messageId,'maildir:abc'));
 assert.notEqual(incomingMailIdentity(email,message.messageId,'x'),
  incomingMailIdentity('other@unesolutions.co.uk',message.messageId,'x'));
});
