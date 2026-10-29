import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type {Server} from 'node:http';
import {createHash} from 'node:crypto';
import {MailAdminAccess} from '../../src/system-support/mail-admin-access.js';
import {registerDockerMailWebRoutes} from '../../src/system-support/docker-mail-web-routes.js';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import type {RbacEngine} from '../../src/system-files/rbac-engine.js';

const tenantA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const tenantB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const user='11111111-1111-4111-8111-111111111111';
const mailbox='owner@tenant-a.example';
const sha=(token:string)=>createHash('sha256').update(token).digest('hex');

test('Admin opens a tenant-owned mailbox once, in a revocable read-only session',async()=>{
 const oldUser=process.env.METADRIVE_MAIL_ADMIN_MASTER_USERNAME;
 const oldPassword=process.env.METADRIVE_MAIL_ADMIN_MASTER_PASSWORD;
 process.env.METADRIVE_MAIL_ADMIN_MASTER_USERNAME='admin-access';
 process.env.METADRIVE_MAIL_ADMIN_MASTER_PASSWORD='very-long-test-master-password-123456';
 type RecordState={token_hash:string;kind:'ticket'|'session';tenant_id:string;actor_user_id:string;mailbox_email:string};
 let state:RecordState|undefined, permissionGranted=true,accountEnabled=true;
 const events:string[]=[];
 const db={query:async(sql:string,params:unknown[]=[])=>{
  if(sql.startsWith('SELECT email FROM md_mail_accounts'))
   return {rows:params[0]===tenantA&&params[1]===mailbox?[{email:mailbox}]:[]};
  if(sql.startsWith('INSERT INTO md_mail_admin_sessions')){
   assert.equal(state,undefined);
   state={token_hash:String(params[0]),tenant_id:String(params[1]),actor_user_id:String(params[2]),mailbox_email:String(params[3]),kind:'ticket'};
   return {rows:[]};
  }
  if(sql.startsWith('UPDATE md_mail_admin_sessions')){
   if(!state||state.kind!=='ticket'||state.token_hash!==params[0])return {rows:[]};
   state.token_hash=String(params[1]);state.kind='session';
   return {rows:[{tenant_id:tenantA,user_id:user,mailbox_email:mailbox}]};
  }
  if(sql.startsWith('SELECT s.tenant_id')){
   return {rows:state?.kind==='session'&&state.token_hash===params[0]&&accountEnabled?
    [{tenant_id:tenantA,user_id:user,mailbox_email:mailbox}]:[]};
  }
  if(sql.startsWith('DELETE FROM md_mail_admin_sessions')){
   if(state?.token_hash!==params[0])return {rows:[]};
   state=undefined;
   return {rows:[{tenant_id:tenantA,user_id:user,mailbox_email:mailbox}]};
  }
  if(sql.startsWith('INSERT INTO md_security_events')){events.push(String(params[2]));return {rows:[]};}
  throw Error('Unexpected SQL: '+sql);
 }} as unknown as SqlPersistence;
 const rbac={require:async(_tenant:string,_user:string,_resource:string,access:string)=>{
  assert.equal(_resource,'Mailbox');assert.equal(access,'manage');
  if(!permissionGranted)throw Error('Permission denied');
 }} as unknown as RbacEngine;
 const access=new MailAdminAccess(db,rbac);
 let server:Server|undefined;
 try{
  await assert.rejects(access.createTicket({tenant_id:tenantB,user_id:user},mailbox),/Mailbox not found/);
  permissionGranted=false;
  await assert.rejects(access.createTicket({tenant_id:tenantA,user_id:user},mailbox),/Permission denied/);
  permissionGranted=true;
  const {ticket}=await access.createTicket({tenant_id:tenantA,user_id:user},mailbox);
  assert.equal(ticket.length,43);
  assert.equal(state?.token_hash,sha(ticket),'only hashed ticket is stored');
  assert.notEqual(state?.token_hash,ticket);
  assert.equal(await access.redeem('invalid'),null);
  const result=await access.redeem(ticket);
  assert.ok(result);assert.equal(result?.email,mailbox);
  assert.equal(await access.redeem(ticket),null,'ticket cannot be replayed');
  assert.equal(state?.token_hash,sha(result!.token));
  assert.deepEqual(await access.authorize(result!.token,'folders'),
   {username:mailbox+'*admin-access',password:'very-long-test-master-password-123456',email:mailbox});
  await assert.rejects(access.authorize(result!.token,'send'),/read-only/);
  accountEnabled=false;
  await assert.rejects(access.authorize(result!.token,'message'),/Invalid admin session/);
  accountEnabled=true;permissionGranted=false;
  await assert.rejects(access.authorize(result!.token,'message'),/Permission denied/);
  permissionGranted=true;

  let called=0;
  const app=express();
  registerDockerMailWebRoutes(app,undefined,undefined,async(input)=>{
   called++;
   assert.equal(input.username,mailbox+'*admin-access');
   assert.equal(input.action,'folders');
   return {ok:true,result:{folders:[]}};
  },()=>access);
  server=await new Promise<Server>(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const addr=server.address();assert.ok(addr&&typeof addr!=='string');
  const url='http://127.0.0.1:'+addr.port+'/api/mail-client/';
  const request=(action:string)=>fetch(url,{method:'POST',headers:{Authorization:'Bearer '+result!.token,'Content-Type':'application/json'},
   body:JSON.stringify({action})});
  assert.equal((await request('folders')).status,200);
  assert.equal(called,1);
  assert.equal((await request('send')).status,403);
  assert.equal((await request('mark_read')).status,403);
  assert.equal(called,1,'admin write requests never reach IMAP/SMTP worker');
  const revoke=await fetch(url+'admin/revoke',{method:'POST',
   headers:{Authorization:'Bearer '+result!.token,'Content-Type':'application/json'},body:'{}'});
  assert.equal(revoke.status,204);
  assert.equal((await request('folders')).status,401);
  assert.ok(events.includes('mailbox_admin_ticket_created'));
  assert.ok(events.includes('mailbox_admin_session_started'));
  assert.ok(events.includes('mailbox_admin_read'));
  assert.ok(events.includes('mailbox_admin_session_ended'));
 }finally{
  if(server)await new Promise<void>(done=>server!.close(()=>done()));
  if(oldUser===undefined)delete process.env.METADRIVE_MAIL_ADMIN_MASTER_USERNAME;
  else process.env.METADRIVE_MAIL_ADMIN_MASTER_USERNAME=oldUser;
  if(oldPassword===undefined)delete process.env.METADRIVE_MAIL_ADMIN_MASTER_PASSWORD;
  else process.env.METADRIVE_MAIL_ADMIN_MASTER_PASSWORD=oldPassword;
 }
});
