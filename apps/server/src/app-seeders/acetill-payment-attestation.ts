import type {PoolClient} from 'pg';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
import {decodeMetadataValues,encodeMetadataValue,type MetadataValueRow} from '../system-files/component-runtime.js';

/** Additive safety policy. Never replace cashier-authored Flow graphs, nodes or bindings. */
const guard={
 collectionInput:'cartItems',recordObject:'Product',idInputField:'Product',
 restrictedField:'AgeRestricted',minimumAgeField:'MinimumAge',attestedInput:'ageVerified',
 eventName:'AcetillAgeCheckConfirmed'
};
export async function requireAcetillPaymentAttestation(client:PoolClient,tenantId:string):Promise<number>{
 let updated=0;
 for(const apiName of ['AcetillPaymentCash','AcetillPaymentCard']){
  const {rows:flows}=await client.query<{id:string}>(`SELECT id FROM md_flow_definitions
   WHERE tenant_id=$1 AND api_name=$2 AND active=true AND archived=false
   ORDER BY version DESC LIMIT 1 FOR UPDATE`,[tenantId,apiName]);
  if(!flows[0])continue;
  const {rows}=await client.query<MetadataValueRow>(`SELECT property_path,value_kind,value_text
   FROM md_flow_editor_values WHERE tenant_id=$1 AND flow_id=$2 ORDER BY property_path`,
   [tenantId,flows[0].id]);
  const original=decodeMetadataValues(rows).builder;
  if(!original||typeof original!=='object'||Array.isArray(original))continue;
  const graph=original as Record<string,unknown>;
  const start=graph.startConfig&&typeof graph.startConfig==='object'&&!Array.isArray(graph.startConfig)
   ?graph.startConfig as Record<string,unknown>:{};
  // A tenant-defined guard may be stricter: leave it intact.
  if(start.recordAttestationGuard!==undefined)continue;
  graph.startConfig={...start,recordAttestationGuard:guard};
  const encoded:Array<{path:string;kind:string;text:string|null}>=[];
  encodeMetadataValue(graph,'/builder',encoded);
  await client.query(`DELETE FROM md_flow_editor_values WHERE tenant_id=$1 AND flow_id=$2`,
   [tenantId,flows[0].id]);
  for(const entry of encoded)await client.query(`INSERT INTO md_flow_editor_values
   (tenant_id,flow_id,property_path,value_kind,value_text)
   VALUES($1,$2,$3,$4,$5)`,[tenantId,flows[0].id,entry.path,entry.kind,entry.text]);
  await client.query(`INSERT INTO md_security_events(tenant_id,action,details)
   VALUES($1,'AcetillPaymentAttestationPolicyInstalled',
    jsonb_build_object('flow',$2::text,'flowId',$3::text))`,
    [tenantId,apiName,flows[0].id]);
  updated++;
 }
 return updated;
}
export async function backfillAcetillPaymentAttestation(db:SqlPersistence):Promise<number>{
 const {rows}=await db.query<{tenant_id:string}>(`SELECT DISTINCT i.tenant_id
  FROM md_app_installations i JOIN md_apps a ON a.id=i.app_id
  JOIN md_app_entitlements e ON e.app_id=i.app_id AND e.tenant_id=i.tenant_id
  WHERE a.api_name='Acetill' AND a.enabled=true AND e.active=true
  AND (e.expires_at IS NULL OR e.expires_at>now())`);
 let updated=0;
 for(const {tenant_id} of rows)updated+=await db.transaction(client=>
  requireAcetillPaymentAttestation(client,tenant_id));
 return updated;
}
