import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveHighlightFields} from '../src/core/records/RecordWorkspace/highlightFieldSelection';

test('PB08 Highlights Panel retains authored order and hides denied field names',()=>{
 const readable=[{apiName:'Name'},{apiName:'Status'},{apiName:'Amount'}];
 const compact=[readable[0],readable[1]];
 assert.deepEqual(resolveHighlightFields(['Amount','Secret','Name','Amount'],compact,readable),
  [readable[2],readable[0]]);
 assert.deepEqual(resolveHighlightFields(undefined,compact,readable),compact);
 assert.deepEqual(resolveHighlightFields(['Secret'],compact,readable),[]);
});
