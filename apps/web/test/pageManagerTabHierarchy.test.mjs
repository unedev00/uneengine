import { readPageBuilderModules } from './helpers/builderSources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tabs = readFileSync(new URL('../src/core/builders/PageBuilder/PageManagerTabs.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/core/builders/PageBuilder/PageManagerTabs.css', import.meta.url), 'utf8');
const builder = readPageBuilderModules();

test('Page Builder uses Company Settings-style primary tab strip and conditional app sub-tabs', () => {
  assert.match(tabs, /md-admin-tabstrip/);
  for (const label of ['Home', 'App', 'Record', 'In-Screen']) assert.match(tabs, new RegExp("label: '"+label+"'"));
  assert.match(tabs, /type === 'App Page' && <div className="page-manager-tab-level">/);
  assert.match(tabs, /label="Pages by application"/);
  assert.match(tabs, /\{ value: 'all', label: 'All Apps' \}/);
  assert.match(tabs, /apps\.map\(item =>/);
  assert.match(tabs, /aria-selected=\{selected === tab\.value\}/);
  assert.match(tabs, /ArrowRight/);
  assert.match(tabs, /ArrowLeft/);
  assert.match(css, /page-manager-main-tabs > button\[aria-selected="true"\]/);
  assert.match(css, /page-manager-app-tabs > button\[aria-selected="true"\]/);
  assert.match(css, /var\(--md-surface/);
});
test('App sub-tab filter does not hide Home, Record or In-Screen pages', () => {
  assert.match(builder, /pageListTypeTab !== 'App Page'/);
  assert.match(builder, /pageListTypeTab, setPageListTypeTab\] = useState\('App Page'\)/);
  assert.match(builder, /<PageManagerTabs/);
  assert.match(builder, /pageListDeviceTab/);
  assert.doesNotMatch(builder, /className="page-manager-app-tabs" aria-label/);
});
