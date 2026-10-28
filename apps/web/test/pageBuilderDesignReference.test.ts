import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
test('Heading and Supporting Text reuse exactly one three-row layout',()=>{
 const code=source('../src/core/builders/PageBuilder/RibbonCapabilityControls.tsx');
 const css=source('../src/core/builders/PageBuilder/PageBuilderDesignReference.css');
 assert.match(code,/\(group==='Heading'\|\|group==='Supporting text'\|\|group==='Text'\)/);
 for(const key of ['office-ribbon-text-layout','office-ribbon-text-top','office-ribbon-text-middle','office-ribbon-text-bottom'])
   assert.ok(code.includes(key),key);
 assert.match(css,/data-ribbon-group="Heading"\],\[data-ribbon-group="Supporting text"/);
 assert.match(css,/grid-template-rows:34px 27px 19px/);
});
test('Radius and Card radius do not render a leading glyph',()=>{
 const code=source('../src/core/builders/PageBuilder/RibbonCapabilityControls.tsx');
 assert.match(code,/label=\{group==='Card'\?'Card radius':'Radius'\}\/>/);
 assert.doesNotMatch(code,/label=\{group==='Card'\?'Card radius':'Radius'\} icon=/);
});
test('Font weights expose only light, mid, hard using existing metadata choices',()=>{
 const code=source('../src/core/builders/PageBuilder/RibbonCapabilityControls.tsx');
 for(const name of ['Light','Mid','Hard'])assert.ok(code.includes(`name:'${name}'`));
 assert.ok(code.includes('.flatMap(level=>level.choice'));
 assert.match(code,/\[definition\.propertyKey\]:level\.choice\.key/);
});
test('Badge, Image and Appearance grids follow approved compact placement',()=>{
 const code=source('../src/core/builders/PageBuilder/RibbonCapabilityControls.tsx');
 const css=source('../src/core/builders/PageBuilder/PageBuilderDesignReference.css');
 for(const name of ['badge-fill','badge-size','badge-text','badge-weights'])assert.ok(code.includes(name));
 assert.match(css,/grid-template-columns:repeat\(2,49px\)/);
 assert.match(css,/grid-template-columns:55px 96px/);
 assert.match(css,/data-ribbon-group="Card"/);
 assert.match(css,/\.office-ribbon-direct-number select/);
});
