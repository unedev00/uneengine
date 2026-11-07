/**
 * Upgrade only recognised legacy CartSession Flow versions, retaining immutable
 * older versions and tenant-owned flows unrelated to this migration.
 * 
 * node scripts/cart/upgrade-cart-flow-metadata.mjs             # preflight
 * node scripts/cart/upgrade-cart-flow-metadata.mjs --apply     # create v+1
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {SqlPersistence} from '../../apps/server/dist-system/system-files/sql-persistence.js';
import {encodeMetadataValue,decodeMetadataValues} from '../../apps/server/dist-system/system-files/component-runtime.js';
import {copilotPosGraphs} from '../../apps/server/dist-system/app-seeders/acetill-copilot-pos-flows.js';
import {acetillCartGraphs} from '../../apps/server/dist-system/app-seeders/acetill-cart-flows.js';
import {SMART_TILL_ADD} from '../codextill/ensure-smart-till-cart-flows.mjs';

const connectionString=process.env.DATABASE_URL??process.env.METADRIVE_DATABASE_URL;
if(!connectionString)throw Error('DATABASE_URL is required');
const apply=process.argv.includes('--apply');
const tenantArg=process.argv.find(x=>x.startsWith('--tenant='));
const tenantSlug=tenantArg?.slice('--tenant='.length);
if(tenantSlug&&!/^[a-zA-Z0-9_-]{2,128}$/.test(tenantSlug))throw Error('Invalid tenant slug');
const payment=JSON.parse(readFileSync(fileURLToPath(
 new URL('../../apps/acetill/flows/payment-flows.v1.json',import.meta.url)),'utf8'));
const templates=[...copilotPosGraphs,...acetillCartGraphs,
 SMART_TILL_ADD,payment.AcetillPaymentCash,payment.AcetillPaymentCard];
const targets=new Map(templates.map(graph=>[graph.apiName,graph]));
const db=new SqlPersistence(connectionString);
const related=graph=>JSON.stringify(graph).includes('CartSession');
const nodesOf=graph=>Array.isArray(graph.elements)?graph.elements:[];
const legacy=graph=>{
 const nodes=nodesOf(graph);
 switch(graph.apiName){
  case 'AcetillHoldCart':
   return nodes.some(n=>n.type==='Create Records'&&n.config?.object==='CartLine');
  case 'AcetillResumeHeldCart':
   return nodes.some(n=>n.type==='Update Records'&&n.config?.fieldValues?.some(f=>f.field==='Status'&&f.value==='Resumed'));
  case 'AcetillListHeldCarts':
   return !nodes.some(n=>n.config?.conditions?.some(c=>c.field==='UserId'));
  case 'AcetillPaymentCash':case 'AcetillPaymentCard':
   return nodes.some(n=>n.type==='Create Records'&&n.config?.object==='Invoice')
    && !nodes.some(n=>n.type==='Update Records'&&n.config?.object==='Cart');
  default:return related(graph);
 }
};
const knownLegacyCounts=new Map([
 ['AcetillCopilotAddProduct',15],['AcetillCopilotReadCart',10],
 ['AcetillCopilotChangeQuantity',16],['SmartTillAddProduct',17],
 ['AcetillHoldCart',6],['AcetillListHeldCarts',3],['AcetillResumeHeldCart',7],
 ['AcetillPaymentCash',23],['AcetillPaymentCard',23]
]);
const compatible=(name,graph)=>{
 if(graph.apiName!==name||!Array.isArray(graph.elements))return false;
 const nodes=nodesOf(graph);
 if(knownLegacyCounts.has(name)&&nodes.length!==knownLegacyCounts.get(name))return false;
 if(graph.startConfig&&typeof graph.startConfig==='object'&&
  Object.keys(graph.startConfig).some(k=>!['executionContext','recordAttestationGuard'].includes(k)))
  return false;
 if(name==='SmartTillAddProduct')return nodes.some(n=>n.type==='Create Records'&&n.config?.object==='CartLine');
 if(name.startsWith('AcetillPayment'))return nodes.some(n=>n.id===12&&n.type==='Create Records'&&n.config?.object==='Invoice')
  &&nodes.some(n=>n.id===19&&n.type==='End');
 if(name==='AcetillHoldCart')return nodes.some(n=>n.type==='Create Records'&&n.config?.object==='CartLine');
 if(name.startsWith('AcetillCopilot'))return graph.appApiName==='Acetill';
 return graph.appApiName==='Acetill';
};
try{
 const tenants=await db.query(
  tenantSlug?'SELECT id,slug FROM md_tenants WHERE slug=$1 ORDER BY id'
            :'SELECT id,slug FROM md_tenants ORDER BY id',
  tenantSlug?[tenantSlug]:[]);
 const log=[];
 for(const {id:tenant,slug} of tenants.rows){
  const run=async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['cart-flow-upgrade:'+tenant]);
   for(const [name,target] of targets){
    const active=await client.query(`
     SELECT id,version FROM md_flow_definitions WHERE tenant_id=$1
       AND api_name=$2 AND active=true AND archived=false ORDER BY version DESC LIMIT 1 FOR UPDATE`,
     [tenant,name]);
    if(!active.rows[0])continue;
    const previous=active.rows[0];
    const {rows}=await client.query(`
     SELECT property_path,value_kind,value_text FROM md_flow_editor_values
     WHERE tenant_id=$1 AND flow_id=$2 ORDER BY property_path`,[tenant,previous.id]);
    const graph=decodeMetadataValues(rows).builder;
    if(!graph||typeof graph!=='object'||Array.isArray(graph))throw Error(name+': missing graph');
    if(!legacy(graph))continue;
    if(!compatible(name,graph))throw Error(name+': customised or unknown legacy graph; needs manual review');
    const next=await client.query(`
     SELECT COALESCE(MAX(version),0)::int+1 AS version FROM md_flow_definitions
     WHERE tenant_id=$1 AND api_name=$2`,[tenant,name]);
    const version=Number(next.rows[0].version);
    const newer=structuredClone(target);
    newer.version=version;
    // Preserve authoritative payment attestation added after original seeding.
    if(name.startsWith('AcetillPayment')&&graph.startConfig?.recordAttestationGuard)
     newer.startConfig={...(newer.startConfig??{}),
       recordAttestationGuard:graph.startConfig.recordAttestationGuard};
    log.push({tenant:slug,flow:name,from:previous.version,to:version});
    if(!apply)continue;
    const created=await client.query(`
     INSERT INTO md_flow_definitions(tenant_id,api_name,label,flow_type,version,active)
     VALUES($1,$2,$3,$4,$5,false) RETURNING id`,
     [tenant,name,newer.label,newer.flowType,version]);
    const values=[];encodeMetadataValue(newer,'/builder',values);
    for(const v of values)await client.query(`
     INSERT INTO md_flow_editor_values(tenant_id,flow_id,property_path,value_kind,value_text)
     VALUES($1,$2,$3,$4,$5)`,[tenant,created.rows[0].id,v.path,v.kind,v.text]);
    await client.query('UPDATE md_flow_definitions SET active=false WHERE tenant_id=$1 AND id=$2',
      [tenant,previous.id]);
    await client.query('UPDATE md_flow_definitions SET active=true WHERE tenant_id=$1 AND id=$2',
      [tenant,created.rows[0].id]);
   }
  };
  if(apply)await db.transaction(run);
  else await run(db);
 }
 console.log(JSON.stringify({mode:apply?'upgraded':'preflight',flows:log},null,2));
}finally{await db.close();}
