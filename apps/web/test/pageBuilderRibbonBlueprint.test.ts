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
 const css=readFileSync(new URL('../src/core/builders/PageBuilder/sections/04-page-builder.css',import.meta.url),'utf8');
 assert.match(css,/#page-builder-tab-content > \.office-ribbon-part-group/);
 assert.match(css,/#page-builder-tab-content\[aria-label="Component Content"\] > \.office-ribbon-inline-options/);
 assert.match(css,/#page-builder-tab-content > \.office-ribbon-add-library > \.office-ribbon-gallery-pages/);
 assert.match(css,/grid-template-rows:repeat\(3,40px\)!important/);
});
