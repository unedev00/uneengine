import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');

test('tenant admin split depends on usable content width, not browser viewport', () => {
  const css = read('../src/core/workspace/WorkspaceTheme/operationalPolish.css');
  assert.match(css, /\.lightning \.tenant-console\{container-type:inline-size\}/);
  assert.match(css, /\.tenant-console \.tenant-columns\{display:grid;grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(css, /@container \(min-width:1560px\)/);
  assert.match(css, /minmax\(620px,\.85fr\)/);
  assert.doesNotMatch(css, /@media\(min-width:1024px\)[\s\S]*?\.tenant-console \.tenant-columns\{/);
});

test('tenant usage metrics grow within the actual panel instead of six viewport-based columns', () => {
  const css = read('../src/core/platform/TenantUsagePanel/TenantUsagePanel.css');
  assert.match(css, /repeat\(auto-fit,minmax\(min\(100%,190px\),1fr\)\)/);
  assert.doesNotMatch(css, /@media \(min-width: 1100px\)/);
  assert.match(css, /overflow-wrap: break-word/);
});

test('tenant detail tabs remain fully visible without horizontal overflow', () => {
  const css = read('../src/core/platform/TenantManagement/TenantManagement.css');
  assert.match(css, /\.tenant-detail-tabs\{\s*display:grid;/);
  assert.match(css, /grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,110px\),1fr\)\)/);
  assert.match(css, /overflow:visible;\s*mask-image:none;/);
});

test('tenant logo formula provides a setup hint only for missing builder images', () => {
  const smart = read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
  const settings = read('../src/core/settings/SettingsWorkspace/settingsWorkspaceViews.tsx');
  assert.match(smart, /tenantLogoReference=\/\^=\?\\s\*\\\$tenant\\\.logo\$\/i/);
  assert.match(smart, /Tenant logo unavailable — Company Settings › Branding/);
  assert.match(smart, /single&&p\.builderPreview&&!image/);
  assert.match(settings, /id="company-logo-upload"/);
  assert.match(settings, /refreshTenantBrand\(\)/);
});
