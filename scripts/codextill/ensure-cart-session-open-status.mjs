import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {SqlPersistence} from '../../apps/server/dist-system/system-files/sql-persistence.js';
import {decodeMetadataValues} from '../../apps/server/dist-system/system-files/component-runtime.js';

// Acetill's existing AddProduct Flow creates CartSession.Status='Open'.
// Install only that expected active picklist option for the unique CODEXTILL
// tenant; preserve all other field values, Flows, pages and business records.
export const VERSION='codextill-cart-session-open-status-20261101-v1';
export const OBJECT='CartSession';
export const FIELD='Status';
export const VALUE='Open';
const checksum=createHash('sha256').update(JSON.stringify([OBJECT,FIELD,VALUE])).digest('hex');
if(process.argv.includes('--preflight')){
 assert.equal(OBJECT,'CartSession');
 assert.equal(FIELD,'Status');
 assert.equal(VALUE,'Open');
 console.log('CODEXTILL CartSession Open picklist preflight passed (no SQL writes).');
 process.exit(0);
}
if(!process.env.DATABASE_URL)throw Error('Configured production DATABASE_URL required');
if(typeof process.getuid==='function'&&process.getuid()===0){
 process.initgroups('metadrive','metadrive');
 process.setgid('metadrive');process.setuid('metadrive');
}
if(typeof process.getuid==='function'&&process.getuid()===0)
 throw Error('Refusing privileged SQL connection');
const db=new SqlPersistence(process.env.DATABASE_URL);
try{
 await db.transaction(async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',
   ['codextill-cart-session-open-status']);
  const page=await client.query(`SELECT p.tenant_id FROM md_page_definitions p
    JOIN md_lightning_page_details d ON d.tenant_id=p.tenant_id AND d.page_id=p.id
    WHERE p.api_name='CODEXTILL' AND p.enabled=true
      AND NOT EXISTS(SELECT 1 FROM md_app_seed_pages s
        WHERE s.tenant_id=p.tenant_id AND s.page_id=p.id)`);
  assert.equal(page.rows.length,1,'Expected exactly one editable CODEXTILL tenant');
  const tenant=page.rows[0].tenant_id;
  const flow=await client.query(`SELECT id FROM md_flow_definitions
    WHERE tenant_id=$1 AND api_name='AcetillCopilotAddProduct'
      AND flow_type='Autolaunched Flow' AND active=true AND archived=false
    ORDER BY version DESC LIMIT 1`,[tenant]);
  assert.equal(flow.rows.length,1,'Active Acetill AddProduct Flow missing');
  const entries=await client.query(`SELECT property_path,value_kind,value_text
    FROM md_flow_editor_values WHERE tenant_id=$1 AND flow_id=$2`,
    [tenant,flow.rows[0].id]);
  const graph=decodeMetadataValues(entries.rows).builder;
  assert(graph&&Array.isArray(graph.elements),'AddProduct Flow metadata missing');
  const sessions=graph.elements.filter(node=>
    node?.type==='Create Records' && node.config?.object===OBJECT);
  assert.equal(sessions.length,1,'Expected one CartSession creation node');
  assert(sessions[0].config.fieldValues?.some(field=>
    field.field===FIELD&&field.value===VALUE),
    'Flow no longer uses CartSession.Status=Open: refuse metadata change');
  const field=await client.query(`SELECT data_type,required FROM md_field_definitions
    WHERE tenant_id=$1 AND object_api=$2 AND api_name=$3
      AND deleted_at IS NULL`,[tenant,OBJECT,FIELD]);
  assert.equal(field.rows.length,1,'CartSession.Status field unavailable');
  assert.equal(field.rows[0].data_type,'picklist','Status is no longer a Picklist');
  const global=await client.query(`SELECT 1 FROM md_field_global_value_sets
    WHERE tenant_id=$1 AND object_api=$2 AND field_api=$3`,[tenant,OBJECT,FIELD]);
  assert.equal(global.rows.length,0,
    'Status is linked to a global value set: do not mutate shared options');
  const receipt=await client.query(
    'SELECT checksum FROM md_system_migrations WHERE version=$1',[VERSION]);
  if(receipt.rows.length)assert.equal(receipt.rows[0].checksum,checksum,
    'Picklist migration receipt changed');
  // Upsert never removes, reorders or modifies customer-configured options.
  await client.query(`INSERT INTO md_field_picklist_values
    (tenant_id,object_api,field_api,value,sort_order)
    VALUES($1,$2,$3,$4,COALESCE(
      (SELECT max(sort_order)+10 FROM md_field_picklist_values
       WHERE tenant_id=$1 AND object_api=$2 AND field_api=$3),10))
    ON CONFLICT (tenant_id,object_api,field_api,value) DO NOTHING`,
    [tenant,OBJECT,FIELD,VALUE]);
  const values=await client.query(`SELECT value FROM md_field_picklist_values
    WHERE tenant_id=$1 AND object_api=$2 AND field_api=$3
    ORDER BY sort_order,value`,[tenant,OBJECT,FIELD]);
  assert(values.rows.some(row=>row.value===VALUE),'Open picklist option not persisted');
  if(!receipt.rows.length)await client.query(`INSERT INTO md_system_migrations(version,checksum)
    VALUES($1,$2) ON CONFLICT(version) DO NOTHING`,[VERSION,checksum]);
  console.log('CODEXTILL CartSession.Status Open allowed and verified; '+values.rows.length+
    ' existing/added picklist options preserved, no Flow/page/record writes.');
 });
}finally{await db.pool.end();}
