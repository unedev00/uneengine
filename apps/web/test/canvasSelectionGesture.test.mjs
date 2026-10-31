import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
const handles=readFileSync(new URL('../src/core/builders/PageBuilder/SmartCanvasHandles.css',import.meta.url),'utf8');

test('a design-time image or shield click selects its own component, not the tab behind it',()=>{
  const click=source.slice(source.indexOf('onClickCapture={libraryPreview'),source.indexOf('onDoubleClick={!libraryPreview'));
  assert.match(click,/event\.preventDefault\(\);\s*event\.stopPropagation\(\);\s*selectCanvasComponent\(event\)/);
  assert.doesNotMatch(click,/hit\.closest\('\.canvas-design-interaction-shield/,'shield clicks must go through component selection');
  assert.match(source,/onDragStartCapture=\{selectOnlyInDesigner && page\.layoutMode === 'free-canvas'/,'native image dragging must not steal captured gestures');
  assert.match(handles,/\.free-canvas-component\.selected\{\s*z-index:1000!important/,'selected image must be hit-tested in front of overlapping tabs');
  assert.match(handles,/\.canvas-group-outline\{\s*z-index:1100/,'group handles must remain above promoted selected shapes');
});

test('selected shape exposes four-way movement and eight independent resize arrows',()=>{
  assert.match(source,/className=`free-canvas-resize-handle resize-\$\{edge\}`/);
  assert.match(source,/\['n','ne','e','se','s','sw','w','nw'\]/);
  assert.match(source,/onPointerDown=\{event => startCanvasResize\(event, component, edge\)\}/);
  assert.match(source,/onPointerMove=\{moveCanvasResize\} onPointerUp=\{endCanvasResize\}/);
  assert.match(source,/onLostPointerCapture=\{event => endCanvasResize\(event, true\)\}/);
  assert.match(source,/setSelectionIds\(\[component\.id\]\);\s*setSelectedRegion\(null\);\s*\};\s*const moveCanvasResize/);
  for(const [edge,cursor] of Object.entries({n:'ns',ne:'nesw',e:'ew',se:'nwse',s:'ns',sw:'nesw',w:'ew',nw:'nwse'})){
    assert.match(handles,new RegExp('\\.resize-'+edge+'(?:,|\\{|[^}]*\\{)[^}]*cursor:'+cursor+'-resize!important'),'directional resize cursor for '+edge);
  }
  assert.match(handles,/\.free-canvas-component:not\(\.canvas-component-locked\) > :not\(\.canvas-element-actions\)/);
  assert.match(handles,/cursor:move!important/,'four-way move cursor for selected image/shape');
  assert.doesNotMatch(handles,/cursor:grabbing!important/,'hand cursor must not return on the move grip');
  assert.match(source,/canvas-editing/);
  assert.match(handles,/\.free-canvas-stage\.canvas-editing\{\s*overflow:visible/,'boundary handles must not be clipped');
});
