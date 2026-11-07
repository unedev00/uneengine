import assert from 'node:assert/strict';
import {test} from 'node:test';
import {resolveFlowLoopResources} from '../../src/flow-engine/FlowLoopResourceContract.js';

test('undeclared Loop item is inferred from the declared collection',()=>{
 const inferred=resolveFlowLoopResources(
  [{type:'Loop',config:{collection:'lines',loopVariable:'item'}}],
  [{name:'lines',type:'Record Collection',dataType:'CartLine'}]);
 assert.deepEqual(inferred,[{name:'item',type:'Record',dataType:'CartLine'}]);
});
test('Loop item cannot hijack a differently typed, cross-object, or collection resource',()=>{
 const loop=[{type:'Loop',config:{collection:'lines',loopVariable:'item'}}];
 const source={name:'lines',type:'Record Collection',dataType:'CartLine'};
 for(const collision of [
  {name:'item',type:'Variable',dataType:'Text'},
  {name:'item',type:'Record',dataType:'Product'},
  {name:'item',type:'Record Collection',dataType:'CartLine'}
 ]){
  assert.throws(()=>resolveFlowLoopResources(loop,[source,collision]),
   /Loop variable conflicts with a declared Flow resource/);
 }
 assert.throws(()=>resolveFlowLoopResources(loop,[]),/Loop source has no valid/);
 assert.throws(()=>resolveFlowLoopResources(
  [{type:'Loop',config:{collection:'lines',loopVariable:'$System'}}],[source]),
  /Invalid Loop variable/);
});
