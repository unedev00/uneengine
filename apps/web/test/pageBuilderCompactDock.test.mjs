import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const dock=source('../src/core/builders/PageBuilder/PageBuilderDesignDock.css');
const ribbon=source('../src/core/builders/PageBuilder/SmartRibbon.tsx');
const insert=source('../src/core/builders/PageBuilder/SmartInsertRibbon.css');
const layout=source('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css');
const topbar=source('../src/core/builders/PageBuilder/PageBuilderTopbarFormula.css');

test('the same Page Builder dock is 30% narrower across every tab',()=>{
  assert.match(dock,/\.page-builder-design-dock\{\s*box-sizing:border-box;flex:0 0 308px;width:308px/);
  assert.match(dock,/--page-builder-dock-content-width:284px/);
  assert.match(dock,/\.office-ribbon-tabs>button\[role=tab\]\{\s*padding:7px 5px!important/);
  assert.match(insert,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
  assert.match(layout,/flex:0 0 108px!important;width:108px!important/);
  assert.match(topbar,/width:284px!important;min-width:0!important;max-width:284px!important/);
  assert.match(dock,/\.advanced-fixed-field:has\(input\[type="checkbox"\]\)/);
});

test('every Design section shares the same fixed icon order and numeric dimensions',()=>{
  const positions={
    '1:fill':1,'1:border':2,'1:shape':3,'1:shapeFill':4,
    '1:orientation':5,'1:radius':6,
    '2:height':1,'2:width':2,'2:shadow':3,'2:placement':4,
    '3:text':1,'3:alignment':2,'3:bold':3,'3:wrap':4,
    '3:imageFill':5,'3:size':6
  };
  for(const [slot,column] of Object.entries(positions)){
    assert.ok(ribbon.includes("'"+slot+"':"+column),
      slot+' must stay at its agreed fixed column');
  }
  assert.match(ribbon,/design2DockNumericSlots=new Set\(\['radius','height','width','size'\]\)/);
  assert.match(ribbon,/width:design2DockNumericSlots\.has\(slot\.slotKey\)\?60:slot\.width/);
  assert.match(ribbon,/\.filter\(slot=>slot\.slotKey!=='focused'\)/);
  assert.match(ribbon,/return Array\.from\(\{length:row===2\?4:6\}/);
  assert.match(dock,/grid-template-columns:40px 40px 40px 40px 40px 60px!important/);
  assert.match(dock,/grid-template-columns:60px 60px 40px 40px!important/);
  assert.ok(5*40+60+5*4<=284,'Appearance and Typography fit 284px');
  assert.ok(2*60+2*40+3*4<=284,'Position fits 284px');
});

test('Count and Padding exist in permanent Extras cells with existing change handlers',()=>{
  const extras=ribbon.slice(ribbon.indexOf("area==='Extras'&&<>"));
  assert.ok(extras.startsWith("area==='Extras'&&<>"),'Extras section must exist');
  assert.match(extras,/className="smart-design2-extras-fixed"/);
  assert.equal((extras.match(/className="smart-design2-extras-cell"/g)||[]).length,2);
  assert.match(extras,/className="smart-design2-count"/);
  assert.match(extras,/className="smart-design2-padding"/);
  assert.match(extras,/const enabled=supported&&!sourceBound/);
  assert.match(extras,/const enabled=api==='smart_card_grid'&&/);
  assert.match(extras,/onValueChange=\{next=>/);
  assert.match(extras,/onChange\(\{\.\.\.properties,cardPadding:next\}\)/);
  assert.match(extras,/design2SupplementalProperties.length>0&&/);
  assert.doesNotMatch(ribbon,/row===1&&\(\(\)=>\{/);
  assert.doesNotMatch(ribbon,/row===2&&\(\(\)=>\{/);
});
