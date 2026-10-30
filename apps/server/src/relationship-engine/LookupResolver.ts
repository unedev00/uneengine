import type {PoolClient} from 'pg';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
/** Resolve a reference only within the caller's tenant, without bypassing Record Engine RBAC. */
export async function assertLookupTargetExists(db:SqlPersistence|PoolClient,tenantId:string,objectApi:string|null,recordId:string,fieldKey:string,actorUserId?:string){
 // When invoked by Record Engine, apply parent read access inside its current
 // transaction (not an RBAC side connection that cannot see new Flow records).
 const match=await db.query(actorUserId
  ?"SELECT id FROM md_records WHERE tenant_id=$1 AND object_api=$2 AND id=$3 AND is_deleted=false AND md_record_access($1,$4,id,'read')"
  :'SELECT id FROM md_records WHERE tenant_id=$1 AND object_api=$2 AND id=$3 AND is_deleted=false',
  actorUserId?[tenantId,objectApi,recordId,actorUserId]:[tenantId,objectApi,recordId]);
 if(!match.rowCount)throw new Error('Invalid relationship target: '+fieldKey);
}
