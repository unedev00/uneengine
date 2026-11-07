import { readPageBuilderModules } from './helpers/builderSources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const builder=readPageBuilderModules();
const handles=read('../src/core/builders/PageBuilder/SmartCanvasHandles.css');
const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
const formulaCss=read('../src/core/builders/PageBuilder/SmartRibbonDataFormula.css');
const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
const smartCss=read('../src/component-libraries/smart/shared/smart.css');

test('button-based smart components are draggable on the editing canvas without enabling runtime actions',()=>{
 const move=builder.slice(builder.indexOf('const startCanvasMove ='),builder.indexOf('const moveCanvasPointer ='));
 assert.ok(move.length>0);
 assert.match(move,/event\.currentTarget\.setPointerCapture\(event\.pointerId\)/);
 assert.doesNotMatch(move,/hit\.closest\('button,/);
 assert.match(move,/hit\.closest\('input,select,textarea,\[contenteditable="true"\]/);
 assert.match(builder,/onClickCapture=\{libraryPreview/);
 assert.match(builder,/selectOnlyInDesigner \? event =>/);
 assert.match(builder,/!previewMode && !libraryPreview && page\.layoutMode === 'free-canvas'/);
});

test('selection bounds are editor-only, always show the exact frame, and never create metadata',()=>{
 assert.match(handles,/\.free-canvas-component\.selected::after\{/);
 assert.match(handles,/position:absolute;inset:0;box-sizing:border-box/);
 assert.match(handles,/pointer-events:none;z-index:161/);
 assert.match(handles,/--canvas-selection-outline,#2563eb/);
 assert.match(builder,/--canvas-selection-outline':component\.properties\.borderColor/);
 assert.doesNotMatch(builder,/properties:\s*\{[^}]*canvasSelectionOutline/);
 assert.match(handles,/\.record-component\.selected:not\(\.free-canvas-component\)/);
});

test('tab bounds stay visible in short containers while preserving configured tab height',()=>{
 assert.match(runtime,/height:number\(p\.tabHeight,44\),maxHeight:"100%",minHeight:0/);
 assert.doesNotMatch(runtime,/minHeight:number\(p\.tabHeight,44\)/);
 assert.match(handles,/\.free-canvas-component > \.free-canvas-content-viewport/);
 assert.match(runtime,/height:32,maxHeight:"100%",minHeight:0/);
 assert.match(smartCss,/\.smart-container\{[^}]*min-height:0;max-height:100%/);
});

test('data binding uses one selected-only canvas overlay and existing Formula Bar',()=>{
 const icons=read('../src/core/builders/PageBuilder/CanvasDataBindingIcons.tsx');
 const bindings=read('../src/core/builders/PageBuilder/canvasDataBindingTargets.ts');
 assert.match(builder,/selectedId===component\.id&&/);
 assert.match(builder,/<CanvasDataBindingIcons/);
 assert.match(builder,/if\(hit\.closest\('\.canvas-data-bindings'\)\)return/);
 assert.match(builder,/canvasBinding=\{canvasBinding\}/);
 assert.match(ribbon,/writeCanvasBinding\(properties/);
 assert.match(ribbon,/ref=\{formulaInputHost\}/);
 assert.doesNotMatch(ribbon,/<div className="smart-data-sections">/);
 assert.match(icons,/p\.tab==='Data'&&p\.components\.includes\(api\)/);
 assert.match(icons,/data-md-bind/);
 assert.match(bindings,/tabCaptionIndex/);
 assert.match(formulaCss,/smart-data-formula-input/);
});
