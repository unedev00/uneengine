import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  reconcileCurrentAppId, reconcileSelectedObject, reconcileSelectedPage
} from '../src/core/workspace/SetupShell/metadataSelection.ts';
import {appRoutePathWithoutBase, recordPageLayoutVariants} from '../src/core/workspace/Navigation/appRouting.ts';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const loader = read('../src/core/workspace/SetupShell/useSetupMetadata.ts');
const presentation = read('../src/core/workspace/SetupShell/setupShellPresentation.tsx');
const surface = read('../src/core/platform/Workspace/PlatformWorkspaceSurface.tsx');

test('a later metadata stage keeps the object the user already opened', () => {
  const account = { apiName: 'Account' }, order = { apiName: 'Order__c' };
  assert.equal(reconcileSelectedObject(order, [account, order]), order);
  // Only falls back when the selection no longer exists.
  assert.equal(reconcileSelectedObject({ apiName: 'Removed__c' }, [account, order]), account);
  // An empty payload never discards the current selection.
  assert.deepEqual(reconcileSelectedObject(order, []), order);
});

test('a later metadata stage keeps the app the user already switched to', () => {
  const apps = [{ apiName: 'CRM' }, { apiName: 'Till' }];
  assert.equal(reconcileCurrentAppId('Till', apps), 'Till');
  assert.equal(reconcileCurrentAppId('Records', apps), 'CRM');
  assert.equal(reconcileCurrentAppId('Records', []), '');
});

test('page selection prefers the live route, then the current page, then Account, then the first page', () => {
  const home = { apiName: 'Home', targetObject: 'Contact', pageType: 'Home Page' };
  const account = { apiName: 'AccountRecord', targetObject: 'Account', pageType: 'Record Page' };
  const custom = { apiName: 'Custom', targetObject: 'Order__c', pageType: 'Record Page' };
  const pages = [home, account, custom];
  assert.equal(reconcileSelectedPage(home, pages, 'Custom'), custom);
  assert.equal(reconcileSelectedPage(custom, pages), custom);
  assert.equal(reconcileSelectedPage({ apiName: 'Gone' }, pages), account);
  assert.equal(reconcileSelectedPage({ apiName: 'Gone' }, [home, custom]), home);
  assert.deepEqual(reconcileSelectedPage(custom, []), custom);
});

test('metadata load stages read live state, never the mount-time closure', () => {
  assert.doesNotMatch(loader, /===\s*object\.apiName\)\s*\?\?/, 'object selection must not read the stale closure');
  assert.doesNotMatch(loader, /app\.apiName === currentAppId|item\.apiName === currentAppId/, 'app selection must not read the stale closure');
  assert.doesNotMatch(loader, /route\.kind === 'setup' && route\.workspace === 'page-builder' && item\.apiName/, 'page selection must use the live route');
  assert.match(loader, /setObject\(current=>reconcileSelectedObject\(current,displayObjects\)\)/);
  assert.match(loader, /setObject\(current=>reconcileSelectedObject\(current,objectPayload\.objects\)\)/);
  assert.match(loader, /setCurrentAppId\(current=>reconcileCurrentAppId\(current,displayApps\)\)/);
  assert.match(loader, /setCurrentAppId\(current => reconcileCurrentAppId\(current, appPayload\.apps\)\)/);
  assert.match(loader, /latest\.current\.route/);
});

test('permission flags are applied together, then marked resolved on every exit path', () => {
  const marks = loader.match(/setSessionPermissionsLoaded\(true\)/g) ?? [];
  assert.ok(marks.length >= 3, 'fast entry, /auth/me response and the finally block must each mark permissions resolved');
  const thenBlock = loader.slice(loader.indexOf('void sessionRequest.then'), loader.indexOf('The awaited bootstrap handles session-expiry'));
  // Surfaces decide access from these flags, so they must be set before the marker flips.
  for (const setter of ['setCanReadMetadata', 'setCanReadSecurity', 'setCanManagePlatformTenants', 'setCanManageFlows', 'setCanRunFlows']) {
    assert.ok(thenBlock.indexOf(setter) > -1 && thenBlock.indexOf(setter) < thenBlock.indexOf('setSessionPermissionsLoaded(true)'), setter + ' must precede the resolved marker');
  }
  const finallyBlock = loader.slice(loader.indexOf('} finally {', loader.indexOf('const [objectPayload, flowPayload,')));
  assert.match(finallyBlock, /setSessionPermissionsLoaded\(true\)/, 'a failed identity call must end in the explicit denial, not an endless check');
});

test('every permission-gated Setup surface waits for resolved permissions before showing a denial', () => {
  const unguarded = presentation.match(/permitted=\{(canReadMetadata|canReadSecurity)\}(?! resolving=\{!sessionPermissionsLoaded\})/g);
  assert.equal(unguarded, null, 'a surface can flash "Access ... not verified" before /auth/me resolves');
  assert.match(presentation, /workspace === 'tenant-management' && !sessionPermissionsLoaded && <section[^>]*role="status">Checking access/);
  assert.match(presentation, /workspace === 'tenant-management' && sessionPermissionsLoaded && !canManagePlatformTenants/);
});

test('waiting never grants access: unresolved checks render no workspace content', () => {
  const checking = surface.indexOf('if(!permitted&&resolving)return');
  const denial = surface.indexOf('if(!permitted)return <div role="alert">Access to this Setup workspace');
  const content = surface.indexOf("const pageName='MetaDrive_Admin_'");
  assert.ok(checking > -1 && denial > checking && content > denial, 'checking, then denial, then content');
  assert.match(surface.slice(checking, denial), /Checking access/);
  assert.doesNotMatch(surface.slice(checking, denial), /children/);
});

test('Object Manager Record Page links target a specific device without duplicate summary screens', () => {
  const manager = read('../src/core/builders/ObjectManager/objectManagerView.tsx');
  const editor = read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
  const router = read('../src/core/workspace/Navigation/appRouting.ts');
  assert.deepEqual(recordPageLayoutVariants,['Mobile','Desktop','Tablet','Custom']);
  for (const variant of recordPageLayoutVariants) {
    const path=appRoutePathWithoutBase({
      kind:'setup',workspace:'object-manager',objectApiName:'Cart',
      setting:'Lightning Record Pages',resourceApiName:'Cart_Record_View',resourceId:variant
    });
    assert.equal(path,'/une/setup/object-manager/Cart/LightningRecordPages/Cart_Record_View/'+variant);
  }
  assert.match(router,/segments\[5\]/,'device target must round-trip through the parser');
  assert.match(manager,/onOpenRecordPage\(item\.id, variant\)/);
  assert.match(manager,/<DeviceIcon size=\{16\} aria-hidden="true"\/><span>\{variant\}<\/span>/, 'device layout controls must have visible labels');
  assert.match(manager,/onOpenRecordPage\(item\.id, 'Desktop'\)/);
  assert.match(manager,/selectedSetting !== 'Lightning Record Pages'/);
  assert.match(editor,/initialLayoutVariant\?\?page\.layoutVariant\?\?'Desktop'/);
  assert.match(editor,/onLayoutVariantChange\?\.\(variant\)/);
  assert.match(presentation,/initialLayoutVariant=\{requestedVariant\}/);
  assert.match(presentation,/resourceId:variant/);
});

test('Flow list keeps the Setup sidebar and a first-column pencil Edit action', () => {
  const shell = read('../src/core/workspace/SetupShell/setupShellPresentation.tsx');
  const builder = read('../src/core/builders/FlowBuilder/FlowBuilder.tsx');
  assert.match(shell, /workspace !== 'flow-builder' \|\| !route\.resourceApiName/,
    'Only a selected Flow editor may hide Setup navigation');
  const list = builder.slice(builder.indexOf('<h2 id="flow-start-existing-title">'),
    builder.indexOf('<nav aria-label="Flow list pagination"'));
  assert.match(list, /<th aria-label="Edit flow">Edit<\/th><th>Flow Name<\/th>/);
  assert.match(list, /<td><button type="button" className="icon-button subtle" aria-label=\{`Edit \$\{candidate\.label\}`\}/);
  assert.doesNotMatch(list, /<th>Actions<\/th>/,
    'The old trailing actions column must not duplicate the first-column Edit button');
});
