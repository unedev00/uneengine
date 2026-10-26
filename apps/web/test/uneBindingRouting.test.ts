import test from 'node:test';
import assert from 'node:assert/strict';
import {needsMetadataComponentRuntime,bindPageStateProperties,safePageStateRecordCollection,resolvePageStatePath}
 from '../src/core/pages/PageRuntime/pageComponentBindings';
test('a Flow/Page State collection works without forcing every UNE widget to query an Object',()=>{
 assert.equal(needsMetadataComponentRuntime({stateBindings:{items:'slots'}}),true);
 assert.equal(needsMetadataComponentRuntime({objectApiName:'Appointment'}),true);
 assert.equal(needsMetadataComponentRuntime({actionFlows:{click:{actionType:'Flow'}}}),true);
 assert.equal(needsMetadataComponentRuntime({text:'Static'}),false);
 const props={items:[],title:'Fallback',objectApiName:'Appointment',stateBindings:{
  items:'slots',title:'heading',objectApiName:'untrusted'
 }};
 const rendered=bindPageStateProperties(props,{slots:[{Id:'slot1',Label:'10:00'}],
  heading:'Available appointments',untrusted:'OtherObject'});
 assert.deepEqual(rendered.items,[{Id:'slot1',Label:'10:00'}]);
 assert.equal(rendered.title,'Available appointments');
 assert.equal(rendered.objectApiName,'Appointment');
});
test('record arrays are only accepted for declared list-shaped properties',()=>{
 const props={label:'Keep label',items:[],stateBindings:{items:'rows',label:'rows'}};
 const rows=Array.from({length:201},(_,i)=>({Id:i}));
 assert.equal(safePageStateRecordCollection(rows),undefined);
 const bad=bindPageStateProperties(props,{rows});
 assert.deepEqual(bad.items,[]);
 assert.equal(bad.label,'Keep label');
 const good=bindPageStateProperties(props,{rows:[{Id:1}]});
 assert.deepEqual(good.items,[{Id:1}]);
 assert.equal(good.label,'Keep label');
});

test('Page Builder Flow actions safely bind nested fields from selected page state records',()=>{
 const state={selectedContact:{value:'id-1',record:{Name:'Alice',Phone:'447700900123'}}};
 assert.equal(resolvePageStatePath(state,'selectedContact.record.Phone'),'447700900123');
 assert.equal(resolvePageStatePath(state,'selectedContact.value'),'id-1');
 assert.equal(resolvePageStatePath(state,'selectedContact.record.constructor'),undefined);
 assert.equal(resolvePageStatePath(state,'selectedContact.__proto__'),undefined);
 assert.equal(resolvePageStatePath(state,'selectedContact.missing'),undefined);
});
