import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {PAGE_LAYOUT_VARIANTS,pageLayoutVariant,runtimeLayoutVariant,
 mergePublishedPageActivation} from '../../src/system-files/page-layout-version-runtime.js';

const schema=readFileSync(new URL('../../src/system-support/migrations/20261215-page-layout-versions.sql',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../../src/system-files/page-runtime.ts',import.meta.url),'utf8');
const service=readFileSync(new URL('../../src/system-files/page-layout-version-runtime.ts',import.meta.url),'utf8');
const server=readFileSync(new URL('../../src/system-support/server.ts',import.meta.url),'utf8');
const customTargets=readFileSync(new URL('../../src/system-support/migrations/20261216-page-layout-custom-targets.sql',import.meta.url),'utf8');


test('four independent layout identities map to the correct published runtime',()=>{
 assert.deepEqual(PAGE_LAYOUT_VARIANTS,['Mobile','Desktop','Tablet','Custom']);
 assert.equal(runtimeLayoutVariant('Phone'),'Mobile');
 assert.equal(runtimeLayoutVariant('Mobile'),'Mobile');
 assert.equal(runtimeLayoutVariant('Tablet'),'Tablet');
 assert.equal(runtimeLayoutVariant('Custom'),'Custom');
 assert.equal(runtimeLayoutVariant('Desktop'),'Desktop');
 assert.throws(()=>pageLayoutVariant('Unknown'),/Invalid page layout/);
});

test('each immutable layout revision is SQL relational, tenant-scoped and versioned',()=>{
 for(const table of ['md_page_layout_heads','md_page_layout_versions','md_page_layout_version_nodes',
  'md_page_layout_version_properties','md_page_layout_version_activation']){
  assert.match(schema,new RegExp('CREATE TABLE IF NOT EXISTS '+table));
 }
 assert.doesNotMatch(schema,/\bjsonb?\b/i);
 assert.match(schema,/PRIMARY KEY\(tenant_id,page_id,variant,version\)/);
 assert.match(schema,/FOREIGN KEY\(tenant_id,page_id,variant,draft_version\)/);
 assert.match(schema,/FOREIGN KEY\(tenant_id,page_id,variant,published_version\)/);
 assert.match(service,/draft_version=\$4/);
 assert.match(service,/published_version=\$4/);
});

test('legacy page SQL is preserved while draft and runtime published paths stay separate',()=>{
 assert.match(service,/INSERT INTO md_page_layout_versions/);
 assert.match(service,/INSERT INTO md_page_layout_version_nodes/);
 assert.match(service,/UPDATE md_page_layout_heads SET draft_version/);
 assert.match(service,/UPDATE md_page_layout_heads SET published_version/);
 assert.match(runtime,/this\.layouts\.load\(tenantId,pageApi,variant,'published',base\)/);
 assert.match(runtime,/this\.layouts\.load\(tenantId,pageApi,variant,'draft',base\)/);
 assert.match(server,/await rbac\.require\(actor\.tenant_id,actor\.user_id,'PageDefinition','manage'\)/);
 assert.match(server,/assertMetadataPackageEditable\(db,actor\.tenant_id,'page',req\.params\.apiName\)/);
});


test('publishing Mobile replaces only Phone activation and preserves Desktop selection',()=>{
 const desktop={assignment_id:'same-key',scope:'Org Default',app_api:null,profile_id:null,
  record_type_id:null,desktop:true,phone:true,sort_order:0};
 const mobile={assignment_id:'same-key',scope:'App Default',app_api:'MobileApp',profile_id:null,
  record_type_id:null,desktop:false,phone:true,sort_order:0};
 const next=mergePublishedPageActivation([desktop],[mobile],'Mobile');
 assert.equal(next.length,2);
 assert.deepEqual(next.map(a=>[a.scope,a.desktop,a.phone]),[
  ['Org Default',true,false],['App Default',false,true]]);
 assert.equal(new Set(next.map(a=>a.assignment_id)).size,2,'conflicting ids must be made unique');
 const desktopNext=mergePublishedPageActivation(next,[{
  ...desktop,desktop:true,phone:false
 }],'Desktop');
 assert.deepEqual(desktopNext.map(a=>[a.scope,a.desktop,a.phone]),[
  ['App Default',false,true],['Org Default',true,false]]);
});

test('publishing Tablet or Custom changes only its own activation target, not Desktop or Phone',()=>{
 const desktop={assignment_id:'default',scope:'Org Default',app_api:null,profile_id:null,
  record_type_id:null,desktop:true,phone:false,tablet:false,custom:false,sort_order:0};
 const phone={...desktop,assignment_id:'phone',desktop:false,phone:true};
 for(const variant of ['Tablet','Custom'] as const){
  const device=variant==='Tablet'?'tablet':'custom';
  const proposed={...desktop,assignment_id:'other',scope:'App Default',app_api:'ExampleApp',
    desktop:false,phone:false,tablet:device==='tablet',custom:device==='custom'};
  const next=mergePublishedPageActivation([desktop,phone],[proposed],variant);
  assert.equal(next.some(a=>a.phone&&a.scope==='Org Default'),true);
  assert.equal(next.some(a=>a.desktop&&a.scope==='Org Default'),true);
  assert.equal(next.some(a=>a[device]&&a.scope==='App Default'),true);
  assert.equal(next.some(a=>a.desktop&&a.scope==='App Default'),false);
  assert.equal(next.some(a=>a.phone&&a.scope==='App Default'),false);
 }
});

test('first-time Page Builder activation must create an unpublished SQL draft first',()=>{
 const setup=readFileSync(new URL('../../../web/src/core/workspace/SetupShell/setupAppShell.tsx',import.meta.url),'utf8');
 assert.match(setup,/if \(!existing\) \{/);
 assert.match(setup,/body: JSON\.stringify\(\{\.\.\.nextPage,status:'Draft',revision:undefined/);
 assert.match(setup,/draftRevision:0,revision:undefined/);
 assert.match(setup,/\/layouts\/\$\{variant\}\/draft/);
});


test('a layout without activation snapshot keeps existing shared routing',()=>{
 const active={assignment_id:'desktop',scope:'Org Default',app_api:null,
  profile_id:null,record_type_id:null,desktop:true,phone:false,sort_order:0};
 for(const variant of PAGE_LAYOUT_VARIANTS){
  const merged=mergePublishedPageActivation([active],[],variant);
  assert.deepEqual(merged,[active],variant+' empty legacy assignment cannot deactivate page');
  assert.notStrictEqual(merged[0],active,'returned row must not alias mutable source');
 }
});

test('Custom targets are independently versioned in relational SQL and never activate drafts',()=>{
 assert.match(customTargets,/ADD COLUMN IF NOT EXISTS custom_target_enabled boolean NOT NULL DEFAULT false/);
 assert.match(customTargets,/ADD COLUMN IF NOT EXISTS custom_target_min_width integer/);
 assert.match(customTargets,/ADD COLUMN IF NOT EXISTS custom_target_max_width integer/);
 assert.doesNotMatch(customTargets,/\\bjsonb?\\b/i);
 assert.match(service,/custom_target_enabled,custom_target_min_width,custom_target_max_width/);
 assert.match(runtime,/strictCustom/);
 assert.ok(runtime.includes('NOT $8::boolean OR a.custom'));
 assert.ok(runtime.includes('NOT $5::boolean OR x.custom'));
 assert.match(server,/viewportWidth/);
});
