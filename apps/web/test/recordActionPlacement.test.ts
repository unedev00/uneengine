import test from 'node:test';
import assert from 'node:assert/strict';
import {actionVisibleInArea} from '../src/core/records/RecordWorkspace/recordActionPlacement';

test('legacy Object actions retain header and selected highlights, not publisher',()=>{
 for(const area of ['Header','Highlights'] as const)
  assert.equal(actionVisibleInArea({},area),true);
 assert.equal(actionVisibleInArea({},'Publisher'),false);
});
test('each publisher/header/highlight placement isolates its area; Everywhere is explicit',()=>{
 for(const area of ['Header','Highlights','Publisher'] as const){
  for(const configured of ['Header','Highlights','Publisher'] as const)
   assert.equal(actionVisibleInArea({placement:configured},area),area===configured);
  assert.equal(actionVisibleInArea({placement:'Everywhere'},area),true);
 }
});
