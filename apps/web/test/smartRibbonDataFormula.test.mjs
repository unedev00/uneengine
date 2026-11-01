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


test('selected filters have independent counts and never overwrite component filters',()=>{
 assert.match(ui,/const storedFieldFilters=properties\.dataFieldFilters/);
 assert.match(ui,/selectedFieldFilterCount=selectedFieldRule\?\.filters\.length\?\?0/);
 assert.match(ui,/activeDataProperty&&selectedFieldFilterCount>0/);
 assert.match(ui,/dataFieldFilters:\{\.\.\.existing,\[id\]:\{\.\.\.previous,\.\.\.patch\}\}/);
 assert.match(ui,/activeDataProperty\?updateFieldFilter\(activeDataProperty\.id,\{filters\}\)/);
 assert.match(ui,/contextApiName/);
 assert.doesNotMatch(ui,/apiRequest\<\{contexts:/);
});
test('compact width metadata keeps Source controls while allowing natural scrollbar overflow',()=>{
 const compact=read('../../server/src/system-support/migrations/20270217-data-ribbon-compact-widths.sql');
 assert.match(compact,/SET design_width=CASE WHEN property_key IN \('defaultCheck','columnVisibility'\) THEN 105 ELSE 100 END/);
 assert.match(compact,/section_group IN \('Values','Cart','Cart columns','Cart totals'\)/);
 assert.doesNotMatch(compact,/objectApiName/);
 const layout=read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css');
 assert.match(layout,/overflow-x: auto !important/);
});
test('field-only filtering is applied after authorised record loading without changing the global query',()=>{
 const matcher=read('../src/core/pages/PageRuntime/fieldScopedRecordFilters.ts');
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 const cart=read('../src/component-libraries/smart_cart/SmartCart.jsx');
 assert.match(matcher,/filterPageComponentRecords\(\[record\]/);
 assert.match(matcher,/compileRecordFilterFormula/);
 assert.match(matcher,/return false;/);
 assert.match(runtime,/typeof p\.fieldAllowed==='function'/);
 const page=read('../src/core/pages/MetadataBoundPageComponent/MetadataBoundPageComponent.tsx');
 assert.match(page,/scopedFieldAllows\(/);
 assert.match(runtime,/scopedExpression\(p,"textSource"/);
 assert.match(runtime,/fieldAllowed=\{\(key,row\)=>fieldAllows\(p,key,row\)\}/);
 assert.match(cart,/fieldExpression\('column'\+\(index\+1\)\+'Source'/);
});
test('filter modal is 50 percent wider, compact, four-column and not multiply scrollable',()=>{
 const style=read('../src/core/builders/PageBuilder/SmartRibbon.css');
 assert.match(style,/z-index:2147483000!important/);
 assert.match(style,/min\(1140px,calc\(100vw - 32px\)\)/);
 assert.match(style,/grid-template-columns:repeat\(4,minmax\(0,190px\)\)/);
 assert.match(style,/max-height:none!important;overflow:visible!important/);
});


test('Cart Data geometry uses 10 percent wider true control tracks and two-pixel gaps',()=>{
 const migration=read('../../server/src/system-support/migrations/20270218-data-ribbon-cart-geometry.sql');
 const ui=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const dataCss=read('../src/core/builders/PageBuilder/SmartRibbonDataFormula.css');
 const pageLayout=read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css');
 assert.match(migration,/property_key='columnVisibility' THEN 171/);
 assert.match(migration,/property_key='defaultCheck' THEN 116/);
 assert.match(migration,/ELSE 110/);
 assert.match(migration,/section_group IN \('Values','Cart','Cart columns','Cart totals'\)/);
 assert.doesNotMatch(migration,/objectApiName|DELETE FROM|TRUNCATE|md_page_components/);
 assert.match(ui,/properties\.length-1\)\*\(tab==='Data'&&group!=='Source'\?2:4\)/);
 assert.match(dataCss,/smart-data-sections[\s\S]*?\.smart-ribbon-row\{[\s\S]*?column-gap:2px!important/);
 assert.match(dataCss,/\.smart-ribbon-group\[aria-label="Cart"\]/);
 assert.match(dataCss,/\.smart-ribbon-group:last-child\{/);
 assert.match(dataCss,/data-property="columnVisibility"\] \.smart-multiselect-trigger/);
 assert.match(dataCss,/width:100%!important;min-width:0!important;max-width:100%!important/);
 assert.match(pageLayout,/overflow-x: auto !important/);
});
