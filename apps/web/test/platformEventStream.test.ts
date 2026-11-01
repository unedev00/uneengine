import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PlatformEventFrameParser} from '../src/core/automation/platformEventStream.js';

test('incremental stream parser handles split frames and heartbeats',()=>{
 const found:string[]=[];
 const parser=new PlatformEventFrameParser(item=>found.push(item.replayId));
 parser.append(': connected\n\n');
 parser.append('id: 4\nevent: Change\ndata: {"replayId":"4","eventId":"id","payload":{"Name":"A"}}\n');
 assert.deepEqual(found,[]);
 parser.append('\n');
 assert.deepEqual(found,['4']);
});
test('stream parser rejects invalid and oversized frames',()=>{
 assert.throws(()=>new PlatformEventFrameParser(()=>{}).append('data: nope\n\n'),/Invalid/);
 assert.throws(()=>new PlatformEventFrameParser(()=>{}).append('x'.repeat(131073)),/exceeds limit/);
});
