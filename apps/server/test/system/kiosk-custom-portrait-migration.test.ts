import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=readFileSync(new URL(
  '../../src/system-support/migrations/20271103-kiosk-custom-portrait-layout.sql',
  import.meta.url),'utf8');

const pages=[
 'smart_kiosk_welcome','smart_kiosk_order_type','smart_kiosk_menu',
 'smart_kiosk_product','smart_kiosk_customise','smart_kiosk_basket',
 'smart_kiosk_upsell','smart_kiosk_review','smart_kiosk_payment',
 'smart_kiosk_confirmation'
];

test('kiosk portrait migration selects exactly the ten requested page APIs',()=>{
 const found=[...migration.matchAll(/'smart_kiosk_[a-z_]+'/g)].map(m=>m[0].slice(1,-1));
 assert.deepEqual(found,pages);
 assert.match(migration,/cardinality\(page_apis\)/);
 assert.match(migration,/count\(DISTINCT p\.api_name\)/);
 assert.match(migration,/candidate_tenants <> 1/);
 assert.match(migration,/p\.enabled=true/);
 assert.match(migration,/NOT EXISTS \(\s*SELECT 1 FROM md_app_seed_pages managed/);
});

test('kiosk portrait conversion preserves version history and component metadata',()=>{
 for(const table of [
  'md_page_layout_versions',
  'md_page_layout_heads',
  'md_page_layout_version_nodes',
  'md_page_layout_version_properties',
  'md_page_layout_version_activation'
 ])assert.match(migration,new RegExp(table));
 assert.match(migration,/1080,1920,canvas_fill_color/);
 assert.match(migration,/source_revision\.canvas_width=1080 AND source_revision\.canvas_height=1920/);
 assert.match(migration,/SELECT DISTINCT versions\.version/);
 assert.match(migration,/published_version=CASE WHEN published_version=source_revision\.version/);
 assert.match(migration,/draft_version=CASE WHEN draft_version=source_revision\.version/);
 assert.match(migration,/array_append\(devices,'Custom'\)/);
 assert.match(migration,/ON CONFLICT DO NOTHING/);
 assert.doesNotMatch(migration,/UPDATE md_page_layout_versions\b/);
 assert.doesNotMatch(migration,/DELETE FROM md_page_layout_version_(nodes|properties)/);
 assert.match(migration,/Kiosk portrait layout verification failed/);
});
