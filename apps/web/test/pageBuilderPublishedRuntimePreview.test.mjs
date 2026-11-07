import { readPageBuilderModules } from './helpers/builderSources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');

test('interactive preview uses the same lazy-loaded runtime as published App Pages', () => {
  const app = source('../src/core/workspace/App/App.tsx');
  const builder = source('../src/core/builders/PageBuilder/editor/canvas/PageCanvasStage.tsx');
  assert.match(app, /createPageBuilder\(MetadataComponentProperties, runtime\.MetadataBoundPageComponent, runtime\.LightningAppRuntime\)/);
  assert.match(builder, /previewMode && page\.pageType !== 'Record Page' \? <div className="page-builder-live-runtime"/);
  assert.match(builder, /<LightningAppRuntime[\s\S]*?previewPage=\{page\}/);
  assert.match(builder, /pageDefinitionCache=\{previewPageDefinitionCache\.current\}/);
  assert.match(builder, /onLaunchFlow=\{onLaunchFlow\}/);
  assert.match(builder, /formFactor=\{device\} previewLayoutDevice=\{device\}/);
  assert.match(builder, /previewMode && page\.pageType !== 'Record Page' \? <div className="page-builder-live-runtime"[\s\S]*? : <div\s+className=\{\`record-preview/);
});

test('preview renders draft metadata without fetching or caching a published page revision', () => {
  const runtime = source('../src/core/pages/PageRuntime/pageRuntimeViews.tsx');
  assert.match(runtime, /previewPage\?: LightningPageMetadata/);
  assert.match(runtime, /const page=previewPage\?\?\(routePending\?cached:pageLoad\.page\)/);
  assert.match(runtime, /const loading=previewPage\?false/);
  assert.match(runtime, /const layoutDevice = previewLayoutDevice \?\? detectedLayoutDevice/);
  assert.match(runtime, /if\(previewPage\)return;[\s\S]*?const cachedPage=readPageDefinitionCache/);
});


test('unbound Image and Smart Image load the same tenant assets in preview and published runtime', () => {
  const runtime = source('../src/core/pages/PageRuntime/pageRuntimeViews.tsx');
  const builder = source('../src/core/builders/PageBuilder/editor/canvas/createPageCanvasRenderer.tsx');
  const tenantImage = source('../src/component-libraries/shared/TenantImage.jsx');
  assert.match(runtime, /const loadPageMediaAsset = \(id:string\) =>/);
  assert.match(runtime, /Promise.reject\(new Error\('Invalid media asset ID'\)\)/);
  assert.match(runtime, /apiRequest<\{contentType:string;contentBase64:string\}>\('\/media-assets\/'\+id\)/);
  assert.match(runtime, /loadAsset: loadPageMediaAsset, viewRevision: revision/);
  const start = runtime.indexOf('const content = needsMetadataComponentRuntime(component.properties)');
  const end = runtime.indexOf('const rendered = nestedChildren?.length', start);
  assert.ok(start >= 0 && end > start, 'unbound custom component renderer exists');
  const customRuntime = runtime.slice(start, end);
  assert.match(customRuntime, /:\s*<RegisteredComponent definition=\{definition\} layoutTransparent props=\{\{[\s\S]*?loadAsset: loadPageMediaAsset/);
  assert.match(builder, /loadAsset:\(id:string\)=>request/);
  assert.match(tenantImage, /loader\.current\(match\[1\]\)/);
});

test('live preview has no editor drag and resize handlers or canvas movement cursor', () => {
  const builder = readPageBuilderModules();
  const css = source('../src/core/builders/PageBuilder/PageBuilderCanvasWorkspace.css');
  assert.match(builder, /onPointerDown=\{!previewMode && !libraryPreview && page\.layoutMode === 'free-canvas'/);
  assert.match(builder, /onPointerMove=\{!previewMode && !libraryPreview && page\.layoutMode === 'free-canvas'/);
  assert.match(builder, /onDrop=\{previewMode \? undefined : \(event\) => handleDrop\(event\)\}/);
  assert.match(css, /builder-interactive-preview \.reference-builder-layout\.page-builder-layout \.page-stage:has\(> \.page-builder-live-runtime\)\{/);
  assert.match(css, /builder-interactive-preview \.page-builder-live-runtime\{/);
});


test('both published free-canvas and template runtimes expose the same formula dependency scope',()=>{
 const runtime=source('../src/core/pages/PageRuntime/pageRuntimeViews.tsx');
 const canvas=runtime.slice(runtime.indexOf("if(page.layoutMode==='free-canvas')return"),runtime.indexOf('const renderRegion ='));
 assert.match(canvas, /<PageFormulaScope[^>]*components=\{page\.components\}[^>]*catalog=\{libraryComponents\}/);
 assert.match(canvas, /<ResponsivePageCanvas page=\{page\}>/);
 assert.match(canvas, /<\/ResponsivePageCanvas>[\s\S]*<\/PageFormulaScope>/);
 const template=runtime.slice(runtime.indexOf('const renderRegion ='));
 assert.match(template, /<PageFormulaScope[^>]*components=\{page\.components\}[^>]*catalog=\{libraryComponents\}/);
});
