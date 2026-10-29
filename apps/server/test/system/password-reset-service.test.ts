import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import type {AuthenticationService} from '../../src/system-files/authentication.js';
import {PasswordResetService} from '../../src/system-support/password-reset-service.js';

process.env.METADRIVE_PASSWORD_RESET_OTP_SECRET='isolated-test-only-recovery-signing-key-at-least-32-bytes';
const acknowledgement={message:'If this account exists, recovery instructions have been sent.'};
type Challenge={id:string;user_id:string;otp_hash:string|null;otp_length:number;attempt_count:number;
 max_attempts:number;token_hash:string;verified_at:boolean;consumed_at:boolean};
function fixture(options:{digits?:4|6;phone?:string|null;sms?:boolean;failDelivery?:boolean}={}){
 const challenge:{value:Challenge|null}={value:null};
 const queries:string[]=[];
 const transports:Array<{channel:string;code:string;body:string;to?:string}>=[];
 const config={method:'OTP',otp_length:options.digits??6,otp_expiry_minutes:options.digits===4?5:10,
  max_otp_attempts:options.digits===4?3:5,email_subject:'OTP',
  email_template:'Code: {!Verification.Value}'};
 const fakeQuery=async(sql:string,args:unknown[]=[]):Promise<{rows:any[];rowCount:number}>=>{
  queries.push(sql);
  if(sql.includes('FROM md_password_recovery_flow'))return {rows:[config],rowCount:1};
  if(sql.includes('FROM md_password_recovery_channel_actions'))return {rows:options.sms?[{
   channel:'sms',enabled:true,flow_service_user_id:'service-uuid',
   credential_id:'credential-uuid',callout_path:'sms/send',callout_body:'{"text":"{!Recovery.Message}"}',
   message_template:'OTP {!Verification.Value}',credential_enabled:true,
   credential_protocol:'HTTPS',service_user_enabled:true
  }]:[],rowCount:0};
  if(sql.includes('LEFT JOIN md_user_recovery_phones'))return {rows:[{
   id:'user',name:'Tenant A',phone_e164:options.phone===undefined?'+447911123456':options.phone
  }],rowCount:1};
  if(sql.includes('count(*)'))return {rows:[{requests:'0'}],rowCount:1};
  if(sql.includes('INSERT INTO md_password_reset_challenges')){
   challenge.value={id:String(args[0]),user_id:String(args[2]),token_hash:String(args[3]),
    otp_hash:String(args[5]),otp_length:Number(args[6]),max_attempts:Number(args[7]),
    attempt_count:0,verified_at:false,consumed_at:false};
  }
  if(sql.includes('SELECT c.id,c.user_id,c.otp_hash,c.otp_length'))return {
   rows:challenge.value&&!challenge.value.consumed_at&&!challenge.value.verified_at
    ?[challenge.value]:[],rowCount:challenge.value?1:0
  };
  if(sql.includes('SET attempt_count=attempt_count+1')&&challenge.value)challenge.value.attempt_count++;
  if(sql.includes('SET token_hash=$3,verified_at=now(),otp_hash=NULL')&&challenge.value){
   challenge.value.token_hash=String(args[2]);challenge.value.verified_at=true;challenge.value.otp_hash=null;
  }
  if(sql.includes('SET consumed_at=now()')&&challenge.value)challenge.value.consumed_at=true;
  if(sql.includes('FROM md_password_reset_challenges c')&&sql.includes('password_hash'))
   return {rows:challenge.value&&!challenge.value.consumed_at&&challenge.value.verified_at
    ?[{id:challenge.value.id,user_id:'user',password_hash:'old-hash'}]:[],rowCount:1};
  return {rows:[],rowCount:1};
 };
 const db={query:fakeQuery,
  transaction:async(callback:(client:{query:typeof fakeQuery})=>Promise<unknown>)=>
   callback({query:fakeQuery})} as unknown as SqlPersistence;
 const auth={hashPassword:async()=> 'new-hash',verifyPassword:async()=>false} as unknown as AuthenticationService;
 const service=new PasswordResetService(db,auth,
  async(_tenant,_cred,from,to,_subject,body)=>{
   assert.equal(from,'');transports.push({channel:'email',code:body.split('Code: ')[1],body,to});
   if(options.failDelivery)throw Error('Delivery unavailable');
  },
  async(_tenant,_user,_config,vars)=>{
   transports.push({channel:'sms',code:String(vars['Recovery.Code']),body:String(vars['Recovery.Message'])});
   return {status:200,body:'{}'};
  });
 return {service,queries,transports,challenge};
}

test('numeric OTP is never stored or returned in plaintext',async()=>{
 const x=fixture();
 const result=await x.service.request('tenant-a','person@example.org');
 assert.deepEqual(result,acknowledgement);
 const code=x.transports[0]?.code;
 assert.match(code??'',/^\d{6}$/);
 assert.match(x.challenge.value?.otp_hash??'',/^[a-f0-9]{64}$/);
 assert.notEqual(x.challenge.value?.otp_hash,code);
 assert.ok(!JSON.stringify(result).includes(code??''));
 assert.ok(x.queries.some(sql=>sql.includes('pg_advisory_xact_lock')));
 assert.equal(x.transports[0].to,'person@example.org');
});

test('wrong OTP cannot mint a reset grant; exhaustion blocks the right OTP',async()=>{
 const x=fixture();
 await x.service.request('tenant-a','person@example.org');
 const right=x.transports[0].code,wrong=right==='000000'?'999999':'000000';
 for(let i=0;i<5;i++)await assert.rejects(
  ()=>x.service.verify('tenant-a','person@example.org',wrong),/Incorrect or expired/);
 await assert.rejects(()=>x.service.verify('tenant-a','person@example.org',right),
  /Incorrect or expired/);
 assert.equal(x.challenge.value?.attempt_count,5);
 assert.equal(x.challenge.value?.verified_at,false);
});

test('valid OTP is exchanged only once for a high-entropy reset grant',async()=>{
 const x=fixture();
 await x.service.request('tenant-a','person@example.org');
 const code=x.transports[0].code;
 const grant=await x.service.verify('tenant-a','person@example.org',code);
 assert.match(grant.resetToken,/^[A-Za-z0-9_-]{43}$/);
 assert.ok(!JSON.stringify(grant).includes(code));
 await assert.rejects(()=>x.service.verify('tenant-a','person@example.org',code),/Incorrect or expired/);
 await x.service.confirm('tenant-a','person@example.org',grant.resetToken,'new-strong-password');
 assert.ok(x.queries.filter(sql=>sql.includes('revoked_at=now()')).length===2);
 assert.ok(x.queries.some(sql=>sql.includes('INSERT INTO md_security_events')));
});

test('four digit setting uses short expiration and restricted attempts',async()=>{
 const x=fixture({digits:4});
 await x.service.request('tenant-a','person@example.org');
 assert.match(x.transports[0].code,/^\d{4}$/);
 assert.equal(x.challenge.value?.otp_length,4);
 assert.equal(x.challenge.value?.max_attempts,3);
});

test('SMS dispatch uses only verified stored phone and HTTP Callout, not user input',async()=>{
 const x=fixture({sms:true,phone:'+447911123456'});
 await x.service.request('tenant-a','person@example.org','sms');
 assert.equal(x.transports.length,1);
 assert.equal(x.transports[0].channel,'sms');
 assert.match(x.transports[0].code,/^\d{6}$/);
 const unverified=fixture({sms:true,phone:null});
 await unverified.service.request('tenant-a','person@example.org','sms');
 assert.equal(unverified.transports.length,0);
 assert.equal(unverified.challenge.value,null);
});

test('unsent OTP is consumed without leaking identity or code',async()=>{
 const x=fixture({failDelivery:true});
 const old=console.error;console.error=()=>{};
 try{assert.deepEqual(await x.service.request('tenant-a','person@example.org'),acknowledgement);}
 finally{console.error=old;}
 assert.equal(x.challenge.value?.consumed_at,true);
});
