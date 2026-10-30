import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { currentFormFactor, currentSizeClass } from '../src/core/workspace/Responsive/useFormFactor';
import { isComponentVisible, validateVisibilityRule } from '../src/core/components/Properties/componentVisibility';
import { workspaceShortcut } from '../src/core/workspace/Navigation/workspaceShortcuts';

const documentRoot = new URL('../', import.meta.url);
const file = (path: string) => readFileSync(new URL(path, documentRoot), 'utf8');

test('four responsive width classes share one set of boundaries', () => {
  const originalWindow = globalThis.window;
  try {
    const sizeCases: Array<[number, number, boolean, string, string]> = [
      [390, 844, true, 'Compact', 'Phone'],
      [599, 900, false, 'Compact', 'Phone'],
      [600, 900, true, 'RegularNarrow', 'Tablet'],
      [834, 1194, true, 'RegularNarrow', 'Tablet'],
      [1023, 900, false, 'RegularNarrow', 'Tablet'],
      [1024, 768, true, 'Regular', 'Desktop'],
      [1439, 900, false, 'Regular', 'Desktop'],
      [1440, 900, false, 'Wide', 'Desktop'],
      [1180, 490, true, 'Compact', 'Phone']
    ];
    for (const [width, height, coarse, expectedClass, expectedFactor] of sizeCases) {
      globalThis.window = {
        matchMedia: (query: string) => ({
          matches: query.includes('max-width: 599px')
            ? width <= 599 || (height <= 500 && coarse)
            : query.includes('max-width: 1023px')
              ? width <= 1023
              : query.includes('max-width: 1439px') && width <= 1439
        })
      } as unknown as Window & typeof globalThis;
      assert.equal(currentSizeClass(), expectedClass, `size class at ${width} × ${height}`);
      assert.equal(currentFormFactor(), expectedFactor, `form factor at ${width} × ${height}`);
    }
  } finally {
    globalThis.window = originalWindow;
  }
});

test('adaptive appearance respects tenant accents, theme preference and accessibility', () => {
  const css = file('src/core/workspace/WorkspaceTheme/appleTheme.css');
  assert.match(css, /--md-primary: #007aff/);
  assert.match(css, /--md-primary-hover: color-mix\(in srgb, var\(--md-primary\)/);
  assert.match(css, /\[data-theme="dark"\]/);
  assert.match(css, /prefers-color-scheme: dark/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /prefers-reduced-transparency: reduce/);
  assert.match(css, /pointer: coarse/);
  assert.match(css, /\.record-detail-field span \{/);
  assert.match(css, /white-space: normal/);
  assert.match(css, /\.md-sidebar-scrim/);
});

test('iPad supports rotation and the adaptive theme stays out of marketing startup', () => {
  const app = JSON.parse(readFileSync(new URL('../mobile/app.json', documentRoot), 'utf8'));
  assert.equal(app.expo.orientation, 'default');
  assert.equal(app.expo.ios.supportsTablet, true);
  const startup = file('src/main.tsx');
  const styles = startup.indexOf('WorkspaceTheme/styles.css');
  const adaptive = startup.indexOf('WorkspaceTheme/appleTheme.css');
  assert.ok(styles >= 0 && adaptive > styles);
  assert.ok(adaptive > startup.indexOf('const Workspace = lazy('));
});

test('record permission visibility fails closed and reflects permission revocation',()=>{
  const component={
    visible:true,
    properties:{visibilityRules:{logic:'All',conditions:[
      {source:'Record Permission',operator:'Equals',value:'Edit'}
    ]}}
  } as const;
  assert.deepEqual(validateVisibilityRule(component.properties.visibilityRules,[],true),[]);
  assert.notDeepEqual(validateVisibilityRule(component.properties.visibilityRules,[],false),[]);
  assert.equal(isComponentVisible(component,{formFactor:'Desktop',recordPermissions:new Set(['Edit'])},true),true);
  assert.equal(isComponentVisible(component,{formFactor:'Desktop',recordPermissions:new Set()},true),false);
  assert.equal(isComponentVisible(component,{formFactor:'Desktop'},true),false);
  const deny={...component,properties:{visibilityRules:{
    logic:'All',conditions:[{source:'Record Permission',operator:'Not Equals',value:'Delete'}]}}} as const;
  assert.equal(isComponentVisible(deny,{formFactor:'Desktop',recordPermissions:new Set(['Edit'])},true),true);
  assert.equal(isComponentVisible(deny,{formFactor:'Desktop',recordPermissions:new Set(['Delete'])},true),false);
});

test('tablet visibility accepts new rules without breaking pre-existing Desktop settings', () => {
  const legacy = { logic: 'All', conditions: [{ source: 'Device', operator: 'Equals', value: 'Desktop' }] };
  const tabletOnly = { logic: 'All', conditions: [{ source: 'Device', operator: 'Equals', value: 'Tablet' }] };
  const explicit = { logic: 'Any', conditions: [
    { source: 'Device', operator: 'Equals', value: 'Tablet' },
    { source: 'Device', operator: 'Equals', value: 'Desktop' }
  ] };
  assert.deepEqual(validateVisibilityRule(tabletOnly, [], false), []);
  const visible = (rule: unknown, formFactor: 'Phone' | 'Tablet' | 'Desktop') =>
    isComponentVisible({ visible: true, properties: { visibilityRules: rule } }, { formFactor }, false);
  assert.equal(visible(legacy, 'Tablet'), true, 'published Desktop condition continues to match tablet');
  assert.equal(visible(legacy, 'Phone'), false);
  assert.equal(visible(tabletOnly, 'Tablet'), true);
  assert.equal(visible(tabletOnly, 'Desktop'), false);
  assert.equal(visible(explicit, 'Tablet'), true);
  assert.equal(visible(explicit, 'Desktop'), true);
});

test('workspace keyboard registry preserves browser defaults while typing',()=>{
  const event=(key:string,metaKey=true,ctrlKey=false,altKey=false,shiftKey=false)=>
    ({key,metaKey,ctrlKey,altKey,shiftKey});
  assert.equal(workspaceShortcut(event('[')),'back');
  assert.equal(workspaceShortcut(event(']')),'forward');
  assert.equal(workspaceShortcut(event('\\')),'sidebar');
  assert.equal(workspaceShortcut(event('f')),'find');
  assert.equal(workspaceShortcut(event('n')),'new');
  assert.equal(workspaceShortcut(event('k')),null,'GlobalRecordSearch owns Cmd+K');
  assert.equal(workspaceShortcut(event('w')),null,'browser tab shortcuts must be preserved');
  assert.equal(workspaceShortcut(event('f'),true),null,'typing takes precedence');
  assert.equal(workspaceShortcut(event('n',false,true)),'new');
  assert.equal(workspaceShortcut(event('? ',false)),null);
  assert.equal(workspaceShortcut(event('?',false)),'help');
});

test('all five builders retain their shared, lazily loaded adaptive frame',()=>{
  const paths=[
    'src/core/builders/PageBuilder/pageBuilderView.tsx',
    'src/core/builders/FlowBuilder/FlowBuilder.tsx',
    'src/core/builders/DashboardBuilder/DashboardBuilder.tsx',
    'src/core/builders/ReportBuilder/reportBuilderView.tsx',
    'src/core/builders/ObjectManager/objectManagerView.tsx'
  ];
  for(const path of paths){
    assert.match(file(path),/SharedBuilderFrame\/adaptiveBuilder\.css/,`shared UI missing from ${path}`);
  }
  const style=file('src/core/builders/SharedBuilderFrame/adaptiveBuilder.css');
  for(const selector of ['.page-builder-layout','.flow-workarea','.dashboard-builder-layout',
    '.report-builder-layout','.md-object-editor-split']){
    assert.ok(style.includes(selector),`shared frame must include ${selector}`);
  }
});

test('desktop record preview reuses existing guarded detail runtime and mobile uses native detail',()=>{
  const records=file('src/core/records/RecordWorkspace/recordWorkspaceViews.tsx');
  assert.match(records,/md-records-split-open/);
  assert.match(records,/md-records-split-handle/);
  assert.match(records,/role="separator"/);
  assert.match(records,/ContextMenu/);
  assert.match(records,/canEdit\?\[\{id:'edit'/);
  assert.match(records,/canDelete\?\[\{id:'delete'/);
  const native=readFileSync(new URL('../mobile/src/app/(tabs)/index.tsx',documentRoot),'utf8');
  const nativeDetail=readFileSync(new URL('../mobile/src/app/record/[objectApi]/[recordId].tsx',documentRoot),'utf8');
  assert.match(native,/useWindowDimensions/);
  assert.match(native,/RecordDetailPanel/);
  assert.match(nativeDetail,/RecordDetailPanel/);
  assert.match(native,/onSelect=\{isTablet/);
});

test('reused UNE modal and drawer trap keyboard focus rather than making duplicate engines',()=>{
  const layout=file('src/component-libraries/une/shared/UneLayout.jsx');
  assert.match(layout,/export function UneModal/);
  assert.match(layout,/export function UneDrawer/);
  assert.match(layout,/e\.key!=="Tab"/);
  assert.match(layout,/previous\?\.focus/);
});

test('tablet builders and Setup have valid media queries and complete touch controls', () => {
  const builder = file('src/core/builders/SharedBuilderFrame/adaptiveBuilder.css');
  const application = file('src/core/workspace/WorkspaceTheme/applicationPolish.css');
  for (const [path, css] of [['adaptiveBuilder.css', builder], ['applicationPolish.css', application]]) {
    assert.doesNotMatch(css, /\band\(/, `${path} must separate media-query "and" from its condition`);
  }
  assert.match(builder, /@media \(min-width: 600px\) and \(max-width: 1023px\) and \(orientation: portrait\)/);
  assert.match(application, /@media \(min-width: 600px\) and \(max-width: 1023px\)/);
  for (const selector of ['.page-builder-layout', '.flow-workarea', '.dashboard-builder-layout',
    '.report-builder-layout', '.md-object-editor-split']) {
    assert.ok(builder.includes(selector), `Touch coverage missing for ${selector}`);
  }
  assert.match(builder, /input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)/);
  assert.match(builder, /font-size: max\(16px, 1em\)/);
  assert.match(builder, /min-height: var\(--md-control-touch, 44px\)/);
});

test('adaptive operational labels remain readable without enlarging desktop controls', () => {
  const theme = file('src/core/workspace/WorkspaceTheme/appleTheme.css');
  assert.match(theme, /--md-fs-body: 14px/);
  assert.match(theme, /--md-fs-sm: 13px/);
  assert.match(theme, /--md-fs-xs: 12px/);
  assert.match(theme, /--md-control-height: 32px/);
});

test('settings visual skin reuses actual navigation and native form controls', () => {
  const startup = file('src/main.tsx');
  const skin = file('src/core/workspace/WorkspaceTheme/settingsAppearance.css');
  const icons = file('src/core/settings/SettingsNavigationIcon.tsx');
  const shell = file('src/core/workspace/SetupShell/setupShellPresentation.tsx');
  const mobile = file('src/core/settings/MobileSettingsHome.tsx');
  const company = file('src/core/settings/CompanySettingsWorkspace/CompanySettingsWorkspace.tsx');
  assert.ok(startup.indexOf('settingsAppearance.css') > startup.indexOf('const Workspace = lazy('));
  assert.match(skin, /\.lightning :is\(\.setup-layout, \.mobile-settings-home\) \.md-setup-icon/);
  assert.match(skin, /\.company-workspace \.business-calendar-closed input\[type="checkbox"\]/);
  assert.match(skin, /\.credential-switch input:checked \+ \.credential-switch-track/);
  assert.match(skin, /prefers-reduced-motion: reduce/);
  assert.match(icons, /Presentation metadata only/);
  assert.match(shell, /<SettingsNavigationIcon group=\{group.group\} label=\{item\}/);
  assert.match(mobile, /<SettingsNavigationIcon group=\{group\} label=\{label\}/);
  assert.match(mobile, /setupNavigation as Group\[\]/);
  assert.match(company, /BusinessCalendarSettings/);
  assert.doesNotMatch(icons, /onClick|apiRequest|navigateRoute/);
});

test('Setup light appearance overrides OS dark palette without touching standalone pages', () => {
  const css = file('src/core/workspace/WorkspaceTheme/settingsAppearance.css');
  const shell = file('src/core/workspace/SetupShell/setupShellPresentation.tsx');
  assert.match(shell, /route\.kind === 'setup' && !standalonePageMode && !isStandaloneMetadataPage \? ' md-setup-light'/);
  assert.match(css, /:root:not\(\[data-theme="dark"\]\) \.lightning\.md-setup-light:not\(\[data-theme="dark"\]\)/);
  assert.match(css, /color-scheme: light/);
  assert.match(css, /--md-sidebar: rgb\(246 246 248 \/ 96%\)/);
  assert.match(css, /--md-text: #1d1d1f/);
  assert.match(css, /--md-action-ink: #0058bd/);
  assert.match(css, /\.page-manager-table thead th/);
  assert.match(css, /\.page-manager-table tbody td/);
  assert.match(css, /\.page-manager-filters \.form-control/);
  assert.doesNotMatch(css.slice(css.indexOf('/* MetaDrive Setup uses the light')), /!important/);
});

test('desktop Setup collapse retains icon-only nav and both real expand controls', () => {
  const css = file('src/core/workspace/WorkspaceTheme/settingsAppearance.css');
  const shell = file('src/core/workspace/SetupShell/setupShellPresentation.tsx');
  const browserSmoke = file('../../scripts/workspace-responsive-smoke.mjs');
  assert.match(css, /\.setup-layout > \.setup-sidebar\.setup-sidebar-collapsed/);
  assert.match(css, /\.tree-item > span:not\(\.md-setup-icon\)/);
  assert.match(css, /\.setup-sidebar-collapsed \.setup-sidebar-toggle/);
  assert.match(css, /:has\(\.setup-layout > \.setup-sidebar\.setup-sidebar-collapsed\)/);
  assert.match(shell, /aria-label=\{setupSidebarCollapsed \? 'Expand Setup menu' : 'Collapse Setup menu'\}/);
  assert.match(shell, /onClick=\{\(\) => setSetupSidebarCollapsed\(\(collapsed\) => !collapsed\)\}/);
  assert.match(shell, /<SettingsNavigationIcon group=\{group.group\} label=\{item\}/);
  assert.match(browserSmoke, /getByRole\('button',\{name:'Expand Setup menu'\}\)\.click\(\)/);
  assert.match(browserSmoke, /getByRole\('button',\{name:'Open navigation'\}\)\.click\(\)/);
});


test('every Setup route has a reusable coloured PWA icon on desktop and mobile', () => {
  const definition = file('src/core/metadata/Definitions/metadata.ts');
  const icons = file('src/core/settings/SettingsNavigationIcon.tsx');
  const css = file('src/core/workspace/WorkspaceTheme/settingsAppearance.css');
  const mobile = file('src/core/settings/MobileSettingsHome.tsx');
  const shell = file('src/core/workspace/SetupShell/setupShellPresentation.tsx');
  const section = definition.split('export const setupNavigation = [')[1]?.split('];')[0] ?? '';
  const labels = Array.from(section.matchAll(/items:\s*\[([^\]]+)\]/g))
    .flatMap(match => Array.from(match[1].matchAll(/'([^']+)'/g), item => item[1]));
  const itemSection = icons.split('const items:')[1]?.split('};')[0] ?? '';
  const mapped = new Map(Array.from(itemSection.matchAll(/'([^']+)': \{icon: \w+, tone: '([^']+)'\}/g),
    entry => [entry[1], entry[2]] as const));
  assert.ok(labels.length >= 20, 'Expected the entire Setup navigation, not a screenshot-only subset');
  for (const label of labels) {
    assert.ok(mapped.has(label), `Missing PWA icon for ${label}`);
    assert.ok(css.includes(`.md-setup-icon-${mapped.get(label)} { --md-icon-gradient:`),
      `Missing gradient token for ${label}`);
  }
  assert.ok(new Set(mapped.values()).size >= 12, 'Menu icons should be individually colour-coded');
  assert.match(icons, /const appearance = items\[label\] \?\? groups\[group\]/);
  assert.match(icons, /aria-hidden="true"/);
  assert.match(css, /:is\(\.setup-layout, \.mobile-settings-home\) \.md-setup-icon/);
  assert.match(css, /\.md-setup-icon svg \{/);
  assert.match(css, /color: #fff; \/\* override legacy \.tree-item svg muted stroke \*\//);
  assert.match(mobile, /<SettingsNavigationIcon group=\{group\} label=\{label\}/);
  assert.match(shell, /<SettingsNavigationIcon group=\{group.group\} label=\{item\}/);
});
