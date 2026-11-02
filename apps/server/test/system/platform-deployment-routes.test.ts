import test from 'node:test';
import assert from 'node:assert/strict';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import type {RbacEngine} from '../../src/system-files/rbac-engine.js';
import {
 DeploymentControlError,readProductionDeployment,requestProductionDeployment,
 registerPlatformDeploymentRoutes
} from '../../src/system-support/platform-deployment-routes.js';

const latest='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const stale='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const originalToken=process.env.METADRIVE_GITHUB_DEPLOY_TOKEN;
const originalRelease=process.env.METADRIVE_RELEASE_SHA;
const originalFetch=globalThis.fetch;
function json(value:unknown){return new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});}
function fakeGithub(active=false){
 const requests:Array<{url:string;method:string}>=[];
 globalThis.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input),method=init?.method??'GET';
  requests.push({url,method});
  assert.match(url,/^https:\/\/api\.github\.com\/repos\/unedev00\/uneengine\//);
  if(process.env.METADRIVE_GITHUB_DEPLOY_TOKEN)
   assert.match(String((init?.headers as Record<string,string>)?.Authorization),/^Bearer /);
  else assert.equal((init?.headers as Record<string,string>)?.Authorization,undefined);
  if(url.endsWith('/commits/main'))return json({sha:latest});
  if(url.includes('/runs?branch=main'))return json({workflow_runs:[{
   id:42,head_sha:stale,status:active?'in_progress':'completed',
   conclusion:active?null:'success',created_at:'2026-11-02T13:25:00Z',event:'push'
  }]});
  if(url.endsWith('/dispatches')){assert.equal(method,'POST');assert.equal(init?.body,JSON.stringify({ref:'main'}));return new Response(null,{status:204});}
  throw Error('Unexpected request '+url);
 };
 return requests;
}
function fakeDatabase(recent=false){
 const actions:string[]=[];
 const query=async(sql:string,params?:unknown[])=>{
  if(sql.includes('md_security_events'))actions.push(String(params?.[2]??'query'));
  if(sql.includes('AS exists'))return {rows:[{exists:recent}]};
  if(sql.includes('AS authorised'))return {rows:[{authorised:true}]};
  return {rows:[]};
 };
 const client={query};
 const db={query,transaction:async<T>(fn:(value:typeof client)=>Promise<T>)=>fn(client)} as unknown as SqlPersistence;
 return {db,actions};
}
test('deploy control shows disabled status when secret is absent',async()=>{
 delete process.env.METADRIVE_GITHUB_DEPLOY_TOKEN;
 const calls=fakeGithub();
 try{
  const status=await readProductionDeployment();
  assert.equal(status.configured,false);
  assert.equal(status.latestCommit,latest);
  assert.equal(status.run?.id,42);
  assert.equal(calls.filter(c=>c.method==='POST').length,0);
 }finally{
  globalThis.fetch=originalFetch;
  if(originalToken===undefined)delete process.env.METADRIVE_GITHUB_DEPLOY_TOKEN;
  else process.env.METADRIVE_GITHUB_DEPLOY_TOKEN=originalToken;
 }
});
test('deploy button dispatches only the expected validated main revision and audits',async()=>{
 process.env.METADRIVE_GITHUB_DEPLOY_TOKEN='test-only-token';
 process.env.METADRIVE_RELEASE_SHA=stale;
 const requests=fakeGithub();
 const {db,actions}=fakeDatabase();
 try {
  const state=await readProductionDeployment();
  assert.equal(state.latestCommit,latest);
  assert.equal(state.deployedCommit,stale);
  assert.equal(state.active,false);
  assert.equal(state.run?.url,'https://github.com/unedev00/uneengine/actions/runs/42');
  const result=await requestProductionDeployment(db,'tenant','actor',latest);
  assert.deepEqual(result,{accepted:true,targetCommit:latest});
  assert.equal(requests.filter(x=>x.method==='POST').length,1);
  assert.ok(actions.includes('platform.production-deploy.requested'));
  assert.ok(actions.includes('platform.production-deploy.accepted'));
 } finally {
  globalThis.fetch=originalFetch;
  if(originalToken===undefined)delete process.env.METADRIVE_GITHUB_DEPLOY_TOKEN;
  else process.env.METADRIVE_GITHUB_DEPLOY_TOKEN=originalToken;
  if(originalRelease===undefined)delete process.env.METADRIVE_RELEASE_SHA;
  else process.env.METADRIVE_RELEASE_SHA=originalRelease;
 }
});
test('running deployments and outdated confirmations cannot dispatch',async()=>{
 process.env.METADRIVE_GITHUB_DEPLOY_TOKEN='test-only-token';
 const requests=fakeGithub(true);
 const {db}=fakeDatabase();
 try {
  await assert.rejects(requestProductionDeployment(db,'tenant','actor',latest),
   (error:unknown)=>error instanceof DeploymentControlError&&error.statusCode===409);
  await assert.rejects(requestProductionDeployment(db,'tenant','actor',stale),
   (error:unknown)=>error instanceof DeploymentControlError&&error.statusCode===409);
  assert.equal(requests.filter(x=>x.method==='POST').length,0);
 }finally {
  globalThis.fetch=originalFetch;
  if(originalToken===undefined)delete process.env.METADRIVE_GITHUB_DEPLOY_TOKEN;
  else process.env.METADRIVE_GITHUB_DEPLOY_TOKEN=originalToken;
 }
});
test('recent accepted dispatch prevents duplicate submits',async()=>{
 process.env.METADRIVE_GITHUB_DEPLOY_TOKEN='test-only-token';
 const requests=fakeGithub();
 const {db}=fakeDatabase(true);
 try{
  await assert.rejects(requestProductionDeployment(db,'tenant','actor',latest),
   (error:unknown)=>error instanceof DeploymentControlError&&error.statusCode===409);
  assert.equal(requests.length,0);
 }finally {
  globalThis.fetch=originalFetch;
  if(originalToken===undefined)delete process.env.METADRIVE_GITHUB_DEPLOY_TOKEN;
  else process.env.METADRIVE_GITHUB_DEPLOY_TOKEN=originalToken;
 }
});
test('read-only status is visible but dispatch is denied without PlatformDeveloper',async()=>{
 process.env.METADRIVE_GITHUB_DEPLOY_TOKEN='test-only-token';
 const calls=fakeGithub();
 const handlers:Record<string,(req:any,res:any,next:(e?:unknown)=>void)=>Promise<void>>={};
 const app={get:(path:string,fn:any)=>{handlers['GET '+path]=fn;},
  post:(path:string,fn:any)=>{handlers['POST '+path]=fn;}} as any;
 const db={query:async()=>({rows:[{authorised:false}]})} as unknown as SqlPersistence;
 const rbac={allowed:async()=>true} as unknown as RbacEngine;
 registerPlatformDeploymentRoutes(app,db,rbac);
 try{
  for(const method of ['GET','POST']){
   const result:{status?:number;body?:any}={};
   const res={
    status(code:number){result.status=code;return this;},
    json(body:unknown){result.body=body;return this;},
    set(){return this;}
   };
   let nextCalled=false;
   await handlers[method+' /api/platform/production-deployment'](
    {actor:{tenant_id:'tenant',user_id:'user'},body:{expectedCommit:latest}},res,()=>{nextCalled=true;});
   assert.equal(nextCalled,false);
   if(method==='GET'){
    assert.equal(result.status,undefined);
    assert.equal(result.body.latestCommit,latest);
    assert.equal(result.body.canDeploy,false);
   }else assert.equal(result.status,403);
  }
  assert.equal(calls.filter(c=>c.method==='POST').length,0);
 }finally{
  globalThis.fetch=originalFetch;
  if(originalToken===undefined)delete process.env.METADRIVE_GITHUB_DEPLOY_TOKEN;
  else process.env.METADRIVE_GITHUB_DEPLOY_TOKEN=originalToken;
 }
});
test('only platform developers with manage grant can dispatch',async()=>{
 process.env.METADRIVE_GITHUB_DEPLOY_TOKEN='test-only-token';
 const calls=fakeGithub();
 const handlers:Record<string,(req:any,res:any,next:(e?:unknown)=>void)=>Promise<void>>={};
 const app={get:(path:string,fn:any)=>{handlers['GET '+path]=fn;},
  post:(path:string,fn:any)=>{handlers['POST '+path]=fn;}} as any;
 const {db}=fakeDatabase();
 const rbac={allowed:async()=>false} as unknown as RbacEngine;
 registerPlatformDeploymentRoutes(app,db,rbac);
 const response:{status?:number;body?:any}={};
 await handlers['POST /api/platform/production-deployment'](
  {actor:{tenant_id:'tenant',user_id:'user'},body:{expectedCommit:latest}},
  {status(code:number){response.status=code;return this;},json(body:unknown){response.body=body;return this;},
   set(){return this;}},(error?:unknown)=>{throw error;});
 assert.equal(response.status,403);
 assert.equal(calls.filter(c=>c.method==='POST').length,0);
 globalThis.fetch=originalFetch;
 if(originalToken===undefined)delete process.env.METADRIVE_GITHUB_DEPLOY_TOKEN;
 else process.env.METADRIVE_GITHUB_DEPLOY_TOKEN=originalToken;
});
