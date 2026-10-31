import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file = name => readFileSync(new URL(name,import.meta.url),'utf8');
const migration = file('../../server/src/system-support/migrations/20270208-page-builder-layout-ribbon-density.sql');
const css = file('../src/core/builders/PageBuilder/SmartRibbonApprovedThreeRow.css');
const ribbon = file('../src/core/builders/PageBuilder/SmartRibbon.tsx');
const builder = file('../src/core/builders/PageBuilder/pageBuilderView.tsx');
const layout = [...migration.matchAll(/\('([^']+)',\s*'([^']+)',\s*([123]),\s*(\d+)\)/g)]
  .map(([,key,section,row,width])=>({key,section,row:Number(row),width:Number(width)}));
const property = key => layout.find(item=>item.key===key);

test('Layout ribbon uses SQL geometry to place Position Cards and Calendar vertically',()=>{
 assert.deepEqual(layout.map(item=>item.key).slice(0,6),[
  'x','y','cardsPerRow','cardsPerColumn','showDays','firstDay']);
 for(const [section,first,second] of [
  ['Position','x','y'],['Cards','cardsPerRow','cardsPerColumn'],
  ['Calendar','showDays','firstDay']]){
  assert.equal(property(first)?.section,section);
  assert.equal(property(first)?.row,1);
  assert.equal(property(second)?.section,section);
  assert.equal(property(second)?.row,2);
  assert.ok(property(first).width>=60);
  assert.ok(property(second).width>=60);
 }
 assert.equal(property('supportingBoxHeight')?.row,1);
 assert.equal(new Set(layout.map(item=>item.key)).size,layout.length);
 assert.match(migration,/WHERE properties\.tab='Layout'/);
 assert.match(migration,/properties\.section_group=compact_layout\.section_group/);
 assert.doesNotMatch(migration,/\b(?:DELETE|INSERT|TRUNCATE)\b/i);
});

test('Page and Canvas widths are content-sized and their numeric icons share an input boundary',()=>{
 assert.match(css,/\[data-shared-group="Page"\]\s*\{\s*width:260px!important/);
 assert.match(css,/\[data-shared-group="Canvas"\]\s*\{\s*width:114px!important/);
 assert.match(css,/\.une-ribbon-size-with-icon\s*\{[^}]*overflow:hidden!important/);
 assert.match(css,/\.une-ribbon-size-with-icon input\s*\{[^}]*min-width:0!important/);
 assert.match(builder,/className="une-sql-home-control une-ribbon-size-with-icon"/);
 assert.match(builder,/className="une-ribbon-embedded-icon"/);
});

test('Header Supporting width follows controls instead of allocating an empty fixed column',()=>{
 assert.match(ribbon,/tab==='Layout'&&group==='Header Supporting'\?110/);
 assert.match(ribbon,/\[1,2,3\]\.map\(row/);
 assert.match(ribbon,/sectionRow\(section,row\)\.map\(controls\)/);
 assert.match(css,/\.smart-property\.disabled\[data-numeric-icon="true"\] \.smart-numeric/);
 assert.match(css,/\.smart-property\.disabled\s*\{\s*opacity:\.66!important;filter:none!important/);
 assert.match(ribbon,/const enabled=supported&&/);
});
