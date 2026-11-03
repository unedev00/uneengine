import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const sql=read('../../server/src/system-support/migrations/20270309-design2-contextual-ribbon.sql');
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

test('Design 2 slots are SQL backed, complete, unique and have fixed 26px controls',()=>{
 assert.equal(rows.length,96);
 assert.equal(new Set(rows.map(row=>row.area)).size,8);
 assert.equal(new Set(rows.map(row=>row.area+':'+row.slot)).size,96);
 assert.equal(new Set(rows.map(row=>row.area+':'+row.row+':'+row.order)).size,96);
 assert.equal(rows.filter(row=>row.row===2).length,56);
 assert.equal(rows.filter(row=>row.row===3).length,40);
 assert.match(sql,/ON CONFLICT\(area,slot_key\) DO NOTHING/);
 assert.doesNotMatch(rows.map(row=>row.area).join(' '),/Actions|Selected Row/i);
});

test('Focused has one reusable icon mapped to selected row or selected tab',()=>{
 assert.equal(lookup('Row','focused').key,'selectedRowColor');
 assert.equal(lookup('Tabs','focused').key,'selectedTabColor');
 for(const area of ['Body','Header','Header Supporting','Table','Summary','Summary 2'])
  assert.equal(lookup(area,'focused').key,null);
 assert.match(shared,/slot\.slotKey==='focused'\?'Focused Color'/);
 assert.match(shared,/components:slot\.propertyKey\?original\.components:\[\]/);
});

test('Body never wraps and Row background is inherited from Table',()=>{
 assert.equal(lookup('Body','wrap').key,null);
 assert.equal(lookup('Row','fill').key,null);
 assert.equal(lookup('Table','fill').key,'tableBackgroundColor');
 assert.equal(lookup('Row','text').key,'rowLabelColor');
 assert.match(cart,/backgroundColor:p\.tableBackgroundColor/);
 assert.match(table,/background:colour\(p\.tableBackgroundColor/);
});

test('original Design is not changed or replaced',()=>{
 assert.match(inventory,/Design2/);
 assert.match(builder,/'Component Properties': 'Design'/);
 assert.match(builder,/'Component Design 2': 'Design 2'/);
 assert.match(builder,/\['Add Block','Component Data','Component Properties',\s*'Component Design 2'/);
 assert.match(shared,/tab==='Design2'\?design2Properties:definitions\.filter\(p=>p\.tab===tab\)/);
 assert.match(sql,/m\.label,'Design2','Contextual'/);
 assert.doesNotMatch(sql,/SET\s+tab\s*=\s*'Design'/i);
 assert.doesNotMatch(sql,/DELETE FROM md_builder_shared_properties/i);
});

test('Design 2 uses current icon widgets, not alternate icons',()=>{
 for(const component of ['RibbonColorPalette','SmartIconDropdown','SmartIconGallery','RibbonTextSizeIcon','RibbonCornerRadiusIcon'])
  assert.ok(shared.includes(component),component);
 assert.match(shared,/smart-design2-area-picker/);
 assert.match(shared,/<span aria-hidden="true">Select it<\/span>/);
 assert.match(shared,/\['shapeId','shapeFill'\]/);
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
