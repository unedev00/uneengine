import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('page-level handlers remain intact in topbar and Layout while Smart Insert stays functional',()=>{
 const page=src('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const marker=page.indexOf('id="page-builder-tab-content"');
 const end=page.indexOf('className="office-ribbon-group-navigation"',marker);
 const body=page.slice(marker,end);
 assert.ok(marker>0&&end>marker);
 for(const name of ["case 'backIcon'","case 'pageName'","case 'save'","case 'activate'","case 'resetIcon'"])
  assert.ok(page.includes(name),name);
 assert.doesNotMatch(body,/<UneBuilderRibbon|<UniversalRibbonInventory|<PageBuilderActionRibbon|<PageBuilderRibbonData|ribbonTab==='Preview'|ribbonTab==='Parity'/);
 assert.match(body,/ribbonTab==='Add Block' && <SmartInsertRibbon/);
 assert.match(body,/onInsert=\{addPaletteComponent\}/);
 assert.match(body,/onOpenLibrary=\{\(\)=>openAddBlocks\(\)\}/);
 assert.match(body,/ribbonTab==='Component Layout' && ribbonCatalog/);
 assert.match(page,/office-ribbon-quick-access/);
 assert.match(page,/const quickAccessOrder=\['save','activate','resetIcon','undo','redo','cut','copy','paste'\]/);
});
test('additive SQL migration removes only non-Home shared entries and migrates Acetill Cart without deleting values',()=>{
 const sql=src('../../server/src/system-support/migrations/20270123-ribbon-home-reset-acetill-cart.sql');
 assert.match(sql,/DELETE FROM md_builder_shared_properties WHERE tab <> 'Home'/);
 assert.doesNotMatch(sql,/DELETE FROM md_page_component_properties|DELETE FROM md_lightning_page_node_properties/);
 assert.match(sql,/UPDATE md_page_components c SET component_api='acetill_cart'/);
 assert.match(sql,/UPDATE md_lightning_page_nodes n SET component_type='Custom:acetill_cart'/);
 assert.match(sql,/UPDATE md_page_layout_version_nodes n SET component_type='Custom:acetill_cart'/);
 assert.match(sql,/p.api_name IN \('AcetillSale','AcetillCheckout'\)/);
});
test('Acetill owns its renderer identity and a separate version-3 package',()=>{
 const d=JSON.parse(src('../src/component-libraries/acetill_cart/component.json'));
 const v3=src('../../acetill/sql/register-v3.sql');
 assert.equal(d.apiName,'acetill_cart');
 assert.deepEqual(d.propertyDefinitions,[]);
 const privateRenderer=src('../src/component-libraries/acetill_cart/AcetillCart.jsx');
 assert.match(privateRenderer,/shared\/primitives\/ShoppingCart\/ShoppingCart/);
 assert.doesNotMatch(privateRenderer,/ui_cart\/UneCart/);
 assert.match(v3,/one-bundled:acetill_cart/);
 assert.match(v3,/AcetillSale','acetill_cart'/);
 assert.match(v3,/AcetillCheckout','acetill_cart'/);
 assert.doesNotMatch(v3,/'ui_cart'/);
 const v4=src('../../acetill/sql/register-v4.sql');
 for(const name of ['acetill_input','acetill_search','acetill_item_grid','acetill_cart','acetill_button'])
  assert.ok(v4.includes(name),name);
 assert.doesNotMatch(v4,/'ui_input'|'ui_search'|'ui_item_grid'|'ui_cart'|'ui_button'/);
});

test('Layout combines Device and Version in the SQL Page section without losing controls',()=>{
 const sql=src('../../server/src/system-support/migrations/20270203-page-layout-ribbon-consolidation.sql');
 const ui=src('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const css=src('../src/core/builders/PageBuilder/PageBuilderRibbonBlueprint.css');
 assert.match(sql,/property_key IN \('deviceLayout','selectVersion'\)/);
 assert.match(sql,/section_group='Page'/);
 assert.match(sql,/section_group IN \('Device','Version'\)/);
 assert.doesNotMatch(sql,/DELETE FROM md_builder_shared_properties|UPDATE md_page_components|DELETE FROM md_page_components/);
 assert.match(ui,/case 'pageName'/);
 assert.match(ui,/case 'deviceLayout'/);
 assert.match(ui,/case 'selectVersion'/);
 assert.match(ui,/aria-label=\{showLayoutHistory\?'Refresh versions':'Load versions'\}/);
 assert.match(ui,/restoreLayoutVersion\(selectedHistoryVersion\)/);
 assert.match(ui,/office-ribbon-version-controls/);
 assert.match(css,/--page-ribbon-bg:#f4f5f7/);
 assert.match(css,/>\.smart-ribbon\s*\{\s*background:var\(--page-ribbon-bg\)!important/);
 assert.match(css,/une-sql-home-group\[data-shared-group="Page"\]/);
});
