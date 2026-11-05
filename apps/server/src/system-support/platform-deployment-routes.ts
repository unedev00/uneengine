import type {Express,Request,Response,NextFunction} from 'express';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
import type {RbacEngine} from '../system-files/rbac-engine.js';
import {brokerOperation} from './mcp-tools.js';

/**
 * Platform-wide production deployment control. Never exposes GitHub credentials
 * to the browser and never executes shell commands from a web request.
 * OCI's fixed, root-owned deployment helper fetches a pinned main revision,
 * validates/builds it, and reuses full-stack backup/deploy/rollback and locks.
 * GitHub provides ONLY a read-only source SHA comparison, never dispatch/status.
 */
const repository='unedev00/uneengine';
const shaPattern=/^[a-f0-9]{40}$/;
type OciRelease={state:'idle'|'running'|'succeeded'|'failed';sha:string|null;stage:string|null;updatedAt:string|null};
type DeploymentStatus={
 configured:boolean; latestCommit:string|null; deployedCommit:string|null;
 active:boolean; oci:OciRelease|null; error?:string;
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
function productionCommit(){
 const value=process.env.METADRIVE_RELEASE_SHA??'';
 return shaPattern.test(value)?value:null;
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
 let error:string|undefined;
 if(brokerConfigured()) {
  try {oci=parseOciStatus((await operate({action:'deploy_status',service:'api'})).output);}
  catch {error='OCI deployment helper is unreachable. Check the operations socket and installed helper on OCI.';}
 }else error='OCI deployment helper is not configured on the API host.';
 // Source control is read only; failure to reach it must not hide OCI's own status.
 let latestCommit:string|null=null;
 try {
  const commit=await github('/commits/main');
  if(typeof commit?.sha!=='string'||!shaPattern.test(commit.sha))
   throw new DeploymentControlError('Invalid main-branch revision.',502);
  latestCommit=commit.sha;
 }catch(cause){
  const description=cause instanceof DeploymentControlError?cause.message:'Source revision lookup is unavailable.';
  error=[error,description+' Cannot dispatch until the latest revision can be verified.'].filter(Boolean).join(' ');
 }
 return {configured:oci!==null,latestCommit,deployedCommit,oci,
  active:oci?.state==='running',...(error?{error}:{})};
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
   // until OCI accepts/rejects the dispatch and the acceptance audit commits.
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
   // A broker or systemd scheduler failure is not a PostgreSQL outage.
   // Turn the fixed-operation broker's rejection into a bounded deployment
   // error so the UI never reports a misleading "SQL service unavailable".
   let result:{output:string};
   try{
    result=await operate({action:'deploy_latest',service:'api',release:expectedCommit});
   }catch{
    throw new DeploymentControlError(
     'OCI deployment scheduler unavailable. Refresh status and check the OCI operations service.',503);
   }
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
 * Deployment requires OneEngine membership in the canonical OCI platform tenant
 * AND effective PlatformOperations:manage through central, revocable SQL RBAC.
 * A customer tenant OneEngine user cannot deploy the shared platform host.
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
 async function platformOneEngine(actor:Actor):Promise<{hasOneEngine:boolean;hasPlatformTenant:boolean}>{
  // This fixed, verified platform domain bounds shared OCI deployment authority.
  // Permission-set membership can be direct, role, profile or group based.
  const {rows}=await db.query<{has_oneengine:boolean;has_platform_tenant:boolean}>(`
   SELECT EXISTS(
    SELECT 1 FROM md_permission_assignments a JOIN md_permission_sets p
     ON p.tenant_id=a.tenant_id AND p.id=a.permission_set_id
     WHERE a.tenant_id=$1 AND a.user_id=$2 AND p.api_name='OneEngine'
    UNION ALL SELECT 1 FROM md_user_roles ur JOIN md_role_permission_sets rp
     ON rp.tenant_id=ur.tenant_id AND rp.role_id=ur.role_id
     JOIN md_permission_sets p ON p.tenant_id=rp.tenant_id AND p.id=rp.permission_set_id
     WHERE ur.tenant_id=$1 AND ur.user_id=$2 AND p.api_name='OneEngine'
    UNION ALL SELECT 1 FROM md_user_profiles up JOIN md_profile_permission_sets pp
     ON pp.tenant_id=up.tenant_id AND pp.profile_id=up.profile_id
     JOIN md_permission_sets p ON p.tenant_id=pp.tenant_id AND p.id=pp.permission_set_id
     WHERE up.tenant_id=$1 AND up.user_id=$2 AND p.api_name='OneEngine'
    UNION ALL SELECT 1 FROM md_user_permission_groups ug JOIN md_permission_group_sets gs
     ON gs.tenant_id=ug.tenant_id AND gs.group_id=ug.group_id
     JOIN md_permission_sets p ON p.tenant_id=gs.tenant_id AND p.id=gs.permission_set_id
     WHERE ug.tenant_id=$1 AND ug.user_id=$2 AND p.api_name='OneEngine'
   ) AS has_oneengine,
   EXISTS(
    SELECT 1 FROM md_tenant_domains d JOIN md_tenants t ON t.id=d.tenant_id
    JOIN md_users u ON u.tenant_id=t.id AND u.id=$2
    WHERE d.tenant_id=$1 AND d.domain='unesolutions.co.uk'
      AND t.status='ACTIVE' AND u.enabled=true AND u.user_type='internal'
   ) AS has_platform_tenant`,[actor.tenant_id,actor.user_id]);
  return {hasOneEngine:rows[0]?.has_oneengine===true,
   hasPlatformTenant:rows[0]?.has_platform_tenant===true};
 }
 async function deploymentPermission(actor:Actor){
  const scope=await platformOneEngine(actor);
  const hasOperationsManage=await rbac.allowed(actor.tenant_id,actor.user_id,'PlatformOperations','manage');
  return {...scope,hasOperationsManage,
   canDeploy:scope.hasPlatformTenant&&scope.hasOneEngine&&hasOperationsManage};
 }
 app.get('/api/platform/production-deployment',async(req,res,next)=>{
  try {
   const actor=actorOf(req);
   const {canDeploy,...permission}=await deploymentPermission(actor);
   res.set('Cache-Control','private, no-store');
   try {
    const status=await readProductionDeployment();
    res.json({...status,canDeploy,permission});
   } catch(error) {
    // Fail closed while retaining permission diagnostics for this signed-in user.
    res.json({configured:false,canDeploy,permission,latestCommit:null,
     deployedCommit:productionCommit(),active:false,oci:null,
     error:error instanceof DeploymentControlError?error.message:'OCI deployment status unavailable.'});
   }
  }catch(error){handleError(error,res,next);}
 });
 app.post('/api/platform/production-deployment',async(req,res,next)=>{
  try{
   const actor=actorOf(req);
   if(!(await deploymentPermission(actor)).canDeploy)
    throw new DeploymentControlError('OCI deployment requires OneEngine and PlatformOperations manage permission in the platform tenant.',403);
   res.set('Cache-Control','private, no-store');
   const expected=(req.body as {expectedCommit?:unknown}|null)?.expectedCommit;
   res.status(202).json(await requestProductionDeployment(db,actor.tenant_id,actor.user_id,expected));
  }catch(error){handleError(error,res,next);}
 });
}
