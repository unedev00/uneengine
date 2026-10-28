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

test('selected Item Grid and Calendar render blueprint-specific Design and Content',()=>{
 const source=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
 const content=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonContent.tsx',import.meta.url),'utf8');
 assert.match(source,/selectedCustomDefinition\?\.apiName==='une_item_grid'/);
 assert.match(source,/selectedCustomDefinition\?\.apiName==='une_calendar'/);
 assert.match(source,/PageBuilderRibbonContent key=\{selected.id\}/);
 assert.match(content,/section\('Event Title'/);
 assert.match(content,/section\('Event Time'/);
 assert.match(content,/section\('Supporting Text'/);
 assert.match(content,/RibbonFieldExpressionInput/);
});
test('Data and Responsive are three stable functional ribbon groups',()=>{
 const data=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonData.tsx',import.meta.url),'utf8');
 const responsive=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonStyle.tsx',import.meta.url),'utf8');
 assert.match(data,/office-ribbon-data-group/);
 assert.match(data,/onOpenFilters/);
 assert.match(data,/recordSortFieldApiName/);
 assert.match(responsive,/office-ribbon-responsive-visibility/);
 assert.match(responsive,/office-ribbon-responsive-overrides/);
 assert.match(responsive,/office-ribbon-responsive-rules/);
});
test('extra metadata styling remains available outside the fixed ribbon',()=>{
 const style=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderAdvancedStyle.tsx',import.meta.url),'utf8');
 assert.match(style,/RibbonDesign properties=\{properties\}/);
 assert.match(style,/RibbonFormat properties=\{properties\}/);
});
