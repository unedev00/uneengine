import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');
const sql=read('../../server/src/system-support/migrations/20270215-smart-ribbon-data-design-geometry.sql');
const ui=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
const css=read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css');
const action=read('../src/core/builders/PageBuilder/PageBuilderActionRibbon.tsx');

function geometry(block,key,group,row,col,width){
 const pattern=new RegExp("\\('"+key+"','"+group+"',"+row+","+col+","+width+"(?:,|\\))");
 assert.match(block,pattern,'wrong placement for '+key);
}

test('Data uses 225px formula controls, 150px object selectors and leaves Visibility intact',()=>{
 const data=sql.split('-- Exact Design tab')[0];
 for(const [key,row,col] of [
  ['label',1,1],['imageSource',1,2],['defaultValue',2,1],
  ['textSource',2,2],['badgeText',3,1],['defaultCheck',3,2]])
   geometry(data,key,'Values',row,col,225);
 for(const [key,row] of [['objectApiName',1],['objectApiName2',2],['objectApiName3',3]])
  geometry(data,key,'Source',row,1,150);
 for(const [key,row,col] of [
  ['column2Source',1,1],['column3Source',1,2],['subtotalValue',1,3],
  ['column4Source',2,1],['column5Source',2,2],['totalValue',2,3],
  ['taxValue',3,2],['discountValue',3,3]])
  geometry(data,key,'Cart',row,col,225);
 assert.doesNotMatch(sql,/\('columnVisibility',/);
 assert.match(css,/\[data-property="columnVisibility"\]\{\s*margin-right:80px!important/);
 assert.match(sql,/'imageSource','Values',1,2,225,'Image'/);
 assert.match(sql,/'textSource','Values',2,2,225,'Text'/);
 assert.match(ui,/displayProperties=visible\.filter\(p=>p\.id!=='autoRecordScope'/);
 assert.match(ui,/tab==='Data'&&p\.id==='contextApiName'/);
 assert.match(css,/\[data-property="defaultCheck"\]>.smart-label/);
});

test('all 45 Design slots retain exact widths, 26px heights and positions',()=>{
 const design=sql.split('-- Exact Design tab')[1].split('-- Badge Alignment')[0];
 const slots=[
  ['badgeAlignment','Badge',1,1,125],['badgeTextSize','Badge',2,1,58],
  ['badgeBold','Badge',2,2,28],['badgeBodyColor','Badge',3,1,40],
  ['badgeTextColor','Badge',3,2,40],['badgeVisible','Badge',3,3,28],
  ['backgroundColor','Body',1,1,40],['borderColor','Body',1,2,40],
  ['labelColor','Body',2,1,40],['radius','Body',2,2,58],
  ['shadow','Body',3,1,105],
  ['wrapText','Header',1,1,28],['headerBorderColor','Header',1,2,40],
  ['headerTextColor','Header',2,1,40],['headerBold','Header',2,2,28],
  ['headerAlignment','Header',3,1,35],
  ['supportingBorderColor','Header Supporting',1,1,40],
  ['supportingTextColor','Header Supporting',1,2,40],
  ['supportingBold','Header Supporting',2,1,28],
  ['supportingAlignment','Header Supporting',2,2,35],
  ['rowBorderColor','Row',1,1,40],['rowLabelColor','Row',1,2,40],
  ['rowRadius','Row',2,1,58],['rowHeight','Row',3,1,58],
  ['summaryBackgroundColor','Summary',1,1,40],
  ['summaryBorderColor','Summary',1,2,40],['summaryRadius','Summary',1,3,58],
  ['summaryTextColor','Summary',2,1,40],['summaryHeight','Summary',2,2,58],
  ['summaryWidth','Summary',2,3,58],['summaryTextSize','Summary',3,1,58],
  ['summaryTextWeight','Summary',3,2,28],['summaryShadow','Summary',3,3,105],
  ['summary2TextSize','Summary 2',1,1,58],
  ['summary2TextWeight','Summary 2',1,2,28],
  ['summary2TextColor','Summary 2',2,1,40],
  ['tableBackgroundColor','Table',1,1,40],
  ['tableBorderColor','Table',1,2,40],
  ['tableRadius','Table',2,1,58],['tableShadow','Table',3,1,35],
  ['selectedTabColor','Tabs',1,1,40],['tabColor','Tabs',2,1,40],
  ['labelAlignment','Typography',1,1,35],
  ['defaultValueColor','Typography',2,1,40],
  ['textSize','Typography',3,1,58]
 ];
 assert.equal(slots.length,45);
 for(const [key,group,row,col,width] of slots)
  geometry(design,key,group,row,col,width);
 assert.match(sql,/design_height=26/);
 assert.match(sql,/SET design_display='buttons'/);
 assert.match(sql,/SET design_display='dropdown'/);
 assert.match(ui,/className="smart-inline-caption-select"/);
 assert.match(css,/width:125px!important/);
});

test('spacing and Actions helper removal preserve real configuration',()=>{
 assert.match(css,/--page-ribbon-min-control-gap:2px/);
 assert.match(css,/smart-ribbon-row\{column-gap:4px!important/);
 assert.doesNotMatch(action,/Choose a trigger from the Actions dropdown/);
 for(const text of ['page-action-property-group','page-action-library','page-action-selected',
  'page-action-target','Flow for selected action','Custom Button 2'])
  assert.ok(action.includes(text),'missing Action control: '+text);
});

test('shared Actions tab exposes actual editable + and minus formula bars',()=>{
 const action=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderActionRibbon.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderEightTabRibbon.css',import.meta.url),'utf8');
 const engine=readFileSync(new URL('../src/core/pages/PageRuntime/adjustNumberRecord.ts',import.meta.url),'utf8');
 assert.match(action,/Editable quantity action formulas/);
 assert.match(action,/label="Increase quantity formula"/);
 assert.match(action,/label="Decrease quantity formula"/);
 assert.match(action,/onChange=\{value=>patch\(\{incrementFormula:value\}\)\}/);
 assert.match(action,/onChange=\{value=>patch\(\{decrementFormula:value\}\)\}/);
 assert.match(css,/page-action-formula-rows/);
 assert.match(engine,/evaluateFieldExpressionDetailed/);
 assert.match(engine,/config\.incrementFormula/);
 assert.match(engine,/config\.decrementFormula/);
});
