import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('all 34 UNE components declare exactly one Help text property',()=>{
 const manifest=JSON.parse(read('../src/one/manifest.json'));
 assert.equal(manifest.components.length,34);
 for(const source of manifest.components){
  const component=JSON.parse(read('../src/one/'+source));
  const matches=component.propertyDefinitions.filter(prop=>prop.propertyKey==='helpText');
  assert.equal(matches.length,1,component.apiName);
  assert.equal(matches[0].label,'Help text');
  assert.equal(matches[0].kind,'TEXT');
 }
 assert.ok(!manifest.components.includes('une_badge/component.json'));
});
test('UNE frame displays Help text as an optional native tooltip',()=>{
 assert.match(read('../src/one/une/shared/UneFrame.jsx'),/title=\{typeof p\.helpText/);
});
