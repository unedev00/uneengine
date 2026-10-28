import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');
const components=[
 ['une_conversation',{channelAccountObjectApiName:'Source Object — Account',contactsObjectApiName:'Source Object — Contact',contactSourceObjectApi:'Source Object — Contact (Flow)',conversationsObjectApiName:'Source Object — Conversation',messagesObjectApiName:'Source Object — Message'}],
 ['une_repeater',{sourceObjectApiName:'Source Object — Flow Records'}],
 ['une_cart',{stateObjectApiName:'Source Object — State'}]
];
test('UNE component labels identify source objects without changing property API keys',()=>{
 for(const [name,mapping] of components){
  const manifest=JSON.parse(file('../src/one/'+name+'/component.json'));
  for(const [key,label] of Object.entries(mapping)){
   const definition=manifest.propertyDefinitions.find(item=>item.propertyKey===key);
   assert.equal(definition?.label,label,name+'.'+key);
  }
 }
});
test('List View editor uses Source Object in both edit surfaces',()=>{
 const view=file('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(view,/<label className="form-label">Source Object\s*<select className="form-control" aria-label="List View Object"/);
 assert.match(view,/<div className="properties-section-title">List records<\/div>\s*<label className="form-label">Source Object/);
});
test('SQL metadata label migration is tenant scoped, exact and preserves property names',()=>{
 const migration=file('../../server/src/system-support/migrations/20261028-source-object-property-labels.sql');
 assert.match(migration,/p\.tenant_id=h\.tenant_id/);
 assert.match(migration,/p\.value_text=labels\.old_label/);
 assert.match(migration,/p\.property_path LIKE '\/propertyDefinitions\/%\/label'/);
});
