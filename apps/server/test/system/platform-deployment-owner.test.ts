import test from 'node:test';
import assert from 'node:assert/strict';
import type {SqlPersistence} from '../../src/system-files/sql-persistence.js';
import {seedPlatformDeploymentOwner} from '../../src/app-seeders/platform-deployment-owner.js';

const env={
 METADRIVE_BOOTSTRAP_TENANT_ID:'platform',
 METADRIVE_BOOTSTRAP_DOMAIN:'platform.example.test',
 METADRIVE_BOOTSTRAP_ADMIN_EMAIL:'owner@example.test'
};
const tenant='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const user='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function dbFixture(options:{receipt?:boolean;identity?:boolean;rootCandidates?:number;fallbackCandidates?:number;directRootCandidates?:number;directFallbackCandidates?:number;tenantCount?:number}={}){
 const statements:Array<{sql:string;params:unknown[]}>=[];
 const query=async(sql:string,params:unknown[]=[])=>{
  statements.push({sql,params});
  if(sql.includes('FROM md_platform_deployment_owner_receipts LIMIT 1'))
   return {rows:options.receipt?[{tenant_id:tenant,user_id:user}]:[]};
  if(sql.includes('SELECT u.tenant_id,u.id AS user_id'))
   return {rows:options.identity===false?[]:[{tenant_id:tenant,user_id:user}]};
  if(sql.includes('SELECT count(*)::integer AS tenant_count FROM md_tenants'))
   return {rows:[{tenant_count:options.tenantCount??1}]};
  if(sql.includes('AS root_direct_manage'))
   return {rows:[{tenants:options.tenantCount??1,canonical_domains:0,
    active_internal:2,direct_oneengine:1,direct_oneengine_manage:0,
    root_direct_oneengine:0,root_direct_manage:0}]};
  if(sql.includes('SELECT DISTINCT u.tenant_id,u.id AS user_id')){
   const direct=sql.includes('JOIN md_permission_assignments a');
   const root=sql.includes('WHERE d.domain=$1');
   const count=root
    ?direct?(options.directRootCandidates??0):(options.rootCandidates??1)
    :direct?(options.directFallbackCandidates??0):(options.fallbackCandidates??1);
   return {rows:Array.from({length:count},(_,i)=>({tenant_id:tenant,user_id:user+i}))};
  }
  return {rows:[]};
 };
 const db={transaction:async(callback:(client:{query:typeof query})=>Promise<unknown>)=>callback({query})} as unknown as Pick<SqlPersistence,'transaction'>;
 return {db,statements};
}
test('unconfigured platform owner never receives or creates a deployment grant',async()=>{
 const {db,statements}=dbFixture();
 assert.equal(await seedPlatformDeploymentOwner(db,{}),'not-configured');
 assert.equal(statements.length,0);
});
test('platform grant requires the exact trusted bootstrap tenant, domain and original OneEngine owner',async()=>{
 const {db,statements}=dbFixture({identity:false});
 assert.equal(await seedPlatformDeploymentOwner(db,env),'identity-not-found');
 const identity=statements.find(x=>x.sql.includes('SELECT u.tenant_id,u.id AS user_id'));
 assert.deepEqual(identity?.params,['platform','platform.example.test','owner@example.test']);
 assert.match(identity!.sql,/t.slug=\$1 AND d.domain=\$2 AND lower\(u.email\)=\$3/);
 assert.match(identity!.sql,/u.enabled=true AND t.status='ACTIVE'/);
 assert.match(identity!.sql,/p.api_name='OneEngine'/);
 assert.ok(!statements.some(x=>x.sql.includes('INSERT INTO md_permission_assignments')));
});
test('grant is minimal, auditable, and inserted once without overwriting existing deny',async()=>{
 const {db,statements}=dbFixture();
 assert.equal(await seedPlatformDeploymentOwner(db,env),'granted');
 assert.ok(statements.some(x=>x.sql.includes('pg_advisory_xact_lock')));
 const set=statements.find(x=>x.sql.includes('INSERT INTO md_permission_sets'));
 assert.match(set!.sql,/PlatformDeveloper/);
 const rules=statements.find(x=>x.sql.includes('INSERT INTO md_permission_rules'));
 assert.match(rules!.sql,/'PlatformOperations','manage','allow'/);
 assert.match(rules!.sql,/ON CONFLICT.*DO NOTHING/);
 assert.doesNotMatch(rules!.sql,/\*','\*'/);
 assert.ok(statements.some(x=>x.sql.includes('INSERT INTO md_permission_assignments')));
 assert.ok(statements.some(x=>x.sql.includes('INSERT INTO md_platform_deployment_owner_receipts')));
 const audit=statements.find(x=>x.sql.includes('INSERT INTO md_security_events'));
 assert.match(audit!.sql,/bootstrap-granted/);
 assert.match(audit!.sql,/actor_user_id,subject_user_id/);
 assert.deepEqual(audit!.params,[tenant,user]);
});
test('prior bootstrap receipt permanently preserves revocation and prevents new owner self-selection',async()=>{
 const {db,statements}=dbFixture({receipt:true});
 assert.equal(await seedPlatformDeploymentOwner(db,env),'already-provisioned');
 assert.ok(!statements.some(x=>x.sql.includes('INSERT INTO md_permission_assignments')));
 assert.ok(!statements.some(x=>x.sql.includes('INSERT INTO md_permission_rules')));
});
test('invalid configuration fails closed without querying the database',async()=>{
 const {db,statements}=dbFixture();
 await assert.rejects(
  seedPlatformDeploymentOwner(db,{...env,METADRIVE_BOOTSTRAP_DOMAIN:'../../untrusted'}),
  /Invalid trusted platform bootstrap identity/);
 assert.equal(statements.length,0);
});

test('OCI canonical-domain bootstrap grants only a unique existing platform root developer',async()=>{
 const {db,statements}=dbFixture({rootCandidates:1});
 assert.equal(await seedPlatformDeploymentOwner(db,{METADRIVE_PLATFORM_CANONICAL_DOMAIN:'unesolutions.co.uk'}),'granted');
 const match=statements.find(x=>x.sql.includes('SELECT DISTINCT u.tenant_id,u.id AS user_id'));
 assert.deepEqual(match?.params,['unesolutions.co.uk']);
 assert.match(match!.sql,/r.api_name='TenantDeveloper'/);
 assert.match(match!.sql,/p.api_name='OneEngine'/);
 assert.match(match!.sql,/d.domain=\$1 AND t.status='ACTIVE'/);
 assert.match(match!.sql,/u.user_type='internal'/);
 assert.ok(statements.some(x=>x.sql.includes('INSERT INTO md_permission_assignments')));
});
test('OCI root with ambiguous platform operators fails closed and grants none',async()=>{
 const {db,statements}=dbFixture({rootCandidates:2});
 assert.equal(await seedPlatformDeploymentOwner(db,{METADRIVE_PLATFORM_CANONICAL_DOMAIN:'unesolutions.co.uk'}),'identity-not-found');
 assert.ok(!statements.some(x=>x.sql.includes('INSERT INTO md_permission_assignments')));
});
test('untrusted OCI domain values are rejected',async()=>{
 const {db,statements}=dbFixture();
 await assert.rejects(seedPlatformDeploymentOwner(db,{METADRIVE_PLATFORM_CANONICAL_DOMAIN:'api.bad.example'}),
  /Invalid root-installed OCI canonical domain/);
 assert.equal(statements.length,0);
});

test('legacy OCI with one tenant and exactly one original developer is bootstrapped',async()=>{
 const {db,statements}=dbFixture({rootCandidates:0,tenantCount:1,fallbackCandidates:1});
 assert.equal(await seedPlatformDeploymentOwner(db,{METADRIVE_PLATFORM_CANONICAL_DOMAIN:'unesolutions.co.uk'}),'granted');
 assert.ok(statements.some(x=>x.sql.includes('SELECT count(*)::integer AS tenant_count')));
 const fallback=statements.find(x=>x.sql.includes('SELECT DISTINCT u.tenant_id,u.id AS user_id')
  && !x.sql.includes('WHERE d.domain=$1'));
 assert.match(fallback!.sql,/r.api_name='TenantDeveloper'/);
 assert.match(fallback!.sql,/p.api_name='OneEngine'/);
 assert.match(fallback!.sql,/HAVING count\(\*\)=1/);
 assert.ok(statements.some(x=>x.sql.includes('INSERT INTO md_permission_assignments')));
});
test('OCI owner recovery never assigns a platform grant to a multi-tenant service',async()=>{
 const {db,statements}=dbFixture({rootCandidates:0,tenantCount:2,fallbackCandidates:1});
 assert.equal(await seedPlatformDeploymentOwner(db,{METADRIVE_PLATFORM_CANONICAL_DOMAIN:'unesolutions.co.uk'}),'identity-not-found');
 assert.ok(!statements.some(x=>x.sql.includes('INSERT INTO md_permission_assignments')));
 assert.ok(!statements.some(x=>x.sql.includes('HAVING count(*)=1')));
});
test('OCI owner recovery requires a single original developer and rejects ambiguity',async()=>{
 const {db,statements}=dbFixture({rootCandidates:0,tenantCount:1,fallbackCandidates:2});
 assert.equal(await seedPlatformDeploymentOwner(db,{METADRIVE_PLATFORM_CANONICAL_DOMAIN:'unesolutions.co.uk'}),'identity-not-found');
 assert.ok(!statements.some(x=>x.sql.includes('INSERT INTO md_permission_assignments')));
});

test('direct OneEngine assignment in canonical OCI root recovers platform owner without legacy role',async()=>{
 const {db,statements}=dbFixture({rootCandidates:0,directRootCandidates:1});
 assert.equal(await seedPlatformDeploymentOwner(db,{METADRIVE_PLATFORM_CANONICAL_DOMAIN:'unesolutions.co.uk'}),'granted');
 const direct=statements.find(x=>x.sql.includes('JOIN md_permission_assignments a')
  && x.sql.includes('WHERE d.domain=$1'));
 assert.deepEqual(direct?.params,['unesolutions.co.uk']);
 assert.match(direct!.sql,/p.api_name='OneEngine'/);
 assert.match(direct!.sql,/md_rbac_allowed\(u.tenant_id,u.id,'Tenant','manage'\)/);
 assert.match(direct!.sql,/u.enabled=true AND u.user_type='internal'/);
 assert.ok(statements.some(x=>x.sql.includes('INSERT INTO md_permission_assignments')));
});
test('multiple direct OneEngine operators cannot claim platform deployment',async()=>{
 const {db,statements}=dbFixture({rootCandidates:0,directRootCandidates:2});
 assert.equal(await seedPlatformDeploymentOwner(db,{METADRIVE_PLATFORM_CANONICAL_DOMAIN:'unesolutions.co.uk'}),'identity-not-found');
 assert.ok(!statements.some(x=>x.sql.includes('INSERT INTO md_permission_assignments')));
});
test('single-tenant OCI root can recover a unique direct OneEngine owner without seeded role',async()=>{
 const {db,statements}=dbFixture({rootCandidates:0,directRootCandidates:0,tenantCount:1,
  fallbackCandidates:0,directFallbackCandidates:1});
 assert.equal(await seedPlatformDeploymentOwner(db,{METADRIVE_PLATFORM_CANONICAL_DOMAIN:'unesolutions.co.uk'}),'granted');
 const direct=statements.find(x=>x.sql.includes('JOIN md_permission_assignments a')
  && x.sql.includes('(SELECT count(*) FROM md_tenants)=1'));
 assert.ok(direct);
 assert.match(direct!.sql,/md_rbac_allowed\(u.tenant_id,u.id,'Tenant','manage'\)/);
 assert.ok(statements.some(x=>x.sql.includes('INSERT INTO md_permission_assignments')));
});
test('single-tenant OCI root rejects ambiguous direct OneEngine owners',async()=>{
 const {db,statements}=dbFixture({rootCandidates:0,directRootCandidates:0,tenantCount:1,
  fallbackCandidates:0,directFallbackCandidates:2});
 assert.equal(await seedPlatformDeploymentOwner(db,{METADRIVE_PLATFORM_CANONICAL_DOMAIN:'unesolutions.co.uk'}),'identity-not-found');
 assert.ok(!statements.some(x=>x.sql.includes('INSERT INTO md_permission_assignments')));
});
test('two tenants never trigger direct-OneEngine recovery without canonical domain match',async()=>{
 const {db,statements}=dbFixture({rootCandidates:0,directRootCandidates:0,tenantCount:2,
  fallbackCandidates:0,directFallbackCandidates:1});
 assert.equal(await seedPlatformDeploymentOwner(db,{METADRIVE_PLATFORM_CANONICAL_DOMAIN:'unesolutions.co.uk'}),'identity-not-found');
 assert.ok(!statements.some(x=>x.sql.includes('(SELECT count(*) FROM md_tenants)=1')));
 assert.ok(!statements.some(x=>x.sql.includes('INSERT INTO md_permission_assignments')));
});

test('failed OCI bootstrap emits only safe aggregate eligibility diagnostics',async()=>{
 const {db,statements}=dbFixture({rootCandidates:0,directRootCandidates:0,
  tenantCount:1,fallbackCandidates:0,directFallbackCandidates:0});
 const original=console.info;
 const logs:string[]=[];
 console.info=(...args:unknown[])=>{logs.push(args.map(String).join(' '));};
 try{
  assert.equal(await seedPlatformDeploymentOwner(db,{
   METADRIVE_PLATFORM_CANONICAL_DOMAIN:'unesolutions.co.uk'}),'identity-not-found');
 }finally{console.info=original;}
 const log=logs.find(x=>x.includes('Platform owner eligibility counts:'))??'';
 assert.match(log,/"direct_oneengine":1/);
 assert.match(log,/"direct_oneengine_manage":0/);
 assert.doesNotMatch(log,/@|password|email|tenant_id|user_id/);
 const probe=statements.find(x=>x.sql.includes('AS root_direct_manage'));
 assert.ok(probe);
 assert.match(probe!.sql,/md_rbac_allowed/);
 assert.ok(!statements.some(x=>x.sql.includes('INSERT INTO md_permission_assignments')));
});
