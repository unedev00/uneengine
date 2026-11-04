import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const ui=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
const css=read('../src/core/builders/PageBuilder/SmartRibbonDataFormula.css');
const sql=read('../../server/src/system-support/migrations/20270216-data-selected-field-formula-ribbon.sql');

test('Data keeps a formula-only first row above every metadata section',()=>{
 assert.match(ui,/selectedDataField,setSelectedDataField/);
 assert.match(ui,/smart-data-formula-bar/);
 assert.match(ui,/smart-data-workspace/);
 assert.match(ui,/smart-data-sections/);
 assert.match(ui,/activeDataProperty\?<SmartFormulaField/);
 assert.match(ui,/changeActiveDataFormula/);
 assert.match(ui,/setSelectedDataField\(property\.id\)/);
 assert.match(ui,/aria-pressed=\{selected\}/);
 assert.match(ui,/dataSectionRow\(section,row\)/);
 assert.match(ui,/tab==='Data'\?<div className="smart-data-workspace"/);
 assert.match(ui,/\{sections\.map\(section=><section className="smart-ribbon-group"/);
 assert.match(ui,/\[1,2,3\]\.map\(row/);
 assert.match(ui,/const dataSectionRow=\(group:string,row:number\)=>sectionRow\(group,row\)/);
 assert.doesNotMatch(ui,/sections\.filter\(group=>group==='Source'\)/);
 const formulaStart=ui.indexOf('<div className="smart-data-formula-bar"');
 const formulaEnd=ui.indexOf('<div className="smart-data-sections"',formulaStart);
 assert.ok(formulaStart>0&&formulaEnd>formulaStart);
 assert.doesNotMatch(ui.slice(formulaStart,formulaEnd),/smart-data-summary-name|objectApiName/);
 const cartLabel=ui.indexOf('className="smart-data-summary-name"');
 assert.ok(cartLabel>formulaEnd,'Cart summary label belongs beneath the formula row');
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
test('Data styling makes room for three 26px metadata rows below the formula',()=>{
 assert.match(css,/smart-data-workspace/);
 assert.match(css,/smart-data-fx-prefix/);
 assert.match(css,/smart-data-filter-button/);
 assert.match(css,/smart-data-field-fx\.is-selected/);
 assert.match(css,/smart-data-sections/);
 assert.match(css,/height:106px/);
 assert.match(css,/height:86px/);
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
 assert.match(ui,/properties\.length\+extra-1\)\*\(tab==='Data'\?2:4\)/);
 assert.match(ui,/dataChipWidth\(p\.group\)/);
 assert.match(ui,/Math\.max\(165,p\.designWidth\?\?0\)/);
 assert.match(dataCss,/smart-data-sections[\s\S]*?\.smart-ribbon-row\{[\s\S]*?column-gap:2px!important/);
 assert.doesNotMatch(dataCss,/\.smart-ribbon-group\[aria-label="Cart"\]/);
 assert.match(dataCss,/\.smart-ribbon-group:last-child\{/);
 assert.match(dataCss,/data-property="columnVisibility"\] \.smart-multiselect-trigger/);
 assert.match(dataCss,/width:100%!important;min-width:0!important;max-width:100%!important/);
 assert.match(pageLayout,/overflow-x: auto !important/);
});


test('Data metadata widths are equal in Values and prevent Cart and Source collision',()=>{
 const next=read('../../server/src/system-support/migrations/20271110-data-ribbon-formula-row-equal-widths.sql');
 const layout=read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css');
 assert.match(next,/SET design_width=210, design_height=26/);
 assert.match(next,/SET design_width=160, design_height=26/);
 assert.match(next,/property_key='columnVisibility' THEN 171 ELSE 160/);
 assert.match(next,/WHERE tab='Data' AND section_group='Values'/);
 assert.match(next,/WHERE tab='Data' AND section_group='Cart'/);
 assert.doesNotMatch(next,/DELETE|TRUNCATE|UPDATE md_page_components/i);
 assert.match(layout,/aria-label="Component Data"/);
 assert.match(layout,/--page-ribbon-content-height:140px/);
 assert.match(css,/smart-data-summary-slot/);
 assert.match(css,/--smart-data-chip-width/);
 assert.doesNotMatch(css,/display:none!important[^}]*smart-data-summary-name/);
});

test('approved compact three-row Data matrix matches all screenshot controls',()=>{
 const approved=read('../../server/src/system-support/migrations/20271111-data-ribbon-approved-compact-three-rows.sql');
 const placements=[...approved.matchAll(/\('([^']+)','([^']+)',(\d+),(\d+),(\d+)\)/g)]
  .map(match=>({key:match[1],group:match[2],row:+match[3],col:+match[4],width:+match[5]}));
 const expected={
  Source:[['objectApiName'],['objectApiName2'],['objectApiName3']],
  Values:[['imageSource','textSource','label'],
          ['badgeText','customButton1Label','customButton2Label'],
          ['defaultValue','defaultCheck']],
  Cart:[['column2Source','column3Source','subtotalValue','taxValue'],
        ['column4Source','rowSupportingSource','column5Source','totalValue'],
        [null,'discountValue','columnVisibility']],
  'Card Grid':[['cardDescription'],['cardButtonText'],['cardValue']]
 };
 assert.equal(placements.length,24,'no existing control omitted or duplicated');
 for(const [group,rows] of Object.entries(expected)){
  rows.forEach((row,r)=>row.forEach((key,c)=>{
   if(key===null)return; // The persisted Cart summary label editor is inline at R3C1.
   const matching=placements.filter(slot=>slot.key===key);
   assert.equal(matching.length,1,key+' must appear exactly once');
   assert.deepEqual(matching[0],{key,group,row:r+1,col:c+1,width:group==='Source'?165:120});
  }));
 }
 assert.match(ui,/section==='Cart'&&row===3&&<span className="smart-data-summary-slot">/);
 const inline=ui.indexOf('section===\'Cart\'&&row===3');
 const fields=ui.indexOf('{dataSectionRow(section,row).map(controls)}',inline);
 assert.ok(inline>0&&fields>inline,'inline Cart summary must precede R3C2 Summary 4');
 assert.match(ui,/const dataChipWidth=\(group:string\)=>Math.max\(120/);
 assert.match(ui,/group==='Source'\)\?0:/);
 assert.match(ui,/\['Values','Cart','Card Grid'\]\.includes\(p\.group\)/);
 assert.doesNotMatch(approved,/\b(?:DELETE|TRUNCATE|INSERT INTO md_builder_shared_properties|UPDATE md_page_components)\b/i);
});

test('Source field width uses one label and 115px selector, without phantom Cart gap',()=>{
 const css=read('../src/core/builders/PageBuilder/SmartRibbonDataFormula.css');
 const layout=read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css');
 assert.match(css,/flex:0 0 115px!important/);
 assert.match(css,/width:115px!important;min-width:115px!important;max-width:115px!important/);
 assert.match(css,/\.smart-ribbon\[data-three-row="true"\] \.smart-data-sections/);
 assert.doesNotMatch(layout,/margin-right:80px!important/);
 assert.match(layout,/overflow-x: auto !important/);
 assert.match(css,/smart-data-summary-slot/);
 assert.match(css,/--smart-data-chip-width,120px/);
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
