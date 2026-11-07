import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('Card Grid bounded mode comes from the authored free-canvas frame, not a fixed application height',()=>{
 const source=read('../src/core/pages/MetadataBoundPageComponent/MetadataBoundPageComponent.tsx');
 assert.match(source,/definition\.apiName==='ui_item_grid'&&Boolean\(component\.position\)/);
 assert.match(source,/boundedCardGrid\?\{boundedViewport:true\}/);
 assert.match(source,/className=\{boundedCardGrid\?'md-card-grid-bound':undefined\}/);
});

test('Card Grid record rows have a native, keyboard accessible and independently scrolling viewport',()=>{
 const grid=read('../src/component-libraries/shared/primitives/ItemGrid/ItemGrid.jsx');
 const css=read('../src/component-libraries/ui_item_grid/UiItemGrid.css');
 const frame=read('../src/component-libraries/ui-runtime/shared/Frame.jsx');
 for(const token of ['md-product-grid--scroll','aria-label','tabIndex','overflowY:"scroll"','scrollbarGutter:"stable"','minHeight:0']){
  assert.ok(grid.includes(token),'Missing '+token);
 }
 assert.match(frame,/p\.boundedViewport===true\?"100%"/);
 assert.match(css,/\.md-card-grid-bound > div:not\(\.records-pagination\)/);
 assert.match(css,/\.md-product-grid--scroll::-webkit-scrollbar/);
 assert.match(css,/overscroll-behavior-y:contain/);
 assert.match(css,/touch-action:pan-y/);
});

test('Card Grid scrolling does not replace move/resize or enable nested scrolling on auto-height templates',()=>{
 const grid=read('../src/component-libraries/shared/primitives/ItemGrid/ItemGrid.jsx');
 const handles=read('../src/core/builders/PageBuilder/SmartCanvasHandles.css');
 const builder=read('../src/core/builders/PageBuilder/editor/canvas/createPageCanvasRenderer.tsx');
 assert.match(grid,/p\.boundedViewport===true\?/);
 assert.match(handles,/\.free-canvas-resize-handle/);
 assert.match(handles,/overflow:visible!important/);
 assert.match(grid,/event\.pointerType==="touch"\)event\.stopPropagation\(\)/);
 assert.match(builder,/canvasScrollbarHit\(target,event\.clientX,event\.clientY,event\.currentTarget\)/);
});


test('Both Card Grid runtimes keep every authorised row and use row count for visible geometry',()=>{
 const smart=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 const generic=read('../src/component-libraries/shared/primitives/ItemGrid/ItemGrid.jsx');
 assert.match(smart,/gridAutoRows:"max\("/);
 assert.match(smart,/previewRows\.map\(\(r,i\)=>/);
 assert.match(smart,/recordsOf\(p\)/);
 assert.match(generic,/visibleRowCount/);
 assert.match(generic,/gridAutoRows:"max\("/);
 assert.match(generic,/visibleRows\.map\(\(r, i\) =>/);
 assert.doesNotMatch(generic,/visibleRows\.slice\(0,maxCards\)/);
});

test('Smart Card Grid scroll interaction preserves Page Builder move grips',()=>{
 const builder=read('../src/core/builders/PageBuilder/editor/canvas/createPageCanvasRenderer.tsx');
 assert.doesNotMatch(builder,/component\.type==='Custom:smart_card_grid'&&target\.closest/);
 assert.match(builder,/startCanvasMove\(event, component\)/);
});
