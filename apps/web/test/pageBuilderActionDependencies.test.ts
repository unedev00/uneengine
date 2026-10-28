import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPageDependencies} from '../src/core/pages/PageRuntime/pageDependencies';
import type {LightningPageMetadata} from '../src/core/metadata/Definitions/metadata';

const scope={apps:[],pages:[],objects:[],reports:[],dashboards:[],flows:[],libraryComponents:[]};
function dependencies(actionFlows:Record<string,unknown>){
  const page={
    id:'test',apiName:'ActionTest',label:'Action test',pageType:'App Page',
    targetObject:'',activationAssignments:[],
    components:[{id:'action-component',type:'Text',label:'Action component',visible:true,
      properties:{actionFlows}}]
  } as unknown as LightningPageMetadata;
  return inspectPageDependencies(page,scope);
}

test('PageState and SetFilter do not create nonexistent Flow dependencies',()=>{
  const result=dependencies({
    change:{actionType:'PageState',stateKey:'selection'},
    filter:{actionType:'SetFilter',filterKey:'status'}
  });
  assert.equal(result.filter(item=>item.kind==='Flow').length,0);
});

test('Flow actions still report missing Flow dependencies',()=>{
  const result=dependencies({click:{actionType:'Flow',flowApiName:'MissingFlow'}});
  assert.deepEqual(result.filter(item=>item.kind==='Flow').map(item=>[item.name,item.status]),
    [['MissingFlow','Missing']]);
});

test('legacy Flow bindings without actionType retain dependency inspection',()=>{
  const result=dependencies({click:{flowApiName:'LegacyFlow'}});
  assert.deepEqual(result.filter(item=>item.kind==='Flow').map(item=>item.name),['LegacyFlow']);
});
