import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const builder=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
const insert=read('../src/core/builders/PageBuilder/SmartInsertRibbon.tsx');
const insertCss=read('../src/core/builders/PageBuilder/SmartInsertRibbon.css');
const dockCss=read('../src/core/builders/PageBuilder/PageBuilderDesignDock.css');
const ribbonLayoutCss=read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css');
const formulaCss=read('../src/core/builders/PageBuilder/PageBuilderTopbarFormula.css');

test('Page Builder uses one left-docked editor instead of a duplicate top ribbon',()=>{
 assert.match(builder,/const designInPanel = !previewMode;/);
 assert.match(builder,/\{designInPanel && <aside className="page-builder-design-dock"/);
 assert.match(builder,/\{ribbonNavigation\}/);
 assert.match(builder,/\{renderRibbonPanel\(\)\}/);
 assert.doesNotMatch(builder,/designDockedLeft|ribbonCollapsed|setDesignDockedLeft|setRibbonCollapsed/);
 assert.doesNotMatch(builder,/office-ribbon-layout-toggles|!designInPanel && renderRibbonPanel\(\)/);
 assert.doesNotMatch(builder,/Show tabs in the top ribbon|Collapse the ribbon|Pin the ribbon/);
 assert.doesNotMatch(dockCss,/is-ribbon-collapsed|office-ribbon-layout-toggle/);
});

test('Left Insert gallery expands to show all registered Smart component tiles',()=>{
 assert.match(builder,/items=\{paletteComponents\}/);
 assert.match(insert,/const visible=items\.filter\(isSmartInsertItem\)/);
 assert.match(insert,/visible\.map\(item=>/);
 const leftGrid=insertCss.slice(insertCss.lastIndexOf('.page-builder-design-dock .office-builder-ribbon .smart-insert-tiles'));
 assert.match(leftGrid,/grid-auto-flow:row!important/);
 assert.match(leftGrid,/grid-template-rows:none!important/);
 assert.match(leftGrid,/grid-auto-rows:55px/);
 assert.match(leftGrid,/height:auto!important;max-height:none!important/);
 assert.match(leftGrid,/overflow:visible!important/);
 const topInsertRules=ribbonLayoutCss.slice(
  ribbonLayoutCss.indexOf('/* Insert and Advanced must use the same 114px lane'),
  ribbonLayoutCss.indexOf('/* Advanced ribbon:'));
 assert.equal(topInsertRules.split(':not(.page-builder-design-dock-ribbon)').length-1,6,
  'Two-row ribbon limits must never apply to the left dock');
 assert.match(dockCss,/overflow-x:hidden;overflow-y:auto/);
});

test('Formula Bar is twice the old target width and occupies vacated topbar space',()=>{
 assert.match(builder,/className="office-ribbon-topbar-formula"/);
 assert.match(builder,/dataRibbon\('formulaBar'\)/);
 assert.match(formulaCss,/flex:1 1 880px;min-width:0;max-width:880px/);
 assert.match(formulaCss,/margin:0 0 0 4px/);
 assert.doesNotMatch(builder,/<div className="office-ribbon-navigation">/);
});
