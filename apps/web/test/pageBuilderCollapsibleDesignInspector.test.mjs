import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
const builder=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
const dock=read('../src/core/builders/PageBuilder/PageBuilderDesignDock.css');
const runtime=read('../src/core/pages/PageRuntime/usePageCollectionFormula.ts');

test('Design sections are generated from metadata, independently collapsible and share one open state',()=>{
 assert.match(ribbon,/design2Areas\.map\(area=><section/);
 assert.match(ribbon,/className="smart-inspector-section-toggle"/);
 assert.match(ribbon,/aria-expanded=\{expandedInspector===area\}/);
 assert.match(ribbon,/chooseInspectorSection\(area\)/);
 assert.match(ribbon,/const design2RenderedSlots:Design2Slot\[\]=design2Areas\.flatMap/);
 assert.match(ribbon,/sectionRow\(area,row\)\.map\(controls\)/);
 assert.match(ribbon,/\[1,2,3\]\.map\(row/);
 assert.doesNotMatch(ribbon,/Select Design 2 area|Select it/);
 assert.match(builder,/inspectorSection=\{inspectorSection\} onInspectorSectionChange=\{setInspectorSection\}/);
});

test('Object Source is first, defaults to Object 1 and supports adding/removing persisted slots',()=>{
 const design=builder.indexOf("const smartRibbonElement =");
 const source=builder.indexOf("dataRibbon('source')",design);
 const ribbonIndex=builder.indexOf('<SmartRibbon',design);
 assert.ok(design>=0&&source>design&&source<ribbonIndex,'Object Source must be above Design sections');
 assert.match(ribbon,/sourceCount=Math\.min\(100,Math\.max\(1/);
 assert.match(ribbon,/objectSourceCount:next/);
 assert.match(ribbon,/sourceKey=\(index:number\)=>index===1\?'objectApiName':'objectApiName'\+index/);
 assert.match(ribbon,/Remove Object /);
 assert.match(ribbon,/updateSourceCount\(sourceCount\+1\)/);
 assert.match(ribbon,/onInspectorSectionChange\?\.\('Object Source'\)/);
 assert.match(ribbon,/expandedInspector==='Object Source'/);
 assert.match(ribbon,/values\.forEach\(\(name,offset\)=>/);
});

test('Unsupported controls retain their existing slot geometry and are natively disabled',()=>{
 assert.match(ribbon,/components:assigned\?assigned\.components:\[\]/);
 assert.match(ribbon,/const supported=property\.components\.includes\(api\)/);
 assert.match(ribbon,/data-supported=\{supported\}/);
 assert.match(ribbon,/disabled=\{!enabled\}/);
 assert.match(dock,/\.smart-design2-area-section \.smart-ribbon-row\[data-design-row\]/);
 assert.match(dock,/height:26px!important/);
 assert.match(dock,/\.smart-inspector-section-content/);
 assert.doesNotMatch(dock,/\.smart-design2-area-section \.smart-property\s*\{/);
});

test('Any added Object source is available to formulas through the existing RBAC-protected runtime',()=>{
 assert.match(runtime,/Object\.keys\(properties\)\.filter\(key=>\/\^objectApiName/);
 assert.match(runtime,/selected\.includes\(name\)/);
 assert.match(runtime,/loadFlowScreenRecordPage\(name/);
 assert.match(ribbon,/selectedSourceObjects=\{sourceObjects\}/);
});

test('Object Source is always present on Design, including components without Data capability',()=>{
 assert.match(builder,/\(part==='source'\|\|selectedHasDataRibbon\)/);
 assert.match(builder,/ribbonTab==='Component Design 2'&&dataRibbon\('source'\)/);
 assert.doesNotMatch(builder,/selectedHasSourceRibbon/);
 assert.match(ribbon,/sections\.filter\(group=>group==='Source'\)/);
 assert.match(ribbon,/disabled=\{!canAddSources\|\|sourceCount>=100\}/);
 assert.match(read('../src/core/builders/PageBuilder/PageBuilderTopbarFormula.css'),/margin:0!important/);
});

test('Fit Width accounts for the actual scroll viewport padding and ignores subpixel scale jitter',()=>{
 assert.match(builder,/window\.getComputedStyle\(previewArea\)/);
 assert.match(builder,/previewArea\.clientWidth-horizontalInset-2/);
 assert.match(builder,/previewArea\.clientHeight-verticalInset-2/);
 assert.match(builder,/Math\.abs\(previous-nextScale\)<0\.0005\?previous:nextScale/);
 assert.doesNotMatch(builder,/previewArea\.clientWidth - 8/);
});

test('The Design 2 SQL migration consolidates duplicate sections without touching saved metadata',()=>{
 const sql=read('../../server/src/system-support/migrations/20271116-page-builder-inspector-consolidation.sql');
 const areas=['Body','Badge','Image','Header','Header Supporting','Table','Row',
  'Row Supporting','Summary','Summary 2','Footer','Button','Button 2','Button 3','Button 4','Button 5'];
 for(const area of areas)assert.ok(sql.includes("('"+area+"',"),area);
 for(const retired of ['Tabs','Card Grid','Focused','Custom Button 1','Custom Button 2'])
  assert.ok(sql.includes("'"+retired+"'"),retired);
 for(const key of ['selectedTabColor','tabColor','tabIndex','focusedCardShadow',
  'focusedTextColor','cardPadding','selectionMode','customButton1','customButton2',
  'removeButton','qtyIncrease','qtyDecrease'])
  assert.ok(sql.includes(key),'Missing preserved mapping: '+key);
 assert.match(sql,/ON CONFLICT\(component_api,area,slot_key\) DO UPDATE/);
 assert.doesNotMatch(sql,/UPDATE md_page_components|UPDATE md_page_definitions|DELETE FROM md_page_components/);
 assert.match(ribbon,/const design2SupplementalProperties:UneRibbonProperty\[\]/);
 assert.match(ribbon,/!slot.slotKey.startsWith\('extra_'\)/);
 assert.match(ribbon,/smart-design2-supplemental-setting/);
 assert.match(dock,/margin-top:12px!important/);
});
