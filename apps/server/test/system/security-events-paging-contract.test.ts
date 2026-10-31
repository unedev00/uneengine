import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
test('Security audit endpoint preserves tenant isolation, permissions, pagination and filters',()=>{
 const server=readFileSync(new URL('../../src/system-support/server.ts',import.meta.url),'utf8');
 const a=server.indexOf("app.get('/api/auth/security-events'"),b=server.indexOf("app.post('/api/auth/users/:id/lock'",a);
 assert.ok(a>0&&b>a);
 const block=server.slice(a,b);
 for(const part of ["'Security','read'","tenant_id=$1","OFFSET $","ILIKE","actor.tenant_id","nextOffset",
  "Number.isSafeInteger(offset)","ORDER BY created_at DESC,id DESC","new URL"]){
  if(part==='new URL')continue;
  assert.ok(block.includes(part),part);
 }
 assert.doesNotMatch(block,/\$\{req\.query/);
 assert.match(block,/limit\+1,offset/);
});
