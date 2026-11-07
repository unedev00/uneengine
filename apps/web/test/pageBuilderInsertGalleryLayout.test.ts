import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
test('Insert uses the current Smart component gallery, not retired browser markup',()=>{
 const base=new URL('../src/core/builders/PageBuilder/',import.meta.url);
 const ribbon=readFileSync(new URL('SmartInsertRibbon.tsx',base),'utf8');
 const styles=readFileSync(new URL('SmartInsertRibbon.css',base),'utf8');
 const page=readFileSync(new URL('editor/ribbon/createPageRibbon.tsx',base),'utf8');
 assert.match(ribbon,/items\.filter\(isSmartInsertItem\)/);
 assert.match(ribbon,/className="smart-insert-tiles"/);
 assert.match(ribbon,/onClick=\{\(\)=>onInsert\(item\.type\)\}/);
 assert.match(styles,/grid-template-rows:repeat\(2,55px\)/);
 assert.match(page,/<SmartInsertRibbon/);
 assert.doesNotMatch(page,/office-ribbon-add-library/);
 assert.equal(existsSync(new URL('PageBuilderRibbonGallery.css',base)),false);
});
