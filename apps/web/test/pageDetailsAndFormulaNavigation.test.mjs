import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('Page Manager exposes different Edit and Design actions',()=>{
 const builder=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(builder,/aria-label=\{'Edit page properties for '/);
 const split=read('../src/core/builders/PageBuilder/PageDesignSplitAction.tsx');
 assert.match(builder,/PageDesignSplitAction label=\{item\.label\}/);
 assert.match(split,/aria-label=\{'Design '\+label\}/);
 assert.match(split,/const ordered=\[primary,/);
 assert.match(split,/onClick=\{onOpenDefault\}/);
 assert.match(split,/onChange=\{event=>onOpenLayout/);
 assert.match(builder,/onOpenDesign=\{openPageDesignLayout\}/);
});
test('page details uses immutable, permission-checked history endpoints',()=>{
 const ui=read('../src/core/builders/PageBuilder/PageDetailsDialog.tsx');
 assert.match(ui,/base\+'\/history'/);
 assert.match(ui,/base\+'\/versions\/ '\+version|base\+'\/versions\/'\+version/);
 assert.match(ui,/base\+'\/restore'/);
 assert.match(ui,/onOpenDesign\(page\.apiName,designVariant\)/);
 assert.match(ui,/Historical versions are immutable/);
 assert.match(ui,/Show archived/);
 assert.match(ui,/Unarchive/);
 assert.match(ui,/Page API name/);
 const api=read('../../server/src/api/PageApiController.ts');
 assert.match(api,/\/layouts\/:variant\/versions\/:version/);
 assert.match(api,/PageDefinition','read'/);
 assert.match(api,/versions\/:version\/archive/);
});
test('formula autocomplete supports up down enter and selection accessibility',()=>{
 const ui=read('../src/core/builders/PageBuilder/SmartFormulaField.tsx');
 assert.match(ui,/event\.key==='ArrowDown'/);
 assert.match(ui,/event\.key==='ArrowUp'/);
 assert.match(ui,/setActiveSuggestion/);
 assert.match(ui,/aria-activedescendant/);
 assert.match(ui,/insertFunction\(functionSuggestions\[Math\.min\(activeSuggestion/);
 assert.match(ui,/insert\(filtered\[Math\.min\(activeSuggestion/);
});

test('new API names typed manually are normalized to lowercase across metadata editors',()=>{
 const custom=read('../src/core/builders/ObjectManager/CustomMetadataManager.tsx');
 const values=read('../src/core/builders/ObjectManager/GlobalValueSetManager.tsx');
 const approvals=read('../src/core/automation/ApprovalProcessManager/ApprovalProcessManager.tsx');
 const pages=read('../src/core/builders/PageBuilder/PageDetailsDialog.tsx');
 for(const source of [custom,values,approvals,pages])
  assert.match(source,/event\.target\.value\.toLowerCase\(\)|e\.target\.value\.toLowerCase\(\)/);
 assert.match(custom,/apiName:'value'/);
 assert.match(pages,/nextApiName|apiName/);
});

test('Edit Page selects the device draft and respects saved-layout switching boundaries',()=>{
 const dialog=read('../src/core/builders/PageBuilder/PageDetailsDialog.tsx');
 const builder=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const migration=read('../../server/src/system-support/migrations/20270309-page-device-layout-page-properties.sql');
 assert.match(dialog,/aria-label="Device layout to design"/);
 assert.match(dialog,/setDesignVariant\(e\.target\.value as Variant\)/);
 assert.match(dialog,/onOpenDesign\(page\.apiName,designVariant\)/);
 assert.match(builder,/openPageDesignLayout=async\(apiName:string,variant:PageLayoutVariant\)/);
 assert.match(builder,/if\(editorMode&&page\.apiName===apiName\)return switchLayoutVariant\(variant\)/);
 assert.match(builder,/if\(undoStack\.length&&!window\.confirm\('Discard unsaved edits/);
 assert.match(builder,/\/layouts\/\$\{variant\}\/editor/);
 assert.doesNotMatch(builder,/case 'deviceLayout':return/);
 assert.doesNotMatch(builder,/data-ribbon-property="deviceLayout"/);
 assert.match(migration,/section_group='Page Properties'/);
 assert.doesNotMatch(migration,/DELETE FROM md_builder_shared_properties|DELETE FROM md_page_layout_versions/);
});
