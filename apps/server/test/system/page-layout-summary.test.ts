import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarisePageLayouts,type PageLayoutSummaryRow} from '../../src/system-support/page-layout-summary.js';

const row=(variant:string,draft:number|null,nodes:number,inherits:boolean,at:string,published:number|null=null):PageLayoutSummaryRow=>
 ({api_name:'smart_kiosk_review',variant,draft_version:draft,published_version:published,
   inherits_desktop:inherits,draft_created_at:at,nodes});

test('a page designed only in Custom opens in Custom, with Desktop shown as empty',()=>{
 const summary=summarisePageLayouts('smart_kiosk_review',[
  row('Desktop',1,0,false,'2026-11-01T10:00:00Z'),
  row('Custom',3,26,false,'2026-11-04T20:40:00Z'),
  row('Tablet',1,0,true,'2026-11-01T10:00:00Z'),
  row('Mobile',1,0,false,'2026-11-01T10:00:00Z')
 ]);
 assert.equal(summary.primary,'Custom');
 assert.deepEqual(summary.layouts.map(item=>[item.variant,item.components,item.authored]),[
  ['Desktop',0,true],['Custom',26,true],['Tablet',0,false],['Mobile',0,false]]);
});
test('Desktop stays the default for Desktop pages and wins ties',()=>{
 assert.equal(summarisePageLayouts('p',[row('Desktop',4,12,false,'2026-11-04T10:00:00Z')]).primary,'Desktop');
 // Bootstrap copies (version 1) and inheriting layouts never steal the default.
 assert.equal(summarisePageLayouts('p',[
  row('Desktop',2,12,false,'2026-11-01T10:00:00Z'),
  row('Custom',1,12,false,'2026-11-05T10:00:00Z'),
  row('Mobile',5,3,true,'2026-11-06T10:00:00Z')
 ]).primary,'Desktop');
 assert.equal(summarisePageLayouts('p',[
  row('Desktop',2,12,false,'2026-11-04T10:00:00Z'),
  row('Custom',2,8,false,'2026-11-04T10:00:00Z')
 ]).primary,'Desktop');
 assert.equal(summarisePageLayouts('p',[]).primary,'Desktop');
});
test('the most recently saved designed layout is the default; inheriting layouts show Desktop components',()=>{
 const summary=summarisePageLayouts('p',[
  row('Desktop',3,10,false,'2026-11-02T10:00:00Z',3),
  row('Tablet',4,7,false,'2026-11-03T10:00:00Z'),
  row('Mobile',2,1,true,'2026-11-04T10:00:00Z')
 ]);
 assert.equal(summary.primary,'Tablet');
 const mobile=summary.layouts.find(item=>item.variant==='Mobile')!;
 assert.equal(mobile.authored,false);
 assert.equal(mobile.components,10);
 assert.equal(summary.layouts.find(item=>item.variant==='Desktop')!.published,true);
});
test('summary route is tenant-scoped, read-permissioned and validates page names',()=>{
 const controller=readFileSync(new URL('../../src/api/PageApiController.ts',import.meta.url),'utf8');
 const service=readFileSync(new URL('../../src/system-support/page-layout-summary.ts',import.meta.url),'utf8');
 assert.match(controller,/app\.get\('\/api\/metadata\/page-layout-summaries'/);
 assert.match(controller,/'PageDefinition','read'\);\s*const names=/);
 assert.match(controller,/names\.some\(name=>!api\.test\(name\)\)/);
 assert.match(service,/WHERE p\.tenant_id=\$1 AND p\.enabled=true AND p\.api_name=ANY/);
 assert.doesNotMatch(service,/INSERT|UPDATE|DELETE/);
});
