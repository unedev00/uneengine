import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('page-level handlers remain intact in topbar and Design while Smart Insert stays functional',()=>{
 const page=src('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 // Top ribbon tab panel (its id moves to the left Design dock while Design is docked).
 const marker=page.indexOf('ref={ribbonStripRef}');
 const end=page.indexOf('{visibilityEditorOpen && selected && <PageBuilderVisibilityDialog',marker);
 const body=page.slice(marker,end);
 assert.ok(marker>0&&end>marker);
 for(const name of ["case 'backIcon'","case 'restoreVersion'","case 'save'","case 'activate'","case 'resetIcon'"])
  assert.ok(page.includes(name),name);
 assert.doesNotMatch(body,/<UneBuilderRibbon|<UniversalRibbonInventory|<PageBuilderRibbonData|ribbonTab==='Parity'/);
 assert.match(body,/\(ribbonTab==='Preview'\|\|ribbonTab==='Arrange'\) && <div className="office-ribbon-group canvas-preview-selector-group"/, 'component navigator remains a ribbon group in Preview and Arrange');
 assert.match(body,/ribbonTab==='Add Block' && insertRibbon/);
 assert.match(page,/const insertRibbon = \(<SmartInsertRibbon/);
 assert.match(page,/onInsert=\{addPaletteComponent\}/);
 assert.doesNotMatch(body,/onOpenLibrary=\{\(\)=>openAddBlocks\(\)\}/);
 assert.match(body,/ribbonTab==='Component Design 2' && <div className="office-ribbon-group une-sql-home-group design-canvas-settings"/);
 assert.doesNotMatch(page,/\x27Component Design 2\x27,\x27Component Layout\x27,\x27Arrange\x27/);
 assert.match(page,/office-ribbon-quick-access/);
 assert.match(page,/const quickAccessOrder=\['save','activate','preview','exitPreview','resetIcon','undo','redo','cut','copy','paste','delete'\]/);
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

test('Device layout moves to Page Details without losing version controls or SQL metadata',()=>{
 const sql=src('../../server/src/system-support/migrations/20270203-page-layout-ribbon-consolidation.sql');
 const ui=src('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const css=src('../src/core/builders/PageBuilder/PageBuilderRibbonBlueprint.css');
 const details=src('../src/core/builders/PageBuilder/PageDetailsDialog.tsx');
 const move=src('../../server/src/system-support/migrations/20270309-page-device-layout-page-properties.sql');
 assert.match(sql,/property_key IN \('deviceLayout','selectVersion'\)/);
 assert.match(sql,/section_group='Page'/);
 assert.match(sql,/section_group IN \('Device','Version'\)/);
 assert.doesNotMatch(sql,/DELETE FROM md_builder_shared_properties|UPDATE md_page_components|DELETE FROM md_page_components/);
 assert.doesNotMatch(ui,/case 'pageName'/);
 assert.doesNotMatch(ui,/case 'deviceLayout'/);
 assert.match(details,/aria-label="Device layout to design"/);
 assert.match(move,/section_group='Page Properties'/);
 assert.match(ui,/case 'selectVersion'/);
 assert.match(ui,/aria-label=\{showLayoutHistory\?'Refresh versions':'Load versions'\}/);
 assert.match(ui,/restoreLayoutVersion\(selectedHistoryVersion\)/);
 assert.match(ui,/office-ribbon-version-controls/);
 assert.match(css,/--page-ribbon-bg:#f4f5f7/);
 assert.match(css,/>\.smart-ribbon\s*\{\s*background:var\(--page-ribbon-bg\)!important/);
 assert.match(css,/une-sql-home-group\[data-shared-group="Page"\]/);
});

test('Quick Access keeps Preview and Exit while collapsing the interactive ribbon',()=>{
 const ui=src('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const polish=src('../src/core/builders/PageBuilder/PageBuilderRibbonPolish.css');
 assert.ok(ui.includes("case 'preview':return <button"));
 assert.ok(ui.includes("case 'exitPreview':return <button"));
 assert.ok(ui.includes("setRibbonTab('Preview');setPreviewMode(true)"));
 assert.ok(ui.includes('is-interactive-preview'));
 assert.ok(polish.includes('.office-builder-ribbon.is-interactive-preview #page-builder-tab-content'));
 assert.ok(polish.includes('.builder-page.builder-interactive-preview .record-component-head'));
});
test('Conditional Visibility and Canvas Tools are direct ribbon sections',()=>{
 const ui=src('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const advanced=src('../src/core/builders/PageBuilder/PageBuilderAdvancedRibbon.tsx');
 assert.ok(ui.includes('preview-visibility-group'));
 assert.ok(ui.includes('onClick={openVisibilityEditor}'));
 assert.ok(!ui.includes("ribbonTab==='Arrange' && <ArrangeRibbon"));
 assert.ok(ui.includes('const canvasArrangeProps:ArrangeRibbonProps='));
 assert.ok(ui.includes('onAlign:alignSelected,')&&ui.includes('onDistribute:distributeSelected,'));
 assert.ok(ui.includes('onGroup:wrapSelectedInContainer,')&&ui.includes('onUngroup:ungroupSelected,'));
 assert.ok(ui.includes('design2Arrange={canvasArrangeProps}'));
 assert.ok(ui.includes('design2Arrange={canvasArrangeProps}'));
 assert.ok(advanced.includes('page-builder-canvas-ribbon-group'));
 for(const feature of ["key:'visibility'","key:'canvas'","key:'preview'"])assert.ok(!advanced.includes(feature),feature);
 assert.ok(!ui.includes("advancedEditor==='visibility'"));
 assert.ok(!ui.includes("advancedEditor==='canvas'"));
});
