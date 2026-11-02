import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const builder=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
const handles=read('../src/core/builders/PageBuilder/SmartCanvasHandles.css');
const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
const formulaCss=read('../src/core/builders/PageBuilder/SmartRibbonDataFormula.css');
const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');

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
});

test('data ribbon exposes existing metadata fields without new binding properties',()=>{
 assert.match(ribbon,/import \{relationshipFormulaFields\} from '\.\/relationshipFormulaFields'/);
 assert.match(ribbon,/relationshipFormulaFields\(objects,sourceObjectNames/);
 assert.match(ribbon,/className="smart-data-field-picker"/);
 assert.match(ribbon,/aria-label="Choose display field"/);
 assert.match(ribbon,/onChange=\{event=>\{if\(event\.target\.value\)changeActiveDataFormula\(event\.target\.value\);\}\}/);
 assert.match(ribbon,/onChange\(\{\.\.\.properties,\[activeDataKey\]:next/);
 assert.match(formulaCss,/\.smart-data-field-picker\{/);
});
