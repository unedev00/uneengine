import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

// Regression contracts complement, but do not replace, pointer-driven browser
// tests at the 19 audited viewports. IDs refer to ALL_FINDINGS.csv (UX-0001..0084).
const src = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');
const auth = src('core/authentication/Login/loginView.tsx');
const authCss = src('core/authentication/Login/standaloneLogin.css');
const recovery = src('core/authentication/Login/LoginRecovery.tsx');
const shell = src('core/workspace/SetupShell/setupShellPresentation.tsx');
const setup = src('core/settings/SetupHome/setupHomeView.tsx');
const dataLoader = src('core/workspace/SetupShell/UniversalDataLoaderWorkspace.tsx');
const metadataLoader = src('core/builders/ObjectManager/UniversalMetadataLoader.tsx');
const objects = src('core/builders/ObjectManager/objectManagerView.tsx');
const objectDialogs = src('core/builders/ObjectManager/setupObjectDialogs.tsx');
const pages = src('core/builders/PageBuilder/pageBuilderView.tsx');
const pageDetails = src('core/builders/PageBuilder/PageDetailsDialog.tsx');
const appManager = src('core/applications/AppManager/AppManager.tsx');
const appList = src('core/applications/AppManagerList/AppManagerList.tsx');
const checklist = src('component-libraries/shared/primitives/ChecklistMultiSelect/ChecklistMultiSelect.tsx');

test('UX-0001/0002/0003/0005: auth reflows and reveal is a named in-field button', () => {
  assert.match(authCss, /html:has\(\.auth-screen\),body:has\(\.auth-screen\)\{min-width:0!important/);
  assert.match(authCss, /\.auth-screen \.auth-card\{[^}]*max-width:420px/);
  assert.match(authCss, /@media\(max-height:460px\)/);
  assert.match(auth, /className="auth-password-field"/);
  assert.match(auth, /aria-label=\{passwordVisible\?'Hide password':'Show password'\}/);
  assert.match(auth, /className="auth-reveal"/);
});

test('UX-0011/0017/0018: recovery is addressable and returning hides the password', () => {
  assert.match(auth, /\?recover=1/);
  assert.match(auth, /popstate/);
  assert.match(auth, /const closeRecovery=\(\)=>\{setRecovering\(false\);setPassword\(''\);setPasswordVisible\(false\)/);
  assert.match(recovery, /<h1>Recover your password<\/h1>/);
  assert.match(auth, /document.title=recovering\?/);
});

test('UX-0014/0015/0016: provisioned channels only; unprovisioned route gives real support', () => {
  assert.match(recovery, /channelButtons\.filter\(item=>options\.channels\[item\.channel\]\)/);
  assert.doesNotMatch(recovery, /— Not configured/);
  assert.match(recovery, /mailto:support@unesolutions\.co\.uk/);
  assert.match(recovery, /Retry recovery options/);
  assert.match(authCss, /\.auth-screen \.auth-recovery-channel\{[^}]*min-height:44px[^}]*width:100%/);
});

test('UX-0019/0023/0048: one Setup Home; resize restores sidebar state', () => {
  assert.match(shell, /workspace === 'home' &&\s*<SetupHome/);
  assert.doesNotMatch(shell, /<MobileSettingsHome/);
  const setupShell = src('core/workspace/SetupShell/setupAppShell.tsx');
  assert.match(setupShell, /matchMedia\('\(max-width: 1024px\)'\)/);
  assert.match(setupShell, /breakpoint\.addEventListener\('change',sync\)/);
});

test('UX-0020/0029: compact welcome band, refresh with progress and clear outcomes', () => {
  assert.doesNotMatch(setup, /className="welcome-quick"/);
  assert.doesNotMatch(setup, /className="welcome-art"/);
  assert.match(setup, /loading\?'Refreshing…':'Refresh'/);
  assert.match(setup, /Setup data refreshed/);
});

test('UX-0032/0033/0034/0046: Object Manager has sticky labels, usable pagination, sorting', () => {
  assert.match(objects, /aria-sort=\{objectSort\.key===key/);
  assert.match(objects, /toggleObjectSort/);
  assert.match(objects, /\.object-manager-desktop-list'\)\?\.scrollTo\(0,0\)/);
  const css = src('core/workspace/WorkspaceTheme/setupUsability.css');
  assert.match(css, /\.object-manager-desktop-list thead th\{position:sticky/);
  assert.match(css, /\.object-manager-desktop-list\{max-height:none!important/);
});

test('UX-0036/0040/0041: Object dialog is keyboard dismissible; list has semantic links/empty layout', () => {
  assert.match(objectDialogs, /event\.key==='Escape'/);
  assert.match(objectDialogs, /type="button" className="btn" onClick=\{closeNewObject\}/);
  assert.match(objects, /<a className="field-link" href=/);
  assert.match(objects, /visibleObjects\.length>0&&<nav className="object-manager-pagination"/);
});

test('UX-0047/0052/0055: Data Loader category tabs respond to pointer and keyboard', () => {
  assert.match(dataLoader, /role="tablist"/);
  assert.match(dataLoader, /role="tab" id=\{'loader-tab-'/);
  assert.match(dataLoader, /onPointerDown=\{\(\)=>setTab\(key\)\}/);
  assert.match(dataLoader, /event\.key==='ArrowRight'/);
  assert.match(dataLoader, /role="tabpanel"/);
  assert.match(dataLoader, /overflowX:'auto'/);
});

test('UX-0049/0050/0051/0054: upload inputs reflow, scope grouped, action status announced', () => {
  assert.match(metadataLoader, /metadata-export-scope/);
  assert.match(metadataLoader, /name="metadata-export-scope"/);
  assert.match(metadataLoader, /metadata-validate-hint/);
  assert.match(metadataLoader, /maxWidth:'100%'/);
  assert.match(metadataLoader, /setExportNotice\('Workbook download started\.'\)/);
  assert.match(dataLoader, /record-workbook-hint/);
});

test('UX-0057/0058/0060/0062/0063/0068: Page Builder sorting, dialogs and mobile actions', () => {
  assert.match(pages, /togglePageSort\('label'\)/);
  assert.doesNotMatch(pages, /aria-pressed=\{item\.status==='Active'\}/);
  assert.match(pages, /aria-label="Filter pages by layout"/);
  assert.match(pages, /Edit page properties for /);
  assert.match(pages, /Download component inventory for /);
  assert.match(pages, /event\.key==='Escape'/);
  assert.match(pageDetails, /role="tablist"/);
  assert.match(pageDetails, /role="tabpanel"/);
  assert.match(pageDetails, /event\.key==='Escape'/);
});

test('UX-0073/0074/0084: App Manager never synchronously blocks clone/delete', () => {
  assert.match(appManager, /setDeleteConfirmationOpen\(true\)/);
  assert.match(appManager, /role="alertdialog"/);
  assert.match(appManager, /const cloneApp = \(source: AppDraft\)/);
  assert.match(appManager, /setDraft\(appDraftFromMetadata\(copy\)\)/);
  assert.match(appManager, /onClick=\{returnToList\}>Cancel/);
  const deleting = appManager.split('const remove = async () => {')[1].split('const cancel = () => {')[0];
  assert.doesNotMatch(deleting, /window\.confirm/);
});

test('UX-0075/0077/0078/0080/0081: App Manager actions and pickers have names and state', () => {
  assert.match(appList, /aria-label=\{'Edit '\+app\.label\}/);
  assert.match(appList, /aria-label=\{'Clone '\+app\.label\}/);
  assert.match(appList, /aria-sort=\{sort\.key/);
  assert.match(appList, /countLabel\(app\.navigationPageApiNames\.length,'page'\)/);
  assert.match(appManager, /aria-current=\{activeStep === index \? 'step' : undefined\}/);
  assert.match(checklist, /aria-haspopup="dialog"/);
  assert.match(checklist, /role="dialog"/);
});
