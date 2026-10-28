import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');
test('one numeric width standard applies to every ribbon tab without changing text selectors',()=>{
 const css=file('../src/core/builders/PageBuilder/PageBuilderNumericControls.css');
 const page=file('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const inventory=file('../src/core/builders/PageBuilder/UniversalRibbonInventory.tsx');
 assert.match(css,/--une-ribbon-numeric-width:80px/);
 assert.match(css,/--une-ribbon-numeric-height:27px/);
 assert.match(css,/input\[type="number"\]/);
 assert.match(css,/\.office-ribbon-direct-number select/);
 assert.match(css,/\.office-ribbon-compact-size select/);
 assert.match(css,/\.une-universal-property\[data-kind="NUMBER"\]/);
 assert.match(css,/\.une-universal-property\[data-kind="CURRENCY"\]/);
 assert.match(inventory,/data-kind=\{definition.kind\}/);
 assert.ok(page.indexOf("import './PageBuilderNumericControls.css';")>page.indexOf("import './UniversalRibbonInventory.css';"));
 assert.doesNotMatch(css,/select:not\(/);
});
