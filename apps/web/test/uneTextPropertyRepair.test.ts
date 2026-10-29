import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');

test('UNE Text paints a dedicated metadata-controlled surface while retaining shared text runtime',()=>{
 const jsx=load('../src/one/une_text/UneText.jsx');
 const css=load('../src/one/une_text/UneText.css');
 assert.match(jsx,/une-text-surface/);
 assert.match(jsx,/OneComponent/);
 for(const variable of ['--une-fg','--une-bg','--une-border','--une-elevation','--one-radius','--one-pad','--une-blur','--one-gap','--une-accent'])
   assert.ok(css.includes(variable),variable);
 assert.match(css,/data-une-density="compact"/);
 assert.match(css,/data-une-density="spacious"/);
 assert.match(css,/data-une-surface="glass"/);
 assert.match(css,/data-une-surface="plain"/);
 const text=load('../src/one/OneText/OneText.jsx');
 assert.match(text,/multilineGap/);
 assert.match(text,/lines\.map/);
});

test('UNE Text removes colour palette metadata and displays surface under Surface section',()=>{
 const manifest=JSON.parse(load('../src/one/une_text/component.json'));
 assert.ok(!manifest.propertyDefinitions.some((p:{propertyKey:string})=>p.propertyKey==='tone'));
 const inv=load('../src/core/builders/PageBuilder/UniversalRibbonInventory.tsx');
 assert.match(inv,/key==='surface'.*'Component Properties','Surface'/);
 assert.match(inv,/definition\?\.apiName==='une_text'&&def\.propertyKey==='tone'/);
 assert.match(inv,/key==='width'\?'Width':'Height'/);
 assert.match(inv,/numberDraft/);
 assert.match(inv,/onBlur=\{\(\)=>setNumberDraft\(null\)\}/);
});
