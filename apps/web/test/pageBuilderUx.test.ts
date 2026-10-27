import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import { pageBuilderPaletteCategories } from '../src/core/builders/PageBuilder/pageBuilderPalette';
import {
  addRecentPageBlock, loadRecentPageBlocks, pageBuilderCategoryLabels, pageBuilderStartOptions
} from '../src/core/builders/PageBuilder/pageBuilderUx';

test('all builder palette groups have short non-technical display labels', () => {
  assert.deepEqual(Object.keys(pageBuilderCategoryLabels).sort(), [...pageBuilderPaletteCategories].sort());
  for (const category of pageBuilderPaletteCategories) {
    assert.ok(pageBuilderCategoryLabels[category].length > 0);
    assert.ok(pageBuilderCategoryLabels[category].split(/\s+/).length <= 3);
  }
});

test('reused page types remain metadata-backed and human-readable', () => {
  assert.deepEqual(pageBuilderStartOptions.map(option => option.type), [
    'Home Page', 'Record Page', 'App Page'
  ]);
  for (const choice of pageBuilderStartOptions) {
    assert.ok(choice.title.length > 0 && choice.description.length > 0);
  }
});

test('recent blocks are bounded, deduplicated and reject invalid preferences', () => {
  assert.deepEqual(addRecentPageBlock(['Text','Image','Button'], 'Image'), ['Image','Text','Button']);
  assert.equal(addRecentPageBlock(['a','b','c'], 'd', 2).length, 2);
  assert.deepEqual(loadRecentPageBlocks('invalid'), []);
  assert.deepEqual(loadRecentPageBlocks('{"foo":"bar"}'), []);
  assert.deepEqual(loadRecentPageBlocks('["Text","Text",false,null,"Button"]'), ['Text','Button']);
  assert.equal(loadRecentPageBlocks(JSON.stringify(Array.from({length:20},(_,i)=>'Block'+i))).length,8);
});

test('journey mounts record filters inline and saves draft separately from publishing', () => {
  const source=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
  const engine=readFileSync(new URL('../src/core/builders/ComponentProperties/componentPropertiesView.tsx',import.meta.url),'utf8');
  assert.match(source,/Component Content/);
  assert.match(source,/page-ribbon-expanded-editor/);
  assert.match(source,/mode=\{expandedRibbonEditor.kind==='source'\?'data-source'/);
  assert.match(source,/ribbonFilterDraft/);
  assert.match(source,/Apply filters/);
  assert.match(source,/Cancel changes/);
  assert.doesNotMatch(source,/dataEditorOpen|visibilityDialogOpen/);
  assert.match(engine,/mode==='filters-editor'/);
  assert.match(engine,/RecordFilterEditor/);
});

test('card gallery exposes independent part metadata that is consumed by runtime', () => {
  const component=JSON.parse(readFileSync(new URL('../src/one/une_item_grid/component.json',import.meta.url),'utf8'));
  const runtime=readFileSync(new URL('../src/one/OneItemGrid/OneItemGrid.jsx',import.meta.url),'utf8');
  const keys=new Set(component.propertyDefinitions.map((definition:{propertyKey:string})=>definition.propertyKey));
  for(const key of ['imageWidth','imageHeight','imageFit','imageAspectRatio','imageShape',
    'headingFontSize','headingColor','descriptionFontSize','descriptionColor','valueFontSize','valueColor']) {
    assert.equal(keys.has(key),true,key+' must be configurable');
    assert.match(runtime,new RegExp('p\\\\.'+key+'\\\\b'),key+' must change rendering');
  }
  for(const part of ['Image','Heading','Supporting text','Value','Card','Gallery'])
    assert.equal(component.propertyDefinitions.some((definition:{group?:string})=>definition.group===part),true,part);
});
