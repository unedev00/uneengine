import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../src/one/',import.meta.url));
test('every installed UNE component declares Help text metadata',()=>{
 let count=0;
 for(const name of readdirSync(root).filter(s=>s.startsWith('une_'))){
  const filename=path.join(root,name,'component.json');
  if(!existsSync(filename))continue;
  count++;
  const defs=JSON.parse(readFileSync(filename,'utf8')).propertyDefinitions??[];
  const matches=defs.filter(d=>d.propertyKey==='helpText');
  assert.equal(matches.length,1,name);
  assert.equal(matches[0].label,'Help text',name);
  assert.equal(matches[0].kind,'TEXT',name);
 }
 assert.ok(count>=20);
});
test('UNE frame exposes Help text as tooltip',()=>{
 const frame=readFileSync(new URL('../src/one/une/shared/UneFrame.jsx',import.meta.url),'utf8');
 assert.match(frame,/title=\{typeof p\.helpText/);
});
