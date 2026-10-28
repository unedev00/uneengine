import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('../../src/system-support/migrations/20270117-four-layout-existing-page-backfill.sql',import.meta.url),'utf8');

test('backfill creates four independent variants for every existing Page',()=>{
 for(const device of ['Desktop','Mobile','Tablet','Custom'])assert.match(sql,new RegExp("\\('"+device+"'\\)"));
 for(const table of ['md_page_layout_versions','md_page_layout_version_nodes','md_page_layout_version_properties','md_page_layout_version_activation','md_page_layout_heads'])
  assert.ok(sql.includes('INSERT INTO '+table),table);
});
test('migration is tenant-scoped and never overwrites user-defined variants',()=>{
 assert.match(sql,/NOT EXISTS/);
 assert.match(sql,/h\.tenant_id=d\.tenant_id AND h\.page_id=d\.page_id AND h\.variant=v\.variant/);
 assert.match(sql,/ON CONFLICT DO NOTHING/g);
 assert.doesNotMatch(sql,/\bDELETE FROM\b|\bUPDATE md_page_layout_/i);
});
