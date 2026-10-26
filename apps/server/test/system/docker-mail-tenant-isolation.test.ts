import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type {Server} from 'node:http';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import type {RbacEngine} from '../../src/system-files/rbac-engine.js';
import {registerDockerMailAdminRoutes} from '../../src/system-support/docker-mail-admin-routes.js';

const tenantA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const tenantB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const domainA={id:'11111111-1111-4111-8111-111111111111',name:'tenant-a.example',isEnabled:true};
const domainB={id:'22222222-2222-4222-8222-222222222222',name:'tenant-b.example',isEnabled:true};
const accountA={email:'alice@tenant-a.example',domain:'tenant-a.example',description:'A',created_at:new Date(),domain_id:domainA.id};
const accountB={email:'bob@tenant-b.example',domain:'tenant-b.example',description:'B',created_at:new Date(),domain_id:domainB.id};

test('Docker MailAdmin requires tenant-scoped domain, mailbox and creation access',async()=>{
 const db={query:async(sql:string,params:unknown[]=[])=>{
  const tenant=params[0],id=params[1];
  if(sql.includes('SELECT id,domain AS name,verified_at'))
   return {rows:tenant===tenantA?[domainA]:tenant===tenantB?[domainB]:[]};
  if(sql.includes('FROM md_mail_accounts a JOIN md_mail_domains'))
   return {rows:tenant===tenantA?[accountA]:tenant===tenantB?[accountB]:[]};
  if(sql.includes('SELECT id,domain FROM md_mail_domains WHERE'))
   return {rows:tenant===tenantA&&id===domainA.id?[{id:domainA.id,domain:'tenant-a.example'}]:
    tenant===tenantB&&id===domainB.id?[{id:domainB.id,domain:'tenant-b.example'}]:[]};
  throw new Error('Unexpected query: '+sql);
 }} as unknown as SqlPersistence;
 const rbac={require:async(_tenant:string,_user:string,resource:string,access:string)=>{
  assert.equal(resource,'Mailbox');assert.ok(['read','manage'].includes(access));
 }} as unknown as RbacEngine;
 const app=express();app.use(express.json());
 app.use((req,_res,next)=>{
  (req as typeof req&{actor?:{tenant_id:string;user_id:string}}).actor={
   tenant_id:req.get('x-test-tenant')===tenantB?tenantB:tenantA,user_id:'user'};
  next();
 });
 registerDockerMailAdminRoutes(app,db,rbac);
 const server=await new Promise<Server>(resolve=>{const value=app.listen(0,'127.0.0.1',()=>resolve(value));});
 const address=server.address();assert.ok(address&&typeof address!=='string');
 const root='http://127.0.0.1:'+address.port;
 try{
  for(const [tenant,expectedDomain,expectedAccount,otherAccount] of [
   [tenantA,'tenant-a.example','alice@tenant-a.example','bob@tenant-b.example'],
   [tenantB,'tenant-b.example','bob@tenant-b.example','alice@tenant-a.example']
  ]){
   const headers={'x-test-tenant':tenant};
   const d=await fetch(root+'/api/mail/domains',{headers});
   assert.equal(d.status,200);
   const domains=await d.text();assert.ok(domains.includes(expectedDomain));assert.ok(!domains.includes(tenant===tenantA?'tenant-b.example':'tenant-a.example'));
   const a=await fetch(root+'/api/mail/mailboxes',{headers});
   assert.equal(a.status,200);
   const accounts=await a.text();assert.ok(accounts.includes(expectedAccount));assert.ok(!accounts.includes(otherAccount));
  }
  const denial=await fetch(root+'/api/mail/mailboxes',{method:'POST',headers:{
   'x-test-tenant':tenantB,'content-type':'application/json'
  },body:JSON.stringify({name:'intruder',domainId:domainA.id,password:'a-long-test-password'})});
  assert.equal(denial.status,400,'A tenant must not provision a mailbox in another tenant domain');
  const crossTenantApproval=await fetch(root+'/api/mail/domains/'+domainA.id+'/approve-sender',{
   method:'POST',headers:{'x-test-tenant':tenantB,'content-type':'application/json'},
   body:JSON.stringify({email:accountA.email})
  });
  assert.equal(crossTenantApproval.status,400,'Tenant B cannot approve senders using tenant A domain');
  const spoofedSender=await fetch(root+'/api/mail/domains/'+domainB.id+'/approve-sender',{
   method:'POST',headers:{'x-test-tenant':tenantB,'content-type':'application/json'},
   body:JSON.stringify({email:'attacker@tenant-a.example'})
  });
  assert.equal(spoofedSender.status,400,'Tenant B cannot approve a sender outside its verified domain');
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
