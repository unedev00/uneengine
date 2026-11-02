import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const page=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
const advanced=read('../src/core/builders/PageBuilder/PageBuilderAdvancedSections.tsx');
const layout=read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css');
const dialog=read('../src/core/builders/PageBuilder/PageBuilderVisibilityDialog.tsx');

test('View owns visibility conditions and reuses the record filter dialog shell',()=>{
 assert.match(page,/'Component Layout','Arrange','Component Action','Advanced','Preview'/);
 assert.match(page,/aria-label="Edit conditional visibility"/);
 assert.match(page,/onClick=\{openVisibilityEditor\}/);
 assert.match(page,/<PageBuilderVisibilityDialog/);
 assert.match(dialog,/smart-dialog smart-filter-dialog/);
 assert.match(dialog,/<ComponentVisibilityEditor rules=\{rules\}/);
 assert.match(dialog,/validateVisibilityRule\(rules/);
});

test('Advanced is five permanently rendered ribbon groups, never button navigation or modal inspector',()=>{
 for(const section of ['Activation Assignments','Responsive Settings','Advanced Properties','Component Nesting','Technical Details'])
   assert.ok(advanced.includes('aria-label="'+section+'"'),section);
 assert.match(page,/ribbonTab==='Advanced' && <PageBuilderAdvancedSections/);
 assert.doesNotMatch(advanced,/<button[^>]+onClick=\{\(\)=>onSelect/);
 assert.doesNotMatch(advanced,/page-builder-advanced-inline-nav/);
 assert.doesNotMatch(advanced,/page-builder-advanced-inline-host/);
 assert.doesNotMatch(page,/advancedEditor==='nesting' && selected/);
 assert.doesNotMatch(page,/<PageBuilderAdvancedResponsive properties=\{selected.properties\}/);
 assert.doesNotMatch(page,/modal page-builder-advanced-dialog/);
});

test('Advanced keeps all permanent fields in a compact responsive ribbon without horizontal scrolling',()=>{
 const fields=[
  'assigned','default','role','app',
  'device-0','device-1','device-2','breakpoint','columns',
  'api-name','css-class','visible','readonly',
  'accept','child-types','max-children','parent',
  'component-id','object','render-mode'
 ];
 for(const key of fields){
   assert.ok(advanced.includes('advanced-'+key),key+' must be rendered');
   assert.match(layout,new RegExp('advanced-'+key+'[^\\n]*\\{[^\\n]*top:(5|35|65)px'),key+' has a fixed row');
 }
 for(const group of ['activation','responsive','properties','nesting','technical'])
   assert.ok(layout.includes('advanced-fixed-group.advanced-'+group),group);
 assert.match(layout,/grid-template-columns:minmax\\(0,1\\.08fr\\)/);
 assert.match(layout,/width:100%!important;min-width:0!important;max-width:100%!important/);
 assert.doesNotMatch(layout,/width:1641px!important/);
 assert.match(layout,/scrollbar-width:none!important/);
 assert.match(layout,/\\[aria-label="Advanced"\\]::-webkit-scrollbar/);
 assert.match(layout,/grid-template-columns:repeat\\(6,minmax\\(0,1fr\\)\\)!important/);
 assert.match(layout,/grid-template-columns:minmax\\(0,1fr\\)!important/);
 assert.match(layout,/height:114px!important;min-height:114px!important;max-height:114px!important/);
 assert.match(layout,/top:92px;height:22px/);
 assert.match(layout,/advanced-fixed-field.*input:disabled/s);
 assert.equal((page.match(/ribbonTab==='Advanced' && <PageBuilderAdvancedSections/g)??[]).length,1,
   'Advanced controls are rendered only once');
});

test('Existing page handlers own assignments, visibility, grid count, and safe reparenting',()=>{
 for(const action of [
  'addRecordAssignment()','addHomeAssignment()',
  'setRecordProfileId(value)','setHomeProfileId(value)',
  'setRecordAppId(value)','setHomeAppId(value)',
  'setRecordFormFactors(toggle)','setHomeFormFactors(toggle)',
  'cardsPerRow:value','visible:value','readOnlyOnLayout:value',
  'layoutContainer:value','canNest(page.components,selected.id,parent)',
  'reparentComponent(page.components,selected.id,parent)',
  'customTargetMinWidth:value'
 ])assert.ok(page.includes(action),action);
 assert.match(advanced,/disabled=\{!responsive\.canBreakpoint\}/);
 assert.match(advanced,/disabled=\{!responsive\.canColumns\}/);
 assert.match(advanced,/disabled=\{!nesting\.canChange\}/);
 assert.match(advanced,/disabled title="Custom CSS class is not supported/);
 assert.match(advanced,/disabled title="Per-container allowed child types is not supported/);
 assert.match(advanced,/disabled\s+title="Maximum child count is not supported/);
 assert.doesNotMatch(advanced,/fetch\(|request\(|localStorage|INSERT INTO/);
});

test('Arrange nesting activates Advanced tab without a popup',()=>{
 assert.match(page,/onNesting=\{\(\)=>openAdvanced\('nesting'\)\}/);
 assert.match(page,/setRibbonTab\('Advanced'\);\s*setAdvancedEditor\(feature\)/);
});
