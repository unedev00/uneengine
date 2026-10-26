import assert from 'node:assert/strict';
import test from 'node:test';
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
