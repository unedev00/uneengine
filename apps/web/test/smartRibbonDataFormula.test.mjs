import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const ui=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
const css=read('../src/core/builders/PageBuilder/SmartRibbonDataFormula.css');
const sql=read('../../server/src/system-support/migrations/20270216-data-selected-field-formula-ribbon.sql');

test('Data has a single selected-field formula bar above its two-row sections',()=>{
 assert.match(ui,/selectedDataField,setSelectedDataField/);
 assert.match(ui,/smart-data-formula-bar/);
 assert.match(ui,/smart-data-workspace/);
 assert.match(ui,/smart-data-sections/);
 assert.match(ui,/activeDataProperty\?<SmartFormulaField/);
 assert.match(ui,/changeActiveDataFormula/);
 assert.match(ui,/setSelectedDataField\(property\.id\)/);
 assert.match(ui,/aria-pressed=\{selected\}/);
 assert.match(ui,/dataSectionRow\(section,row\)/);
 assert.match(ui,/sections\.filter\(group=>group==='Source'\)/);
 assert.match(ui,/sections\.filter\(group=>group!=='Source'\)/);
 assert.match(ui,/\[1,2,3\]\.map\(row/);
 assert.match(ui,/\[1,2\]\.map\(row/);
 assert.match(ui,/selectedSourceObjects=\{sourceObjects\}/);
 assert.match(ui,/activeDataProperty\.id==='imageSource'\?'image':'text'/);
});
test('only the selected formula edit writes the existing metadata property',()=>{
 assert.match(ui,/activeDataProperty\?\.valueKeys\?\.\[api\]/);
 assert.match(ui,/onChange\(\{\.\.\.properties,\[activeDataKey\]:next/);
 assert.match(ui,/imageSourceMode:'field'/);
 assert.match(ui,/activeSummaryLabel\.key/);
 assert.match(ui,/disabled=\{!activeDataEnabled\}/);
 assert.match(ui,/RecordFilterEditor/);
 assert.match(ui,/onClick=\{\(\)=>openFilters\(activeDataProperty\?\.label\?\?'Record'\)\}/);
});
test('SQL placements keep Source intact and display all Value and Cart bindings',()=>{
 const slots=[...sql.matchAll(/\('([^']+)','([^']+)',(\d+),(\d+),(\d+),'([^']+)'\)/g)]
  .map(match=>({key:match[1],group:match[2],row:Number(match[3]),col:Number(match[4]),width:Number(match[5])}));
 const expected={
  Values:[['imageSource','textSource','label'],['badgeText','defaultValue','defaultCheck']],
  Cart:[['column2Source','column3Source','subtotalValue','taxValue'],
        ['column4Source','column5Source','totalValue','discountValue','columnVisibility']]
 };
 for(const [group,rows] of Object.entries(expected))
  rows.forEach((row,rowIndex)=>row.forEach((key,colIndex)=>{
   const entry=slots.find(slot=>slot.key===key);
   assert.ok(entry,key+' missing from SQL');
   assert.equal(entry.group,group);assert.equal(entry.row,rowIndex+1);assert.equal(entry.col,colIndex+1);
   assert.ok(entry.width>=100&&entry.width<=150);
  }));
 assert.equal(slots.length,15);
 assert.doesNotMatch(sql,/\('objectApiName'/);
 assert.doesNotMatch(sql,/\b(?:DELETE|TRUNCATE|DROP|ALTER TABLE|UPDATE md_page_components)\b/i);
});
test('Data styling is scoped; the full-width formula row stays above two 26px chip rows',()=>{
 assert.match(css,/smart-data-workspace/);
 assert.match(css,/smart-data-fx-prefix/);
 assert.match(css,/smart-data-filter-button/);
 assert.match(css,/smart-data-field-fx\.is-selected/);
 assert.match(css,/smart-data-sections/);
 assert.match(css,/height:80px/);
 assert.match(css,/height:26px/);
 assert.doesNotMatch(css,/\.office-builder-ribbon\s*\{\s*height/);
});
