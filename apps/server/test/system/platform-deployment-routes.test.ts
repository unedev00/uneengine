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
const initial={
 socket:process.env.METADRIVE_MCP_BROKER_SOCKET,
 operations:process.env.METADRIVE_MCP_OPERATIONS,
 release:process.env.METADRIVE_RELEASE_SHA,
 fetch:globalThis.fetch
};
function enableOci(){
 process.env.METADRIVE_MCP_BROKER_SOCKET='/run/fixture-oci.sock';
 process.env.METADRIVE_MCP_OPERATIONS='enabled';
}
function disableOci(){
 delete process.env.METADRIVE_MCP_BROKER_SOCKET;
 delete process.env.METADRIVE_MCP_OPERATIONS;
}
function reset(){
 globalThis.fetch=initial.fetch;
 for(const [name,value] of [
  ['METADRIVE_MCP_BROKER_SOCKET',initial.socket],
  ['METADRIVE_MCP_OPERATIONS',initial.operations],
  ['METADRIVE_RELEASE_SHA',initial.release]
 ] as const){
  if(value===undefined)delete process.env[name];
  else process.env[name]=value;
 }
}
function json(value:unknown){return new Response(JSON.stringify(value),{status:200});}
function fakeGithub(active=false){
 const calls:string[]=[];
 globalThis.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);
  calls.push(url);
  assert.equal(init?.method,'GET');
  assert.equal((init?.headers as Record<string,string>)?.Authorization,undefined,
   'No GitHub deploy credential or authenticated GitHub API call');
  assert.match(url,/^https:\/\/api\.github\.com\/repos\/unedev00\/uneengine\//);
  if(url.endsWith('/commits/main'))return json({sha:latest});
  if(url.includes('/runs?branch=main'))return json({workflow_runs:[{
   id:42,head_sha:stale,status:active?'in_progress':'completed',
   conclusion:active?null:'success',created_at:'2026-11-02T13:25:00Z',event:'push'
  }]});
  throw Error('Unexpected GitHub request '+url);
 };
 return calls;
}
function fakeOci(state:'idle'|'running'|'succeeded'|'failed'='idle'){
 const calls:Array<{action:string;service:string;release?:string}>=[];
 const operate=async(input:{action:string;service:string;release?:string})=>{
  calls.push(input);
  if(input.action==='deploy_status')return {
   output:state==='idle'?'state=idle\n':
    'state='+state+'\nsha='+latest+'\nstage=building\nupdated_at=2026-11-02T14:00:00Z\n'
  };
  if(input.action==='deploy_latest')return {output:'QUEUED '+input.release+'\n'};
  throw Error('Unexpected OCI operation');
 };
 return {operate,calls};
}
function fakeDatabase(recent=false,authorised=true){
 const actions:string[]=[];
 const query=async(sql:string,params?:unknown[])=>{
  if(sql.includes('md_security_events'))actions.push(String(params?.[2]??'query'));
  if(sql.includes('AS exists'))return {rows:[{exists:recent}]};
  if(sql.includes('AS authorised'))return {rows:[{authorised}]};
  return {rows:[]};
 };
 const client={query};
 return {
  db:{query,transaction:async<T>(fn:(c:typeof client)=>Promise<T>)=>fn(client)} as unknown as SqlPersistence,
  actions
 };
}
test('OCI is optional for public status, but is required for dispatch',async()=>{
 disableOci();
 const calls=fakeGithub();
 try{
  const status=await readProductionDeployment();
  assert.equal(status.configured,false);
  assert.equal(status.latestCommit,latest);
  assert.equal(status.oci,null);
  assert.equal(calls.length,2);
  await assert.rejects(requestProductionDeployment(fakeDatabase().db,'tenant','user',latest),
   (e:unknown)=>e instanceof DeploymentControlError&&e.statusCode===503);
 }finally{reset();}
});
test('OCI deploy dispatch pins main and audits without GitHub write API',async()=>{
 enableOci();
 process.env.METADRIVE_RELEASE_SHA=stale;
 const calls=fakeGithub();
 const oci=fakeOci();
 const {db,actions}=fakeDatabase();
 try{
  const status=await readProductionDeployment(oci.operate);
  assert.equal(status.configured,true);
  assert.equal(status.oci?.state,'idle');
  assert.equal(status.deployedCommit,stale);
  assert.equal(status.run?.id,42);
  const accepted=await requestProductionDeployment(db,'tenant','user',latest,oci.operate);
  assert.deepEqual(accepted,{accepted:true,targetCommit:latest});
  assert.equal(oci.calls.filter(x=>x.action==='deploy_latest').length,1);
  assert.deepEqual(oci.calls.find(x=>x.action==='deploy_latest'),
   {action:'deploy_latest',service:'api',release:latest});
  assert.ok(actions.includes('platform.production-deploy.requested'));
  assert.ok(actions.includes('platform.production-deploy.accepted'));
  assert.ok(calls.every(url=>!url.includes('/dispatches')));
 }finally{reset();}
});
test('OCI running, concurrent workflow, stale commit and duplicates refuse dispatch',async()=>{
 enableOci();
 fakeGithub();
 const {db}=fakeDatabase();
 const running=fakeOci('running');
 try{
  await assert.rejects(requestProductionDeployment(db,'tenant','user',latest,running.operate),
   (e:unknown)=>e instanceof DeploymentControlError&&e.statusCode===409);
  await assert.rejects(requestProductionDeployment(db,'tenant','user',stale,running.operate),
   (e:unknown)=>e instanceof DeploymentControlError&&e.statusCode===409);
  assert.equal(running.calls.filter(x=>x.action==='deploy_latest').length,0);
  const oci=fakeOci();
  await assert.rejects(requestProductionDeployment(fakeDatabase(true).db,'tenant','user',latest,oci.operate),
   (e:unknown)=>e instanceof DeploymentControlError&&e.statusCode===409);
  assert.equal(oci.calls.length,0);
 }finally{reset();}
});
test('read-only status is visible without platform policy but dispatch is forbidden',async()=>{
 disableOci();
 const calls=fakeGithub();
 const handlers:Record<string,(req:any,res:any,next:(e?:unknown)=>void)=>Promise<void>>={};
 const app={
  get:(p:string,fn:any)=>{handlers['GET '+p]=fn;},
  post:(p:string,fn:any)=>{handlers['POST '+p]=fn;}
 } as any;
 const {db}=fakeDatabase(false,false);
 const rbac={allowed:async()=>true} as unknown as RbacEngine;
 registerPlatformDeploymentRoutes(app,db,rbac);
 try {
  for(const method of ['GET','POST']){
   const response:{status?:number;body?:any}={};
   const res={
    status(code:number){response.status=code;return this;},
    json(body:unknown){response.body=body;return this;},
    set(){return this;}
   };
   await handlers[method+' /api/platform/production-deployment'](
    {actor:{tenant_id:'tenant',user_id:'user'},body:{expectedCommit:latest}},res,
    (error?:unknown)=>{throw error;});
   if(method==='GET'){
    assert.equal(response.status,undefined);
    assert.equal(response.body.latestCommit,latest);
    assert.equal(response.body.canDeploy,false);
   }else assert.equal(response.status,403);
  }
  assert.ok(calls.every(url=>!url.includes('/dispatches')));
 }finally{reset();}
});
test('separate PlatformOperations permission is mandatory even with platform policy',async()=>{
 disableOci();
 const handlers:Record<string,any>={};
 const app={get:(p:string,f:any)=>{handlers['GET '+p]=f;},
  post:(p:string,f:any)=>{handlers['POST '+p]=f;}} as any;
 const {db}=fakeDatabase(false,true);
 const rbac={allowed:async()=>false} as unknown as RbacEngine;
 registerPlatformDeploymentRoutes(app,db,rbac);
 let status=0;
 await handlers['POST /api/platform/production-deployment'](
  {actor:{tenant_id:'tenant',user_id:'user'},body:{expectedCommit:latest}},
  {status(c:number){status=c;return this;},json(){return this;},set(){return this;}},
  (error?:unknown)=>{throw error;});
 assert.equal(status,403);
 reset();
});
