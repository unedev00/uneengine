import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const builder = read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
const canvas = read('../src/core/builders/PageBuilder/PageBuilderCanvasWorkspace.css');
const selection = read('../src/core/builders/PageBuilder/sections/01-page-builder.css');
const appearance = read('../src/core/pages/TemplatePageRuntime/pageComponentAppearance.css');
const handles = read('../src/core/builders/PageBuilder/SmartCanvasHandles.css');
const smart = read('../src/component-libraries/smart/shared/SmartRuntime.jsx');

test('all Page Builder components share a geometry-only canvas frame', () => {
  // The wrapper used to add an extra square, black stroke when the native
  // surface already painted its own configured (possibly rounded) border.
  assert.match(builder, /data-page-appearance=\{isLayoutType\(component\.type\) \? 'layout' : pageAppearanceTarget\(component\.type\)\}/);
  assert.match(builder, /data-page-style=\{pageAppearanceStyleKeys\(visualStyle\)\}/);
  assert.doesNotMatch(builder, /editorBlackBorder|canvas-authored-black-border/);
  assert.doesNotMatch(canvas, /canvas-authored-black-border/);
  assert.match(appearance, /\.record-component\[data-page-appearance\]\s*\{[^}]*border:0!important/);
  assert.match(appearance, /\.free-canvas-runtime-component\[data-page-appearance\]\s*\{[^}]*border:0!important/);
});

test('pointer selection and multi-selection never add a second square outline', () => {
  assert.doesNotMatch(selection, /\.free-canvas-component\.selected\s*\{\s*outline:2px/);
  assert.doesNotMatch(selection, /\.free-canvas-component\.multi-selected:not\(\.selected\)\s*\{\s*outline:2px/);
  assert.match(appearance,
    /\.builder-editor-mode \.modern-canvas-builder \.record-component\[data-page-appearance\]\.selected\s*\{[^}]*outline:0!important;[^}]*box-shadow:none!important/s);
  // Keyboard users still see a focus indicator, without an always-on frame.
  assert.match(appearance,
    /\.record-component\[data-page-appearance\]\.selected:focus-visible\s*\{[^}]*outline:2px dashed/s);
  assert.match(canvas, /\.canvas-group-outline/);
  for (const edge of ['n','s','e','w','ne','nw','se','sw'])
    assert.ok(handles.includes('.resize-' + edge), edge + ' resize handle must remain');
});

test('every native appearance category preserves its own authored border and radius', () => {
  // Not a smart_image-only fix: shared appearance targeting covers all
  // built-in, UNE and Smart component types using the same Page Builder.
  for (const target of [
    'input','toggle','button','badge','text','image','surface','collection',
    'table','calendar','progress','layout','tabs','conversation','cart','form','overlay'
  ]) {
    assert.ok(appearance.includes('data-page-appearance="' + target + '"'), target);
  }
  assert.match(appearance, /\[data-page-appearance="image"\]\[data-page-style~="border"\] \.registered-component img/);
  assert.match(appearance, /\[data-page-appearance="image"\]\[data-page-style~="radius"\] \.registered-component img/);
  assert.match(smart, /<article className="smart-card" style=\{\{/);
  assert.match(smart, /borderRadius:number\(p\.radius,12\)/);
  assert.match(smart, /border:p\.borderColor\?"1px solid "\+p\.borderColor:/);
  assert.match(smart, /border:p\.imageBorderColor\?"1px solid "\+p\.imageBorderColor:undefined/);
});
