import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');

test('Arrange replaces the old Grok and Advanced canvas commands without changing their handlers',()=>{
 const arrange=readFileSync(new URL('../src/core/builders/PageBuilder/ArrangeRibbon.tsx',import.meta.url),'utf8');
 assert.match(page,/'Component Layout','Arrange','Component Action','Logic','Preview'/);
 assert.doesNotMatch(page,/ribbonTab==='Grok'/);
 assert.match(page,/<ArrangeRibbon/);
 assert.match(page,/onAlign=\\{alignSelected\\}/);
 assert.match(page,/onDistribute=\\{distributeSelected\\}/);
 assert.match(page,/onGroup=\\{wrapSelectedInContainer\\}/);
 assert.match(page,/onUngroup=\\{ungroupSelected\\}/);
 assert.match(page,/onLock=/);
 assert.match(page,/onNesting=/);
 assert.match(arrange,/Align left/);
 assert.match(arrange,/Distribute vertically/);
 assert.match(arrange,/Bring to front/);
 assert.match(arrange,/Component nesting/);
 assert.match(page,/ribbonTab==='Logic'.*preview-visibility-group/);
 assert.match(page,/case 'exitPreview'/);
});
test('Grok keyboard shortcuts respect editing and preview guards',()=>{
  assert.ok(page.includes("['INPUT','TEXTAREA','SELECT'].includes(target.tagName)"));
  assert.ok(page.includes("command && key === 'g' && !previewMode"));
  assert.ok(page.includes("if (event.shiftKey) ungroupSelected();"));
  assert.ok(page.includes("else wrapSelectedInContainer();"));
  assert.ok(page.includes("const step = command ? 1 : 8;"));
  assert.ok(page.includes("const ids = selectionIds.length ? selectionIds"));
  assert.ok(page.includes('isCanvasLocked(c)'));
  assert.ok(page.includes('applyPage({ ...page, components: next });'));
});
