import {AppRuntime} from '../../src/system-files/app-runtime.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seedUneAceChatterCatalog,UNE_ACECHATTER_APP as APP}
 from '../../src/app-seeders/une-acechatter-catalog.js';
import {seedUneAceChatterInstalledPages}
 from '../../src/app-seeders/une-acechatter-pages.js';

const tenant='tenant-a';
const componentNames=['une_conversation','une_modal','une_tabs','une_stack',
 'une_lookup','une_input','une_button','une_search'];
const flows=['AceChatterLoadConversations','AceChatterLoadCommunications',
 'AceChatterLoadContacts','AceChatterCreateConversation',
 'AceChatterFindConversationByPhone','AceChatterSendMessage'];
function fixture(mode:'new'|'existing'|'uninstalled'|'missing-original'|'no-read-flows'='new'){
 const calls:Array<{sql:string;params:unknown[]}>=[];
 const client={query:async(sql:string,params:unknown[]=[])=>{
  calls.push({sql,params});
  if(sql.includes('FROM md_apps')&&sql.includes("api_name='AceChatter'")&&!sql.includes('md_app_installations'))
   return {rows:[{id:'existing-app-id'}],rowCount:1};
  if(sql.includes('SELECT id FROM md_apps'))return {rows:[{id:'une-app-id'}],rowCount:1};
  if(sql.includes('SELECT a.id FROM md_apps'))return {rows:mode==='uninstalled'?[]:[{id:'une-app-id'}],rowCount:1};
  if(sql.includes('FROM md_app_installations i')&&sql.includes("a.api_name='AceChatter'"))
   return {rows:mode==='missing-original'?[]:[{exists:1}],rowCount:1};
  if(sql.includes('FROM md_component_definitions'))
   return {rows:componentNames.map(api_name=>({api_name})),rowCount:componentNames.length};
  if(sql.includes('FROM md_flow_definitions'))
   return {rows:(mode==='no-read-flows'?flows.slice(3):flows)
    .map(api_name=>({api_name})),rowCount:flows.length};
  if(sql.includes('INSERT INTO md_page_definitions'))
   return {rows:mode==='existing'?[]:[{id:'page-'+params[1]}],rowCount:1};
  if(sql.includes('SELECT id FROM md_page_definitions'))
   return {rows:[{id:'page-'+params[1]}],rowCount:1};
  if(sql.includes('SELECT EXISTS('))return {rows:[{allowed:true}],rowCount:1};
  return {rows:[],rowCount:1};
 }};
 return {client,calls};
}
test('UNE AceChatter is a separate catalog entry with a required pre-installed AceChatter dependency',async()=>{
 const {client,calls}=fixture();
 await seedUneAceChatterCatalog({transaction:async(fn:(tx:unknown)=>Promise<void>)=>fn(client)} as never);
 assert.equal(APP.apiName,'UNEAceChatter');
 assert.equal(APP.label,'UNE AceChatter');
 assert.deepEqual(Object.keys(APP.pages).sort(),['custom','desktop','phone','tablet']);
 assert.ok(calls.some(x=>x.sql.includes('md_app_package_dependencies')
  &&x.params.includes('existing-app-id')));
 assert.ok(!calls.some(x=>x.sql.includes('INSERT INTO md_app_installations')));
});
test('install creates four independent editable layouts and only references existing Flows',async()=>{
 const {client,calls}=fixture();
 assert.equal(await seedUneAceChatterInstalledPages(client as never,tenant),true);
 const pages=calls.filter(x=>x.sql.includes('INSERT INTO md_page_definitions'));
 assert.equal(pages.length,4);
 assert.equal(new Set(pages.map(x=>x.params[1])).size,4);
 assert.equal(calls.filter(x=>x.sql.includes('INSERT INTO md_lightning_page_details')).length,4);
 assert.equal(calls.filter(x=>x.sql.includes('INSERT INTO md_app_home_pages')).length,3);
 assert.equal(calls.filter(x=>x.sql.includes('INSERT INTO md_lightning_page_activation')).length,4);
 const nodes=calls.filter(x=>x.sql.includes('INSERT INTO md_lightning_page_nodes'));
 assert.equal(nodes.length,48);
 assert.ok(nodes.some(x=>x.params.includes('Custom:une_conversation')));
 assert.ok(nodes.some(x=>x.params.includes('Custom:une_modal')));
 assert.ok(nodes.some(x=>x.params.includes('Custom:une_lookup')));
 assert.ok(nodes.every(x=>String(x.params[3]).startsWith('Custom:une_')));
 const encoded=calls.filter(x=>x.sql.includes('INSERT INTO md_lightning_page_node_properties'));
 for(const flow of flows)assert.ok(encoded.some(x=>x.params.includes(flow)),'missing '+flow);
 assert.ok(encoded.some(x=>x.params.includes('/props/stateBindings/messages')
  &&x.params.includes('chatMessages')));
 assert.ok(encoded.some(x=>x.params.includes('/props/actionFlows/newConversationOpen/actionType')));
 assert.ok(encoded.some(x=>x.params.includes('/props/actionFlows/create/flowApiName')
   &&x.params.includes('AceChatterCreateConversation')));
 assert.ok(encoded.some(x=>x.params.includes('/props/actionFlows/click/inputs/phoneNumber')
   &&x.params.includes('$state.contactSelection.phoneNumber')));
 assert.ok(!calls.some(x=>/INSERT INTO md_flow_definitions|UPDATE md_flow_definitions|DELETE FROM md_flow_definitions|INSERT INTO md_record_values/.test(x.sql)));
});
test('reinstall never overwrites user edited page nodes, properties or activation',async()=>{
 const {client,calls}=fixture('existing');
 assert.equal(await seedUneAceChatterInstalledPages(client as never,tenant),true);
 assert.equal(calls.filter(x=>x.sql.includes('INSERT INTO md_page_definitions')).length,4);
 assert.equal(calls.filter(x=>x.sql.includes('INSERT INTO md_lightning_page_nodes')).length,0);
 assert.equal(calls.filter(x=>x.sql.includes('INSERT INTO md_lightning_page_node_properties')).length,0);
 assert.equal(calls.filter(x=>x.sql.includes('UPDATE md_lightning_page_details')).length,0);
});
test('uninstalled UNE AceChatter and missing source never create pages',async()=>{
 for(const mode of ['uninstalled','missing-original'] as const){
  const {client,calls}=fixture(mode);
  if(mode==='uninstalled')assert.equal(await seedUneAceChatterInstalledPages(client as never,tenant),false);
  else await assert.rejects(seedUneAceChatterInstalledPages(client as never,tenant),/requires an active AceChatter/);
  assert.ok(!calls.some(x=>x.sql.includes('INSERT INTO md_page_definitions')));
 }
});
test('no fake conversation page when required existing read Flows are inactive',async()=>{
 const {client,calls}=fixture('no-read-flows');
 await assert.rejects(seedUneAceChatterInstalledPages(client as never,tenant),/read Flows inactive/);
 assert.ok(!calls.some(x=>x.sql.includes('INSERT INTO md_page_definitions')));
});

test('shared AppExchange installation creates the tenant metadata FK parent before UNE page navigation',async()=>{
 const base=fixture();
 let parentInserted=false;
 const seen:string[]=[];
 const client={query:async(sql:string,params:unknown[]=[])=>{
   seen.push(sql);
   if(sql.includes('INSERT INTO md_tenant_app_metadata'))parentInserted=true;
   if(sql.includes('INSERT INTO md_tenant_app_navigation')&&!parentInserted){
     const error=Object.assign(new Error('tenant app metadata FK missing'),{code:'23503'});
     throw error;
   }
   if(sql.includes('SELECT a.id,a.api_name,a.label FROM md_apps'))
     return {rows:[{id:'une-app-id',api_name:APP.apiName,label:APP.label}],rowCount:1};
   if(sql.includes('FROM md_app_package_versions')&&sql.includes('published=true'))
     return {rows:[{version:1,description:'UNE UI only',brand_color:'#128C7E'}],rowCount:1};
   if(sql.includes('FROM md_app_package_dependencies d'))
     return {rows:[{api_name:'AceChatter',minimum_version:1,installed_version:1,
       installed:true,licensed:true}],rowCount:1};
   return base.client.query(sql,params);
 }};
 const db={transaction:async <T>(work:(tx:typeof client)=>Promise<T>)=>work(client)};
 await new AppRuntime(db as never).install(tenant,APP.apiName);
 assert.equal(parentInserted,true);
 const parentIndex=seen.findIndex(sql=>sql.includes('INSERT INTO md_tenant_app_metadata'));
 const firstNavigationIndex=seen.findIndex(sql=>sql.includes('INSERT INTO md_tenant_app_navigation'));
 const pageIndex=seen.findIndex(sql=>sql.includes('INSERT INTO md_page_definitions'));
 assert.ok(parentIndex>0);
 assert.ok(firstNavigationIndex>parentIndex,'navigation FK parent must precede UI seeding');
 assert.ok(pageIndex>parentIndex,'Page Builder seeding must follow app metadata');
 assert.equal(seen.filter(sql=>sql.includes('INSERT INTO md_tenant_app_metadata')).length,1);
 assert.equal(seen.filter(sql=>sql.includes('INSERT INTO md_page_definitions')).length,4);
 assert.ok(!seen.some(sql=>/INSERT INTO md_flow_definitions|DELETE FROM md_records|UPDATE md_record_values/.test(sql)));
});
