import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dense = readFileSync(new URL('../src/core/workspace/WorkspaceTheme/desktopDense.css', import.meta.url), 'utf8');

test('desktop density beats the Setup sidebar rules that load around it', () => {
  // These must keep the same specificity as settingsAppearance.css, or the 44px rows return.
  assert.match(dense, /\.lightning \.setup-layout \.setup-sidebar:not\(\.setup-sidebar-collapsed\) \.tree-item\s*\{[^}]*min-height:\s*34px/);
  assert.match(dense, /\.lightning \.setup-layout \.setup-sidebar:not\(\.setup-sidebar-collapsed\)\s*\{[^}]*width:\s*200px/);
  assert.match(dense, /\.md-setup-icon\s*\{[^}]*width:\s*26px/);
});

test('dense sizing stays desktop-only and never uses zoom', () => {
  assert.match(dense, /@media \(min-width: 900px\) and \(pointer: fine\)/);
  assert.doesNotMatch(dense.replace(/\/\*[\s\S]*?\*\//g, ''), /\bzoom\s*:/);
});
