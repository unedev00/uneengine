import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../src/core/builders/PageBuilder/'+path,import.meta.url),'utf8');
const sql=readFileSync(new URL('../../server/src/system-support/migrations/20270211-eight-tab-ribbon-geometry.sql',import.meta.url),'utf8');

// The checked shared SQL geometry is the input for every selected Smart component.
// A group uses its widest of three rows, not the sum of the rows.
function ribbonWidth(section){
  const rows=[...section.matchAll(/\('([^']+)','([^']+)',(\d+),(\d+),(\d+)(?:,(?:NULL|'[^']*'),(\d+))?\)/g)]
    .map(match=>({key:match[1],group:match[2],row:Number(match[3]),width:Number(match[5])}));
  const groups=[...new Set(rows.map(row=>row.group))];
  return {groups,rows,total:groups.reduce((sum,group)=>{
    const widest=Math.max(...[1,2,3].map(row=>{
      const cells=rows.filter(cell=>cell.group===group&&cell.row===row);
      // Conservatively retain SQL's original uncompressed widths.
      return cells.reduce((width,cell)=>width+cell.width,0)+Math.max(0,cells.length-1)*2;
    }));
    return sum+Math.ceil(Math.max(widest+15,group.length*5.5+16));
  },0)};
}

test('Design groups fit a 1760px desktop without losing the third row',()=>{
  const design=sql.split('-- Ten fixed Design groups.')[1].split('-- Retain the existing Position dropdown')[0];
  const layout=ribbonWidth(design);
  assert.equal(layout.groups.length,10);
  assert.ok(layout.total<1650,'Design toolbar is wider than the target desktop: '+layout.total);
  const ui=source('SmartRibbon.tsx');
  const css=source('SmartRibbonApprovedThreeRow.css');
  assert.match(ui,/const sectionRow=\(group:string,row:number\)/);
  assert.match(ui,/sectionRow\(section,row\)\.map\(controls\)/);
  assert.match(ui,/Math\.max\(0,properties\.length-1\)\*2/);
  assert.match(ui,/Math\.max\(54,Math\.min\(width,58\)\)/);
  assert.match(css,/padding:6px 7px 1px!important/);
  assert.match(css,/gap:2px!important;padding:0!important;margin:0!important;white-space:nowrap/);
  assert.match(css,/height:86px!important;min-height:86px!important;max-height:86px!important/);
});

test('Layout groups plus Page and Canvas fit desktop and keep narrow-screen navigation',()=>{
  const layoutRows=sql.split('-- Layout: Size & Position')[1];
  const layout=ribbonWidth(layoutRows);
  assert.equal(layout.groups.length,7);
  assert.ok(layout.total+260+114<1650,'Layout toolbar is wider than the target desktop');
  const css=source('SmartRibbonApprovedThreeRow.css');
  const eight=source('PageBuilderEightTabRibbon.css');
  assert.match(css,/flex:0 0 260px!important/);
  assert.match(css,/flex:0 0 114px!important/);
  assert.match(css,/flex:0 0 115px!important/);
  assert.match(css,/padding:6px 8px 17px!important/);
  assert.match(eight,/overflow-x:auto!important/);
  assert.match(eight,/direction:ltr!important/);
});

test('edited Design and Layout placements are applied through SQL without recolouring',()=>{
  const placement=readFileSync(new URL('../../server/src/system-support/migrations/20270213-compact-page-builder-ribbon-placements.sql',import.meta.url),'utf8');
  const required=[
    ['Design','labelAlignment','Typography',1],['Design','defaultValueColor','Typography',2],
    ['Design','textSize','Typography',3],['Design','selectedTabColor','Tabs',1],
    ['Design','tabColor','Tabs',2],['Design','tableRadius','Table',2],
    ['Design','tableShadow','Table',3],['Design','rowRadius','Row',2],
    ['Design','rowHeight','Row',3],['Layout','tabWidth','Tabs',1],
    ['Layout','tabCount','Tabs',2],['Layout','tabHeight','Tabs',3],
    ['Layout','showDays','Calendar',1],['Layout','firstDay','Calendar',2]
  ];
  for(const [tab,key,group,row] of required)
    assert.ok(placement.includes("('"+tab+"','"+key+"','"+group+"',"+row+","),
      'Missing placement '+tab+' / '+key);
  assert.match(placement,/SET design_row=placement\.row_no,design_order=placement\.order_no/);
  assert.doesNotMatch(placement,/\b(?:background_color|text_color|default_value|UPDATE md_page_components)\b/i);
  const view=source('pageBuilderView.tsx');
  const pageGroup=view.slice(view.indexOf("group==='Page'?<>"),view.indexOf("</>:group==='Canvas'?"));
  assert.ok(pageGroup.indexOf('data-ribbon-property="deviceLayout"') <
    pageGroup.indexOf('data-ribbon-property="selectVersion"'));
  assert.ok(pageGroup.indexOf('data-ribbon-property="selectVersion"') <
    pageGroup.indexOf('data-ribbon-property="restoreVersion"'));
  const css=source('SmartRibbonApprovedThreeRow.css');
  assert.match(css,/\.une-ribbon-restore-only>button/);
});
