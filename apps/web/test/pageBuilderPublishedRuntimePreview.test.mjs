import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');

test('interactive preview uses the same lazy-loaded runtime as published App Pages', () => {
  const app = source('../src/core/workspace/App/App.tsx');
  const builder = source('../src/core/builders/PageBuilder/pageBuilderView.tsx');
  assert.match(app, /createPageBuilder\(MetadataComponentProperties, runtime\.MetadataBoundPageComponent, runtime\.LightningAppRuntime\)/);
  assert.match(builder, /previewMode \? <div className="page-builder-live-runtime"/);
  assert.match(builder, /<LightningAppRuntime[\s\S]*?previewPage=\{page\}/);
  assert.match(builder, /pageDefinitionCache=\{previewPageDefinitionCache\.current\}/);
  assert.match(builder, /onLaunchFlow=\{onLaunchFlow\}/);
  assert.match(builder, /previewMode \? <div className="page-builder-live-runtime"[\s\S]*? : <div\s+className=\{\`record-preview/);
});

test('preview renders draft metadata without fetching or caching a published page revision', () => {
  const runtime = source('../src/core/pages/PageRuntime/pageRuntimeViews.tsx');
  assert.match(runtime, /previewPage\?: LightningPageMetadata/);
  assert.match(runtime, /const page=previewPage\?\?\(routePending\?cached:pageLoad\.page\)/);
  assert.match(runtime, /const loading=previewPage\?false/);
  assert.match(runtime, /if\(previewPage\)return;[\s\S]*?const cachedPage=readPageDefinitionCache/);
});

test('live preview has no editor drag and resize handlers or canvas movement cursor', () => {
  const builder = source('../src/core/builders/PageBuilder/pageBuilderView.tsx');
  const css = source('../src/core/builders/PageBuilder/PageBuilderCanvasWorkspace.css');
  assert.match(builder, /onPointerDown=\{!previewMode && !libraryPreview && page\.layoutMode === 'free-canvas'/);
  assert.match(builder, /onPointerMove=\{!previewMode && !libraryPreview && page\.layoutMode === 'free-canvas'/);
  assert.match(builder, /onDrop=\{previewMode \? undefined : \(event\) => handleDrop\(event\)\}/);
  assert.match(css, /builder-interactive-preview \.reference-builder-layout\.page-builder-layout \.page-stage\{/);
  assert.match(css, /builder-interactive-preview \.page-builder-live-runtime\{/);
});
