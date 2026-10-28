import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('ribbon preserves real disabled commands instead of Not applicable placeholders',()=>{
 const source=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(source,/<span className="office-ribbon-disabled-group">Not applicable<\/span>/);
 assert.match(source,/RibbonCapabilityControls group=\{group\}/);
 assert.match(source,/ribbonPartIcons\[group\]/);
});
test('the real Insert, Content and Design ribbon structures have compact overrides',()=>{
 const css=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonBlueprint.css',import.meta.url),'utf8');
 assert.match(css,/#page-builder-tab-content > \.office-ribbon-part-group/);
 assert.match(css,/#page-builder-tab-content\[aria-label="Component Content"\] > \.office-ribbon-inline-options/);
 assert.match(css,/#page-builder-tab-content > \.office-ribbon-add-library > \.office-ribbon-gallery-pages/);
 assert.match(css,/flex-flow:row nowrap!important/);
});

test('capability icons use metadata-backed editor and disable individually',()=>{
 const code=readFileSync(new URL('../src/core/builders/PageBuilder/RibbonCapabilityControls.tsx',import.meta.url),'utf8');
 assert.match(code,/disabled=\{!matched\(cmd.name\).length\}/);
 assert.match(code,/PageBuilderRibbonMetadataPager definitions=\{matched\(active\)\}/);
 assert.match(code,/office-ribbon-command-label/);
});
