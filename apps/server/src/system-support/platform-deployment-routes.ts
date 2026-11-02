import type {Express,Request,Response,NextFunction} from 'express';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
import type {RbacEngine} from '../system-files/rbac-engine.js';
import {brokerOperation} from './mcp-tools.js';

/**
 * Platform-wide production deployment control. Never exposes GitHub credentials
 * to the browser and never executes shell commands from a web request.
 * The existing protected Oracle full-stack workflow owns build, tests, SQL
 * backup, deploy/rollback, concurrency and environment approvals.
 */
const repository='unedev00/uneengine';
const workflow='oracle-api-deploy.yml';
const shaPattern=/^[a-f0-9]{40}$/;
const activeStatuses=new Set(['queued','in_progress','waiting','pending','requested']);

type Run={id:number;head_sha:string;status:string;conclusion:string|null;created_at:string;event:string};
type OciRelease={state:'idle'|'running'|'succeeded'|'failed';sha:string|null;stage:string|null;updatedAt:string|null};
type DeploymentStatus={
 configured:boolean; latestCommit:string|null; deployedCommit:string|null;
 active:boolean; oci:OciRelease|null; run:null|{id:number;commit:string;status:string;conclusion:string|null;createdAt:string;url:string};
};
export class DeploymentControlError extends Error {
 constructor(message:string,readonly statusCode:number){super(message);}
}
const brokerConfigured=()=>process.env.METADRIVE_MCP_OPERATIONS==='enabled'
 && Boolean(process.env.METADRIVE_MCP_BROKER_SOCKET);
type OciOperation=typeof brokerOperation;
function parseOciStatus(text:string):OciRelease {
 const data=new Map(text.split('\n').map(line=>line.split('=',2) as [string,string]));
 const state=data.get('state');
 if(!state||!['idle','running','succeeded','failed'].includes(state))
  throw new DeploymentControlError('Invalid OCI deployment status.',502);
 const sha=data.get('sha')??null,updatedAt=data.get('updated_at')??null;
 if(sha&&!shaPattern.test(sha))throw new DeploymentControlError('Invalid OCI release identifier.',502);
 return {state:state as OciRelease['state'],sha,stage:data.get('stage')??null,
  updatedAt:updatedAt&&Number.isFinite(Date.parse(updatedAt))?updatedAt:null};
}
// GitHub serves public main branch metadata anonymously. OCI performs builds
// through its existing root-owned operations broker; no GitHub dispatch token.
const workflowUrl='https://github.com/'+repository+'/actions/workflows/'+workflow;
function productionCommit(){
 const value=process.env.METADRIVE_RELEASE_SHA??'';
 return shaPattern.test(value)?value:null;
}
function validRun(input:unknown):input is Run{
 if(!input||typeof input!=='object')return false;
 const r=input as Record<string,unknown>;
 return Number.isSafeInteger(r.id)&&Number(r.id)>0&&typeof r.head_sha==='string'
  &&shaPattern.test(r.head_sha)&&typeof r.status==='string'
  &&(r.conclusion===null||typeof r.conclusion==='string')
  &&typeof r.created_at==='string'&&typeof r.event==='string';
}
async function github(path:string):Promise<any>{
 // Fixed repository and allowlisted paths only. Never proxy arbitrary URLs.
 const response=await fetch('https://api.github.com/repos/'+repository+path,{
  method:'GET',
  headers:{'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
  signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw new DeploymentControlError(
  'Public release information is unavailable ('+response.status+').',502);
 return response.json();
}
export async function readProductionDeployment(operate:OciOperation=brokerOperation):Promise<DeploymentStatus>{
 const deployedCommit=productionCommit();
 let oci:OciRelease|null=null;
 if(brokerConfigured()) {
  try {oci=parseOciStatus((await operate({action:'deploy_status',service:'api'})).output);}
  catch { /* Do not claim OCI dispatch is ready if the installed helper is unavailable. */ }
 }
 const [commit,runs]=await Promise.all([
  github('/commits/main'),
  github('/actions/workflows/'+workflow+'/runs?branch=main&per_page=15')
 ]);
 const latestCommit=typeof commit?.sha==='string'&&shaPattern.test(commit.sha)?commit.sha:null;
 if(!latestCommit)throw new DeploymentControlError('GitHub returned an invalid main-branch revision.',502);
 const matches:Array<Run>=Array.isArray(runs?.workflow_runs)
  ?runs.workflow_runs.filter((r:unknown)=>validRun(r)&&(r as Run).event!=='pull_request'): [];
 const current=matches.find(run=>activeStatuses.has(run.status))??matches[0];
 return {configured:oci!==null,latestCommit,deployedCommit,oci,
  active:(!!current&&activeStatuses.has(current.status))||oci?.state==='running',
  run:current?{id:current.id,commit:current.head_sha,status:current.status,
   conclusion:current.conclusion,createdAt:current.created_at,
   url:'https://github.com/'+repository+'/actions/runs/'+current.id}:null};
}
async function audit(db:SqlPersistence,tenant:string,user:string,action:string,details:object){
 await db.query('INSERT INTO md_security_events(tenant_id,actor_user_id,action,details) VALUES($1,$2,$3,$4::jsonb)',
  [tenant,user,action,JSON.stringify(details)]);
}
export async function requestProductionDeployment(
 db:SqlPersistence,tenant:string,user:string,expectedCommit:unknown,
 operate:OciOperation=brokerOperation
):Promise<{accepted:true;targetCommit:string}>{
 if(typeof expectedCommit!=='string'||!shaPattern.test(expectedCommit))
  throw new DeploymentControlError('A valid expected main-branch commit is required.',400);
 if(!brokerConfigured())throw new DeploymentControlError('OCI operations broker is not configured.',503);
 await audit(db,tenant,user,'platform.production-deploy.requested',{commit:expectedCommit});
 try{
  await db.transaction(async client=>{
   // Cross-request serialization, including multiple API instances. Hold the lock
   // until GitHub accepts/rejects the dispatch and the acceptance audit commits.
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['metadrive:oracle-production:dispatch']);
   const {rows:recent}=await client.query<{exists:boolean}>(`
    SELECT EXISTS(SELECT 1 FROM md_security_events
     WHERE action='platform.production-deploy.accepted'
       AND created_at>now()-interval '45 seconds'
       AND details->>'commit'=$1) AS exists`,[expectedCommit]);
   if(recent[0]?.exists)throw new DeploymentControlError('A deployment was just requested. Check its status before retrying.',409);
   const status=await readProductionDeployment(operate);
   if(!status.configured)
    throw new DeploymentControlError('OCI deployment helper is unavailable.',503);
   if(status.latestCommit!==expectedCommit)
    throw new DeploymentControlError('Main has changed. Refresh the deployment status before confirming.',409);
   if(status.active)
    throw new DeploymentControlError('A production deployment is already queued or running.',409);
   const result=await operate({action:'deploy_latest',service:'api',release:expectedCommit});
   if(!result.output.includes('QUEUED '+expectedCommit))
    throw new DeploymentControlError('OCI broker did not confirm the deployment request.',502);
   await client.query('INSERT INTO md_security_events(tenant_id,actor_user_id,action,details) VALUES($1,$2,$3,$4::jsonb)',
    [tenant,user,'platform.production-deploy.accepted',JSON.stringify({commit:expectedCommit,engine:'oci'})]);
  });
 }catch(error){
  await audit(db,tenant,user,'platform.production-deploy.failed',{
   commit:expectedCommit,reason:error instanceof DeploymentControlError?error.message:'Deployment dispatch failed'
  });
  throw error;
 }
 return {accepted:true,targetCommit:expectedCommit};
}
function handleError(error:unknown,res:Response,next:NextFunction){
 if(error instanceof DeploymentControlError){res.status(error.statusCode).json({error:error.message});return;}
 next(error);
}
/**
 * Read-only status is available to authenticated workspace users. The repository
 * and release SHA are already public; no secret or privileged action is exposed.
 * Mutation requires PlatformDeveloper assignment AND explicit PlatformOperations
 * manage grant, without the unrelated Tenant OneEngine administration gate.
 */
export function registerPlatformDeploymentRoutes(
 app:Express,db:SqlPersistence,rbac:RbacEngine
){
 type Actor={tenant_id:string;user_id:string};
 function actorOf(req:Request):Actor {
  const actor=(req as Request & {actor?:Actor}).actor;
  if(!actor?.tenant_id||!actor.user_id)
   throw new DeploymentControlError('Authentication required.',401);
  return actor;
 }
 async function assignedPlatformDeveloper(actor:Actor):Promise<boolean>{
  const {rows}=await db.query<{authorised:boolean}>(`
   SELECT EXISTS(
    SELECT 1 FROM md_permission_assignments a JOIN md_permission_sets p
      ON p.tenant_id=a.tenant_id AND p.id=a.permission_set_id
      WHERE a.tenant_id=$1 AND a.user_id=$2 AND p.api_name='PlatformDeveloper'
    UNION ALL SELECT 1 FROM md_user_roles ur JOIN md_role_permission_sets rp
      ON rp.tenant_id=ur.tenant_id AND rp.role_id=ur.role_id
      JOIN md_permission_sets p ON p.tenant_id=rp.tenant_id AND p.id=rp.permission_set_id
      WHERE ur.tenant_id=$1 AND ur.user_id=$2 AND p.api_name='PlatformDeveloper'
    UNION ALL SELECT 1 FROM md_user_profiles up JOIN md_profile_permission_sets pp
      ON pp.tenant_id=up.tenant_id AND pp.profile_id=up.profile_id
      JOIN md_permission_sets p ON p.tenant_id=pp.tenant_id AND p.id=pp.permission_set_id
      WHERE up.tenant_id=$1 AND up.user_id=$2 AND p.api_name='PlatformDeveloper'
    UNION ALL SELECT 1 FROM md_user_permission_groups ug JOIN md_permission_group_sets gs
      ON gs.tenant_id=ug.tenant_id AND gs.group_id=ug.group_id
      JOIN md_permission_sets p ON p.tenant_id=gs.tenant_id AND p.id=gs.permission_set_id
      WHERE ug.tenant_id=$1 AND ug.user_id=$2 AND p.api_name='PlatformDeveloper'
   ) AS authorised`,[actor.tenant_id,actor.user_id]);
  return rows[0]?.authorised===true;
 }
 async function canManage(actor:Actor):Promise<boolean>{
  // Neither policy membership nor a wildcard tenant grant may bypass the other.
  if(!await assignedPlatformDeveloper(actor))return false;
  return rbac.allowed(actor.tenant_id,actor.user_id,'PlatformOperations','manage');
 }
 app.get('/api/platform/production-deployment',async(req,res,next)=>{
  try {
   const actor=actorOf(req);
   const canDeploy=await canManage(actor);
   res.set('Cache-Control','private, no-store');
   try {
    const status=await readProductionDeployment();
    res.json({...status,canDeploy,workflowUrl});
   } catch(error) {
    // Temporary rate limits/network failures must never make the control vanish.
    // Display an actionable status and leave dispatch disabled until refreshed.
    res.json({configured:false,canDeploy:false,latestCommit:null,
     deployedCommit:productionCommit(),active:false,oci:null,run:null,workflowUrl,
     error:error instanceof DeploymentControlError?error.message:'GitHub status unavailable.'});
   }
  }catch(error){handleError(error,res,next);}
 });
 app.post('/api/platform/production-deployment',async(req,res,next)=>{
  try{
   const actor=actorOf(req);
   if(!await canManage(actor))
    throw new DeploymentControlError('Platform Developer deployment permission required.',403);
   res.set('Cache-Control','private, no-store');
   const expected=(req.body as {expectedCommit?:unknown}|null)?.expectedCommit;
   res.status(202).json(await requestProductionDeployment(db,actor.tenant_id,actor.user_id,expected));
  }catch(error){handleError(error,res,next);}
 });
}
