import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const page=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
const advanced=read('../src/core/builders/PageBuilder/PageBuilderAdvancedSections.tsx');
const layout=read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css');
const dialog=read('../src/core/builders/PageBuilder/PageBuilderVisibilityDialog.tsx');

test('View owns visibility conditions and reuses the record filter dialog shell',()=>{
 assert.match(page,/'Component Design 2','Component Action','Advanced','Preview'/);
 assert.match(page,/aria-label="Edit conditional visibility"/);
 assert.match(page,/onClick=\{openVisibilityEditor\}/);
 assert.match(page,/<PageBuilderVisibilityDialog/);
 assert.match(dialog,/smart-dialog smart-filter-dialog/);
 assert.match(dialog,/<ComponentVisibilityEditor rules=\{rules\}/);
 assert.match(dialog,/validateVisibilityRule\(rules/);
});

test('Advanced keeps only purposeful sections; page device controls live in Edit Page',()=>{
 for(const section of ['Activation Assignments','Advanced Properties','Component Nesting','Component Identity'])
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
  'assigned','default',
  'api-name','visible','readonly',
  'accept',
  'component-name',
  'layout-open','layout-copy'
 ];
 for(const key of fields){
   assert.ok(key.startsWith('device-')?advanced.includes('advanced-device-'):
     advanced.includes('advanced-'+key),key+' must be rendered');
   assert.match(layout,new RegExp('advanced-'+key+'[^\\n]*\\{[^\\n]*top:(5|35|65)px'),key+' has a fixed row');
 }
 for(const group of ['activation','properties','nesting','technical','layout'])
   assert.ok(layout.includes('advanced-fixed-group.advanced-'+group),group);
 assert.match(layout,/grid-template-columns:minmax\(0,1\.08fr\)/);
 assert.match(layout,/width:min\(100%,1640px\)!important;min-width:0!important;max-width:1640px!important/);
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
  'setRecordProfileId(event.target.value)','setHomeProfileId(event.target.value)',
  'setRecordAppId(event.target.value)','setHomeAppId(event.target.value)',
  'visible:value','readOnlyOnLayout:value',
  'layoutContainer:value','canNest(page.components, draggedId, parentId)',
  'reparentComponent(components, draggedId, parentId)',
  'customTargetMinWidth:value'
 ])assert.ok(page.includes(action),action);
 assert.match(advanced,/disabled=\{!nesting\.canChange\}/);
 // Only meaningful Advanced controls are exposed; technical/parent metadata stays internal.
 for(const removed of ['advanced-css-class','advanced-child-types','advanced-max-children',
   'advanced-parent','advanced-object']) {
   assert.ok(!advanced.includes(removed),removed+' must be removed from the ribbon');
   assert.ok(!layout.includes(removed),removed+' must not reserve a layout slot');
 }
 assert.match(advanced,/Accept nested components/);
 assert.match(page,/reparentComponent\(page\.components,\s*draggedId,\s*parentId\)/);
 assert.match(page,/selected\?\.properties\.objectApiName\|\|page\.targetObject/);
 assert.doesNotMatch(advanced,/fetch\(|request\(|localStorage|INSERT INTO/);
});

test('Design 2 nesting activates Advanced tab without a popup',()=>{
 assert.match(page,/onNesting=\{\(\)=>openAdvanced\('nesting'\)\}/);
 assert.match(page,/setRibbonTab\('Advanced'\);\s*setAdvancedEditor\(feature\)/);
});

test('Obsolete Advanced inputs do not appear in component ribbon or leak duplicate Object binding',()=>{
 for(const label of ['CSS Class','Allowed child types','Max children','Parent container'])
  assert.ok(!advanced.includes('>'+label+'<'),label);
 assert.doesNotMatch(advanced,/advanced-object/);
 assert.ok(page.includes('objectApiName||page.targetObject'),'Data object selection remains usable');
});

test('App and Profile assignment selectors live in Page Details, not the Advanced ribbon',()=>{
 const pageDetails=read('../src/core/builders/PageBuilder/PageDetailsDialog.tsx');
 const assignmentEditor=read('../src/core/builders/PageBuilder/PageDetailsAssignmentEditor.tsx');
 for(const slot of ['advanced-role','advanced-app']){
  assert.ok(!advanced.includes(slot),'old ribbon slot '+slot);
  assert.ok(!layout.includes(slot),'old CSS slot '+slot);
 }
 assert.match(advanced,/Edit activation assignments in Page Properties/);
 assert.match(page,/onAdd:\(\)=>setPageDetailsApi\(page\.apiName\)/);
 assert.match(pageDetails,/<PageDetailsAssignmentEditor/);
 assert.match(pageDetails,/onSaveAssignments\(page,assignments\)/);
 assert.match(assignmentEditor,/New assignment app/);
 assert.match(assignmentEditor,/Role \/ Profile/);
 assert.match(assignmentEditor,/Assignment profile/);
 assert.match(assignmentEditor,/assignmentValidationError/);
 assert.match(page,/\/layouts\/\$\{source\.layoutVariant\?\?'Desktop'\}\/editor/);
 assert.match(page,/JSON\.stringify\(current\.activationAssignments/);
 assert.match(page,/onSave\(\{\.\.\.current,activationAssignments/);
});

test('Page devices are edited only in Edit Page; Advanced has no empty responsive section',()=>{
 const dialog=read('../src/core/builders/PageBuilder/PageDetailsDialog.tsx');
 const controller=read('../../server/src/api/PageDetailsController.ts');
 const shell=read('../src/core/workspace/SetupShell/setupAppShell.tsx');
 const smart=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 assert.doesNotMatch(advanced,/advanced-responsive|advanced-device|advanced-breakpoint|advanced-columns/);
 assert.doesNotMatch(layout,/advanced-responsive|advanced-device|advanced-breakpoint|advanced-columns/);
 assert.doesNotMatch(page,/responsive=\{\{/);
 for(const label of ['Desktop enabled','Tablet enabled','Mobile enabled'])
  assert.ok(dialog.includes(label),label);
 assert.match(dialog,/aria-label="Page enabled devices"/);
 assert.match(dialog,/onSave\(page\.apiName,label\.trim\(\)/);
 assert.match(controller,/expectedDevices/);
 assert.match(controller,/devices=\$3::text\[\]/);
 assert.match(shell,/devices:updated\.devices/);
 assert.match(smart,/cardsPerRow/);
 assert.match(page,/customTargetMinWidth/);
});

test('Render mode is not an editable or read-only Technical Details ribbon slot',()=>{
 assert.doesNotMatch(advanced,/advanced-render-mode|Render mode/);
 assert.doesNotMatch(layout,/advanced-render-mode/);
 assert.match(advanced,/advanced-component-name/);
 assert.doesNotMatch(advanced,/aria-label="Component ID"/);
 assert.equal((advanced.match(/aria-label="Component Name"/g)??[]).length,1);
 assert.doesNotMatch(page,/renderMode:selected\?'Page Runtime'/);
});

test('Component Identity edits the same unique name used for CSV upsert; technical ID stays internal',()=>{
 assert.match(advanced,/aria-label="Component Identity"/);
 assert.match(advanced,/aria-label="Component Name"/);
 assert.match(advanced,/validateInstanceName\(nameDraft\)/);
 assert.match(advanced,/aria-invalid=\{!!nameError\}/);
 assert.match(advanced,/onBlur=\{commitName\}/);
 assert.doesNotMatch(advanced,/Component ID|componentIdDraft|technical\.onRename/);
 assert.match(page,/validateInstanceName:\s*value=>selected\?validateInstanceName\(selected\.id,value\)/);
 assert.match(page,/canonicalComponentName\(otherName\)===canonicalComponentName\(name\)/);
 assert.match(page,/navigatorName:value\.trim\(\)/);
 assert.doesNotMatch(page,/renameComponentId\(/);
});
