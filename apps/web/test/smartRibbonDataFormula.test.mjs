import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const ui=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
const css=read('../src/core/builders/PageBuilder/SmartRibbonDataFormula.css');
const sql=read('../../server/src/system-support/migrations/20270216-data-selected-field-formula-ribbon.sql');

test('Data retains Source and one formula bar controlled by selected canvas binding',()=>{
 assert.match(ui,/selectedDataField,setSelectedDataField/);
 assert.match(ui,/smart-data-formula-bar/);
 assert.match(ui,/smart-data-workspace/);
 assert.match(ui,/formulaInputHost/);
 assert.match(ui,/activeDataProperty\?<SmartFormulaField/);
 assert.match(ui,/readCanvasBinding/);
 assert.match(ui,/writeCanvasBinding/);
 assert.match(ui,/canvasBinding\?\.componentId===componentId/);
 assert.match(ui,/sections\.filter\(group=>group==='Source'\)/);
 assert.doesNotMatch(ui,/<div className="smart-data-sections">/);
 assert.doesNotMatch(ui,/sections\.filter\(group=>group!=='Source'\)\.map/);
 assert.match(ui,/selectedSourceObjects=\{sourceObjects\}/);
 assert.match(ui,/activeDataProperty\.id==='imageSource'\?'image':'text'/);
});
test('selected canvas formula writes its existing property or stable nested tab caption',()=>{
 const helper=read('../src/core/builders/PageBuilder/canvasDataBindingTargets.ts');
 assert.match(ui,/activeDataProperty\?\.valueKeys\?\.\[api\]/);
 assert.match(ui,/writeCanvasBinding\(properties/);
 assert.match(helper,/imageSourceMode:'field'/);
 assert.match(helper,/tabs\[index\]=\{\.\.\.tabs\[index\],label:value\}/);
 assert.match(ui,/disabled=\{!activeDataEnabled\}/);
 assert.match(ui,/RecordFilterEditor/);
 assert.ok(ui.includes("openFilters('Record')"));
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
 assert.match(ui,/filterCount>0/);
 assert.match(ui,/dataFieldFilters:\{\.\.\.existing,\[id\]:\{\.\.\.previous,\.\.\.patch\}\}/);
 assert.match(ui,/scopedFilterId\?updateFieldFilter\(scopedFilterId,\{filters\}\)/);
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
 assert.match(style,/grid-template-columns:minmax\(0,1\.15fr\) minmax\(0,\.85fr\)/);
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


test('Cart Summary 1–4 labels fit the existing Data ribbon controls without width changes',()=>{
 const chipSelector=css.slice(css.indexOf('/* Only Cart Summary 1'));
 assert.ok(chipSelector.length>50,'cart summary label rule missing');
 for(const id of ['subtotalValue','totalValue','taxValue','discountValue'])
  assert.ok(chipSelector.includes('[data-property="'+id+'"]'),'missing compact label '+id);
 assert.match(chipSelector,/\.smart-data-field-name\s*\{\s*font-size:10px!important;/);
 assert.doesNotMatch(chipSelector,/\b(?:width|min-width|max-width|padding)\s*:/);
 for(const label of ['Summary 1','Summary 2','Summary 3','Summary 4'])
  assert.ok(ui.includes("slot:'"+label+"'"),'cart summary metadata lost: '+label);
});

test('shared Filter Records editor switches between Field and Formula and exposes controls immediately',()=>{
 const editor=read('../src/component-libraries/shared/primitives/RecordFilterEditor/RecordFilterEditor.tsx');
 const editorCss=read('../src/component-libraries/shared/primitives/RecordFilterEditor/RecordFilterEditor.css');
 const runtime=read('../src/core/pages/PageRuntime/pageComponentBindings.ts');
 const page=read('../src/core/pages/PageRuntime/pageRuntimeViews.tsx');
 const bound=read('../src/core/pages/MetadataBoundPageComponent/MetadataBoundPageComponent.tsx');
 assert.match(editor,/aria-label="Filter method"/);
 assert.match(editor,/onModeChange\('Field'\)/);
 assert.match(editor,/onModeChange\('Formula'\)/);
 assert.match(editor,/effectiveMode === 'Field' && <>/);
 assert.match(editor,/effectiveMode === 'Formula' && onFormulaChange/);
 assert.match(editor,/filters.length \? filters : \[\{field:/);
 assert.match(editor,/index === filters.length && filters.length < 20/);
 assert.match(editor,/aria-label=\{title \+ ' operator '/);
 assert.match(editor,/aria-label=\{title \+ ' value source '/);
 assert.match(editorCss,/grid-template-columns:minmax\(0,320px\) minmax\(165px,210px\)/);
 assert.match(ui,/onModeChange=\{filterMode=>scopedFilterId/);
 assert.match(runtime,/export function activePageRecordFilters/);
 assert.match(page,/currentQueryRecords,selectedRecordFilters.filters/);
 assert.match(bound,/sourceRecords,selectedRecordFilters.filters/);
});

test('Page State condition makes its optional blank behaviour visible and keeps the key on toggle',()=>{
 const editor=read('../src/component-libraries/shared/primitives/RecordFilterEditor/RecordFilterEditor.tsx');
 const validator=read('../src/core/records/RecordWorkspace/recordFilterMetadata.ts');
 const css=read('../src/component-libraries/shared/primitives/RecordFilterEditor/RecordFilterEditor.css');
 assert.match(editor,/Ignore condition when State value is blank/);
 assert.match(editor,/skipWhenBlank:e\.target\.checked/);
 assert.match(editor,/source: 'PageState', key: e\.target\.value/);
 assert.match(editor,/\.\.\.dynamic,source: 'PageState'/);
 assert.match(editor,/placeholder="e\.g\. categoryId"/);
 assert.match(css,/metadata-filter-optional/);
 assert.match(validator,/Enter a Page State key/);
});

test('the originating filter button sets the target without wasting modal space',()=>{
 assert.ok(ui.includes("filterFieldId,setFilterFieldId"));
 assert.ok(ui.includes("const openFilters=(target:string,fieldId:string|null=null)"));
 assert.ok(ui.includes("setFilterFieldId(fieldId);setFiltersOpen(true)"));
 assert.ok(ui.includes("openFilters('Record')"));
 assert.ok(ui.includes("scopedFilterId=filterFieldId&&activeDataProperty?.id===filterFieldId"));
 assert.ok(ui.includes("onChange={filters=>scopedFilterId?updateFieldFilter"));
 assert.ok(ui.includes("onChange({...properties,filters})"));
 assert.ok(ui.includes("modalFieldRule?.filters"));
 assert.ok(ui.includes("<RecordFilterEditor compact title="));
 assert.ok(ui.includes("openFilters('Record')"));
 assert.doesNotMatch(ui,/smart-filter-scope|smart-filter-target|Apply filters to|aria-label="Filter target"/);
 assert.doesNotMatch(css,/\\.smart-filter-scope/);
});

test('ribbon exposes only the universal formula source and one filter beside the selected field',()=>{
 assert.match(ui,/p\.id!=='collectionFormula'/);
 assert.doesNotMatch(ui,/aria-label=\{'Shared record filters from '\+title\}/);
 assert.doesNotMatch(ui,/aria-label="Image filters and conditions"/);
 const workspace=ui.slice(ui.indexOf('<div className="smart-data-formula-bar"'),ui.indexOf('<div className="smart-data-sections">'));
 assert.ok(workspace.indexOf('smart-data-filter-button')<workspace.indexOf('smart-data-formula-input'));
 assert.doesNotMatch(workspace,/smart-data-field-picker|Use as filter|Filter records<\/button>/);
 assert.equal((workspace.match(/smart-data-filter-button/g)||[]).length,1);
 assert.match(workspace,/stateOptions=\{stateOptions\}/);
 assert.match(workspace,/validate=\{validateCollection\}/);
});

test('one icon opens visual filters while the same Formula Bar edits record predicates',()=>{
 assert.match(ui,/selectedDataField==='__record_filter__'/);
 assert.match(ui,/aria-label="Configure record filters"/);
 assert.match(ui,/label="Record filter formula"/);
 assert.match(ui,/validate=\{value=>validateRecordFilterFormula/);
 assert.match(ui,/onChange=\{changeRecordFilterFormula\}/);
 assert.match(ui,/openFilters\('Record'\)/);
 assert.doesNotMatch(ui,/smart-data-field-picker|smart-data-move-to-filter|smart-data-record-filter-target/);
 assert.doesNotMatch(css,/smart-data-field-picker|smart-data-move-to-filter|smart-data-record-filter-target/);
});

test('forward metadata correction restores compact Data matrix without changing bindings',()=>{
 const correction=read('../../server/src/system-support/migrations/20271112-restore-compact-data-ribbon.sql');
 const slots=[...correction.matchAll(/\('([^']+)','([^']+)',(\d+),(\d+),(\d+),(\d+)\)/g)];
 assert.equal(slots.length,24);
 assert.ok(slots.every(slot=>Number(slot[3])<=3));
 for(const slot of slots.filter(slot=>slot[2]!=='Source'))
   assert.ok(Number(slot[3])<=2,'Data section control must fit into two rows: '+slot[1]);
 assert.match(correction,/design_caption_width=v.caption_px/);
 assert.doesNotMatch(correction,/\b(?:DELETE|TRUNCATE|DROP|INSERT INTO md_builder_shared_properties|UPDATE md_page_components)\b/i);
 const layout=read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css');
 assert.doesNotMatch(layout,/--page-ribbon-content-height:140px/);
 assert.match(css,/height:114px!important/);
 assert.match(ui,/sections\.filter\(group=>group==='Source'\)/);
 assert.match(ui,/sections\.filter\(group=>group!=='Source'\)/);
});
