import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateFieldExpression} from '../src/one/shared/OneFieldExpression.js';
import {loadComponentCatalog} from '../../../scripts/component-catalog.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('Smart Formula uses Excel semantics for maths, literals, fields and &',()=>{
 const row={Price:12,Qty:3,FirstName:'Ada',LastName:'Lovelace'};
 assert.equal(evaluateFieldExpression('@Price * @Qty',row),'36');
 assert.equal(evaluateFieldExpression('@Price + @Qty',row),'15');
 assert.equal(evaluateFieldExpression('@Price - @Qty',row),'9');
 assert.equal(evaluateFieldExpression('@Price / @Qty',row),'4');
 assert.equal(evaluateFieldExpression('@FirstName & " " & @LastName',row),'Ada Lovelace');
 for(const operator of ['+','-','*','/','&'])
   assert.equal(evaluateFieldExpression('"'+operator+'"',row),operator);
});
test('Smart component catalog is independent, ten components and SQL-owned',async()=>{
 const source=JSON.parse(read('../src/one/manifest.json'));
 const names=source.components.map(p=>p.split('/')[0]).filter(name=>name.startsWith('smart_'));
 assert.deepEqual(names.sort(),['smart_button','smart_toggle','smart_lookup','smart_tabs',
  'smart_text','smart_card_grid','smart_image','smart_calendar','smart_navigation',
  'smart_container'].sort());
 const catalog=await loadComponentCatalog();
 for(const name of names){
  const c=catalog.components.find(c=>c.apiName===name);
  assert.ok(c);
  assert.deepEqual(c.propertyDefinitions,[]);
 }
});
test('Smart registry remains enabled through Core bundled-component cleanup',()=>{
 const content=read('../../server/src/app-seeders/bundled-components.ts');
 assert.match(content,/SMART_COMPONENTS/);
 assert.match(content,/\.\.\.UNE_COMPONENTS,\.\.\.SMART_COMPONENTS/);
});
test('Smart SQL library matches approved table and retains Home',()=>{
 const migration=read('../../server/src/system-support/migrations/20270124-smart-component-library.sql');
 const rows=migration.split('\n').filter(s=>/^\('(?:backgroundColor|borderColor|shadow|label|labelAlignment|labelColor|defaultValueColor|radius|textSize|placeholderSize|width|height|x|y|defaultValue|tabHeight|tabWidth|tabCount|selectedTabColor|tabColor|cardsPerRow|cardsPerColumn|imageHeight|headerBoxHeight|wrapText|imagePlacement|imageBorderColor|headerBorderColor|headerAlignment|headerBold|objectApiName|imageSource|textSource|badgeText|badgeAlignment|badgeTextSize|badgeBold|badgeTextColor|badgeVisible|showDays|firstDay|navigationDirection|imageFill)'/.test(s));
 assert.equal(rows.length,43);
 assert.match(migration,/'headerBold','Bold','Design','Header'/);
 assert.match(migration,/component_api='smart_image' AND property_key IN \('cardsPerRow','cardsPerColumn'\)/);
 assert.match(migration,/component_api='smart_lookup' AND property_key='label'/);
 assert.doesNotMatch(migration,/DELETE\s+FROM\s+md_page_(?:definitions|components)/i);
 assert.doesNotMatch(migration,/DELETE\s+FROM\s+md_builder_shared_properties\s+WHERE\s+tab='Home'/i);
 const ui=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(ui,/ribbonTab === 'Home' && ribbonCatalog/);
 assert.match(ui,/<SmartRibbon/);
});
