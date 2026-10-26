import assert from 'node:assert/strict';
import {test} from 'node:test';
import {requireAvailableMetadataName,validateMetadataName} from '../../src/system-support/metadata-name-guard.js';

test('validates metadata API identifiers before SQL access',async()=>{
  assert.throws(()=>validateMetadataName('123 name'),/Invalid API name/);
  let queried=false;
  await assert.rejects(()=>requireAvailableMetadataName({query:async()=>{queried=true;return {rows:[],rowCount:0};}} as never,
    'tenant','globalValueSet','Invalid Name'),/Invalid API name/);
  assert.equal(queried,false);
});

test('rejects tenant-scoped duplicate identifiers with safe table whitelist',async()=>{
  let query='';let args:readonly unknown[]=[];
  await assert.rejects(()=>requireAvailableMetadataName({query:async(sql:string,params:readonly unknown[])=>{
    query=sql;args=params;return {rows:[{metadata_name_exists:true}],rowCount:1};
  }} as never,'tenant-a','matchingRule','Matching_One',{objectApi:'Account'}),/API Name already exists/);
  assert.match(query,/md_matching_rules/);
  assert.match(query,/object_api=\$3/);
  assert.deepEqual(args,['tenant-a','Matching_One','Account']);
});

test('allows a new name without a conflicting SQL row',async()=>{
  await requireAvailableMetadataName({query:async()=>({rows:[],rowCount:0})} as never,'tenant','customSetting','New_Setting');
});

test('case-insensitive metadata uniqueness is enforced by idempotent SQL indexes',async()=>{
  const {readFile}=await import('node:fs/promises');
  const sql=await readFile(new URL('../../src/system-support/migrations/20261026-metadata-api-name-casefold-uniqueness.sql',import.meta.url),'utf8');
  for(const table of ['md_custom_labels','md_custom_metadata_types','md_custom_settings',
    'md_custom_metadata_fields','md_custom_setting_fields','md_global_value_sets',
    'md_matching_rules','md_validation_rules','md_object_definitions',
    'md_field_definitions','md_page_definitions','md_component_definitions',
    'md_flow_definitions','md_global_quick_actions','md_system_definitions','md_tenant_app_metadata','md_named_credentials']){
    assert.match(sql,new RegExp('ON '+table+'\\('));
  }
  assert.equal((sql.match(/CREATE UNIQUE INDEX IF NOT EXISTS/g)??[]).length,17);
});

test('system definition duplicate check isolates tenant and metadata kind',async()=>{
  let capturedSql='';let capturedArgs:readonly unknown[]=[];
  await requireAvailableMetadataName({query:async(sql:string,args:readonly unknown[])=>{
    capturedSql=sql;capturedArgs=args;return {rows:[],rowCount:0};
  }} as never,'tenant-a','systemDefinition','Sales_Report',{systemKind:'reports'});
  assert.match(capturedSql,/kind=\$3/);
  assert.deepEqual(capturedArgs,['tenant-a','Sales_Report','reports']);
});

test('creation paths isolate page and field identities at tenant/object boundaries',async()=>{
 const seen:Array<{sql:string;args:readonly unknown[]}>= [];
 const db={query:async(sql:string,args:readonly unknown[])=>{seen.push({sql,args});return {rows:[],rowCount:0};}};
 await requireAvailableMetadataName(db as never,'tenant-one','page','Contact_Page');
 await requireAvailableMetadataName(db as never,'tenant-one','field','Contact_Code',{objectApi:'Contact'});
 assert.match(seen[0].sql,/md_page_definitions/);
 assert.deepEqual(seen[0].args,['tenant-one','Contact_Page']);
 assert.match(seen[1].sql,/object_api=\$3/);
 assert.deepEqual(seen[1].args,['tenant-one','Contact_Code','Contact']);
 await assert.rejects(()=>requireAvailableMetadataName(db as never,'tenant-one','field','Contact_Code'),/Object scope required/);
});

test('duplicate-name guard ignores unrelated populated rows from broad SQL fixtures',async()=>{
 const queries:string[]=[];
 const genericFixture={rows:[{api_name:'Some_other_record',label:'Fixture'}],rowCount:1};
 const db={query:async(sql:string)=>{queries.push(sql);return genericFixture;}};
 await requireAvailableMetadataName(db as never,'tenant','object','New_Object');
 await requireAvailableMetadataName(db as never,'tenant','field','New_Field',{objectApi:'New_Object'});
 assert.equal(queries.length,2);
 assert.ok(queries.every(sql=>sql.includes('SELECT TRUE AS metadata_name_exists')));
});

test('duplicate-name guard still rejects exact SQL existence matches',async()=>{
 const db={query:async()=>({rows:[{metadata_name_exists:true}],rowCount:1})};
 await assert.rejects(()=>requireAvailableMetadataName(db as never,'tenant','object','Existing_Object'),
   /API Name already exists/);
});

test('webhook and named credential identifiers use separate tenant-scoped tables',async()=>{
 const seen:Array<{sql:string;args:readonly unknown[]}>= [];
 const db={query:async(sql:string,args:readonly unknown[])=>{
   seen.push({sql,args});return {rows:[],rowCount:0};
 }};
 await requireAvailableMetadataName(db as never,'tenant-a','namedCredential','Provider_One');
 await requireAvailableMetadataName(db as never,'tenant-a','inboundWebhook','Provider_One');
 await requireAvailableMetadataName(db as never,'tenant-a','outboundWebhook','Provider_One');
 assert.match(seen[0].sql,/FROM md_named_credentials/);
 assert.match(seen[0].sql,/lower\(name\)=lower\(\$2\)/);
 assert.match(seen[1].sql,/FROM md_inbound_webhook_endpoints/);
 assert.match(seen[2].sql,/FROM md_webhook_subscriptions/);
 assert(seen.every(call=>call.args[0]==='tenant-a'));
});

test('late inbound endpoint index is migration ordered and preserves existing data',async()=>{
 const {readFile}=await import('node:fs/promises');
 const sql=await readFile(new URL('../../src/system-support/migrations/20261224-inbound-webhook-api-name-uniqueness.sql',import.meta.url),'utf8');
 assert.match(sql,/CREATE UNIQUE INDEX IF NOT EXISTS md_inbound_webhook_endpoints_api_name_ci_uq/);
 assert.match(sql,/CREATE UNIQUE INDEX IF NOT EXISTS md_webhook_subscriptions_api_name_ci_uq/);
 assert.equal((sql.match(/CREATE UNIQUE INDEX IF NOT EXISTS/g)??[]).length,2);
 assert.match(sql,/GROUP BY tenant_id,lower\(api_name\) HAVING count\(\*\)>1/);
 assert.doesNotMatch(sql,/\bDELETE\b|\bUPDATE\b|\bTRUNCATE\b/);
});

test('legacy tenant metadata migration detects case-only collisions without mutating records',async()=>{
 const {readFile}=await import('node:fs/promises');
 const sql=await readFile(new URL('../../src/system-support/migrations/20261026-metadata-api-name-casefold-uniqueness.sql',import.meta.url),'utf8');
 assert.match(sql,/GROUP BY %s HAVING count\(\*\) > 1/);
 assert.match(sql,/RAISE EXCEPTION 'Case-insensitive API Name conflicts/);
 assert.match(sql,/tenant_id, object_api, lower\(api_name\)/);
 assert.match(sql,/tenant_id, kind, lower\(api_name\)/);
 assert.match(sql,/tenant_id, language, lower\(api_name\)/);
 assert.doesNotMatch(sql,/\bDELETE FROM\b|\bUPDATE\s+md_|\bTRUNCATE\b/);
});
