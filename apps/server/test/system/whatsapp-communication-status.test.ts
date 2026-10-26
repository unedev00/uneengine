import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {test} from 'node:test';
import express from 'express';
import {registerInboundWebhookPublicRoutes} from '../../src/system-support/inbound-webhook-service.js';

test('Meta status receipts keep the real WhatsApp recipient and IDs, with no message body',async()=>{
 const tenant='22222222-2222-4222-8222-222222222222';
 const endpoint='11111111-1111-4111-8111-111111111111';
 const appKey='test-webhook-key';
 let completed=false;
 let projectionStatus='Sent';
 const sqlCalls:string[]=[];
 const received:Array<Record<string,unknown>>=[];
 const query=async(sql:string)=>{
  sqlCalls.push(sql);
  if(sql.includes('SELECT r.id,COALESCE(st.value_text'))return {rows:[{id:'55555555-5555-4555-8555-555555555555',status:projectionStatus}]};
  if(sql.includes("field_api='Status'" )&&sql.includes('UPDATE md_record_values'))projectionStatus='Delivered';
  if(sql.includes('FROM md_inbound_webhook_endpoints w'))return {rows:[{
   tenant_id:tenant,id:endpoint,api_name:'Credential_WhatsApp',
   flow_api:null,execution_user_id:null,created_by:'33333333-3333-4333-8333-333333333333',
   credential_name:'WhatsApp',provider:'HmacSha256',enabled:true,
   verify_token_digest:createHash('sha256').update('test-token').digest(),
   signature_secret_ciphertext:Buffer.from('test'),encryption_key_id:'active'
  }]};
  if(sql.includes('INSERT INTO md_inbound_webhook_events'))return {rows:[{
   id:'44444444-4444-4444-8444-444444444444',status:completed?'completed':'received'
  }]};
  if(sql.includes("SET status='completed'"))completed=true;
  return {rows:[],rowCount:0};
 };
 const db={query,transaction:async(fn:(client:{query:typeof query})=>Promise<void>)=>fn({query})};
 const app=express();
 app.use(express.json({verify:(req,_res,raw)=>{
  (req as typeof req&{rawWebhookBody?:Buffer}).rawWebhookBody=Buffer.from(raw);
 }}));
 registerInboundWebhookPublicRoutes(app,db as never,
  {decryptOpaque:()=>appKey} as never,{execute:async()=>{throw Error('Unexpected Flow');}} as never,
  {allowed:async()=>true} as never,undefined,async input=>{received.push(input as unknown as Record<string,unknown>);});
 const server=app.listen(0);
 try{
  const address=server.address();
  if(!address||typeof address==='string')throw Error('No port');
  const url='http://127.0.0.1:'+address.port+'/api/inbound-webhooks/'+endpoint;
  const payload={object:'whatsapp_business_account',entry:[{id:'waba-provider-1',
   changes:[{value:{metadata:{
    display_phone_number:'447700900111',phone_number_id:'phone-provider-1'
   },statuses:[{id:'wamid.sent-1',recipient_id:'447700900321',
    status:'delivered',timestamp:'1792690000'}]}}]
  }]};
  const raw=JSON.stringify(payload);
  const signature='sha256='+createHmac('sha256',appKey).update(raw).digest('hex');
  for(let i=0;i<2;i++){
   const response=await fetch(url,{method:'POST',headers:{
    'content-type':'application/json','x-hub-signature-256':signature
   },body:raw});
   assert.equal(response.status,200);
  }
  assert.equal(received.length,0,'Delivery receipts must not create Communication messages');
  assert.equal(projectionStatus,'Delivered','Original outbound message should be updated');
  assert.ok(sqlCalls.some(sql=>sql.includes("field_api='Status'")&&sql.includes('UPDATE md_record_values')));
  assert.ok(sqlCalls.some(sql=>sql.includes('md_security_events')),
   'Status changes must remain auditable');
 }finally{
  await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
 }
});
