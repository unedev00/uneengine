import { readPageBuilderModules } from './helpers/builderSources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Parity tab lists verified work and remaining scope without claiming full Salesforce coverage',()=>{
 const source=readPageBuilderModules();
 assert.doesNotMatch(source,/Implemented and verified|Remaining requested coverage/);
});

test('the real Insert, Content and Design ribbon structures have compact overrides',()=>{
 const css=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonBlueprint.css',import.meta.url),'utf8');
 assert.match(css,/#page-builder-tab-content\s*>\s*\.office-ribbon-part-group/);
 assert.match(css,/#page-builder-tab-content\[aria-label="Component Content"\]\s*>\s*\.office-ribbon-inline-options/);
 assert.match(css,/#page-builder-tab-content\s*>\s*\.office-ribbon-add-library\s*>\s*\.office-ribbon-gallery-pages/);
 assert.match(css,/flex-flow:row nowrap!important/);
});

test('Batch 2 removes redundant Layout controls and keeps unique positioning',()=>{
 const source=readPageBuilderModules();
 assert.doesNotMatch(source,/office-ribbon-arrange-column|office-ribbon-layout-position-physical|office-ribbon-layout-size-physical/);
});
test('Batch 2 grid runtime reads density, line-height, radius and image position',()=>{
 const runtime=readFileSync(new URL('../src/component-libraries/shared/primitives/ItemGrid/ItemGrid.jsx',import.meta.url),'utf8');
 const page=readFileSync(new URL('../src/core/pages/TemplatePageRuntime/pageComponentLayout.ts',import.meta.url),'utf8');
 for(const key of ['p.density','p.lineHeight','p.cardRadius','p.imagePosition','p.headingExpression','p[part+"LineLimit"]'])
   assert.ok(runtime.includes(key),key);
 assert.match(runtime,/gap:gridGap/);
 assert.match(runtime,/const gridGap=Number\.isFinite\(Number\(p\.gap\)\)/);
 assert.match(page,/--md-page-line-height/);
});
test('Batch 2 fixes shared palette contrast and Layout numeric input widths',()=>{
 const css=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonBlueprint.css',import.meta.url),'utf8');
 assert.match(css,/office-ribbon-palette-hex input::placeholder/);
 assert.match(css,/office-ribbon-layout-typography/);
 assert.match(css,/max-width:57px!important/);
});
test('Item Grid ribbon groups have three-column caps, never five icons on a row',()=>{
 const css=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonBlueprint.css',import.meta.url),'utf8');
 assert.match(css,/Approved Item Grid Design ribbon: at most three controls in any row/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.match(css,/grid-template-rows:repeat\(2,41px\)!important/);
 assert.match(css,/grid-template-columns:repeat\(3,25px\)!important/);
 assert.match(css,/office-ribbon-weight-direct button/);
 assert.match(css,/office-ribbon-item-grid-extra \.office-ribbon-extra-field select/);
});
