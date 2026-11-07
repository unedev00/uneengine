import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=(relative:string)=>readFileSync(new URL(relative,import.meta.url),'utf8');
test('Insert connects registered Smart components to clickable two-row tiles',()=>{
 const palette=file('../src/core/builders/PageBuilder/editor/ribbon/usePagePalette.tsx');
 const ribbon=file('../src/core/builders/PageBuilder/editor/ribbon/createPageRibbon.tsx');
 const gallery=file('../src/core/builders/PageBuilder/SmartInsertRibbon.tsx');
 const css=file('../src/core/builders/PageBuilder/SmartInsertRibbon.css');
 assert.match(palette,/RETIRED_UNE_PAGE_BUILDER_COMPONENTS/);
 assert.match(ribbon,/<SmartInsertRibbon\s+items=\{paletteComponents\}\s+onInsert=\{addPaletteComponent\}/);
 assert.match(gallery,/items\.filter\(isSmartInsertItem\)/);
 assert.match(gallery,/key=\{item\.type\}[\s\S]*?onClick=\{\(\)=>onInsert\(item\.type\)\}/);
 assert.match(css,/grid-template-rows:repeat\(2,55px\)/);
 assert.match(css,/flex-direction:column!important/);
});
