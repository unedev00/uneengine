import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateFieldExpression} from '../src/one/shared/OneFieldExpression.js';
import {UNE_BUILDER_COMPONENTS,UNE_RIBBON_PROPERTIES,UNE_RIBBON_GROUPS,uneBuilderDefaults} from '../src/core/builders/PageBuilder/uneBuilderPropertyInventory.ts';

const src=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('new UNE ribbon is source-controlled and has permanent slots for the seven approved components',()=>{
 assert.equal(UNE_BUILDER_COMPONENTS.length,7);
 assert.equal(UNE_RIBBON_PROPERTIES.length,39);
 for(const component of UNE_BUILDER_COMPONENTS){
  assert.ok(UNE_RIBBON_PROPERTIES.some(slot=>slot.components.includes(component)),component);
  const manifest=JSON.parse(src('../src/one/'+component+'/component.json'));
  assert.deepEqual(manifest.propertyDefinitions,[],'old SQL/library properties must remain absent');
 }
 for(const slot of UNE_RIBBON_PROPERTIES){
   assert.ok(UNE_RIBBON_GROUPS[slot.tab].includes(slot.group),slot.id);
 }
 assert.equal(uneBuilderDefaults('une_image').headerBoxHeight,44);
 assert.equal(uneBuilderDefaults('une_image').badgeVisible,false);
});
test('field picker is shared by every @ text and Field Select property',()=>{
 const editor=src('../src/core/builders/PageBuilder/UneExpressionEditor.tsx');
 const ui=src('../src/core/builders/PageBuilder/UneBuilderRibbon.tsx');
 assert.match(editor,/activeReference/);
 assert.match(editor,/role="listbox"/);
 assert.match(editor,/role="option"/);
 assert.match(editor,/une-expression-reference/);
 assert.match(ui,/property.kind==='expression'/);
 assert.match(ui,/UneExpressionEditor/);
 for(const id of ['imageSource','textSource','badgeText'])assert.equal(UNE_RIBBON_PROPERTIES.find(p=>p.id===id)?.kind,'expression');
});
test('existing UNE expression evaluator supports literal strings, field concatenation and arithmetic',()=>{
 const row={FirstName:'John',Department:'Sales',Price:10,Quantity:2,ImageField:'https://example.com/image.png'};
 assert.equal(evaluateFieldExpression('Hello & @FirstName & " - " & @Department',row),'HelloJohn - Sales');
 assert.equal(evaluateFieldExpression('"Total: " & (@Price * @Quantity)',row),'Total: 20');
 assert.equal(evaluateFieldExpression('@Price + @Quantity',row),'12');
 assert.equal(evaluateFieldExpression('@Price & "+" & @Quantity',row),'10+2');
 assert.equal(evaluateFieldExpression('@ImageField',row),'https://example.com/image.png');
 assert.equal(evaluateFieldExpression('https://example.com/image.png',row),'https://example.com/image.png');
 assert.equal(evaluateFieldExpression('@__proto__',row),'');
});
test('Image and Card Grid support independent badge/text/heading/card positioning',()=>{
 const image=src('../src/one/une_image/UneImage.jsx'),grid=src('../src/one/OneItemGrid/OneItemGrid.jsx');
 for(const code of [image,grid]){
  for(const key of ['headerBoxHeight','badgeVisible','badgeAlignment','imagePlacement','imageSource','textSource','badgeText'])
   assert.ok(code.includes(key),'Missing '+key);
 }
 const builder=src('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(builder,/selectedNewUne/);
 assert.match(builder,/<UneBuilderRibbon tab=/);
 const palette=src('../src/core/builders/PageBuilder/pageBuilderPalette.ts');
 assert.match(palette,/!component\.apiName\.startsWith\('une_'\)/);
});
