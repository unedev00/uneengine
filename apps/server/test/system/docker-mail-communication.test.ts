import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type {Server} from 'node:http';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import type {IntegrationActivityInput} from '../../src/system-support/integration-api-log.js';
import {registerDockerMailWebRoutes} from '../../src/system-support/docker-mail-web-routes.js';
import {recordMailboxCommunication} from '../../src/system-support/mail-communication-recording.js';

const tenantA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const tenantB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const inbox={ok:true,result:{uidValidity:'9910',messages:[
 {id:'9',from:'visitor@example.net',to:'support@unesolutions.co.uk',subject:'Quote',messageId:'<abc@example.net>'},
 {id:'10',from:'other@example.net',to:'support@unesolutions.co.uk',subject:'Re: Quote'}
]}};

function mockDb() {
 const queries:string[]=[];
 const db={query:async<T=unknown>(sql:string,params:unknown[]=[])=>{
  queries.push(sql);
  if(sql.includes('FROM md_mail_domains'))return {rows:[] as T[]};
  if(sql.includes('INSERT INTO md_mail_accounts'))return {rows:[] as T[]};
  assert.match(sql,/FROM md_mail_accounts/);
  assert.match(sql,/status='active'/);
  const account=String(params[0]);
  return {rows:(account==='support@unesolutions.co.uk'?[{tenant_id:tenantA}]:
   account==='hello@second.example'?[{tenant_id:tenantB}]:[]) as T[]};
 }} as unknown as SqlPersistence;
 return {db,queries};
}

test('authenticated outbound SMTP send is tenant-owned and records message content, never secrets',async()=>{
 const {db}=mockDb(),events:IntegrationActivityInput[]=[];
 const writer=async (event:IntegrationActivityInput)=>{events.push(event);};
 const app=express();
 registerDockerMailWebRoutes(app,db,writer,async()=>({
  ok:true,result:{ok:true,messageId:'<sent-123@unesolutions.co.uk>'}
 }));
 const server=await new Promise<Server>(resolve=>{
  const value=app.listen(0,'127.0.0.1',()=>resolve(value));
 });
 try{
  const address=server.address();assert.ok(address&&typeof address!=='string');
  const basic=Buffer.from('support@unesolutions.co.uk:sensitive-password').toString('base64');
  const response=await fetch('http://127.0.0.1:'+address.port+'/api/mail-client',{
   method:'POST',headers:{Authorization:'Basic '+basic,'Content-Type':'application/json'},
   body:JSON.stringify({action:'send',to:'friend@example.net',subject:'Test subject',body:'Test text'})
  });
  assert.equal(response.status,200);
  assert.equal(events.length,1);
  assert.equal(events[0].tenantId,tenantA);
  assert.equal(events[0].outcome,'success');
  assert.equal(events[0].communication?.channel,'Email');
  assert.equal(events[0].communication?.subject,'Test subject');
  assert.equal(events[0].communication?.recipient,'friend@example.net');
  assert.equal(events[0].communication?.body,'Test text');
  assert.equal(JSON.stringify(events).includes('sensitive-password'),false);
 }finally{await new Promise<void>(done=>server.close(()=>done()));}
});

test('authenticated IMAP message with full body records tenant-owned incoming Email once',async()=>{
 const {db}=mockDb(),events:IntegrationActivityInput[]=[];
 const writer=async (input:IntegrationActivityInput)=>{events.push(input);};
 // Listing headers must not create an incomplete, permanent duplicate.
 await recordMailboxCommunication(db,writer,'support@unesolutions.co.uk',
  'messages',{folder:'INBOX'},inbox);
 assert.equal(events.length,0);
 const full={ok:true,result:{uidValidity:'9910',id:'9',
  messageId:'<abc@example.net>',from:'visitor@example.net',
  to:'support@unesolutions.co.uk',subject:'Quote',body:'Please send a quote'}};
 await recordMailboxCommunication(db,writer,'support@unesolutions.co.uk',
  'message',{folder:'INBOX',uid:'9'},full);
 await recordMailboxCommunication(db,writer,'support@unesolutions.co.uk',
  'message',{folder:'INBOX',uid:'9'},full);
 assert.equal(events.length,2,'Shared SQL writer performs idempotent delivery');
 assert.equal(events[0].direction,'Inbound');
 assert.equal(events[0].tenantId,tenantA);
 assert.equal(events[0].communication?.channel,'Email');
 assert.equal(events[0].communication?.subject,'Quote');
 assert.equal(events[0].communication?.body,'Please send a quote');
 assert.equal(events[0].communication?.externalMessageId,events[1].communication?.externalMessageId);
 await recordMailboxCommunication(db,writer,'hello@second.example',
  'message',{folder:'INBOX',uid:'9'},full);
 assert.equal(events[2].tenantId,tenantB);
 assert.notEqual(events[0].communication?.externalMessageId,
  events[2].communication?.externalMessageId);
});

test('mailboxes not provisioned in MetaDrive cannot write to any Communication tenant',async()=>{
 const {db}=mockDb(),events:IntegrationActivityInput[]=[];
 const writer=async (input:IntegrationActivityInput)=>{events.push(input);};
 await recordMailboxCommunication(db,writer,'unregistered@example.org','messages',{folder:'INBOX'},inbox);
 await recordMailboxCommunication(db,writer,'support@unesolutions.co.uk','messages',{folder:'Sent'},inbox);
 await recordMailboxCommunication(db,writer,'support@unesolutions.co.uk','messages',{folder:'INBOX'},
  {ok:true,result:{messages:[{id:'9',from:'somebody@example.net'}]}});
 await recordMailboxCommunication(db,writer,'support@unesolutions.co.uk','send',{to:'x@y.org'},
  {ok:false,error:'Invalid credentials'});
 assert.equal(events.length,0);
});

test('verified tenant domain can claim an authenticated existing mailbox only',async()=>{
 const statements:string[]=[];
 const db={query:async(sql:string,values:unknown[]=[])=>{
  statements.push(sql);
  if(sql.includes('FROM md_mail_domains'))return {rows:[{tenant_id:tenantA}]};
  if(sql.includes('FROM md_mail_accounts'))
   return {rows:statements.some(q=>q.includes('INSERT INTO md_mail_accounts'))
    ?[{tenant_id:tenantA}]:[]};
  if(sql.includes('INSERT INTO md_mail_accounts')){
   assert.equal(values[0],'legacy@unesolutions.co.uk');
   assert.equal(values[1],tenantA);
   return {rows:[]};
  }
  throw Error('unexpected query');
 }};
 await recordMailboxCommunication(db as never,async()=>{},'legacy@unesolutions.co.uk',
  'login',{}, {ok:true,result:{email:'legacy@unesolutions.co.uk'}});
 assert.ok(statements.some(q=>q.includes('INSERT INTO md_mail_accounts')));
});

test('only SMTP failures after IMAP authentication are recorded as failed emails',async()=>{
 const {db}=mockDb(),events:IntegrationActivityInput[]=[];
 const writer=async (input:IntegrationActivityInput)=>{events.push(input);};
 await recordMailboxCommunication(db,writer,'support@unesolutions.co.uk','send',{
  to:'person@example.net',subject:'Failed',body:'Test'
 },{ok:false,mailAuthenticated:true,error:'Mail delivery failed'});
 assert.equal(events.length,1);
 assert.equal(events[0].outcome,'network_error');
 assert.equal(events[0].errorCode,'SMTP_DELIVERY_FAILED');
 assert.equal(events[0].communication?.channel,'Email');
 assert.equal(events[0].communication?.sentAt,undefined);
});
