import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderAdvancedRibbon.css',import.meta.url),'utf8');

test('Grok tab and controls coexist with existing Advanced and Preview ribbon',()=>{
  assert.ok(page.includes("| 'Advanced' | 'Grok'>('Add Block')"));
  assert.ok(page.includes("page.layoutMode==='free-canvas'?['Grok' as const]:[]"));
  assert.ok(page.includes("ribbonTab==='Grok' && page.layoutMode==='free-canvas'"));
  assert.ok(page.includes("onClick={wrapSelectedInContainer}"));
  assert.ok(page.includes("onClick={ungroupSelected}"));
  assert.ok(page.includes("onClick={()=>alignSelected('x',anchor)}"));
  assert.ok(page.includes("onClick={()=>alignSelected('y',anchor)}"));
  assert.ok(page.includes("onClick={()=>distributeSelected('x')}"));
  assert.ok(page.includes("onClick={()=>distributeSelected('y')}"));
  assert.ok(page.includes('preview-visibility-group'));
  assert.ok(page.includes("case 'exitPreview'"));
  assert.ok(page.includes("canvasTools={page.layoutMode==='free-canvas'"));
  assert.ok(css.includes('>.grok-canvas-ribbon'));
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
