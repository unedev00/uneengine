import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const names=['une_image','une_calendar','une_button','une_card','une_input','une_toggle','une_badge','une_stack','une_tabs','une_container','une_grid','une_split_pane','une_navigation','une_menu','une_modal','une_drawer','une_item_grid','une_repeater','une_record_list','une_search','une_lookup','une_choice','une_cart','une_conversation','une_form','une_table','une_line_items','une_date_picker','une_slot_picker','une_metric','une_alert','une_progress','une_document_viewer','une_chart','une_option_groups'];
test('every UNE component declares a metadata-driven help text property',()=>{
 for(const name of names){
  const data=JSON.parse(readFileSync(new URL('../src/one/'+name+'/component.json',import.meta.url),'utf8'));
  const match=data.propertyDefinitions.filter(def=>def.propertyKey==='helpText');
  assert.equal(match.length,1,name);
  assert.equal(match[0].kind,'TEXT',name);
  assert.equal(match[0].label,'Help text',name);
 }
});
test('UNE frame exposes configured help text as a tooltip',()=>{
 const frame=readFileSync(new URL('../src/one/une/shared/UneFrame.jsx',import.meta.url),'utf8');
 assert.match(frame,/title=\{typeof p\.helpText/);
});
