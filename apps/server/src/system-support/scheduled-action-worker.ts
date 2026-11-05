import type {SqlPersistence} from '../system-files/sql-persistence.js';
import type {RbacEngine} from '../system-files/rbac-engine.js';
import type {RecordEngine} from '../system-files/record-engine.js';
import type {FlowRuntime} from '../system-files/flow-runtime.js';
import {FormulaActionExecutor} from '../system-files/formula-action-executor.js';
import {ScheduledActionService} from './scheduled-action-service.js';
import type {ClaimedJob,DurableJobWorker} from './durable-job-worker.js';
import {PageRuntime} from '../system-files/page-runtime.js';

/** Reauthorize the initiating user and published page before resuming a job. */
export function registerScheduledActionJobHandler(worker:DurableJobWorker,db:SqlPersistence,
 rbac:RbacEngine,records:RecordEngine,flows:FlowRuntime){
 const scheduled=new ScheduledActionService(db);
 const executor=new FormulaActionExecutor(records,flows,scheduled);
 const pages=new PageRuntime(db);
 const authorize=async(job:ClaimedJob):Promise<boolean>=>{
  if(job.job_type!=='action.resume'||job.attempt!==1||!job.actor_user_id||!job.resource_id)
   return false;
  const {rows}=await db.query<{session_id:string;source_page_api:string|null}>(`
   SELECT s.session_id,s.source_page_api
   FROM md_scheduled_actions s
   JOIN md_users u ON u.tenant_id=s.tenant_id AND u.id=s.initiated_by
   JOIN md_tenants t ON t.id=s.tenant_id
   WHERE s.tenant_id=$1 AND s.id=$2 AND s.job_id=$3 AND s.initiated_by=$4
     AND s.status='pending' AND s.due_at<=now()
     AND u.enabled=true AND t.status='ACTIVE'`,
    [job.tenant_id,job.resource_id,job.id,job.actor_user_id]);
  if(!rows[0])return false;
  if(rows[0].source_page_api){
   if(!await rbac.allowed(job.tenant_id,job.actor_user_id,'PageDefinition','read'))
    return false;
   try {
    const page=await pages.metadata(job.tenant_id,rows[0].source_page_api);
    if(page.status!=='Active')return false;
   }catch{return false;}
  }
  return true;
 };
 worker.register('action.resume',async job=>{
  if(!await authorize(job))throw Error('Scheduled action authorization changed');
  const {rows}=await db.query<{session_id:string;source_page_api:string|null}>(`
    SELECT session_id,source_page_api FROM md_scheduled_actions
    WHERE tenant_id=$1 AND id=$2 AND job_id=$3 AND status='pending'`,
    [job.tenant_id,job.resource_id,job.id]);
  if(!rows[0]||!job.actor_user_id||!job.resource_id)
   throw Error('Scheduled action not found');
  const actor={tenantId:job.tenant_id,userId:job.actor_user_id,
    sessionId:rows[0].session_id,
    ...(rows[0].source_page_api?{pageApi:rows[0].source_page_api}:{})};
  try {
   await scheduled.resume(job.tenant_id,job.resource_id,async(formula,variables)=>{
    const result=await executor.execute(formula,actor,variables);
    if(result.scheduledActionId)
     throw Error('Nested WAIT requires a separate execution checkpoint');
    return result.variables;
   });
  }catch(error){
   await scheduled.fail(job.tenant_id,job.resource_id);
   throw error;
  }
 });
 return authorize;
}
