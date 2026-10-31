import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const page=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
const advanced=read('../src/core/builders/PageBuilder/PageBuilderAdvancedRibbon.tsx');

test('Advanced is accessible for both Smart and standard components without replacing other ribbon tabs',()=>{
  assert.match(page,/'Component Layout','Component Action','Advanced','Preview'/);
  assert.match(page,/'Component Responsive','Component Action','Advanced','Preview'/);
  assert.match(page,/Advanced: 'Advanced'/);
  assert.match(page,/ribbonTab==='Advanced' && <PageBuilderAdvancedRibbon/);
  assert.match(page,/onOpen=\{openAdvanced\}/);
});

test('all nine previous functions have one discoverable advanced command',()=>{
  const expected=['visibility','actions','responsive','nesting','properties','canvas','recordPage','assignments','preview'];
  const keys=[...advanced.matchAll(/\{key:'([^']+)',label:/g)].map(match=>match[1]);
  assert.deepEqual([...keys].sort(),[...expected].sort());
  for(const key of expected)assert.match(page,new RegExp("advancedEditor==='"+key+"'"+"|feature==='"+key+"'"));
  assert.match(advanced,/scope==='component'&&!selected/);
  assert.match(advanced,/scope==='record'&&!recordPage/);
  assert.match(advanced,/scope==='canvas'&&\(!selected\|\|!freeCanvas\)/);
});

test('advanced controls reuse existing metadata editors and shared canvas and nesting functions',()=>{
  assert.match(page,/<RibbonVisibilityRules draft=\{visibilityDraft\}/);
  assert.match(page,/onApply=\{saveAdvancedVisibility\}/);
  assert.match(page,/mode="actions-editor"/);
  assert.match(page,/mode="details"/);
  assert.match(page,/reparentComponent\(page\.components,selected\.id,parent\)/);
  for(const fn of ['wrapSelectedInContainer','ungroupSelected','alignSelected','distributeSelected','moveSelected'])
    assert.ok(page.includes('onClick={'+fn) || page.includes('onClick={()=>'+fn+'('),fn);
  assert.match(page,/advancedEditor!=='recordPage' && page\.pageType === 'Record Page'/);
  assert.match(page,/advancedEditor!=='assignments' && <>/);
  assert.match(page,/office-ribbon-inspector-host" ref=\{setRibbonPropertyHost\}/);
  assert.match(page,/disableActions=\{!previewMode\}/);
});

test('Advanced leaves metadata migrations and published data untouched, with scoped UI styling',()=>{
  assert.match(advanced,/aria-pressed=\{feature\.key==='preview'\?preview:undefined\}/);
  assert.match(page,/if\(feature==='preview'\)\{setAdvancedEditor\(null\);setPreviewMode\(value=>!value\);return;\}/);
  const css=read('../src/core/builders/PageBuilder/PageBuilderAdvancedRibbon.css');
  assert.match(css,/page-builder-advanced-ribbon/);
  assert.match(css,/page-builder-advanced-dialog/);
  assert.doesNotMatch(advanced,/fetch\(|request\(|localStorage|SQL|INSERT INTO/);
});
