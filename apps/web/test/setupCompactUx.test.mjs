import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');
const css = read('../src/core/workspace/WorkspaceTheme/phase2AdminLayout.css');
const credentialView = read('../src/core/integrations/NamedCredentials/NamedCredentials.tsx');
const navigation = read('../src/core/workspace/SetupShell/setupShellPresentation.tsx');

test('desktop shortcut density remains Setup-only and preserves Builder canvas geometry', () => {
  assert.match(css, /\.lightning\.md-setup-light:not\(\.page-builder-editing\) \.shortcut-grid/);
  assert.match(css, /minmax\(min\(100%, 208px\), 1fr\)/);
  assert.match(css, /\.shortcut-card\s*\{[^}]*min-height:\s*106px/);
});

test('Webhook details button follows Test Connection and preserves existing permissions', () => {
  const testButton = credentialView.indexOf("'Testing…' : 'Test Connection'");
  const webhookButton = credentialView.indexOf('credential-webhook-action');
  const viewButton = credentialView.indexOf('aria-label={', webhookButton + 50);
  assert.ok(testButton >= 0 && webhookButton > testButton && viewButton > webhookButton);
  assert.match(credentialView, /credential\.webhookId && <button className="btn btn-small credential-webhook-action"/);
  assert.match(css, /\.named-credentials-page \.slds-table td:last-child \.toolbar-actions\s*\{[^}]*flex-wrap:\s*nowrap/);
});

test('Credential config variables have a compact two-column desktop grid and mobile fallback', () => {
  assert.match(credentialView, /className="connector-config-row">/);
  assert.doesNotMatch(credentialView, /gridTemplateColumns:'minmax\(130px/);
  assert.match(css, /\.named-credential-modal \.connector-config-fields\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 720px\)\s*\{\s*\.lightning \.named-credential-modal \.connector-config-fields/);
  const legacy = read('../src/core/workspace/WorkspaceTheme/sections/07-workspace.css');
  assert.doesNotMatch(legacy, /connector-config-row[^\n]*grid-template-columns:[^\n]*!important/);
  assert.match(legacy, /\.connector-config-row\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\) auto/);
});

test('Setup menu retains readable full-text tooltip when a label cannot fit on one line', () => {
  assert.match(navigation, /title=\{item\}/);
  assert.match(navigation, /<SettingsNavigationIcon group=\{group\.group\} label=\{item\}/);
});

test('tablet app selector retains the selected name rather than collapsing into a 44px icon', () => {
  const headerCss=read('../src/core/workspace/WorkspaceTheme/sections/09-workspace.css');
  const tablet=headerCss.slice(headerCss.indexOf('/* Tablet header: retain a single 56px row'));
  assert.match(tablet,/\.lightning \.header-installed-apps \{[^}]*min-width: 160px/);
  assert.match(tablet,/\.lightning \.header-installed-apps select \{[^}]*min-width: 160px/);
  assert.match(tablet,/\.lightning \.header-installed-apps::after \{ content: none; \}/);
  const compact=headerCss.slice(headerCss.indexOf('/* Compact, stable phone header'),headerCss.indexOf('/* Tablet Setup:'));
  assert.match(compact,/\.header-installed-apps select \{[^}]*min-width:160px/);
  assert.match(navigation,/value=\{installedAppValue\}/);
  assert.match(navigation,/installedAppLabel/);
});
