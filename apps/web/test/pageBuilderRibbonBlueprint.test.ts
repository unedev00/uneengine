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
 assert.match(css,/#page-builder-tab-content\s*>\s*\.office-ribbon-part-group/);
 assert.match(css,/#page-builder-tab-content\[aria-label="Component Content"\]\s*>\s*\.office-ribbon-inline-options/);
 assert.match(css,/#page-builder-tab-content\s*>\s*\.office-ribbon-add-library\s*>\s*\.office-ribbon-gallery-pages/);
 assert.match(css,/flex-flow:row nowrap!important/);
});

test('capability icons use reusable metadata editors without intermediate modals',()=>{
 const code=readFileSync(new URL('../src/core/builders/PageBuilder/RibbonCapabilityControls.tsx',import.meta.url),'utf8');
 assert.match(code,/disabled=\{!definitions.length\}/);
 assert.match(code,/PageBuilderRibbonMetadataPager definitions=\{definitions\}/);
 assert.match(code,/RibbonColorPalette key=\{name\}/);
 assert.match(code,/office-ribbon-capability-popover/);
 assert.doesNotMatch(code,/office-ribbon-capability-backdrop/);
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

test('Data ribbon moves source/filter shortcuts into headings and removes redundant Active record',()=>{
 const source=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonData.tsx',import.meta.url),'utf8');
 assert.match(source,/aria-label="Open source"/);
 assert.match(source,/aria-label="Open filters"/);
 assert.doesNotMatch(source,/fieldSelect\('Active record'/);
 assert.match(source,/recordSortFieldApiName/);
 assert.match(source,/Enable pagination/);
});
test('Content ribbon keeps legacy value and empty message inline with no modal',()=>{
 const source=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonContent.tsx',import.meta.url),'utf8');
 assert.match(source,/aria-label="Show legacy value"/);
 assert.match(source,/aria-label="Empty state message"/);
 assert.doesNotMatch(source,/moreContent|createPortal|More content settings/);
});
test('Design icons provide direct Excel-style colour, size, weight and alignment choices',()=>{
 const controls=readFileSync(new URL('../src/core/builders/PageBuilder/RibbonCapabilityControls.tsx',import.meta.url),'utf8');
 const palette=readFileSync(new URL('../src/core/builders/PageBuilder/RibbonColorPalette.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonBlueprint.css',import.meta.url),'utf8');
 for(const token of ['SizeSelect','WeightOptions','AlignmentOptions','RibbonColorPalette','CommandPopover','choices??[]'])
   assert.ok(controls.includes(token),token);
 assert.match(controls,/aria-label=\{label\+' font size'\}/);
 assert.match(controls,/aria-pressed=\{String\(properties\[definition.propertyKey\]/);
 assert.match(palette,/variant==='capability'/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,38px\)\)/);
 assert.match(css,/office-ribbon-weight-direct/);
 assert.match(css,/office-ribbon-align-direct/);
 assert.match(css,/office-ribbon-content-card>\.office-ribbon-group-heading/);
});
