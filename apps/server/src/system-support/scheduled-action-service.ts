import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
import {Parser} from '../expression-engine/FormulaParser.js';
import {tokenize} from '../expression-engine/FormulaTokenizer.js';
import {validateFormulaFunctions} from '../expression-engine/FormulaFunctionRegistry.js';
import {waitDelaySeconds} from '../expression-engine/FormulaActions.js';
import {DurableJobService} from './durable-job-service.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const source=/^[A-Za-z][A-Za-z0-9_]{0,79}$/;
const varName=/^[A-Za-z_$][A-Za-z0-9_$.]{0,127}$/;
type Scalar=string|number|boolean|null;
export type ScheduledActionInput={
  tenantId:string;userId:string;sessionId:string;sourcePageApi?:string;
  minutes:number;seconds:number;remainingSteps:readonly string[];
  variables?:Readonly<Record<string,Scalar>>;
};
type ScheduledRow={id:string;job_id:string;status:string;initiated_by:string;session_id:string;
  current_step:number;source_page_api:string|null;due_at:Date};

/** Persist WAIT as an SQL job. Nothing depends on a live page/login session. */
export class ScheduledActionService {
 private readonly jobs:DurableJobService;
 constructor(private readonly db:SqlPersistence){this.jobs=new DurableJobService(db);}

 async schedule(input:ScheduledActionInput):Promise<{id:string;jobId:string;dueAt:Date}> {
  const {tenantId,userId,sessionId,sourcePageApi,minutes,seconds,remainingSteps}=input;
  if(!uuid.test(tenantId)||!uuid.test(userId)
    ||typeof sessionId!=='string'||!sessionId.trim()||sessionId.length>200
    ||sourcePageApi!==undefined&&!source.test(sourcePageApi))
    throw Error('Invalid scheduled action source');
  const delay=waitDelaySeconds(minutes,seconds);
  if(!Array.isArray(remainingSteps)||!remainingSteps.length||remainingSteps.length>128)
    throw Error('WAIT requires remaining actions');
  for(const formula of remainingSteps){
   if(typeof formula!=='string'||formula.length>4000)throw Error('Invalid scheduled action');
   validateFormulaFunctions(new Parser(tokenize(formula)).parse(),'action_formula');
  }
  const values=Object.entries(input.variables??{});
  if(values.length>128)throw Error('Too many scheduled action variables');
  for(const [name,value] of values)
   if(!varName.test(name)||typeof value==='object'&&value!==null
      ||typeof value==='number'&&!Number.isFinite(value)
      ||typeof value==='string'&&value.length>4096
      ||!['string','number','boolean'].includes(typeof value)&&value!==null)
    throw Error('Invalid scheduled action variable');
  const dueAt=new Date(Date.now()+delay*1000),id=randomUUID();
  const jobId=await this.db.transaction(async (client:PoolClient)=>{
   const job=await this.jobs.enqueue(tenantId,'action.resume',{
    actorUserId:userId,resourceId:id,scheduledAt:dueAt,maxAttempts:1
   },client);
   await client.query(`INSERT INTO md_scheduled_actions
    (id,tenant_id,job_id,initiated_by,session_id,source_page_api,due_at)
    VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [id,tenantId,job,userId,sessionId,sourcePageApi??null,dueAt]);
   for(const [index,formula] of remainingSteps.entries())
    await client.query(`INSERT INTO md_scheduled_action_steps
      (tenant_id,scheduled_action_id,step_index,formula_text)
      VALUES($1,$2,$3,$4)`,[tenantId,id,index,formula]);
   for(const [name,value] of values)
    await client.query(`INSERT INTO md_scheduled_action_values
     (tenant_id,scheduled_action_id,name,value_text,value_number,value_boolean)
     VALUES($1,$2,$3,$4,$5,$6)`,[tenantId,id,name,
     typeof value==='string'?value:null,typeof value==='number'?value:null,
     typeof value==='boolean'?value:null]);
   // Record Workspace projection: status is descriptive, never used to dispatch.
   await client.query(`INSERT INTO md_records(id,tenant_id,object_api,owner_id)
     VALUES($1,$2,'Scheduledaction',$3)`,[id,tenantId,userId]);
   const entries=[
     ['Name','Scheduled '+id.slice(0,8)],['Status','Pending'],
     ['ScheduledBy',userId],['SessionId',sessionId],
     ['JobId',job],['SourcePage',sourcePageApi??'']
   ] as const;
   for(const [field,value] of entries)
    await client.query(`INSERT INTO md_record_values
     (tenant_id,record_id,object_api,field_api,value_text)
     VALUES($1,$2,'Scheduledaction',$3,$4)`,[tenantId,id,field,value]);
   for(const [field,value] of [['ScheduledAt',dueAt.toISOString()],
     ['CurrentStep','0'],['TotalSteps',String(remainingSteps.length)]] as const)
    await client.query(`INSERT INTO md_record_values
     (tenant_id,record_id,object_api,field_api,value_text,
       value_number,value_datetime) VALUES($1,$2,'Scheduledaction',$3,NULL,$4,$5)`,
     [tenantId,id,field,field==='ScheduledAt'?null:Number(value),
      field==='ScheduledAt'?value:null]);
   return job;
  });
  return {id,jobId,dueAt};
 }

 async list(tenantId:string,userId:string,all=false){
  const {rows}=await this.db.query(`
    SELECT id,job_id,status,initiated_by,session_id,source_page_api,
      due_at,current_step,created_at,finished_at
    FROM md_scheduled_actions WHERE tenant_id=$1 AND ($3::boolean OR initiated_by=$2)
    ORDER BY created_at DESC,id DESC LIMIT 100`,[tenantId,userId,all]);
  return rows;
 }

 /** Atomic with the queue update: queued jobs can be cancelled or acknowledged,
  * but a running/leased job must finish or fail and be reconciled separately. */
 async decide(tenantId:string,id:string,actorUserId:string,
   decision:'cancel'|'complete',allowManage=false){
  if(!uuid.test(id)||!uuid.test(actorUserId)||!['cancel','complete'].includes(decision))
   throw Error('Invalid scheduled action decision');
  return this.db.transaction(async client=>{
   const {rows}=await client.query<ScheduledRow>(`
    SELECT * FROM md_scheduled_actions WHERE tenant_id=$1 AND id=$2 FOR UPDATE`,
    [tenantId,id]);
   const action=rows[0];
   if(!action||!allowManage&&action.initiated_by!==actorUserId)
    throw Error('Scheduled action not found');
   if(action.status!=='pending')throw Error('Only pending actions may be changed');
   const final=decision==='cancel'?'cancelled':'manually_completed';
   const durable=decision==='cancel'?'cancelled':'completed';
   const changed=await client.query(`UPDATE md_durable_jobs SET
      status=$3,updated_at=now() WHERE tenant_id=$1 AND id=$2 AND status='queued'`,
     [tenantId,action.job_id,durable]);
   if(!changed.rowCount)throw Error('Scheduled action already running');
   await this.setStatus(client,tenantId,id,final,action.current_step,true);
   await client.query(`INSERT INTO md_security_events
      (tenant_id,actor_user_id,action,details) VALUES($1,$2,$3,$4::jsonb)`,
      [tenantId,actorUserId,'scheduled_action.'+decision,
       JSON.stringify({scheduledActionId:id,jobId:action.job_id})]);
   return {id,status:final};
  });
 }

 private async setStatus(client:PoolClient,tenantId:string,id:string,status:string,
   currentStep:number,finished=false){
  await client.query(`UPDATE md_scheduled_actions SET status=$3,current_step=$4,
    finished_at=CASE WHEN $5 THEN now() ELSE finished_at END,updated_at=now()
    WHERE tenant_id=$1 AND id=$2`,[tenantId,id,status,currentStep,finished]);
  const label=({pending:'Pending',running:'Running',completed:'Completed',
   cancelled:'Cancelled',manually_completed:'Manually Completed',
   failed:'Failed'} as Record<string,string>)[status];
  for(const [field,value] of [['Status',label],['CurrentStep',String(currentStep)]] as const)
   await client.query(`INSERT INTO md_record_values
     (tenant_id,record_id,object_api,field_api,value_text,value_number)
     VALUES($1,$2,'Scheduledaction',$3,$4,$5)
     ON CONFLICT (tenant_id,record_id,field_api)
     DO UPDATE SET value_text=EXCLUDED.value_text,value_number=EXCLUDED.value_number`,
      [tenantId,id,field,field==='Status'?value:null,
       field==='CurrentStep'?Number(value):null]);
  if(finished)await client.query(`INSERT INTO md_record_values
    (tenant_id,record_id,object_api,field_api,value_datetime)
    VALUES($1,$2,'Scheduledaction','CompletedAt',now())
    ON CONFLICT (tenant_id,record_id,field_api)
    DO UPDATE SET value_datetime=EXCLUDED.value_datetime`,[tenantId,id]);
 }

 /** Worker calls this only after fresh authorization. One job can execute one time;
  * an ambiguous lease is failed closed by the existing durable worker. */
 async resume(tenantId:string,id:string,
   execute:(formula:string,variables:Readonly<Record<string,Scalar>>)=>Promise<Record<string,Scalar>|void>){
  if(!uuid.test(id))throw Error('Invalid scheduled action ID');
  const row=await this.db.query<ScheduledRow>(`
    SELECT * FROM md_scheduled_actions WHERE tenant_id=$1 AND id=$2`,[tenantId,id]);
  const action=row.rows[0];
  if(!action||action.status!=='pending')throw Error('Scheduled action is not pending');
  const stepRows=await this.db.query<{step_index:number;formula_text:string;status:string}>(`
    SELECT step_index,formula_text,status FROM md_scheduled_action_steps
    WHERE tenant_id=$1 AND scheduled_action_id=$2 ORDER BY step_index`,[tenantId,id]);
  const vars=await this.db.query<{name:string;value_text:string|null;value_number:number|null;value_boolean:boolean|null}>(`
    SELECT name,value_text,value_number,value_boolean FROM md_scheduled_action_values
    WHERE tenant_id=$1 AND scheduled_action_id=$2`,[tenantId,id]);
  const values:Record<string,Scalar>={};
  for(const v of vars.rows)values[v.name]=v.value_text??v.value_number??v.value_boolean??null;
  await this.db.transaction(async client=>this.setStatus(client,tenantId,id,'running',action.current_step));
  for(const step of stepRows.rows){
   if(step.step_index<action.current_step)continue;
   if(step.status!=='pending')throw Error('Scheduled action step requires reconciliation');
   const result=await execute(step.formula_text,values);
   // The side effect is not retried if the worker disappears before this marker:
   // the durable lease fails closed and requires operator reconciliation.
   await this.db.transaction(async client=>{
    for(const [name,value] of Object.entries(result??{})){
     if(!varName.test(name)||typeof value==='object'&&value!==null
        ||typeof value==='number'&&!Number.isFinite(value)
        ||typeof value==='string'&&value.length>4096)
       throw Error('Invalid scheduled action result');
     await client.query(`INSERT INTO md_scheduled_action_values
      (tenant_id,scheduled_action_id,name,value_text,value_number,value_boolean)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(tenant_id,scheduled_action_id,name)
      DO UPDATE SET value_text=EXCLUDED.value_text,value_number=EXCLUDED.value_number,
       value_boolean=EXCLUDED.value_boolean`,
      [tenantId,id,name,typeof value==='string'?value:null,
       typeof value==='number'?value:null,typeof value==='boolean'?value:null]);
     values[name]=value;
    }
    await client.query(`UPDATE md_scheduled_action_steps SET status='completed',finished_at=now()
      WHERE tenant_id=$1 AND scheduled_action_id=$2 AND step_index=$3 AND status='pending'`,
      [tenantId,id,step.step_index]);
    await this.setStatus(client,tenantId,id,'running',step.step_index+1);
   });
  }
  await this.db.transaction(client=>this.setStatus(client,tenantId,id,'completed',
    stepRows.rows.length,true));
 }

 async fail(tenantId:string,id:string){
  if(!uuid.test(id))return;
  await this.db.transaction(async client=>{
   const {rows}=await client.query<{current_step:number}>(`
    SELECT current_step FROM md_scheduled_actions
    WHERE tenant_id=$1 AND id=$2 AND status='running' FOR UPDATE`,[tenantId,id]);
   if(rows[0])await this.setStatus(client,tenantId,id,'failed',rows[0].current_step,true);
  });
 }
}
