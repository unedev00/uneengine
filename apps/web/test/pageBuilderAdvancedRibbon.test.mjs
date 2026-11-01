import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const page=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
const advanced=read('../src/core/builders/PageBuilder/PageBuilderAdvancedSections.tsx');
const dialog=read('../src/core/builders/PageBuilder/PageBuilderVisibilityDialog.tsx');
const responsive=read('../src/core/builders/PageBuilder/PageBuilderAdvancedResponsive.tsx');
const css=read('../src/core/builders/PageBuilder/PageBuilderAdvancedRibbon.css');

test('View owns visibility conditions and reuses the record filter dialog shell',()=>{
 assert.match(page,/'Component Layout','Arrange','Component Action','Advanced','Preview'/);
 assert.doesNotMatch(page,/ribbonTab==='Logic'/);
 assert.match(page,/ribbonTab==='Preview' && <div className="office-ribbon-group preview-visibility-group"/);
 assert.match(page,/aria-label="Edit conditional visibility"/);
 assert.match(page,/onClick=\{openVisibilityEditor\}/);
 assert.match(page,/<PageBuilderVisibilityDialog/);
 assert.match(dialog,/smart-dialog smart-filter-dialog/);
 assert.match(dialog,/<ComponentVisibilityEditor rules=\{rules\}/);
 assert.match(dialog,/validateVisibilityRule\(rules/);
 assert.match(page,/onApply=\{applyVisibilityEditor\}/);
});

test('Activation and advanced property editors render inline without a popup',()=>{
 assert.match(page,/ribbonTab==='Advanced' && <PageBuilderAdvancedSections/);
 assert.match(advanced,/Activation assignments/);
 assert.match(advanced,/Advanced properties/);
 assert.match(advanced,/page-builder-advanced-inline-host/);
 assert.match(advanced,/ref=\{onInspectorHost\}/);
 assert.match(page,/!\['assignments','properties','responsive'\]\.includes\(advancedEditor\)/);
 assert.match(page,/advancedEditor!=='assignments' && <>/);
 assert.match(page,/activationAssignments/);
 assert.match(css,/page-builder-advanced-inline-body/);
});

test('Distinct responsive overrides and flow-bound details stay accessible',()=>{
 assert.match(advanced,/Responsive settings/);
 assert.match(page,/<PageBuilderAdvancedResponsive properties=\{selected.properties\} device=\{currentRibbonDevice\}/);
 assert.match(page,/advancedEditor==='properties' && selected && <MetadataComponentProperties/);
 assert.match(page,/mode="details"/);
 for(const symbol of ['responsiveNumberFields','responsiveOptionFields','responsiveColorFields',
  'layoutSettings','updateLayoutSettings'])assert.ok(responsive.includes(symbol),symbol);
 assert.match(responsive,/onChange\(updateLayoutSettings\(properties,device,key,value\)\)/);
 assert.doesNotMatch(advanced,/fetch\(|request\(|localStorage|INSERT INTO/);
});

test('Preserves global Actions and record-page metadata editing',()=>{
 assert.match(page,/<PageBuilderActionRibbon/);
 assert.match(page,/advancedEditor==='recordPage'/);
 assert.match(page,/reparentComponent\(page\.components,selected\.id,parent\)/);
});
