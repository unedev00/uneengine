import type {SqlPersistence} from '../system-files/sql-persistence.js';
import {seedAcetillTillFields} from './acetill-till-fields.js';
import {seedAcetillCartFlows} from './acetill-cart-flows.js';
import {seedAcetillReturnLookup,seedAcetillCreateSalesReturn} from './acetill-return-flows.js';
import {seedAcetillCashierPolicy} from './acetill-cashier-policy.js';
import {seedAcetillScanFlow} from './acetill-scan-flow.js';
import {seedAcetillLockFlowForTenant} from './acetill-lock-flow.js';
import {requireAcetillPaymentAttestation} from './acetill-payment-attestation.js';

/** Upgrade installed and entitled tenants, without app auto-installs or overwriting edited Flows. */
export async function backfillAcetillOperationalFlows(db:SqlPersistence):Promise<number>{
 const {rows}=await db.query<{tenant_id:string}>(`SELECT DISTINCT i.tenant_id
 FROM md_app_installations i JOIN md_apps a ON a.id=i.app_id
 JOIN md_app_entitlements e ON e.app_id=a.id AND e.tenant_id=i.tenant_id
 WHERE a.api_name='Acetill' AND a.enabled=true AND e.active=true
  AND (e.expires_at IS NULL OR e.expires_at>now())`);
 let count=0;
 for(const row of rows){
  await db.transaction(async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',
    [row.tenant_id+':acetill:operational-backfill']);
   await seedAcetillTillFields(client,row.tenant_id);
   await seedAcetillLockFlowForTenant(client,row.tenant_id);
   await seedAcetillCartFlows(client,row.tenant_id);
   await seedAcetillReturnLookup(client,row.tenant_id);
   await seedAcetillCreateSalesReturn(client,row.tenant_id);
   await seedAcetillCashierPolicy(client,row.tenant_id);
   await seedAcetillScanFlow(client,row.tenant_id);
   await requireAcetillPaymentAttestation(client,row.tenant_id);
  });
  count++;
 }
 return count;
}
