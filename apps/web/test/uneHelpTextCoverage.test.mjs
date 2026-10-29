import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../src/one/',import.meta.url));
test('every installed UNE component keeps help text in app code, not SQL registration',async()=>{
 let count=0;
 for(const name of readdirSync(root).filter(s=>s.startsWith('une_'))){
  const filename=path.join(root,name,'component.json');
  if(!existsSync(filename))continue;
  count++;
  assert.deepEqual(JSON.parse(readFileSync(filename,'utf8')).propertyDefinitions,[]);
  const defs=(await import(pathToFileURL(path.join(root,name,'app-properties.mjs')).href)).propertyDefinitions;
  const help=defs.filter(d=>d.propertyKey==='helpText');
  assert.equal(help.length,1,name);
  assert.equal(help[0].label,'Help text',name);
  assert.equal(help[0].kind,'TEXT',name);
 }
 assert.ok(count>=20);
});
test('UNE wrapper provides metadata-driven help text tooltip',()=>{
 const frame=readFileSync(new URL('../src/one/une/shared/UneFrame.jsx',import.meta.url),'utf8');
 assert.match(frame,/title=\{typeof p\.helpText/);
});
