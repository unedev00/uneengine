import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {confirmDestructiveAction,destructiveConfirmationMessage} from '../src/core/components/ConfirmAction/confirmDestructiveAction';

test('destructive confirmation is explicit, identifies the resource and describes its impact',()=>{
  assert.equal(destructiveConfirmationMessage('Delete','Global Value Set "Regions"','References may break.'),
    'Delete Global Value Set "Regions"?\n\nReferences may break.');
  assert.match(destructiveConfirmationMessage('Archive','Record Page "Account"'),/Archive Record Page/);
});

test('Cancel prevents destructive work; Confirm permits the caller to proceed',()=>{
  const old=(globalThis as {window?:unknown}).window;
  let calls=0;
  (globalThis as {window?:unknown}).window={confirm:(message:string)=>{
    calls+=1; assert.match(message,/Delete Test Object/); return false;
  }};
  try {
    let deleted=false;
    if(confirmDestructiveAction('Delete','Test Object')) deleted=true;
    assert.equal(deleted,false);
    (globalThis as {window?:unknown}).window={confirm:()=>true};
    if(confirmDestructiveAction('Delete','Test Object')) deleted=true;
    assert.equal(deleted,true);
    assert.equal(calls,1);
  }finally{(globalThis as {window?:unknown}).window=old;}
});

test('deletion remains denied when no browser confirmation is possible',()=>{
  const old=(globalThis as {window?:unknown}).window;
  (globalThis as {window?:unknown}).window=undefined;
  try{assert.equal(confirmDestructiveAction('Delete','Test Object'),false);}
  finally{(globalThis as {window?:unknown}).window=old;}
});

test('sensitive editor deletion controls use the shared confirmation before mutation',()=>{
  const base=new URL('../src/core/',import.meta.url);
  const files=[
    'builders/ObjectManager/GlobalValueSetManager.tsx',
    'builders/ObjectManager/GlobalQuickActionsEditor.tsx',
    'builders/ObjectManager/CustomMetadataManager.tsx',
    'builders/ObjectManager/objectManagerView.tsx',
    'builders/FlowBuilder/FlowBuilder.tsx',
    'builders/DashboardBuilder/DashboardBuilder.tsx',
    'builders/PageBuilder/pageBuilderView.tsx',
    'security/Permissions/permissionsView.tsx',
    'settings/SettingsWorkspace/settingsWorkspaceViews.tsx'
  ];
  for(const file of files){
    const source=readFileSync(new URL(file,base),'utf8');
    assert.match(source,/confirmDestructiveAction\(/,file);
  }
});
