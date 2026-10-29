import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('ribbon reset preserves Home handlers and clears all other rendered tab controls',()=>{
 const page=src('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const marker=page.indexOf('id="page-builder-tab-content"');
 const end=page.indexOf('className="office-ribbon-group-navigation"',marker);
 const body=page.slice(marker,end);
 assert.ok(marker>0&&end>marker);
 for(const name of ["case 'backIcon'","case 'pageName'","case 'save'","case 'activate'","case 'resetIcon'"])
  assert.ok(body.includes(name),name);
 assert.doesNotMatch(body,/<UneBuilderRibbon|<UniversalRibbonInventory|<PageBuilderActionRibbon|<PageBuilderRibbonData|ribbonTab === 'Add Block'|ribbonTab==='Preview'|ribbonTab==='Parity'/);
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
 const d=JSON.parse(src('../src/one/acetill_cart/component.json'));
 const v3=src('../../acetill/sql/register-v3.sql');
 assert.equal(d.apiName,'acetill_cart');
 assert.deepEqual(d.propertyDefinitions,[]);
 assert.match(src('../src/one/acetill_cart/AcetillCart.jsx'),/une_cart\/UneCart/);
 assert.match(v3,/one-bundled:acetill_cart/);
 assert.match(v3,/AcetillSale','acetill_cart'/);
 assert.match(v3,/AcetillCheckout','acetill_cart'/);
 assert.doesNotMatch(v3,/'une_cart'/);
});
