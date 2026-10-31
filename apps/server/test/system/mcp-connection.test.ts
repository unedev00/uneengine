import assert from 'node:assert/strict';
import {test} from 'node:test';
import express from 'express';
import {readFileSync} from 'node:fs';
import {registerMcpRoutes} from '../../src/system-support/mcp-routes.js';
import {callMcpTool,mcpTools,mcpToolScopes,mcpToolAllowed,type McpServices} from '../../src/system-support/mcp-tools.js';
import {validMcpResource} from '../../src/system-support/mcp-resource.js';
import {ConnectedAppService} from '../../src/system-support/connected-app-service.js';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import type {AuthenticationService} from '../../src/system-files/authentication.js';
import type {RbacEngine} from '../../src/system-files/rbac-engine.js';
const actor={tenant_id:'tenant-a',user_id:'user-a'};
function services(scopes=['mcp:access','records:read']){
 const calls:unknown[][]=[];
 const s={
  db:{query:async(sql:string,args:unknown[])=>{
   calls.push([sql,...args]);
   if(sql.startsWith('SELECT s.scope'))return {rows:scopes.map(scope=>({scope}))};
   if(sql.includes('FROM md_oauth_scope_catalogue'))return {rows:scopes.map(scope=>({scope}))};
   return {rows:[]};
  }},
  records:{list:async(...args:unknown[])=>{calls.push(['records',...args]);return {records:[{Id:'one'}]};}},
  rbac:{require:async()=>{},allowed:async()=>true},
  platform:{requirePlatform:async()=>{}},definitions:{list:async()=>[]},flows:{execute:async()=>({}),
   loadEditor:async(...args:unknown[])=>{calls.push(['flow-read',...args]);return {apiName:'MyFlow',version:1};},
   saveEditor:async(...args:unknown[])=>{calls.push(['flow-create',...args]);return {apiName:'MyFlow',version:1};}},
  pages:{
   editor:async(...args:unknown[])=>{calls.push(['page-draft',...args]);return {apiName:'COPILOTTILL_POS',draftRevision:3,components:[]};},
   metadata:async(...args:unknown[])=>{calls.push(['page-published',...args]);return {apiName:'COPILOTTILL_POS',components:[]};},
   saveLayoutDraft:async(...args:unknown[])=>{calls.push(['page-save',...args]);return {draftRevision:4};},
   publishLayout:async(...args:unknown[])=>{calls.push(['page-publish',...args]);return {publishedRevision:4};}
  }
 } as unknown as McpServices;
 return {s,calls};
}
async function server(scopes?:string[]){
 process.env.METADRIVE_MCP_ORIGIN='https://api.example.org';
 const app=express();app.use(express.json());
 const mock=services(scopes);
 registerMcpRoutes(app,mock.s,(req,res,next)=>{
  if(req.get('authorization')!=='Bearer valid'){res.status(401).json({error:'Invalid session'});return;}
  Object.assign(req,{actor});next();
 });
 const listener=app.listen(0,'127.0.0.1');await new Promise<void>(r=>listener.once('listening',r));
 const address=listener.address();if(!address||typeof address==='string')throw Error();
 const origin='http://127.0.0.1:'+address.port;
 return {...mock,origin,close:()=>new Promise<void>((r,j)=>{listener.close(e=>e?j(e):r());listener.closeAllConnections();}),
  rpc:async(method:string,args?:unknown)=>fetch(origin+'/api/mcp',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer valid'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params:args})})};
}
test('MCP discovery has a fixed HTTPS audience and rejects invalid origins',()=>{
 process.env.METADRIVE_MCP_ORIGIN='https://api.example.org';
 assert.equal(validMcpResource('https://api.example.org/api/mcp'),true);
 assert.equal(validMcpResource('https://evil.example/api/mcp'),false);
 process.env.METADRIVE_MCP_ORIGIN='http://api.example.org';
 assert.throws(()=>validMcpResource('http://api.example.org/api/mcp'));
});
test('MCP requires authentication and a resource-bound OAuth grant',async()=>{
 const x=await server([]);try{
  const unauth=await fetch(x.origin+'/api/mcp');assert.equal(unauth.status,401);
  assert.match(unauth.headers.get('www-authenticate')??'',/oauth-protected-resource/);
  const response=await x.rpc('tools/list');assert.equal(response.status,401);
  const query=x.calls.find(c=>String(c[0]).startsWith('SELECT s.scope'))!;
  assert.equal(query.at(-1),'https://api.example.org/api/mcp');
 }finally{await x.close();}
});
test('tools are scope-filtered and attempted write without scope never reaches records',async()=>{
 const x=await server();try{
  const listed=await (await x.rpc('tools/list')).json();
  assert.deepEqual(listed.result.tools.map((t:{name:string})=>t.name),['list_records','get_record']);
  const rejected=await (await x.rpc('tools/call',{name:'delete_record',arguments:{object:'Contact',id:'123e4567-e89b-42d3-a456-426614174000'}})).json();
  assert.equal(rejected.result.isError,true);assert.equal(x.calls.some(c=>c[0]==='records'),false);
 }finally{await x.close();}
});
test('new grouped OAuth scopes expose only their corresponding MCP tools and never bypass RBAC',async()=>{
 assert.deepEqual(mcpToolScopes('get_page_layout'),['metadata:read','pages:read']);
 assert.deepEqual(mcpToolScopes('create_flow_draft'),['metadata:write','flows:manage']);
 assert.equal(mcpToolAllowed('server_operation',new Set(['operations:read']),{action:'restart'}),false);
 assert.equal(mcpToolAllowed('server_operation',new Set(['operations:read']),{action:'status'}),true);
 const x=await server(['mcp:access','pages:read','flows:read']);try{
  const list=await (await x.rpc('tools/list')).json();
  const tools=list.result.tools.map((t:{name:string})=>t.name);
  assert.ok(tools.includes('get_page_layout'));
  assert.ok(tools.includes('get_flow_definition'));
  assert.ok(!tools.includes('save_page_draft'));
  assert.ok(!tools.includes('create_flow_draft'));
  assert.ok(!tools.includes('list_records'));
  const denied=await (await x.rpc('tools/call',{name:'save_page_draft',arguments:{
   page:'COPILOTTILL_POS',definition:{draftRevision:1}}})).json();
  assert.equal(denied.result.isError,true);
  assert.equal(x.calls.some(row=>row[0]==='page-save'),false);
 }finally{await x.close();}
 const readOnly=await server(['mcp:access','operations:read']);try{
  const list=await (await readOnly.rpc('tools/list')).json();
  assert.ok(list.result.tools.some((t:{name:string})=>t.name==='server_operation'));
  const denied=await (await readOnly.rpc('tools/call',{name:'server_operation',
   arguments:{action:'activate_release',release:'0'.repeat(40)}})).json();
  assert.equal(denied.result.isError,true);
  assert.ok(!readOnly.calls.some(row=>row.includes('McpServerOperationRequested')));
 }finally{await readOnly.close();}
});

test('record calls use authenticated tenant and user, reject injected tenant arguments, and audit',async()=>{
 const x=await server();try{
  const ok=await (await x.rpc('tools/call',{name:'list_records',arguments:{object:'Contact',limit:10}})).json();
  assert.equal(ok.result.isError,undefined);
  assert.deepEqual(x.calls.find(c=>c[0]==='records')?.slice(0,5),['records','tenant-a','user-a','Contact',10]);
  assert.ok(x.calls.some(c=>c.includes('McpToolRequested')));
  assert.ok(x.calls.some(c=>c.includes('McpToolSucceeded')));
  const before=x.calls.filter(c=>c[0]==='records').length;
  const bad=await (await x.rpc('tools/call',{name:'list_records',arguments:{object:'Contact',tenant_id:'tenant-b'}})).json();
  assert.equal(bad.result.isError,true);assert.equal(x.calls.filter(c=>c[0]==='records').length,before);
 }finally{await x.close();}
});
test('MCP can inspect existing Flow metadata and create only draft flows with explicit consent',async()=>{
 const x=await server(['mcp:access','metadata:read','metadata:write']);try{
  const read=await (await x.rpc('tools/call',{name:'get_flow_definition',
   arguments:{flow:'MyFlow'}})).json();
  assert.equal(read.result.isError,undefined);
  assert.ok(x.calls.some(row=>row[0]==='flow-read'&&row[1]==='tenant-a'));
  const rejected=await (await x.rpc('tools/call',{name:'create_flow_draft',arguments:{
   flow:'MyFlow',definition:{apiName:'MyFlow',status:'Active'}
  }})).json();
  assert.equal(rejected.result.isError,true);
  assert.ok(!x.calls.some(row=>row[0]==='flow-create'));
  const created=await (await x.rpc('tools/call',{name:'create_flow_draft',arguments:{
   flow:'MyFlow',definition:{apiName:'MyFlow',status:'Draft'}
  }})).json();
  assert.equal(created.result.isError,undefined);
  assert.ok(x.calls.some(row=>row[0]==='flow-create'&&row[1]==='tenant-a'&&row[5]===true));
 }finally{await x.close();}
 const source=readFileSync(new URL('../../src/flow-engine/FlowEngineCore.ts',import.meta.url),'utf8');
 assert.match(source,/if\(createOnly&&last\)throw new Error\('Flow already exists'\)/);
});

test('Page Builder MCP reads require metadata scope and use the authenticated tenant',async()=>{
 const x=await server(['mcp:access','metadata:read']);try{
  const listed=await (await x.rpc('tools/list')).json();
  assert.ok(listed.result.tools.some((v:{name:string})=>v.name==='get_page_layout'));
  assert.ok(!listed.result.tools.some((v:{name:string})=>v.name==='save_page_draft'));
  const draft=await (await x.rpc('tools/call',{name:'get_page_layout',
   arguments:{page:'COPILOTTILL_POS',variant:'Desktop',view:'draft'}})).json();
  assert.equal(draft.result.isError,undefined);
  assert.ok(x.calls.some(row=>row[0]==='page-draft'&&row[1]==='tenant-a'));
  const denied=await (await x.rpc('tools/call',{name:'save_page_draft',arguments:{
   page:'COPILOTTILL_POS',definition:{draftRevision:3}
  }})).json();
  assert.equal(denied.result.isError,true);
  assert.ok(!x.calls.some(row=>row[0]==='page-save'));
 }finally{await x.close();}
});

test('Page Builder MCP draft/publish requires versioned metadata write consent and Page RBAC',async()=>{
 const x=await server(['mcp:access','metadata:write']);try{
  const listed=await (await x.rpc('tools/list')).json();
  assert.ok(listed.result.tools.some((v:{name:string})=>v.name==='save_page_draft'));
  assert.ok(listed.result.tools.some((v:{name:string})=>v.name==='publish_page_draft'));
  const bad=await (await x.rpc('tools/call',{name:'save_page_draft',arguments:{
   page:'COPILOTTILL_POS',definition:{components:[]}
  }})).json();
  assert.equal(bad.result.isError,true);
  assert.ok(!x.calls.some(row=>row[0]==='page-save'));
  const saved=await (await x.rpc('tools/call',{name:'save_page_draft',arguments:{
   page:'COPILOTTILL_POS',variant:'Desktop',definition:{apiName:'COPILOTTILL_POS',draftRevision:3,components:[]}
  }})).json();
  assert.equal(saved.result.isError,undefined);
  assert.deepEqual(x.calls.find(row=>row[0]==='page-save')?.slice(1,4),
   ['tenant-a','COPILOTTILL_POS','Desktop']);
  const invalid=await (await x.rpc('tools/call',{name:'publish_page_draft',arguments:{
   page:'COPILOTTILL_POS',expectedRevision:0
  }})).json();
  assert.equal(invalid.result.isError,true);
  assert.ok(!x.calls.some(row=>row[0]==='page-publish'));
  const good=await (await x.rpc('tools/call',{name:'publish_page_draft',arguments:{
   page:'COPILOTTILL_POS',variant:'Desktop',expectedRevision:4
  }})).json();
  assert.equal(good.result.isError,undefined);
  assert.ok(x.calls.some(row=>row[0]==='page-publish'&&row[1]==='tenant-a'&&row[4]===4));
 }finally{await x.close();}
 const {s,calls}=services();
 s.rbac.require=async()=>{throw Error('Page permission denied');};
 await assert.rejects(callMcpTool(s,actor,'save_page_draft',{
  page:'COPILOTTILL_POS',definition:{draftRevision:3}}),/Page permission denied/);
 assert.ok(!calls.some(row=>row[0]==='page-save'));
});

test('stateless transport negotiates version, acknowledges notifications and rejects GET streams',async()=>{
 const x=await server();try{
  const result=await (await x.rpc('initialize',{protocolVersion:'future',clientInfo:{name:'test',version:'1'},capabilities:{}})).json();
  assert.equal(result.result.protocolVersion,'2025-06-18');
  const notification=await fetch(x.origin+'/api/mcp',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer valid'},body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})});assert.equal(notification.status,202);
  assert.equal((await fetch(x.origin+'/api/mcp',{headers:{Authorization:'Bearer valid'}})).status,405);
 }finally{await x.close();}
});
test('server operations enforce platform membership before executing any command',async()=>{
 const {s}=services();let rbacCalled=false;
 s.platform.requirePlatform=async()=>{throw Error('Platform permission denied');};
 s.rbac.require=async()=>{rbacCalled=true;};
 await assert.rejects(callMcpTool(s,actor,'server_operation',{action:'restart',service:'api'}),/Platform permission denied/);
 assert.equal(rbacCalled,false);
 await assert.rejects(callMcpTool(s,actor,'server_operation',{action:'restart',service:'api;id'}));
 await assert.rejects(callMcpTool(s,actor,'server_operation',{action:'activate_release',service:'api',release:'../../etc/passwd'}));
});
test('tool schemas describe real properties and reject additional properties',()=>{
 const schema=mcpTools.find(t=>t.name==='list_records')!.inputSchema as {properties?:unknown;additionalProperties?:boolean};
 assert.ok(schema.properties);assert.equal(schema.additionalProperties,false);
});
test('OAuth rejects a code exchange with the wrong resource before consuming code or issuing tokens',async()=>{
 let consumed=false,issued=false;
 const db={query:async()=>({rows:[{tenant_id:'tenant-a',id:'123e4567-e89b-42d3-a456-426614174000',client_type:'public'}]}),transaction:async(fn:(c:unknown)=>unknown)=>fn({query:async(sql:string)=>{
  if(sql.startsWith('UPDATE'))consumed=true;
  return {rows:[{consent_id:'consent',user_id:'user-a',resource:'https://api.example.org/api/mcp',redirect_uri:'https://client.example/callback',challenge:'wrong'}]};
 }})} as unknown as SqlPersistence;
 const auth={issuePasswordSession:async()=>{issued=true;}} as unknown as AuthenticationService;
 const s=new ConnectedAppService(db,auth,{} as RbacEngine);
 await assert.rejects(s.exchange({grant_type:'authorization_code',client_id:'123e4567-e89b-42d3-a456-426614174000',code:'a'.repeat(43),redirect_uri:'https://client.example/callback',code_verifier:'b'.repeat(43),resource:'https://evil.example/api/mcp'}),/Invalid OAuth grant/);
 assert.equal(consumed,false);assert.equal(issued,false);
});
