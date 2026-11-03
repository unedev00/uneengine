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
  'api-name','visible','readonly',
  'accept',
  'component-id','render-mode'
 ];
 for(const key of fields){
   assert.ok(key.startsWith('device-')?advanced.includes('advanced-device-'):
     advanced.includes('advanced-'+key),key+' must be rendered');
   assert.match(layout,new RegExp('advanced-'+key+'[^\\n]*\\{[^\\n]*top:(5|35|65)px'),key+' has a fixed row');
 }
 for(const group of ['activation','responsive','properties','nesting','technical'])
   assert.ok(layout.includes('advanced-fixed-group.advanced-'+group),group);
 assert.match(layout,/grid-template-columns:minmax\(0,1\.08fr\)/);
 assert.match(layout,/width:min\(100%,1360px\)!important;min-width:0!important;max-width:1360px!important/);
 assert.doesNotMatch(layout,/width:1641px!important/);
 assert.match(layout,/scrollbar-width:none!important/);
 assert.match(layout,/\[aria-label="Advanced"\]::-webkit-scrollbar/);
 assert.match(layout,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)!important/);
 assert.match(layout,/grid-template-columns:minmax\(0,1fr\)!important/);
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
  'layoutContainer:value','canNest(page.components,draggedId,parentId)',
  'reparentComponent(components, draggedId, parentId)',
  'customTargetMinWidth:value'
 ])assert.ok(page.includes(action),action);
 assert.match(advanced,/disabled=\{!responsive\.canBreakpoint\}/);
 assert.match(advanced,/disabled=\{!responsive\.canColumns\}/);
 assert.match(advanced,/disabled=\{!nesting\.canChange\}/);
 // Only meaningful Advanced controls are exposed; technical/parent metadata stays internal.
 for(const removed of ['advanced-css-class','advanced-child-types','advanced-max-children',
   'advanced-parent','advanced-object']) {
   assert.ok(!advanced.includes(removed),removed+' must be removed from the ribbon');
   assert.ok(!layout.includes(removed),removed+' must not reserve a layout slot');
 }
 assert.match(advanced,/Accept nested components/);
 assert.match(page,/reparentComponent\(page\.components,draggedId,parentId\)/);
 assert.match(page,/selected\?\.properties\.objectApiName\|\|page\.targetObject/);
 assert.doesNotMatch(advanced,/fetch\(|request\(|localStorage|INSERT INTO/);
});

test('Arrange nesting activates Advanced tab without a popup',()=>{
 assert.match(page,/onNesting=\{\(\)=>openAdvanced\('nesting'\)\}/);
 assert.match(page,/setRibbonTab\('Advanced'\);\s*setAdvancedEditor\(feature\)/);
});

test('Obsolete Advanced inputs do not appear in component ribbon or leak duplicate Object binding',()=>{
 for(const label of ['CSS Class','Allowed child types','Max children','Parent container'])
  assert.ok(!advanced.includes('>'+label+'<'),label);
 assert.doesNotMatch(advanced,/advanced-object/);
 assert.ok(page.includes('objectApiName||page.targetObject'),'Data object selection remains usable');
});
