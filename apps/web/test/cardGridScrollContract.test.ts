import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
test('Smart Card Grid renders authorised rows without truncating them',()=>{
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 assert.match(runtime,/gridAutoRows:"max\("/);
 assert.match(runtime,/previewRows\.map\(\(r,i\)=>/);
 assert.match(runtime,/recordsOf\(p\)/);
});
test('Smart Card Grid preserves Page Builder move grips',()=>{
 const builder=read('../src/core/builders/PageBuilder/editor/canvas/createPageCanvasRenderer.tsx');
 assert.doesNotMatch(builder,/component\.type==='Custom:smart_card_grid'&&target\.closest/);
 assert.match(builder,/startCanvasMove\(event, component\)/);
});
