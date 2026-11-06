import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Setup Home is a single responsive route for all form factors',()=>{
  const shell=source('src/core/workspace/SetupShell/setupShellPresentation.tsx');
  const home=source('src/core/settings/SetupHome/setupHomeView.tsx');
  assert.match(shell,/workspace === 'home' &&\s*<SetupHome/);
  assert.doesNotMatch(shell,/<MobileSettingsHome/);
  assert.match(home,/onOpenAuditTrail/);
  assert.match(home,/lastUpdated/);
});

test('Data Loader uses a named, keyboard accessible tablist and responsive file controls',()=>{
  const loader=source('src/core/workspace/SetupShell/UniversalDataLoaderWorkspace.tsx');
  assert.match(loader,/role="tablist"/);
  assert.match(loader,/role="tab"/);
  assert.match(loader,/role="tabpanel"/);
  assert.match(loader,/aria-selected=\{tab===key\}/);
  assert.match(loader,/onPointerUp/);
  assert.match(loader,/minWidth:0,maxWidth:'100%',width:'100%'/);
  const metadata=source('src/core/builders/ObjectManager/UniversalMetadataLoader.tsx');
  assert.match(metadata,/<fieldset/);
  assert.match(metadata,/name="metadata-export-scope"/);
  assert.match(metadata,/metadata-loader-validate-hint/);
});

test('Object Manager has sortable, paginated semantic links and empty state',()=>{
  const manager=source('src/core/builders/ObjectManager/objectManagerView.tsx');
  assert.match(manager,/objectSortKey/);
  assert.match(manager,/aria-sort=\{objectSortKey/);
  assert.match(manager,/changeObjectPage/);
  assert.match(manager,/href=\{'\/une\/setup\/object-manager\/'/);
  assert.match(manager,/Clear filters/);
});

test('Page Builder list actions and editor dialogs have accessible controls',()=>{
  const builder=source('src/core/builders/PageBuilder/pageBuilderView.tsx');
  const details=source('src/core/builders/PageBuilder/PageDetailsDialog.tsx');
  assert.match(builder,/pageListSort/);
  assert.match(builder,/aria-label=\{"Download component inventory for "/);
  assert.match(builder,/handleCreatePageDialogKey/);
  assert.match(details,/dialogKeyDown/);
  assert.match(details,/aria-current=\{activeSection/);
  assert.doesNotMatch(builder,/aria-pressed=\{item.status==='Active'\}/);
});

test('App Manager clone is reviewed as draft and native delete confirm is absent',()=>{
  const manager=source('src/core/applications/AppManager/AppManager.tsx');
  const list=source('src/core/applications/AppManagerList/AppManagerList.tsx');
  assert.match(manager,/const cloneApp = \(source: AppDraft\)/);
  assert.match(manager,/Review the copied settings/);
  assert.match(manager,/confirmDiscard/);
  assert.match(manager,/role="alertdialog"/);
  assert.doesNotMatch(manager,/window\.confirm\(`Delete/);
  assert.match(manager,/aria-current=\{activeStep===step.id\?'step'/);
  assert.match(list,/aria-sort=\{sort/);
  assert.match(list,/aria-label=\{"Clone "\+app.label\}/);
});

test('Authentication recovery has a working fallback and appropriately keyed visibility state',()=>{
  const recovery=source('src/core/authentication/Login/LoginRecovery.tsx');
  const login=source('src/core/authentication/Login/loginView.tsx');
  const styles=source('src/core/authentication/Login/standaloneLogin.css');
  assert.match(recovery,/availableChannels\.map/);
  assert.match(recovery,/mailto:support@unesolutions\.co\.uk/);
  assert.doesNotMatch(recovery,/— Not configured/);
  assert.match(login,/url\.searchParams\.set\('recover','1'\)/);
  assert.match(login,/setPasswordVisible\(false\)/);
  assert.match(login,/auth-password-toggle/);
  assert.match(styles,/max-width: 420px/);
});

test('Setup Home keeps all five quick-access tools and no duplicate welcome navigation',()=>{
 const home=source('src/core/settings/SetupHome/setupHomeView.tsx');
 const css=source('src/core/workspace/WorkspaceTheme/setupUsability.css');
 assert.match(home,/setupShortcuts\.map/);
 assert.match(home,/setup-home-summary/);
 assert.doesNotMatch(home,/className="welcome-quick"/);
 assert.match(css,/welcome-banner\.setup-home-summary/);
});

test('Sign-in reveal state and autofill maintain accessible light controls',()=>{
 const login=source('src/core/authentication/Login/loginView.tsx');
 const styles=source('src/core/authentication/Login/standaloneLogin.css');
 assert.match(login,/aria-pressed=\{passwordVisible\}/);
 assert.match(styles,/input:-webkit-autofill/);
 assert.match(styles,/color-scheme:light/);
});

test('Cramped desktop admin widths render cards with every action still available',()=>{
 const responsive=source('src/core/records/ResponsiveDataList/ResponsiveDataList.tsx');
 const page=source('src/core/builders/PageBuilder/pageBuilderView.tsx');
 const apps=source('src/core/applications/AppManagerList/AppManagerList.tsx');
 const styles=source('src/core/workspace/WorkspaceTheme/setupUsability.css');
 assert.match(responsive,/includeNarrowDesktop/);
 assert.match(page,/<ResponsiveDataList rows=\{paginatedPages\} includeTablet includeNarrowDesktop/);
 assert.match(apps,/<ResponsiveDataList rows=\{filtered\} includeTablet includeNarrowDesktop/);
 assert.match(styles,/@media\(min-width:1024px\) and \(max-width:1199px\)/);
});

test('Second pass removes root width overflow across every setup page',()=>{
 const shell=source('src/core/workspace/WorkspaceTheme/sections/01-workspace.css');
 assert.match(shell,/html, body, #root \{ min-width: 0; width: 100%; max-width: 100%/);
 assert.doesNotMatch(shell,/html, body, #root \{ min-width: 320px/);
});

test('Second pass sign in uses actual build version and configurable safe legal links',()=>{
 const login=source('src/core/authentication/Login/loginView.tsx');
 const css=source('src/core/authentication/Login/standaloneLogin.css');
 assert.match(login,/__METADRIVE_WEB_RELEASE__/);
 assert.match(login,/auth-signin-footer/);
 assert.match(login,/VITE_PRIVACY_POLICY_URL/);
 assert.match(login,/VITE_TERMS_URL/);
 assert.match(login,/\.startsWith\('https:\/\/'\)/);
 assert.match(css,/@media\(max-height:460px\) and \(orientation:landscape\)/);
});

test('Second pass shows sort direction and explicit utility checkbox associations',()=>{
 const apps=source('src/core/applications/AppManagerList/AppManagerList.tsx');
 const page=source('src/core/builders/PageBuilder/pageBuilderView.tsx');
 const manager=source('src/core/applications/AppManager/AppManager.tsx');
 assert.match(apps,/md-sort-indicator/);
 assert.match(page,/md-sort-indicator/);
 assert.match(manager,/htmlFor=\{'app-utility-'/);
 assert.match(manager,/name="app-utility-items"/);
});

test('Object Manager phone toolbar retains three named, compact actions',()=>{
 const manager=source('src/core/builders/ObjectManager/objectManagerView.tsx');
 const css=source('src/core/workspace/WorkspaceTheme/setupUsability.css');
 assert.match(manager,/className="object-action-short"/);
 assert.match(manager,/aria-label="Universal Data Loader"/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});

test('UNE privacy policy is a public route accessible without workspace authentication',()=>{
  const entry=source('src/main.tsx');
  const marketing=source('src/core/public/MarketingSite/MarketingSite.tsx');
  const login=source('src/core/authentication/Login/loginView.tsx');
  const styles=source('src/core/public/MarketingSite/marketing.css');
  assert.match(entry,/isPrivacyRoute/);
  assert.match(entry,/pathname === '\/privacy'/);
  assert.match(entry,/<PrivacyPolicyPage\s*\/>/);
  assert.match(marketing,/export function PrivacyPolicyPage/);
  assert.match(marketing,/support@unesolutions\.co\.uk/);
  assert.match(marketing,/href=\{\x60\$\{prefix\}privacy\x60\}/);
  assert.match(login,/VITE_PRIVACY_POLICY_URL/);
  assert.match(login,/BASE_URL\}privacy/);
  assert.match(styles,/\.une-privacy-main/);
});

test('UX-0012 boot splash uses real UNE brand and reduced-motion-aware progress',()=>{
 const entry=source('src/main.tsx');
 const style=source('src/core/workspace/WorkspaceTheme/bootSplash.css');
 assert.match(entry,/<UneBrandLogo className="md-boot-brand"/);
 assert.match(entry,/md-boot-spinner/);
 assert.match(style,/prefers-reduced-motion:reduce/);
});
test('UX-0028 Setup Home no longer creates empty auto-fit grid tracks',()=>{
 const css=source('src/core/workspace/WorkspaceTheme/setupUsability.css');
 assert.match(css,/home-content \.shortcut-grid \{ display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(css,/home-content \.shortcut-grid \{ display:grid;grid-template-columns:repeat\(auto-fit/);
});
test('UX-0062 Page Details exposes selected tabs and accessible owned panels',()=>{
 const dialog=source('src/core/builders/PageBuilder/PageDetailsDialog.tsx');
 const css=source('src/core/builders/PageBuilder/PageDetailsDialog.css');
 assert.match(dialog,/role="tablist" aria-label="Page edit sections"/);
 assert.match(dialog,/role="tab"\s+aria-selected=\{activeSection==='properties'\}/);
 assert.match(dialog,/role="tabpanel"\s+aria-labelledby="page-details-tab-properties"/);
 assert.match(dialog,/role="tabpanel" aria-labelledby="page-details-tab-history"/);
 assert.match(css,/\[role="tabpanel"\]\[hidden\]/);
});
