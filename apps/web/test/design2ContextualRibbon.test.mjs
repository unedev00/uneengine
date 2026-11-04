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
 assert.match(shared,/data-design-column=\{slotPlacement\?\.order\}/);
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
