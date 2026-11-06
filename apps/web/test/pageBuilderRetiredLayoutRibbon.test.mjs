import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const page=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
const design=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
const css=read('../src/core/builders/PageBuilder/SmartRibbonDesign2.css');
const migration=read('../../server/src/system-support/migrations/20271114-page-builder-retire-layout-ribbon.sql');
const card=read('../src/component-libraries/shared/CardCore.jsx');
const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
const visibility=read('../src/core/builders/PageBuilder/layoutRibbonVisibility.ts');
const dockCss=read('../src/core/builders/PageBuilder/PageBuilderDesignDock.css');

test('Retire Layout only after remapping all component property definitions to Design2',()=>{
 assert.match(migration,/SET tab='Design2'/);
 assert.match(migration,/WHERE tab='Layout' AND scope='component'/);
 assert.doesNotMatch(page,/['"]Component Design 2['"],['"]Component Layout['"],['"]Arrange['"]/);
 assert.match(page,/if\(tab==='Component Layout'\|\|tab==='Arrange'\|\|tab==='Component Data'\)tab='Component Design 2'/);
 assert.match(page,/design-canvas-settings/);
 for(const key of ['canvasWidth','canvasHeight','canvasFillColor'])
   assert.match(page,new RegExp('data-ribbon-property="'+key+'"'));
});

test('Appearance selector edits only existing count and calendar metadata',()=>{
 assert.doesNotMatch(design,/<Hand size=\{16\}/);
 for(const key of ['cardsPerRow','cardsPerColumn','tabCount','tabIndex','showDays','firstDay'])
  assert.ok(design.includes(key),key+' remains supported');
 assert.match(design,/\[property!\.valueKeys\?\.\[api\]\?\?key\]:next/);
 assert.match(css,/smart-design2-count/);
 assert.match(css,/position:relative;grid-column:7;grid-row:1/);
 assert.match(design,/area==='Extras'&&<>/);
 assert.match(design,/className="smart-design2-extras-fixed"/);
 assert.match(design,/gridTemplateColumns:design2GridColumns\(row\)/);
 assert.doesNotMatch(design,/row===1&&\(\(\)=>\{/);
 assert.match(design,/className="smart-design2-count-choice"/);
 assert.match(design,/className="smart-design2-count-field"/);
 assert.match(design,/className="smart-office-number" step=\{1\}/);
 assert.match(design,/sourceBound=api==='smart_tabs'&&key==='tabCount'/);
 assert.match(design,/const enabled=supported&&!sourceBound/);
 assert.match(design,/className="smart-design2-days-trigger"/);
 assert.match(design,/className="smart-design2-padding"/);
});

test('Tab dimensions, orientation and count resize canvas frame together',()=>{
 for(const key of ['tabWidth','tabHeight','tabCount','tabOrientation'])
   assert.ok(page.includes(key),key);
 assert.match(design,/slot\.slotKey==='width'\?'tabWidth':'tabHeight'/);
 assert.match(page,/selected\.type==='Custom:smart_tabs'/);
 assert.match(page,/updateComponent\(selected\.id,\{properties,\.\.\.\(position\?/);
});

test('Calendar, image and header settings stay directly editable in Design',()=>{
 for(const key of ['showDays','firstDay','imageFill','imagePlacement','imageHeight',
   'headerBoxHeight','supportingBoxHeight','imageBorderColor'])
   assert.ok(design.includes(key),'Missing '+key);
 assert.match(design,/key==='showDays'/);
 assert.match(design,/key==='firstDay'/);
 assert.doesNotMatch(design,/className="smart-design2-image-border"/);
});

test('Badge visibility follows rendered nonempty text, including spaces',()=>{
 assert.match(card,/const badgeEnabled=Boolean\(badge\)/);
 assert.match(runtime,/\{Boolean\(badge\)&&<span/);
 assert.doesNotMatch(runtime,/p\.badgeVisible===true&&Boolean\(badge\)/);
 assert.doesNotMatch(design,/const badge=activeDesign2Area==='Badge'/);
});

test('Removed defaultCheck and columnVisibility stay out of all ribbons',()=>{
 for(const property of ['defaultCheck','columnVisibility']){
   assert.match(migration,new RegExp("'"+property+"'"));
   assert.match(visibility,new RegExp("'"+property+"'"));
 }
 assert.match(migration,/UPDATE md_builder_ribbon_component_rules/);
 assert.match(migration,/SET enabled=false/);
 assert.match(migration,/WHERE property_key IN \('defaultCheck','columnVisibility'\)/);
 assert.match(migration,/RAISE EXCEPTION 'Layout retirement failed: component metadata remains'/);
});

test('Vertical Design dock keeps every control inside its width without a horizontal scrollbar',()=>{
 assert.match(dockCss,/overflow-x:hidden;overflow-y:auto/);
 assert.match(dockCss,/grid-column:7!important;grid-row:1!important/);
 assert.match(dockCss,/position:relative!important/);
 assert.match(dockCss,/\.smart-design2-count-choice/);
 assert.match(dockCss,/\.smart-design2-calendar-controls,\.smart-design2-image-border/);
});
