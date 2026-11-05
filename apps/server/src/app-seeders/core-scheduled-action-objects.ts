import {createHash} from 'node:crypto';
import type {PoolClient} from 'pg';
import type {SqlPersistence} from '../system-files/sql-persistence.js';

/** Object Manager-visible audit projection; md_scheduled_actions remains authoritative. */
export const SCHEDULED_ACTION_OBJECT='Scheduledaction';
const FIELDS=[
 ['Name','Name','text'],['Status','Status','picklist'],
 ['ScheduledBy','Scheduled By','text'],['SessionId','Source Session','text'],
 ['ScheduledAt','Run At','datetime'],['CompletedAt','Finished At','datetime'],
 ['CurrentStep','Current Step','number'],['TotalSteps','Total Steps','number'],
 ['JobId','Job ID','text'],['SourcePage','Source Page','text']
] as const;
export async function seedScheduledActionObject(client:PoolClient,tenantId:string){
 await client.query(`INSERT INTO md_object_definitions(tenant_id,api_name,label,is_system)
   VALUES($1,'Scheduledaction','Scheduled Actions',false)
   ON CONFLICT(tenant_id,api_name) DO NOTHING`,[tenantId]);
 await client.query(`INSERT INTO md_sharing_settings(tenant_id,object_api,default_access,use_hierarchy)
   VALUES($1,'Scheduledaction','Private',false)
   ON CONFLICT(tenant_id,object_api) DO NOTHING`,[tenantId]);
 for(const [field,label,type] of FIELDS)await client.query(`
   INSERT INTO md_field_definitions(tenant_id,object_api,api_name,label,data_type,max_length,required)
   VALUES($1,'Scheduledaction',$2,$3,$4,$5,false)
   ON CONFLICT(tenant_id,object_api,api_name) DO NOTHING`,
   [tenantId,field,label,type,type==='text'?256:null]);
 for(const [index,status] of ['Pending','Running','Completed','Cancelled','Manually Completed','Failed'].entries())
   await client.query(`INSERT INTO md_field_picklist_values(tenant_id,object_api,field_api,value,sort_order)
   VALUES($1,'Scheduledaction','Status',$2,$3) ON CONFLICT DO NOTHING`,
    [tenantId,status,(index+1)*10]);
}
const version='core-scheduled-action-v1';
export async function seedScheduledActionObjectsForExistingTenants(db:SqlPersistence){
 const checksum=createHash('sha256').update(JSON.stringify(FIELDS)).digest('hex');
 return db.transaction(async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['metadrive:system:migrations']);
  const old=await client.query<{checksum:string}>('SELECT checksum FROM md_system_migrations WHERE version=$1',[version]);
  if(old.rows[0]&&old.rows[0].checksum!==checksum)throw Error('Scheduledaction object seed changed');
  const {rows}=await client.query<{id:string}>('SELECT id FROM md_tenants ORDER BY id');
  for(const row of rows)await seedScheduledActionObject(client,row.id);
  if(!old.rows[0])await client.query('INSERT INTO md_system_migrations(version,checksum) VALUES($1,$2)',[version,checksum]);
  return rows.length;
 });
}
