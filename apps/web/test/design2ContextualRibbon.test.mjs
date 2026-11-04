import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const sql=read('../../server/src/system-support/migrations/20270309-design2-contextual-ribbon.sql');
const approved=read('../../server/src/system-support/migrations/20271104-zz-design2-exact-approved-matrix.sql');
const imageGapMigration=read('../../server/src/system-support/migrations/20271112-design2-image-placement-gap.sql');
const shared=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
const builder=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
const css=read('../src/core/builders/PageBuilder/SmartRibbonDesign2.css');
const cart=read('../src/component-libraries/smart_cart/SmartCart.jsx');
const table=read('../src/component-libraries/smart_table/SmartTable.jsx');
const inventory=read('../src/core/builders/PageBuilder/uneBuilderPropertyInventory.ts');
const iconDropdown=read('../src/core/builders/PageBuilder/SmartIconDropdown.tsx');

const slotPattern=/\('([^']+)',(\d+),'([^']+)',([23]),(\d+),(\d+),26,(NULL|'[^']+'),'([^']+)'\)/g;
const rows=[...sql.matchAll(slotPattern)].map(([,area,areaOrder,slot,row,order,width,key,fallback])=>({
 area,areaOrder:+areaOrder,slot,row:+row,order:+order,width:+width,
 key:key==='NULL'?null:key.slice(1,-1),fallback
}));
const lookup=(area,slot)=>rows.find(entry=>entry.area===area&&entry.slot===slot);
const fixedRows=[...approved.matchAll(/ \('([^']+)',(\d+),'([^']+)',([123]),(\d+),(\d+),26,'([^']+)','([^']+)'\)/g)]
 .map(([,area,areaOrder,slot,row,order,width,key,fallback])=>({
  area,areaOrder:+areaOrder,slot,row:+row,order:+order,width:+width,key,fallback
 }));
const fixed=(area,slot)=>fixedRows.find(entry=>entry.area===area&&entry.slot===slot);

test('Design 2 slots are SQL backed, complete, unique and have fixed 26px controls',()=>{
 assert.equal(rows.length,96);
 assert.equal(new Set(rows.map(row=>row.area)).size,8);
 assert.equal(new Set(rows.map(row=>row.area+':'+row.slot)).size,96);
 assert.equal(new Set(rows.map(row=>row.area+':'+row.row+':'+row.order)).size,96);
 assert.equal(rows.filter(row=>row.row===2).length,56);
 assert.equal(rows.filter(row=>row.row===3).length,40);
 assert.match(sql,/ON CONFLICT\(area,slot_key\) DO NOTHING/);
 assert.equal((sql.match(/REFERENCES md_builder_shared_properties\(property_key\) ON DELETE CASCADE/g)||[]).length,2,
  'SQL slot FKs must allow shared metadata cleanup and replay');
 assert.doesNotMatch(rows.map(row=>row.area).join(' '),/Actions|Selected Row/i);
});

test('Focused has one reusable icon mapped to selected row or selected tab',()=>{
 assert.equal(lookup('Row','focused').key,'selectedRowColor');
 assert.equal(lookup('Tabs','focused').key,'selectedTabColor');
 for(const area of ['Body','Header','Header Supporting','Table','Summary','Summary 2'])
  assert.equal(lookup(area,'focused').key,null);
 assert.match(shared,/slot\.slotKey==='focused'\?'Focused Color'/);
 assert.match(shared,/components:assigned\?assigned\.components:\[\]/);
});

test('approved Body Wrap, Row Fill and Table Focus keep their fixed slots',()=>{
 assert.equal(fixed('Body','wrap').row,3);
 assert.equal(fixed('Body','wrap').order,4);
 assert.equal(fixed('Row','fill').row,1);
 assert.equal(fixed('Row','fill').order,1);
 assert.equal(fixed('Table','focused').row,2);
 assert.equal(fixed('Table','focused').order,1);
 assert.match(cart,/backgroundColor:p\.tableBackgroundColor/);
 assert.match(table,/background:colour\(p\.tableBackgroundColor/);
});

test('Design 2 replaces the retired Design tab and is labelled Design',()=>{
 assert.match(inventory,/Design2/);
 assert.doesNotMatch(builder,/'Component Properties'/);
 assert.match(builder,/'Component Design 2': 'Design',/);
 assert.match(builder,/\['Add Block','Component Data',\s*'Component Design 2'/);
 assert.match(builder,/'Component Data':'Component Design 2'/);
 assert.match(shared,/const visible=definitions\.filter\(p=>p\.tab===tab\)/);
 assert.match(shared,/const contextualVisible=tab==='Design2'\?design2Properties:visible/);
 assert.match(sql,/m\.label,'Design2','Contextual'/);
 assert.doesNotMatch(sql,/SET\s+tab\s*=\s*'Design'/i);
 assert.doesNotMatch(sql,/DELETE FROM md_builder_shared_properties/i);
});

test('Design 2 uses current icon widgets, not alternate icons',()=>{
 for(const component of ['RibbonColorPalette','SmartIconDropdown','SmartIconGallery','RibbonTextSizeIcon','RibbonCornerRadiusIcon'])
  assert.ok(shared.includes(component),component);
 assert.match(shared,/smart-design2-area-picker/);
 assert.match(shared,/<span aria-hidden="true">Select it<\/span>/);
 assert.match(shared,/\[1,2,3\]\.map\(row/);
 assert.match(shared,/smart-design2-context/);
 assert.match(shared,/sectionRow\(activeDesign2Area,row\)\.map\(controls\)/);
 assert.match(css,/smart-design2-ribbon/);
 assert.match(css,/26px/);
});

test('all newly exposed controls have real Cart/Table renderer hooks',()=>{
 for(const prop of ['headerTextSize','supportingBackgroundColor','supportingTextSize',
                    'rowAlignment','rowTextSize','rowBold','summaryAlignment','summary2Alignment'])
  assert.ok(cart.includes('p.'+prop),prop+' missing from Cart');
 for(const prop of ['headerTextSize','rowAlignment','rowTextSize','rowBold','summaryAlignment'])
  assert.ok(table.includes('p.'+prop),prop+' missing from Table');
});

test('Design 2 edits share the normal single and multi selection update routes',()=>{
 assert.match(builder,/ribbonTab==='Component Design 2'\?'Design2':'Design'/);
 assert.match(builder,/updateSharedCanvasProperties\([\s\S]*?sharedRibbonDefinitions,tab,properties/);
 assert.match(builder,/componentVisible=\{selected\.visible!==false\}/);
 assert.match(builder,/onVisibleChange=\{visible=>/);
 assert.match(shared,/update\(key,v\)/);
});


test('Design 2 keeps every SQL R/C slot even when unsupported or metadata is absent',()=>{
 // Disabled properties are placeholders, not omitted/reordered into the next cell.
 assert.match(shared,/const assigned=propertyKey\?definitions\.find/);
 assert.match(shared,/approvedMatrixAreas\.has\(slot\.area\)/);
 assert.match(shared,/const original:UneRibbonProperty=assigned\?\?fallbackDefinition\?\?\{/);
 assert.match(shared,/components:assigned\?assigned\.components:\[\]/);
 assert.match(shared,/data-design-slot=\{slotPlacement\?\.slotKey\}/);
 assert.match(shared,/data-design-column=\{tab==='Design2'&&property\.designRow===0\?property\.designOrder:slotPlacement\?\.order\}/);
 assert.doesNotMatch(shared,/\.filter\(\(p\):p is NonNullable<typeof p>=>p!==null\)/);
});

test('Design 2 SQL widths and column positions are never dynamically compacted',()=>{
 assert.equal(fixed('Body','fill').row,1);
 assert.equal(fixed('Body','fill').order,1);
 assert.equal(fixed('Body','fill').width,40);
 assert.equal(fixed('Body','radius').row,1);
 assert.equal(fixed('Body','radius').order,5);
 assert.equal(fixed('Body','radius').width,80);
 assert.equal(fixed('Header','height').row,2);
 assert.equal(fixed('Header','height').order,3);
 assert.equal(fixed('Header','height').width,80);
 assert.match(shared,/if\(tab==='Design2'&&p\.designWidth!==undefined\)return p\.designWidth/);
 assert.match(shared,/gridTemplateColumns:design2GridColumns\(row\)/);
 assert.match(shared,/--smart-slot-column/);
 assert.match(css,/\.smart-ribbon-row:not\(\.smart-design2-top-row\)/);
 assert.match(css,/display:grid!important/);
 assert.match(css,/grid-column-start:var\(--smart-slot-column,auto\)!important/);
 assert.match(css,/width:var\(--smart-control-width\)!important/);
 assert.match(css,/height:var\(--smart-control-height,26px\)!important/);
});

test('approved table has 118 unique fixed slots in 13 areas and 313 component rules',()=>{
 assert.equal(fixedRows.length,118);
 assert.equal(new Set(fixedRows.map(s=>s.area)).size,13);
 assert.equal(new Set(fixedRows.map(s=>s.area+':'+s.row+':'+s.order)).size,118);
 const ruleRows=[...approved.matchAll(/ \('(smart_[^']+)','([^']+)','([^']+)','([^']+)'\)/g)];
 assert.equal(ruleRows.length,313);
 const ruleKeys=new Set(ruleRows.map(r=>r[1]+':'+r[2]+':'+r[3]));
 assert.equal(ruleKeys.size,313);
 assert.ok(ruleKeys.has('smart_card_grid:Body:fill'));
 assert.ok(ruleKeys.has('smart_card_grid:Header:fill'));
 assert.ok(ruleKeys.has('smart_card_grid:Badge:fill'));
 assert.ok(ruleKeys.has('smart_cart:Header:fill'));
 assert.equal(fixed('Body','orientation').row,1);
 assert.equal(fixed('Body','orientation').order,6);
 assert.equal(fixed('Image','placement').row,2);
 assert.equal(fixed('Image','placement').order,6);
 assert.equal(fixed('Image','imageFill').row,3);
 assert.equal(fixed('Image','imageFill').order,6);
 assert.match(approved,/CHECK\(row_no IN \(1,2,3\)\)/);
 assert.match(shared,/design2SlotRules\.find\(rule=>/);
 assert.match(builder,/design2SlotRules=\{ribbonCatalog\.design2SlotRules\}/);
});

test('Image Placement uses the adjacent SQL R2C5 cell after Width without growing the ribbon',()=>{
 assert.equal(fixed('Body','width').row,2);
 assert.equal(fixed('Body','width').order,4);
 assert.equal(fixed('Body','width').width,80);
 assert.equal(fixed('Image','placement').row,2);
 assert.equal(fixed('Image','placement').order,6,'baseline before the forward-only fix');
 assert.equal(fixedRows.some(slot=>slot.area==='Image'&&slot.row===2&&slot.order===5),false);
 assert.match(imageGapMigration,/UPDATE md_builder_design2_slots\s+SET order_no\s*=\s*5\s+WHERE area\s*=\s*'Image'\s+AND slot_key\s*=\s*'placement'\s+AND row_no\s*=\s*2\s+AND order_no\s*=\s*6/);
 assert.doesNotMatch(imageGapMigration,/height_px|md_builder_shared_properties|md_builder_design2_slot_rules|md_page_components/i);
});

test('Design 2 selector and eye occupy row 0 alone',()=>{
 assert.match(shared,/className="smart-design2-context" data-design-row=\{0\}/);
 assert.match(shared,/className="smart-icon-toggle smart-design2-visibility"/);
 assert.match(shared,/\[1,2,3\]\.map\(row/);
 assert.match(css,/flex-flow:column nowrap!important/);
 assert.match(css,/height:110px!important/);
 assert.match(css,/\[aria-label="Component Design 2"\]/);
 assert.match(css,/--page-ribbon-content-height:114px/);
 assert.match(css,/--page-ribbon-scroll-strip-height:127px/);
 assert.doesNotMatch(shared,/<span className="smart-ribbon-caption">\{activeDesign2Area\}<\/span>/);
});

test('the six fixed C1-C6 tracks are shared across all property rows',()=>{
 assert.match(shared,/const design2GridColumns=\(row:number\)=>/);
 assert.match(shared,/Array\.from\(\{length:6\}/);
 assert.match(shared,/slot\?\.width\?\?\(index>=2&&index<=4\?80:40\)/);
 assert.match(shared,/new Map\(design2Slots/);
 assert.doesNotMatch(shared,/\.filter\(rule=>rule\.componentApi===api\)\.map\(rule=>rule\.area\)/);
 assert.match(css,/width:380px!important/);
});

test('all 319 source properties appear, including missing Cart Button 5',()=>{
 const extension=read('../../server/src/system-support/migrations/20271104-zzz-design2-row-zero-button-matrix-corrections.sql');
 const slotRows=[...extension.matchAll(/\('Button 5',13,'([^']+)',([123]),(\d+),(\d+),26/g)];
 assert.equal(slotRows.length,6);
 assert.equal(fixedRows.length+slotRows.length,124);
 const ruleRows=[...approved.matchAll(/ \('(smart_[^']+)','([^']+)','([^']+)','([^']+)'\)/g)];
 assert.equal(ruleRows.length+slotRows.length,319);
 for(const key of ['removeButtonFill','qtyIncreaseFill','qtyDecreaseFill',
  'customButton1Fill','customButton2Fill'])
  assert.ok(extension.includes("'"+key+"'"),key);
});


test('R0 C3/C4 reuses canvas x/y for all 15 requested Smart component APIs',()=>{
 const migration=read('../../server/src/system-support/migrations/20271106-design2-row0-xy-position.sql');
 const required=['smart_button','smart_calendar','smart_card_grid','smart_cart',
  'smart_container','smart_icon','smart_image','smart_lookup','smart_navigation',
  'smart_table','smart_tabs','smart_text','smart_textbox','smart_toggle','smart_input'];
 const listed=[...migration.matchAll(/^\s*\('(smart_[a-z_]+)'\)/gm)].map(match=>match[1]);
 assert.deepEqual(listed,required,'only the 15 explicitly requested component APIs');
 assert.match(migration,/p\.property_key IN \('x','y'\)/);
 assert.match(migration,/p\.control_kind='position'/);
 assert.match(migration,/ON CONFLICT\(component_api,property_key\) DO UPDATE SET enabled=true/);
 assert.doesNotMatch(migration,/INSERT INTO md_builder_shared_properties/);
 assert.doesNotMatch(migration,/UPDATE md_builder_design2_slots/);
 assert.match(shared,/const property=definitions\.find\(entry=>entry\.id===id\)/);
 assert.match(shared,/property&&property\.components\.includes\(api\)/);
 assert.match(shared,/designRow:0,designOrder:index\+3,designWidth:80,designHeight:26/);
 assert.match(shared,/kind==='position'&&useCanvasPosition&&position&&onPositionChange/);
 assert.match(shared,/onPositionChange\(\{\.\.\.position,\[property\.id\]:v\}\)/);
 assert.match(shared,/data-design-column=\{tab==='Design2'&&property\.designRow===0/);
 assert.match(shared,/isCanvasAxis/);
 assert.match(builder,/onPositionChange=\{position=>\{/);
});

test('Design 2 R0 X/Y has exact 80x26 geometry without shifting property rows',()=>{
 assert.match(css,/smart-design2-context\[data-design-row="0"\]>.smart-property\{/);
 assert.match(css,/flex:0 0 80px!important/);
 assert.match(css,/width:80px!important/);
 assert.match(css,/height:26px!important/);
 assert.match(css,/width:472px!important/);
 assert.match(shared,/\[1,2,3\]\.map\(row/);
 assert.match(shared,/gridTemplateColumns:design2GridColumns\(row\)/);
});


test('approved R3C2 alignment and R2/R3C6 image controls use icon dropdowns',()=>{
 assert.equal(fixed('Body','alignment').row,3);
 assert.equal(fixed('Body','alignment').order,2);
 assert.equal(fixed('Image','placement').row,2);
 assert.equal(fixed('Image','placement').order,6);
 assert.equal(fixed('Image','imageFill').row,3);
 assert.equal(fixed('Image','imageFill').order,6);
 assert.match(shared,/kind==='align'&&compactDesign&&property\.designDisplay==='dropdown'/);
 assert.match(shared,/editor=<SmartIconDropdown kind="badgeAlignment"/);
 assert.match(shared,/editor=<Design2IconDropdown/);
 assert.match(shared,/\['imageFill','imagePlacement','tabOrientation','navigationDirection'\]\.includes\(property\.id\)/);
 const menu=read('../src/core/builders/PageBuilder/Design2IconDropdown.tsx');
 for(const value of ["'fill'","'fit'","'stretch'","'top'","'left'","'right'","'bottom'"])
  assert.ok(menu.includes(value),value+' missing from icon menu');
 assert.match(menu,/aria-haspopup="menu"/);
 assert.match(menu,/role="menuitemradio"/);
 assert.match(menu,/onChange\(option\.value\)/);
});
test('footer alignment menus target renderer keys rather than unused aliases',()=>{
 const migration=read('../../server/src/system-support/migrations/20271107-design2-alignment-icon-bindings.sql');
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 assert.match(migration,/\('smart_cart','Footer','alignment','summary2Alignment'\)/);
 assert.match(migration,/\('smart_table','Footer','alignment','summaryAlignment'\)/);
 assert.match(migration,/'cardButtonAlignment','Button Alignment','Design2','Button','align'/);
 assert.match(migration,/WHERE c\.component_api='smart_card_grid'/);
 assert.match(runtime,/textAlign:\["left","center","right"\]\.includes\(p\.cardButtonAlignment\)/);
 assert.match(runtime,/justifyContent:p\.cardButtonAlignment==="left"\?"flex-start"/);
});


test('original Excel keeps Image dropdown slots at R2C6 and R3C6 for the three image-capable components',()=>{
 const rules=[...approved.matchAll(/\('(smart_[a-z_]+)','Image','(placement|imageFill)','([^']+)'\)/g)];
 const required=['smart_image','smart_cart','smart_card_grid'];
 for(const api of required){
  assert.ok(rules.some(m=>m[1]===api&&m[2]==='placement'&&m[3]==='imagePlacement'),
   api+' Image > Placement rule missing');
  assert.ok(rules.some(m=>m[1]===api&&m[2]==='imageFill'&&m[3]==='imageFill'),
   api+' Image > Fill rule missing');
 }
 assert.equal(fixed('Image','placement').row,2);
 assert.equal(fixed('Image','placement').order,6);
 assert.equal(fixed('Image','placement').width,40);
 assert.equal(fixed('Image','imageFill').row,3);
 assert.equal(fixed('Image','imageFill').order,6);
 assert.equal(fixed('Image','imageFill').width,40);
 assert.ok(!rules.some(m=>m[2]==='Body'),'Image controls must stay in the Excel Image area');
});

test('image-placement and fit use reference-style icons without changing persisted enums',()=>{
 const menu=read('../src/core/builders/PageBuilder/Design2IconDropdown.tsx');
 assert.match(menu,/function PlacementGlyph\(\{value\}/);
 assert.match(menu,/function ImageFillGlyph\(\{value\}/);
 assert.match(menu,/mode==='placement'/);
 assert.match(menu,/mode==='imageFill'/);
 assert.match(menu,/allowed\?:readonly string\[\]/);
 assert.match(menu,/allowed\.includes\(option\.value\)/);
 assert.match(shared,/allowed=\{options\}/);
 assert.match(shared,/tab==='Design2'&&kind==='choice'/);
});
test('Design 2 icon palettes and choice controls preserve R0 and the approved SQL matrix',()=>{
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const palette=read('../src/core/builders/PageBuilder/RibbonColorPalette.tsx');
 const icons=read('../src/core/builders/PageBuilder/Design2IconDropdown.tsx');
 assert.match(ribbon,/Design2IconDropdown/);
 assert.match(ribbon,/iconVariant=\{tab==='Design2'/);
 assert.match(ribbon,/aria-label="Component visibility"/);
 assert.match(ribbon,/\['x','y'\] as const/);
 assert.match(ribbon,/smart-design2-workbench/);
 assert.match(palette,/iconVariant/);
 for(const value of ['horizontal','vertical','placement','imageFill','orientation'])assert.ok(icons.includes(value));
 assert.match(approved,/319 source rows/);
});


test('all 14 approved dropdown areas remain visible, regardless of component API',()=>{
 const extension=read('../../server/src/system-support/migrations/20271104-zzz-design2-row-zero-button-matrix-corrections.sql');
 assert.match(extension,/\('Button 5',13,'fill',1,1,40,26/);
 assert.match(shared,/const design2Areas=\[\.\.\.new Map\(design2Slots/);
 assert.match(shared,/\.map\(slot=>\[slot\.area,slot\.areaOrder\] as const\)/);
 assert.match(shared,/\.sort\(\(a,b\)=>a\[1\]-b\[1\]\)\.map\(\(\[area\]\)=>area\)/);
 assert.match(shared,/const approved=design2SlotRules\.find\(rule=>/);
 assert.match(shared,/components:assigned\?assigned\.components:\[\]/);
});

test('fixed SQL columns override legacy flex and grid-area:auto important rules',()=>{
 const oldLayout=read('../src/core/builders/PageBuilder/SmartRibbonApprovedThreeRow.css');
 assert.match(oldLayout,/display:flex!important;flex:0 0 26px!important/);
 assert.match(oldLayout,/grid-area:auto!important/);
 assert.match(css,/\.smart-ribbon\.smart-design2-ribbon\[data-three-row="true"\]/);
 assert.match(css,/\.smart-design2-workbench>\.smart-ribbon-items/);
 assert.match(css,/>.smart-ribbon-row\[data-design-row\]\{/);
 assert.match(css,/display:grid!important/);
 assert.match(css,/grid-area:1 \/ var\(--smart-slot-column,1\) \/ span 1 \/ span 1!important/);
 assert.match(css,/grid-column:var\(--smart-slot-column,1\) \/ span 1!important/);
 assert.match(css,/width:380px!important/);
});


test('Body R1C3 Shape to R1C4 Shape Fill has no empty 80px phantom column',()=>{
 assert.equal(fixed('Body','shape').row,1);
 assert.equal(fixed('Body','shape').order,3);
 assert.equal(fixed('Body','shape').width,40);
 assert.equal(fixed('Body','shapeFill').row,1);
 assert.equal(fixed('Body','shapeFill').order,4);
 assert.equal(fixed('Body','shapeFill').width,40);
 assert.equal(fixed('Body','bold').row,3);
 assert.equal(fixed('Body','bold').order,3);
 assert.equal(fixed('Body','bold').width,40);
 assert.equal(fixed('Body','wrap').row,3);
 assert.equal(fixed('Body','wrap').order,4);
 assert.equal(fixed('Body','wrap').width,40);
 assert.match(shared,/const design2GridColumns=\(row:number\)=>/);
 assert.match(shared,/slot\?\.width\?\?\(index>=2&&index<=4\?80:40\)/);
 assert.match(shared,/gridTemplateColumns:design2GridColumns\(row\)/);
 assert.match(shared,/'shapeFill','shape_fill'\]\.includes\(slot\.slotKey\)\?'color'/);
 assert.match(shared,/'orientation','placement','imageFill'\]\.includes\(slot\.slotKey\)\?'choice'/);
 // All dropdown sections stay visible and per-component enablement stays
 // controlled only by SQL yes/no rules. No metadata mutation.
 assert.match(shared,/const design2Areas=\[\.\.\.new Map\(design2Slots/);
 assert.match(shared,/const approved=design2SlotRules\.find\(rule=>/);
 assert.match(shared,/components:assigned\?assigned\.components:\[\]/);
});

test('Badge visibility is derived from badge text and no longer has a ribbon switch',()=>{
 const migration=read('../../server/src/system-support/migrations/20271109-badge-visibility-layout.sql');
 const catalog=read('../../server/src/system-support/migrations/20270124-smart-component-library.sql');
 assert.match(migration,/UPDATE md_builder_shared_properties/);
 assert.match(migration,/SET tab='Layout',section_group='Badge'/);
 assert.match(migration,/WHERE property_key='badgeVisible'/);
 assert.match(catalog,/\('smart_card_grid','badgeVisible',true/);
 assert.match(catalog,/\('smart_image','badgeVisible',true/);
 assert.match(shared,/const visible=definitions\.filter\(p=>p\.tab===tab\)/);
 assert.doesNotMatch(shared,/title=\{badge\?'Badge visibility'/,'Badge-area eye must not toggle badge visibility');
 assert.match(shared,/aria-label="Component visibility"/);
});

test('Design 2 R0 C7-C21 has 15 fixed 40x26 actions for every selected component',()=>{
 const actions=read('../src/core/builders/PageBuilder/Design2CanvasActions.tsx');
 const labels=[
  'Align left','Align centre','Align right','Align top','Align middle','Align bottom',
  'Distribute horizontally','Distribute vertically','Bring to front','Send backward',
  'Group','Ungroup','Lock / Unlock component','Component nesting','Fill canvas'
 ];
 for(const label of labels)assert.ok(actions.includes(label),'Missing '+label);
 assert.match(actions,/data-design-column=\{index\+7\}/);
 assert.match(actions,/data-design-row="0"/);
 assert.match(actions,/data-design-columns="7-21"/);
 assert.match(actions,/const body=props\.area==='Body'/);
 assert.match(actions,/disabled=\{!item\.enabled\}/);
 assert.match(actions,/arrange\?\.onAlign/);
 assert.match(actions,/arrange\?\.onDistribute/);
 assert.match(actions,/arrange\?\.onPlace/);
 assert.match(actions,/arrange\?\.onMove/);
 assert.match(actions,/arrange\?\.onGroup/);
 assert.match(actions,/arrange\?\.onUngroup/);
 assert.match(actions,/arrange\?\.onLock/);
 assert.match(actions,/arrange\?\.onNesting/);
 assert.match(actions,/arrange\?\.onFitToCanvas/);
 assert.match(shared,/data-design-column="5"/);
 assert.match(shared,/data-design-column="6"/);
 assert.match(shared,/<Design2CanvasActions area=\{activeDesign2Area\} arrange=\{design2Arrange\}/);
 assert.match(builder,/design2Arrange=\{canvasArrangeProps\}/);
 assert.match(builder,/!selectedNewUne && ribbonTab==='Component Design 2'/);
 assert.match(css,/grid-template-columns:repeat\(15,40px\)!important/);
 assert.match(css,/grid-template-rows:26px!important/);
 assert.match(css,/\.smart-design2-arrange-action\{/);
 assert.match(css,/width:40px!important/);
 assert.match(css,/height:26px!important/);
});

test('Design 2 R0 command actions share the exact Arrange callbacks and their disabled rules',()=>{
 const actions=read('../src/core/builders/PageBuilder/Design2CanvasActions.tsx');
 assert.match(builder,/const canvasArrangeProps:ArrangeRibbonProps=/);
 assert.match(builder,/design2Arrange=\{canvasArrangeProps\}/);
 assert.match(actions,/const movable=body&&arrange\?\.freeCanvas&&arrange\?\.hasSelection&&!arrange\?\.locked/);
 assert.match(actions,/const hasThree=body&&arrange\?\.freeCanvas&&\(arrange\?\.selectedCount\?\?0\)>=3/);
 assert.match(actions,/arrange\?\.canGroup/);
 assert.match(actions,/arrange\?\.canUngroup/);
 assert.match(actions,/arrange\?\.canBringToFront/);
 assert.match(actions,/arrange\?\.canSendBackward/);
 assert.match(builder,/onNesting:\(\)=>openAdvanced\('nesting'\)/);
 assert.match(builder,/onLock:\(\)=>/);
});


test('all Design 2 areas project the same fixed Body+Image icon scaffold',()=>{
 const body=fixedRows.filter(item=>item.area==='Body');
 const image=fixedRows.filter(item=>item.area==='Image'&&
  (item.slot==='placement'||item.slot==='imageFill'));
 assert.equal(body.length,15);
 assert.equal(image.length,2);
 const canonical=[...body,...image].sort((a,b)=>a.row-b.row||a.order-b.order);
 assert.equal(canonical.length,17);
 assert.equal(new Set(canonical.map(slot=>slot.row+':'+slot.order)).size,17);
 assert.equal(canonical.find(slot=>slot.row===1&&slot.order===3)?.slot,'shape');
 assert.equal(canonical.find(slot=>slot.row===1&&slot.order===4)?.slot,'shapeFill');
 assert.equal(canonical.find(slot=>slot.row===2&&slot.order===6)?.slot,'placement');
 assert.equal(canonical.find(slot=>slot.row===3&&slot.order===6)?.slot,'imageFill');
 assert.match(shared,/const design2TemplateSlots=\[/);
 assert.match(shared,/design2Slots\.filter\(slot=>slot\.area==='Body'\)/);
 assert.match(shared,/slot\.area==='Image'&&/);
 assert.match(shared,/const design2RenderedSlots:Design2Slot\[\]=design2TemplateSlots\.map/);
 assert.match(shared,/const actual=areaSlots\.find\(slot=>slot\.slotKey===template\.slotKey\)/);
 assert.match(shared,/propertyKey:bodyImagePlacement\?'imagePlacement':actual\?\.propertyKey\?\?null/);
 assert.match(shared,/const design2Properties=tab==='Design2'\?design2RenderedSlots/);
 assert.match(shared,/const slots=design2TemplateSlots\.filter\(slot=>slot\.row===row\)/);
 assert.match(shared,/const slotPlacement=tab==='Design2'\?design2RenderedSlots\.find/);
 assert.match(shared,/const approved=design2SlotRules\.find\(rule=>/);
 assert.match(shared,/components:assigned\?assigned\.components:\[\]/);
 assert.match(shared,/design2Areas=\[\.\.\.new Map\(design2Slots/);
});
