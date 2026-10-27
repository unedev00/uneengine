import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = load('../src/core/workspace/WorkspaceTheme/contrastRepair.css');
const app = load('../src/main.tsx');

test('workspace contrast stylesheet loads after legacy theme and polish', () => {
  const repair = app.indexOf("WorkspaceTheme/contrastRepair.css");
  assert.ok(repair > app.indexOf("WorkspaceTheme/desktopDense.css"));
  assert.ok(repair > app.indexOf("WorkspaceTheme/appleTheme.css"));
});
test('overlay surfaces and editable text use shared appearance tokens', () => {
  for (const selector of ['.notification-panel', '.global-search', '.user-menu',
    '.records-view-popover-panel', '.app-utility-popover']) {
    assert.ok(css.includes(selector), selector);
  }
  assert.match(css, /background-color:\s*var\(--md-surface\)/);
  assert.match(css, /color:\s*var\(--md-text\)/);
  assert.match(css, /::placeholder/);
  assert.doesNotMatch(css, /color-scheme:\s*light/);
});
