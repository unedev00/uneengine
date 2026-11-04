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

test('Retire Layout only after remapping all component property definitions to Design2',()=>{
 assert.match(migration,/SET tab='Design2'/);
 assert.match(migration,/WHERE tab='Layout' AND scope='component'/);
 assert.doesNotMatch(page,/['"]Component Design 2['"],['"]Component Layout['"],['"]Arrange['"]/);
 assert.match(page,/if\(tab==='Component Layout'\)tab='Component Design 2'/);
 assert.match(page,/design-canvas-settings/);
 for(const key of ['canvasWidth','canvasHeight','canvasFillColor'])
   assert.match(page,new RegExp('data-ribbon-property="'+key+'"'));
});

test('Hand control edits the existing count metadata, not a new counter',()=>{
 assert.match(design,/<Hand size=\{16\}/);
 assert.match(design,/['"]tabCount['"]/);
 assert.match(design,/['"]cardsPerRow['"],['"]cardsPerColumn['"]/);
 assert.match(design,/\[property!\.valueKeys\?\.\[api\]\?\?key\]:number/);
 assert.match(css,/smart-design2-count/);
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
 assert.match(design,/activeDesign2Area==='Calendar'/);
 assert.match(design,/activeDesign2Area==='Image'&&api==='smart_card_grid'/);
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
