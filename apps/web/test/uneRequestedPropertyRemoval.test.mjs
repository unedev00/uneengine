import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadComponentCatalog} from '../../../scripts/component-catalog.mjs';
const names=["alert","card","chart","choice","container","date_picker","document_viewer","drawer","form","grid","image","line_items","menu","metric","navigation","option_groups","progress","record_list","repeater","slot_picker","split_pane","table"];
const forbidden=new Set('surface tone accentColor glassBlur density padding gap backgroundColor textColor'.split(' '));
test('selected UNE components have no retired shared appearance property contracts',async()=>{
 const catalog=(await loadComponentCatalog()).components;
 for(const name of names){
  const local=JSON.parse(readFileSync(new URL('../src/one/une_'+name+'/component.json',import.meta.url),'utf8'));
  const registered=catalog.find(c=>c.apiName==='une_'+name);
  assert.ok(registered,name);
  for(const definition of [local,registered])for(const property of definition.propertyDefinitions)
   assert.ok(!forbidden.has(property.propertyKey),name+' '+property.propertyKey);
 }
});
