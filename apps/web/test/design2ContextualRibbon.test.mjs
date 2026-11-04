import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const sql=read('../../server/src/system-support/migrations/20270309-design2-contextual-ribbon.sql');
const approved=read('../../server/src/system-support/migrations/20271104-zz-design2-exact-approved-matrix.sql');
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

test('original Design is not changed or replaced',()=>{
 assert.match(inventory,/Design2/);
 assert.match(builder,/'Component Properties': 'Design'/);
 assert.match(builder,/'Component Design 2': 'Design 2'/);
 assert.match(builder,/\['Add Block','Component Data','Component Properties',\s*'Component Design 2'/);
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
 assert.match(shared,/gridTemplateColumns:design2GridColumns\(\)/);
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

test('Design 2 selector and eye occupy row 0 alone',()=>{
 assert.match(shared,/className="smart-design2-context" data-design-row=\{0\}/);
 assert.match(shared,/className="smart-icon-toggle smart-design2-visibility"/);
 assert.match(shared,/\[1,2,3\]\.map\(row/);
 assert.match(css,/flex-flow:column nowrap!important/);
 assert.match(css,/height:116px!important/);
 assert.match(css,/\[aria-label="Component Design 2"\]/);
 assert.match(css,/--page-ribbon-content-height:146px/);
});

test('the six fixed C1-C6 tracks are shared across all property rows',()=>{
 assert.match(shared,/const design2GridColumns=\(\)=>/);
 assert.match(shared,/Array\.from\(\{length:6\}/);
 assert.match(shared,/Math\.max\(column===2\|\|column===3\|\|column===4\?80:40/);
 assert.match(shared,/\.filter\(rule=>rule\.componentApi===api\)/);
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
 assert.match(shared,/gridTemplateColumns:design2GridColumns\(\)/);
});


test('approved R3C2 alignment and R2/R3C6 image controls use icon dropdowns',()=>{
 assert.equal(fixed('Body','alignment').row,3);
 assert.equal(fixed('Body','alignment').order,2);
 assert.equal(fixed('Body','alignment').width,40);
 assert.equal(fixed('Image','placement').row,2);
 assert.equal(fixed('Image','placement').order,6);
 assert.equal(fixed('Image','placement').width,40);
 assert.equal(fixed('Image','imageFill').row,3);
 assert.equal(fixed('Image','imageFill').order,6);
 assert.equal(fixed('Image','imageFill').width,40);
 assert.match(shared,/kind==='align'&&compactDesign&&property\.designDisplay==='dropdown'/);
 assert.match(shared,/\['imageFill','imagePlacement','badgeAlignment'\]\.includes\(property\.id\)/);
 assert.match(shared,/editor=<SmartIconDropdown kind=\{property\.id as/);
 assert.match(iconDropdown,/type IconKind='align'\|'shadow'\|'imageFill'\|'imagePlacement'\|'badgeAlignment'/);
 for(const value of ["'fill'","'fit'","'stretch'","'top'","'left'","'right'","'bottom'"])
  assert.ok(iconDropdown.includes('value:'+value),value+' missing from actual icon menu');
 assert.match(iconDropdown,/aria-haspopup="menu"/);
 assert.match(iconDropdown,/role="menuitemradio"/);
 assert.match(iconDropdown,/onChange\(option\.value\)/);
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
