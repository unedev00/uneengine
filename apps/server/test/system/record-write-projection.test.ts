import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('baseline: POST and PUT Record API return Id-only projections',async()=>{
 const server=await readFile(new URL('../../src/system-support/server.ts',import.meta.url),'utf8');
 assert.match(server,/res\.status\(201\)\.json\(\{id,record:\{Id:id\}\}\)/);
 assert.match(server,/res\.json\(\{record:\{Id:req\.params\.id\}\}\)/);
 // Formula aliases needing fields therefore make one additional guarded GET.
 console.info('Record write baseline: POST=1 HTTP request + alias field GET=1; PUT likewise');
});
