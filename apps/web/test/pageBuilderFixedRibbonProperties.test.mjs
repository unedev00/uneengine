import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../src/core/builders/PageBuilder/'+name,import.meta.url),'utf8');

test('Data Formula bar retains all six fixed 26px controls and constant image/summary slots',()=>{
  const markup=read('SmartRibbon.tsx');
  const css=read('SmartRibbonDataFormula.css');
  assert.match(css,/flex:0 0 34px;width:34px;height:26px/,'ƒx symbol must be 34 × 26px');
  assert.match(css,/flex:0 0 40px;width:40px;height:26px/,'record-filter button must be 40 × 26px');
  assert.match(css,/flex:0 0 35px;width:35px;min-width:35px;max-width:35px/,'upload must be 35px wide');
  assert.match(css,/flex:0 0 600px;width:600px;min-width:600px;max-width:600px/,'formula input must be 600px wide');
  assert.match(css,/flex:0 0 115px;width:115px;min-width:115px;max-width:115px/,'summary heading must be 115px wide');
  assert.match(css,/height:26px;min-height:26px;max-height:26px/);
  const filter=markup.indexOf('className="smart-data-filter-button"');
  const image=markup.indexOf('className="smart-data-image-upload"');
  const formula=markup.indexOf('className="smart-data-formula-input"');
  const summary=markup.indexOf('className="smart-data-summary-name"');
  assert.ok(filter>=0&&image>filter&&image<formula&&summary>formula,'image slot must remain immediately after filter');
  assert.match(markup,/disabled=\{uploadBusy\|\|!activeDataEnabled\|\|activeDataProperty\?\.id!=='imageSource'\|\|api!=='smart_image'\}/);
  assert.match(markup,/disabled=\{!activeSummaryLabel\|\|!activeDataEnabled\}/);
  assert.doesNotMatch(markup,/\{activeDataProperty\?\.id==='imageSource'&&api==='smart_image'&&\s*<button/);
});

test('Actions labels and controls occupy one 225 × 26px slot, including cart buttons',()=>{
  const css=read('PageBuilderActionRibbonCompact.css');
  const layout=read('PageBuilderRibbonLayout.css');
  const actions=read('PageBuilderActionRibbon.tsx');
  assert.match(css,/width:225px;min-width:225px;max-width:225px;\s*height:26px/);
  assert.match(css,/grid-template-columns:repeat\(2,225px\)/);
  assert.match(layout,/\.page-action-formula-bar>\.smart-formula\{[\s\S]*?width:225px!important;[\s\S]*?height:34px!important/);
  for(const key of ['click','change','start','qtyIncrease','qtyDecrease','customButton1','customButton2']){
    assert.ok(actions.includes("key:'"+key+"'"),'missing action slot '+key);
  }
  assert.match(actions,/<label htmlFor=\{'page-action-'\+slot\.key\}>\{slot\.label\}<\/label>/);
  assert.match(actions,/<select id=\{'page-action-'\+slot\.key\}/);
});

test('Advanced and View use complete, fixed-width grouped ribbon properties',()=>{
  const layout=read('PageBuilderRibbonLayout.css');
  const view=read('pageBuilderView.tsx');
  assert.match(layout,/\.advanced-api-name,\.advanced-visible,\.advanced-readonly,\.advanced-accept,\.advanced-component-id/);
  assert.match(layout,/width:300px!important;min-width:300px!important;\s*max-width:300px!important;height:26px!important/);
  assert.match(layout,/\.page-component-navigator \.ribbon-view-search\{[\s\S]*?width:300px!important/);
  assert.match(layout,/\.ribbon-view-zoom-buttons>button\{[\s\S]*?width:100px!important/);
  assert.match(layout,/\.preview-visibility-controls\{[\s\S]*?width:300px!important/);
  assert.match(view,/checked=\{selected\?\.visible\?\?false\} disabled=\{!selected\}/);
  assert.match(view,/title="Edit conditional visibility" disabled=\{!selected\} onClick=\{openVisibilityEditor\}/);
  assert.match(view,/<button type="button" disabled=\{!selected\} onClick=\{openVisibilityEditor\}>Conditions<\/button>/);
});

test('Actions ribbon has no redundant Other events selector or mapping',()=>{
  const actions=read('PageBuilderActionRibbon.tsx');
  const styles=read('PageBuilderActionRibbonCompact.css');
  assert.doesNotMatch(actions,/Other supported event|Other events|otherEvents|selectedOther|setOtherEvent|page-action-compact-extra/);
  assert.doesNotMatch(styles,/page-action-compact-(extra|mapping|rows)/);
  assert.match(actions,/eventSlots\.map\(slot=>slotPicker\(slot\)\)/);
  assert.match(actions,/componentSlots\.map\(slot=>slotPicker\(slot\)\)/);
  // Existing metadata bindings remain available to the selected-action editor;
  // only the redundant selector and mapping section are removed.
  assert.match(actions,/Object\.prototype\.hasOwnProperty\.call\(actions,selectedEvent\)/);
  assert.match(actions,/onChange\(\{\.\.\.actions,\[selectedEvent\]:\{\.\.\.selected,\.\.\.change\}\}\)/);
});
