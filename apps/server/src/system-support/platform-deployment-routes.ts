import type {Express,Request,Response,NextFunction} from 'express';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
import type {RbacEngine} from '../system-files/rbac-engine.js';
import type {PlatformTenantService} from '../system-files/platform-tenant-service.js';

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
type DeploymentStatus={
 configured:boolean; latestCommit:string|null; deployedCommit:string|null;
 active:boolean; run:null|{id:number;commit:string;status:string;conclusion:string|null;createdAt:string;url:string};
};
export class DeploymentControlError extends Error {
 constructor(message:string,readonly statusCode:number){super(message);}
}
const token=()=>process.env.METADRIVE_GITHUB_DEPLOY_TOKEN?.trim()??'';
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
async function github(path:string,method:'GET'|'POST'='GET',body?:object):Promise<any>{
 const credential=token();
 if(!credential)throw new DeploymentControlError('Production deployment credential is not configured.',503);
 // Fixed repository and allowlisted paths only. Never proxy arbitrary URLs.
 const response=await fetch('https://api.github.com/repos/'+repository+path,{
  method,
  headers:{'Authorization':'Bearer '+credential,'Accept':'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),
  signal:AbortSignal.timeout(12000)
 });
 if(method==='POST'&&response.status===204)return null;
 if(!response.ok)throw new DeploymentControlError(
  response.status===401||response.status===403
   ? 'GitHub deployment credential cannot access the production workflow.'
   : 'GitHub deployment service is unavailable ('+response.status+').',502);
 return response.json();
}
export async function readProductionDeployment():Promise<DeploymentStatus>{
 const deployedCommit=productionCommit();
 if(!token())return {configured:false,latestCommit:null,deployedCommit,active:false,run:null};
 const [commit,runs]=await Promise.all([
  github('/commits/main'),
  github('/actions/workflows/'+workflow+'/runs?branch=main&per_page=15')
 ]);
 const latestCommit=typeof commit?.sha==='string'&&shaPattern.test(commit.sha)?commit.sha:null;
 if(!latestCommit)throw new DeploymentControlError('GitHub returned an invalid main-branch revision.',502);
 const matches:Array<Run>=Array.isArray(runs?.workflow_runs)
  ?runs.workflow_runs.filter((r:unknown)=>validRun(r)&&(r as Run).event!=='pull_request'): [];
 const current=matches[0];
 return {configured:true,latestCommit,deployedCommit,
  active:!!current&&activeStatuses.has(current.status),
  run:current?{id:current.id,commit:current.head_sha,status:current.status,
   conclusion:current.conclusion,createdAt:current.created_at,
   url:'https://github.com/'+repository+'/actions/runs/'+current.id}:null};
}
async function audit(db:SqlPersistence,tenant:string,user:string,action:string,details:object){
 await db.query('INSERT INTO md_security_events(tenant_id,actor_user_id,action,details) VALUES($1,$2,$3,$4::jsonb)',
  [tenant,user,action,JSON.stringify(details)]);
}
export async function requestProductionDeployment(
 db:SqlPersistence,tenant:string,user:string,expectedCommit:unknown
):Promise<{accepted:true;targetCommit:string}>{
 if(typeof expectedCommit!=='string'||!shaPattern.test(expectedCommit))
  throw new DeploymentControlError('A valid expected main-branch commit is required.',400);
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
   const status=await readProductionDeployment();
   if(status.latestCommit!==expectedCommit)
    throw new DeploymentControlError('Main has changed. Refresh the deployment status before confirming.',409);
   if(status.active)
    throw new DeploymentControlError('A production deployment is already queued or running.',409);
   await github('/actions/workflows/'+workflow+'/dispatches','POST',{ref:'main'});
   await client.query('INSERT INTO md_security_events(tenant_id,actor_user_id,action,details) VALUES($1,$2,$3,$4::jsonb)',
    [tenant,user,'platform.production-deploy.accepted',JSON.stringify({commit:expectedCommit,workflow})]);
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
export function registerPlatformDeploymentRoutes(
 app:Express,db:SqlPersistence,rbac:RbacEngine,platform:PlatformTenantService
){
 async function permission(req:Request,operation:'read'|'manage'){
  const actor=(req as Request & {actor?:{tenant_id:string;user_id:string}}).actor;
  if(!actor?.tenant_id||!actor.user_id)throw new DeploymentControlError('Authentication required.',401);
  await platform.requirePlatform(actor.tenant_id,actor.user_id);
  // Tenant OneEngine membership is not by itself production deployment authority.
  // Require the separately assigned Platform Developer policy (directly or
  // through a role/profile/group), then the revocable operations permission.
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
  if(!rows[0]?.authorised)throw new DeploymentControlError('Platform deployment access denied.',403);
  await rbac.require(actor.tenant_id,actor.user_id,'PlatformOperations',operation);
  return actor;
 }
 app.get('/api/platform/production-deployment',async(req,res,next)=>{
  try{
   const actor=await permission(req,'read');
   res.set('Cache-Control','private, no-store');
   res.json({...(await readProductionDeployment()),
    canDeploy:await rbac.allowed(actor.tenant_id,actor.user_id,'PlatformOperations','manage')});
  }catch(error){
   // Access-denied users must not learn GitHub release data or credential status.
   if(error instanceof Error&&/Permission denied|permission denied/i.test(error.message)){
    res.status(403).json({error:'Platform deployment access denied.'});return;
   }
   handleError(error,res,next);
  }
 });
 app.post('/api/platform/production-deployment',async(req,res,next)=>{
  try{
   const actor=await permission(req,'manage');
   res.set('Cache-Control','private, no-store');
   const expected=(req.body as {expectedCommit?:unknown}|null)?.expectedCommit;
   res.status(202).json(await requestProductionDeployment(db,actor.tenant_id,actor.user_id,expected));
  }catch(error){
   if(error instanceof Error&&/Permission denied|permission denied/i.test(error.message)){
    res.status(403).json({error:'Platform deployment access denied.'});return;
   }
   handleError(error,res,next);
  }
 });
}
