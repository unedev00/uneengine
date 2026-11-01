import assert from 'node:assert/strict';
import {test} from 'node:test';
import {jsonSampleScalarPaths} from '../src/core/builders/FlowBuilder/jsonSampleScalarPaths.js';

test('JSON example discovery supports nested provider fields without code',()=>{
 assert.deepEqual(jsonSampleScalarPaths(JSON.stringify({
  entry:[{changes:[{value:{messages:[{from:'123',text:{body:'hello'}}]}}]}]
 })),[
  'entry[0].changes[0].value.messages[0].from',
  'entry[0].changes[0].value.messages[0].text.body'
 ]);
});
test('JSON example discovery rejects invalid, unsafe and oversized examples',()=>{
 assert.deepEqual(jsonSampleScalarPaths(''),[]);
 assert.throws(()=>jsonSampleScalarPaths('{'),/valid JSON/);
 assert.throws(()=>jsonSampleScalarPaths('x'.repeat(262145)),/too large/);
 assert.deepEqual(jsonSampleScalarPaths('{"__proto__":"x","constructor":"y","value":1}'),['value']);
 assert.ok(jsonSampleScalarPaths(JSON.stringify({rows:Array.from({length:100},(_,i)=>({index:i}))})).length<=5);
});
