import { readPageBuilderModules } from './helpers/builderSources.mjs';
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
  const builder=readPageBuilderModules();
  const details=source('src/core/builders/PageBuilder/PageDetailsDialog.tsx');
  assert.match(builder,/pageListSort/);
  assert.match(builder,/aria-label=\{"Download component inventory for "/);
  assert.match(builder,/handleCreatePageDialogKey/);
  assert.match(details,/dialogKeyDown/);
  assert.match(details,/aria-selected=\{activeSection/);
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
 const page=source('src/core/builders/PageBuilder/editor/management/PageManagerView.tsx');
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
 const page=source('src/core/builders/PageBuilder/editor/management/PageManagerView.tsx');
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

test('UX-0031 collapsed Setup sidebar displays item initials and group abbreviations',()=>{
 const css=source('src/core/workspace/WorkspaceTheme/setupUsability.css');
 const nav=source('src/core/workspace/SetupShell/setupShellPresentation.tsx');
 assert.match(css,/\.setup-sidebar\.setup-sidebar-collapsed \.tree-item::after/);
 assert.match(css,/content:attr\(data-short-label\)/);
 assert.match(css,/content:attr\(data-group-short\)/);
 assert.match(nav,/data-short-label=/);
 assert.match(nav,/aria-label=\{item === ['"]Tenant Management['"]/);
});
test('UX-0004 and UX-0006 define auth action states and desktop rhythm',()=>{
 const css=source('src/core/authentication/Login/standaloneLogin.css');
 assert.match(css,/--auth-primary-disabled:/);
 assert.match(css,/--auth-primary-hover:/);
 assert.match(css,/--auth-focus:/);
 assert.match(css,/#login-email \{margin-bottom:18px\}/);
 assert.match(css,/\.auth-submit \{margin-top:24px\}/);
});

test('UX-0043 Setup sidebar shares one navigation registry and exposes current item',()=>{
 const presentation=source('src/core/workspace/SetupShell/setupShellPresentation.tsx');
 const navigation=source('src/core/platform/Workspace/platformSetupNavigation.ts');
 const shell=source('src/core/workspace/SetupShell/setupAppShell.tsx');
 assert.match(presentation,/aria-current=\{isSelected \? 'page' : undefined\}/);
 assert.match(presentation,/const isSelected =/);
 assert.match(shell,/resolveSetupNavigation\(quickFind/);
 assert.match(navigation,/return setupNavigation/);
});

test('UX-0029 Setup Home refresh is visibly busy and only marks successful updates',()=>{
 const home=source('src/core/settings/SetupHome/setupHomeView.tsx');
 const css=source('src/core/workspace/WorkspaceTheme/setupUsability.css');
 assert.match(home,/setup-refresh-spinning/);
 assert.match(home,/aria-busy=\{loading\}/);
 assert.match(home,/setEvents\(result\.events \?\? \[\]\);setLastUpdated\(Date\.now\(\)\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('UX-0046 Object Manager exposes sort direction for both desktop and cards',()=>{
 const obj=source('src/core/builders/ObjectManager/objectManagerView.tsx');
 assert.match(obj,/md-sort-indicator/);
 assert.match(obj,/object-manager-sort-direction/);
 assert.match(obj,/aria-sort=\{objectSortKey===/);
 assert.match(obj,/setObjectSortDescending\(value=>!value\)/);
});
test('UX-0054 Excel export has its own announced pending state',()=>{
 const loader=source('src/core/builders/ObjectManager/UniversalMetadataLoader.tsx');
 assert.match(loader,/\[exporting,setExporting\]/);
 assert.match(loader,/aria-busy=\{exporting\}/);
 assert.match(loader,/Preparing the Excel workbook for download/);
 assert.match(loader,/setNotice\('Downloaded '\+downloadedName/);
});
test('UX-0057 Page Builder card sort offers a direction control',()=>{
 const page=source('src/core/builders/PageBuilder/editor/management/PageManagerView.tsx');
 assert.match(page,/page-manager-sort-direction/);
 assert.match(page,/page-manager-card-sort/);
 assert.match(page,/setPageListSortDescending\(value=>!value\)/);
});

test('UX-0006 authentication colours are declared in one dedicated token file',()=>{
 const css=source('src/core/authentication/Login/standaloneLogin.css');
 const ramp=source('src/core/authentication/Login/authTokens.css');
 assert.match(css,/@import '\.\/authTokens\.css'/);
 assert.doesNotMatch(css,/#[0-9a-fA-F]{3,8}\b/);
 assert.match(ramp,/--auth-color-primary:#0b57d0/);
 assert.match(ramp,/--auth-color-hover:#0946a7/);
 assert.match(ramp,/--auth-color-disabled:#698ac0/);
});
test('UX-0026 security event meta shows a category and relative time instead of generic copy',()=>{
 const setup=source('src/core/settings/SetupHome/setupHomeView.tsx');
 assert.match(setup,/function relativeSecurityTime/);
 assert.match(setup,/function securityActivityType/);
 assert.match(setup,/relativeSecurityTime\(event\.at,Date\.now\(\)\)/);
 assert.match(setup,/dateTime=\{event\.at\}/);
 assert.doesNotMatch(setup,/<small>Security event<\/small>/);
});
test('Page card sort controls exist through narrow-desktop card breakpoint',()=>{
 const css=source('src/core/workspace/WorkspaceTheme/setupUsability.css');
 assert.match(css,/page-manager-mobile-sort \{ display:none; \}[\s\S]*?@media\(max-width:1199px\)/);
});

test('UX-0021 title baselines stay aligned and UX-0024 search has a fixed width cap',()=>{
 const css=source('src/core/workspace/WorkspaceTheme/setupUsability.css');
 assert.match(css,/grid-template-rows: minmax\(36px,auto\) minmax\(0,1fr\)/);
 assert.match(css,/home-content \.shortcut-card \.shortcut-title \{align-self:start\}/);
 assert.match(css,/header-searches \{ min-width:0;max-width:min\(360px,40vw\); \}/);
});

test('UX-0034 paging resets the actual workspace scroll and announces the range',()=>{
 const sourceCode=source('src/core/builders/ObjectManager/objectManagerView.tsx');
 assert.match(sourceCode,/const resetObjectListScroll=/);
 assert.match(sourceCode,/closest<HTMLElement>\('\.workspace'\)/);
 assert.match(sourceCode,/if\(workspace\)workspace\.scrollTop=0/);
 assert.match(sourceCode,/changeObjectPage=\(page:number\)=>\{setObjectListPage\(page\);resetObjectListScroll\(\);\}/);
 assert.match(sourceCode,/role="status" aria-live="polite"/);
});
test('UX-0037 Create Object is first in DOM and tab order, before secondary toolbar actions',()=>{
 const sourceCode=source('src/core/builders/ObjectManager/objectManagerView.tsx');
 const start=sourceCode.indexOf('if (selectedSetting === \'Objects\') return');
 const toolbar=sourceCode.slice(start,sourceCode.indexOf('</div></div>',start));
 assert.ok(start!==-1 && toolbar.indexOf('aria-label="Create new object"') !== -1);
 assert.ok(toolbar.indexOf('aria-label="Create new object"')<toolbar.indexOf('showDeletedObjects()'));
 assert.ok(toolbar.indexOf('aria-label="Create new object"')<toolbar.indexOf('aria-label="Universal Data Loader"'));
});

test('UX-0008 failed sign-in focuses email while MFA failures return to code',()=>{
 const login=source('src/core/authentication/Login/loginView.tsx');
 assert.match(login,/getElementById\(challenge\?'login-mfa':'login-email'\)\?\.focus\(\)/);
 assert.doesNotMatch(login,/getElementById\(challenge\?'login-mfa':'login-password'\)\?\.focus\(\)/);
});

test('App Manager responsive sorting exposes ascending and descending control',()=>{
  const list=source('src/core/applications/AppManagerList/AppManagerList.tsx');
  const css=source('src/core/applications/AppManagerList/AppManagerList.css');
  assert.match(list,/id="app-manager-sort-field"/);
  assert.match(list,/className="app-manager-sort-direction"/);
  assert.match(list,/aria-pressed=\{descending\}/);
  assert.match(list,/setDescending\(value=>!value\)/);
  assert.match(css,/\.app-manager-sort-direction:focus-visible/);
  assert.match(css,/@media\(max-width:1199px\)\s*\{\s*\.app-manager-mobile-sort/);
});

test('UX-0023 desktop sidebar preference survives compact resize without persisting drawer state',()=>{
  const shell=source('src/core/workspace/SetupShell/setupAppShell.tsx');
  assert.match(shell,/md\.setup\.sidebar\.collapsed/);
  assert.match(shell,/setSidebarCollapsedState\(event\.matches \? true : readDesktopSidebarPreference\(\)\)/);
  assert.match(shell,/setSidebarCollapsedState\(true\)/);
  assert.match(shell,/window\.localStorage\.setItem/);
});

test('UX-0027 Setup Home consumes declared typography, icon and shared grid spacing tokens',()=>{
  const css=source('src/core/workspace/WorkspaceTheme/setupUsability.css');
  assert.match(css,/\.home-content \.page-heading h1\s*\{\s*font-size:\s*var\(--text-h1,\s*28px\)/);
  assert.match(css,/\.home-content \.home-lower-grid\s*\{\s*gap:\s*var\(--grid-gutter,\s*12px\)/);
  assert.match(css,/\.home-content \.shortcut-icon\s*\{\s*width:\s*var\(--icon-tile,\s*36px\)/);
  assert.match(css,/@media \(max-width: 599px\)\s*\{\s*\.lightning \.setup-layout \.home-content \{ --text-h1: 20px;/);
});

test('UX-0070 Page Builder metadata loading shows a toolbar, six rows and retry instead of a blank canvas',()=>{
  const shell=source('src/core/workspace/SetupShell/setupShellPresentation.tsx');
  const loader=source('src/core/workspace/SetupShell/SetupLoadingState.tsx');
  const css=source('src/core/workspace/SetupShell/SetupLoadingState.css');
  assert.match(shell,/<SetupLoadingState label="Page Builder definitions"/);
  assert.match(loader,/label\.startsWith\('Page Builder'\)/);
  assert.match(loader,/md-page-list-loading-toolbar/);
  assert.match(loader,/Array\.from\(\{length:6\}/);
  assert.match(loader,/Retry loading \{label\}/);
  assert.match(css,/\.md-page-list-loading-row/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test('UX-0073 Escape in a dirty App Manager edit offers an accessible discard decision',()=>{
  const manager=source('src/core/applications/AppManager/AppManager.tsx');
  assert.match(manager,/if\(dirty\)setConfirmDiscard\(true\);\s*else cancel\(\);/);
  assert.match(manager,/role="alertdialog"/);
  assert.match(manager,/Discard unsaved changes\?/);
  assert.match(manager,/if\(event\.key==='Escape'\)/);
});

test('UX-0026 and UX-0029 security panel shows up to three distinct rows and ignores double refresh',()=>{
 const home=source('src/core/settings/SetupHome/setupHomeView.tsx');
 assert.match(home,/\/auth\/security-events\?limit=15/);
 assert.match(home,/findIndex\(candidate=>candidate\.action===event\.action&&candidate\.at===event\.at\)===index\)\.slice\(0,3\)/);
 assert.match(home,/if\(refreshInFlight\.current\)return \(\) => \{\};/);
 assert.match(home,/refreshInFlight\.current=false/);
});

test('UX-0067 Page Builder CSV filter shrinks within the available header width',()=>{
 const builder=source('src/core/builders/PageBuilder/editor/management/PageManagerView.tsx');
 assert.match(builder,/Inventory CSV device layout/);
 assert.match(builder,/width:'min\(172px, 100%\)',minWidth:0,maxWidth:'100%'/);
 assert.doesNotMatch(builder,/style=\{\{width:172\}\} value=\{inventoryExportVariant\}/);
});
test('UX-0053 Data Loader navigation aligns with the inset configuration panel',()=>{
 const loader=source('src/core/workspace/SetupShell/UniversalDataLoaderWorkspace.tsx');
 assert.match(loader,/maxWidth:1052,marginLeft:24/);
 assert.match(loader,/maxWidth:1100,minWidth:0/);
});

test('UX-0010 Terms, Privacy, Support and Build all stay available at sign in without a configured legal URL',()=>{
 const login=source('src/core/authentication/Login/loginView.tsx');
 const main=source('src/main.tsx');
 const marketing=source('src/core/public/MarketingSite/MarketingSite.tsx');
 assert.match(login,/auth-signin-footer/);
 assert.match(login,/mailto:support@unesolutions\.co\.uk/);
 assert.match(login,/VITE_PRIVACY_POLICY_URL/);
 assert.match(login,/VITE_TERMS_URL\?\.startsWith\('https:\/\/'\)/);
 assert.match(login,/BASE_URL\}terms/);
 assert.match(login,/Build \{__METADRIVE_WEB_RELEASE__/);
 assert.match(main,/const isTermsRoute = pathname === '\/terms'/);
 assert.match(main,/<TermsAccessPage\s*\/>/);
 assert.match(marketing,/export function TermsAccessPage\(/);
 assert.match(marketing,/mailto:support@unesolutions\.co\.uk\?subject=Service%20terms%20request/);
});
