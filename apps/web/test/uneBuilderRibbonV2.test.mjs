import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateFieldExpression} from '../src/one/shared/OneFieldExpression.js';
import {UNE_BUILDER_COMPONENTS,UNE_RIBBON_PROPERTIES,UNE_RIBBON_GROUPS,uneBuilderDefaults} from '../src/core/builders/PageBuilder/uneBuilderPropertyInventory.ts';

const src=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('new UNE ribbon is source-controlled and has permanent slots for all ten approved components',()=>{
 assert.equal(UNE_BUILDER_COMPONENTS.length,10);
 assert.equal(UNE_RIBBON_PROPERTIES.length,43);
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
 assert.match(ui,/kind==='expression'/);
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

test('updated matrix adds Calendar, Navigation Bar and Container to identical fixed ribbon slots',()=>{
 const names=['une_calendar','une_navigation','une_container'];
 for(const name of names)assert.ok(UNE_BUILDER_COMPONENTS.includes(name),name+' missing');
 const lookup=id=>UNE_RIBBON_PROPERTIES.find(p=>p.id===id);
 assert.deepEqual(lookup('showDays').components,['une_calendar']);
 assert.deepEqual(lookup('firstDay').components,['une_calendar']);
 assert.deepEqual(lookup('navigationDirection').components,['une_navigation']);
 assert.deepEqual(lookup('imageFill').components,['une_item_grid','une_image','une_navigation']);
 assert.deepEqual([lookup('showDays').tab,lookup('showDays').group],['Layout','Calendar']);
 assert.deepEqual([lookup('navigationDirection').tab,lookup('navigationDirection').group],['Layout','Navigation']);
 assert.deepEqual([lookup('imageFill').tab,lookup('imageFill').group],['Design','Image']);
 assert.deepEqual(lookup('imageFill').choices,['fill','fit','stretch']);
 assert.deepEqual(uneBuilderDefaults('une_calendar').showDays,['sun','mon','tue','wed','thu','fri','sat']);
 assert.equal(uneBuilderDefaults('une_calendar').firstDay,'mon');
 assert.equal(uneBuilderDefaults('une_calendar').defaultValue,'today');
 assert.equal(uneBuilderDefaults('une_navigation').navigationDirection,'horizontal');
 assert.equal(uneBuilderDefaults('une_image').imageFill,'fill');
 for(const id of ['objectApiName','imageSource','textSource','badgeText','badgeVisible','badgeAlignment'])
  assert.ok(lookup(id).components.includes('une_container'),id+' missing in Container');
 assert.ok(lookup('textSource').components.includes('une_navigation'));
 assert.equal(lookup('shadow').kindOverrides?.une_calendar,'color');
 assert.equal(lookup('label').kindOverrides?.une_calendar,'color');
 assert.equal(lookup('labelAlignment').kindOverrides?.une_calendar,'color');
});
test('new Calendar Layout controls and navigation, container and image renderers are wired',()=>{
 const ribbon=src('../src/core/builders/PageBuilder/UneBuilderRibbon.tsx');
 assert.match(ribbon,/WeekdaysPicker/);
 assert.match(ribbon,/role="dialog"/);
 assert.match(ribbon,/kindOverrides/);
 const calendar=src('../src/one/une/shared/UneSchedule.jsx');
 for(const term of ['showDays','firstDay','defaultValue','defaultValueColor','dayEnabled','activeDayCount'])
  assert.ok(calendar.includes(term),'Calendar missing '+term);
 const layout=src('../src/one/une/shared/UneLayout.jsx');
 for(const term of ['navigationDirection','imageFill','badgeText','badgeVisible','textSource','imageSource','textFrom'])
  assert.ok(layout.includes(term),'Container/Navigation missing '+term);
 const grid=src('../src/one/OneItemGrid/OneItemGrid.jsx');
 const image=src('../src/one/une_image/UneImage.jsx');
 for(const code of [grid,image])assert.ok(code.includes("imageFill"),'image fit mode missing');
 for(const name of UNE_BUILDER_COMPONENTS){
  const registration=JSON.parse(src('../src/one/'+name+'/component.json'));
  assert.deepEqual(registration.propertyDefinitions,[],'SQL metadata leaked into '+name);
 }
 const builder=src('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(builder,/component.apiName==='une_navigation'\?'Navigation Bar'/);
 assert.match(builder,/data-une-v2/);
});
