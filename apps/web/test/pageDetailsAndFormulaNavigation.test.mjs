import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('Page Manager exposes different Edit and Design actions',()=>{
 const builder=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(builder,/aria-label=\{'Edit page properties for '/);
 assert.match(builder,/aria-label=\{'Design '\+item\.label\}/);
 assert.match(builder,/onOpenDesign=\{selectSavedPage\}/);
});
test('page details uses immutable, permission-checked history endpoints',()=>{
 const ui=read('../src/core/builders/PageBuilder/PageDetailsDialog.tsx');
 assert.match(ui,/base\+'\/history'/);
 assert.match(ui,/base\+'\/versions\/ '\+version|base\+'\/versions\/'\+version/);
 assert.match(ui,/base\+'\/restore'/);
 assert.match(ui,/onOpenDesign\(page\.apiName\)/);
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
