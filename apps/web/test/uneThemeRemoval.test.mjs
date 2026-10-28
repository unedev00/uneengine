import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');
const listed=["alert","badge","button","calendar","card","item_grid","cart","chart","choice","container","conversation","date_picker","document_viewer","drawer","form","grid","input","line_items","lookup","menu","metric","modal","navigation","option_groups","progress","record_list","repeater","search","slot_picker","split_pane","stack","table","tabs","text","toggle"];
test('Theme is absent from each requested UNE component manifest',()=>{
 for(const name of listed){
  const definition=JSON.parse(read('../src/one/une_'+name+'/component.json'));
  assert.ok(!definition.propertyDefinitions.some(p=>p.propertyKey==='theme'),name);
 }
});
test('Theme is absent from common property registration and Page Builder appearance controls',()=>{
 const manifest=JSON.parse(read('../src/one/manifest.json'));
 assert.ok(!manifest.commonProperties.some(p=>p.propertyKey==='theme'));
 for(const file of ['PageBuilderAdvancedStyle.tsx','UniversalRibbonInventory.tsx']){
  const source=read('../src/core/builders/PageBuilder/'+file);
  assert.doesNotMatch(source,/\['theme','surface'/);
 }
});
