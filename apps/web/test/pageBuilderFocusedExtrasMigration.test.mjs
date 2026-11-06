import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const migration=read('../../server/src/system-support/migrations/20271117-page-builder-focused-extras-padding.sql');
const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
const designCss=read('../src/core/builders/PageBuilder/SmartRibbonDesign2.css');
const dockCss=read('../src/core/builders/PageBuilder/PageBuilderDesignDock.css');
const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');

test('Focused is migration-only and uses existing Card Grid keys',()=>{
 for(const key of [
  'focusedCardWidth','focusedCardHeight','focusedCardBorderColor','focusedCardShadow',
  'focusedTextColor','focusedTextBold','focusedTextSize'
 ])assert.match(migration,new RegExp("'"+key+"'"));
 assert.match(migration,/SELECT 'Focused',8,s\.slot_key/);
 assert.match(migration,/JOIN md_builder_ribbon_component_rules c/);
 assert.match(migration,/AND c\.enabled=true/);
 assert.doesNotMatch(migration,/INSERT INTO md_builder_shared_properties/);
 assert.doesNotMatch(migration,/UPDATE md_page_components|UPDATE md_page_definitions/);
 assert.doesNotMatch(ribbon,/retiredDesign2Areas=new Set\(\['Tabs','Card Grid','Focused'/);
 assert.match(runtime,/p\.focusedCardWidth/);
 assert.match(runtime,/p\.focusedCardBorderColor/);
 assert.doesNotMatch(ribbon,/focusedPadding/);
});

test('Extras has Card Gap and Single or Multiple Selection, with no Body duplicates',()=>{
 assert.match(migration,/SELECT component_api,'Extras',slot_key,property_key/);
 assert.match(migration,/ON CONFLICT\(area,slot_key\) DO UPDATE SET/);
 for(const key of ['extra_cardGap','extra_selectionMode'])
  assert.match(migration,new RegExp("'"+key+"'"));
 assert.match(ribbon,/slot\.area==='Extras'/);
 assert.match(ribbon,/area==='Extras'&&design2SupplementalProperties/);
 assert.match(ribbon,/area!=='Extras'&&<div className="smart-ribbon-items">/);
 assert.match(runtime,/p\.selectionMode==="single"\|\|p\.selectionMode==="multiple"/);
 assert.match(runtime,/number\(p\.gap,12,0,160\)/);
});

test('Appearance and Position reuse persisted keys, compact widths and one box',()=>{
 for(const key of ['cardsPerRow','cardsPerColumn','tabCount','tabIndex','showDays','firstDay'])
  assert.ok(ribbon.includes(key),'Missing '+key);
 assert.match(ribbon,/smart-design2-count-choice/);
 assert.match(ribbon,/smart-design2-days-trigger/);
 assert.match(ribbon,/smart-design2-padding/);
 assert.match(ribbon,/properties\.cardPadding/);
 assert.match(migration,/'imageBorderColor'/);
 assert.match(migration,/SELECT component_api,'Extras',slot_key,property_key/);
 assert.match(migration,/ON CONFLICT\(area,slot_key\) DO UPDATE SET/);
 assert.doesNotMatch(ribbon,/className="smart-design2-image-border"/);
 assert.doesNotMatch(ribbon,/<Hand size=/);
 assert.match(designCss,/width:110px;min-width:110px;max-width:110px/);
 assert.match(designCss,/width:76px;min-width:76px;max-width:76px/);
 assert.match(dockCss,/margin-top:0!important/);
 assert.match(dockCss,/border-top:1px solid #cbd5e1!important/);
});

test('Card Grid row sizing reserves room for complete rounded borders',()=>{
 assert.match(runtime,/grid\.clientHeight-8/);
 assert.match(runtime,/padding:4,scrollPadding:4/);
 assert.match(runtime,/overflowY:"auto",overflowX:"auto"/);
});
