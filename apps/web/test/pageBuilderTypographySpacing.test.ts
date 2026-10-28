import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
test('Heading and Supporting Text use equally sized numeric dropdowns with no Lines icon',()=>{
 const component=read('../src/core/builders/PageBuilder/RibbonCapabilityControls.tsx');
 const css=read('../src/core/builders/PageBuilder/PageBuilderDesignReference.css');
 assert.match(component,/label="Lines"\/>/);
 assert.doesNotMatch(component,/label="Lines" icon=/);
 assert.match(css,/\.office-ribbon-text-top \.office-ribbon-compact-size select\{/);
 assert.match(css,/\.office-ribbon-text-middle \.office-ribbon-direct-number select\{/);
 const end=css.slice(css.lastIndexOf('Typography overlap correction:'));
 const widths=[...end.matchAll(/width:90px!important/g)].length;
 assert.ok(widths>=4,'Both numeric controls should have the same 90px width');
 assert.match(end,/grid-template-columns:94px 80px/);
 assert.match(end,/grid-template-rows:36px 36px 17px/);
});
