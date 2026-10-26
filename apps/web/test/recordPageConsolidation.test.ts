import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {legacyLayoutToRecordComponents,recordPagePresentationLayout} from '../src/core/records/RecordWorkspace/recordPageLayoutMigration';
import type {LightningPageMetadata,PageLayoutMetadata} from '../src/core/metadata/Definitions/metadata';
import {settingFromRoute,settingToRoute,objectSettings} from '../src/core/workspace/Navigation/appRouting';

const legacy:PageLayoutMetadata={
  id:'sales',label:'Sales',sections:[{id:'base',label:'Details',columns:2,fieldApiNames:['Name','Status']}],
  relatedLists:['Contacts'],relatedListSettings:{Contacts:{columns:['Name'],pageSize:25}},
  actions:['Edit','CustomFlow'],customLinks:[{id:'link',label:'Website',url:'https://example.com',openInNewWindow:true}]
};
const page=(components:LightningPageMetadata['components']):LightningPageMetadata=>({
  apiName:'Account_Record_View',label:'Account Record View',targetObject:'Account',pageType:'Record Page',
  recordMode:'View',layoutMode:'template',canvasWidth:1440,canvasHeight:900,
  status:'Active',devices:['Desktop','Phone'],components
});
test('one Object Manager entrypoint redirects legacy layout bookmarks without removing compatibility data',()=>{
  assert.equal(objectSettings.includes('Page Layouts'),false);
  assert.equal(settingFromRoute('PageLayouts'),'Lightning Record Pages');
  assert.equal(settingFromRoute('Page Layouts'),'Lightning Record Pages');
  assert.equal(settingToRoute('Page Layouts'),'LightningRecordPages');
  assert.equal(objectSettings.includes('Lightning Record Pages'),true);
});
test('imports field sections, related lists, buttons and links into independent drafts',()=>{
  const desktop=legacyLayoutToRecordComponents(legacy,[{
    id:'retained',type:'Tabs',label:'Tabs',properties:{tabs:['Overview']},visible:true
  },{id:'starter',type:'Record Detail',label:'Record Detail',properties:{},visible:true}],'Desktop');
  const mobile=legacyLayoutToRecordComponents(legacy,[],'Mobile');
  assert.equal(desktop.some(c=>c.type==='Record Detail'),false);
  assert.deepEqual(desktop.find(c=>c.type==='Field Section')?.properties.fieldApiNames,['Name','Status']);
  assert.deepEqual(desktop.find(c=>c.type==='Related List')?.properties.relatedLists,['Contacts']);
  assert.deepEqual(desktop.find(c=>c.type==='Record Actions')?.properties.actions,['Edit','CustomFlow']);
  assert.equal(desktop[0].id,'retained');
  assert.notEqual(desktop.find(c=>c.type==='Field Section')?.id,mobile.find(c=>c.type==='Field Section')?.id);
  const migrated=recordPagePresentationLayout(page(desktop),legacy);
  assert.deepEqual(migrated?.actions,['Edit','CustomFlow']);
  assert.equal(migrated?.customLinks?.[0]?.url,'https://example.com');
  assert.deepEqual(migrated?.relatedListSettings?.Contacts?.columns,['Name']);
  assert.deepEqual(legacy.sections[0].fieldApiNames,['Name','Status'],'Legacy metadata must be preserved');
});
test('a draft or page without action controls preserves legacy fallback and permissions',()=>{
  assert.equal(recordPagePresentationLayout({...page([]),status:'Draft'},legacy),legacy);
  assert.equal(recordPagePresentationLayout(page([]),legacy),legacy);
  assert.deepEqual(recordPagePresentationLayout(page([{
    id:'actions',type:'Record Actions',label:'Record Actions',visible:true,properties:{actions:[]}
  }]),legacy)?.actions,[]);
});
test('consolidation never drops old SQL assignments or discards authored Record Page versions',()=>{
  const migration=readFileSync(new URL('../../server/src/system-support/migrations/20270104-unified-record-page-layouts.sql',import.meta.url),'utf8');
  assert.match(migration,/md_page_layout_audit/);
  assert.match(migration,/md_object_page_layout_assignments/);
  assert.match(migration,/md_page_layout_version_nodes/);
  assert.match(migration,/md_page_layout_heads/);
  assert.doesNotMatch(migration,/DROP TABLE|TRUNCATE|DELETE FROM md_object_page_layout/i);
});
