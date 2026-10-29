import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildBundledComponent} from '../../../scripts/component-catalog.mjs';

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

async function renderUne(apiName,props){
 const descriptor=JSON.parse(src('../src/one/'+apiName+'/component.json'));
 const built=await buildBundledComponent(descriptor);
 const sandbox={React,module:{exports:{}},Date,Intl,URL,crypto:globalThis.crypto};
 vm.runInNewContext(built.compiledJs,sandbox);
 return renderToStaticMarkup(React.createElement(sandbox.module.exports.default,props));
}
test('calendar week view renders only chosen days, respects selected first day and selected-date color',async()=>{
 const html=await renderUne('une_calendar',{
  view:'week',selectedDate:'2026-10-21',firstDay:'wed',showDays:['wed','fri'],
  defaultValueColor:'#123456',labelColor:'#abcdef',defaultValue:'today'
 });
 assert.match(html,/--une-calendar-columns:2/);
 assert.match(html,/Select 2026-10-21/);
 assert.match(html,/Select 2026-10-23/);
 assert.doesNotMatch(html,/Select 2026-10-22/);
 assert.match(html,/#123456/i);
});
test('navigation and container preserve usable rendering with new text, image, badge and direction options',async()=>{
 const nav=await renderUne('une_navigation',{
  navigationDirection:'vertical',record:{Heading:'Menu'},textSource:'@Heading',
  items:[{label:'Home',value:'home',imageSrc:'https://example.com/nav.png'}],imageFill:'fit'
 });
 assert.match(nav,/flex-direction:column/);
 assert.match(nav,/Menu/);
 assert.match(nav,/Home/);
 assert.match(nav,/object-fit:contain/);
 const container=await renderUne('une_container',{
  imageSource:'@Image',textSource:'@Heading',badgeText:'@Badge',
  badgeVisible:true,imageFill:'stretch',
  record:{Image:'https://example.com/card.png',Heading:'Store',Badge:'NEW'}
 });
 assert.match(container,/une-container-root/);
 assert.match(container,/Store/);
 assert.match(container,/NEW/);
 assert.match(container,/object-fit:fill/);
});

test('new UNE selections never mount the retired ribbon next to the 43 Excel slots',()=>{
 const page=src('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const inventory=src('../src/core/builders/PageBuilder/uneBuilderPropertyInventory.ts');
 const css=src('../src/core/builders/PageBuilder/UneBuilderRibbon.css');
 assert.match(page,/selectedNewUne && selected && \['Component Data','Component Properties','Component Layout'\]/);
 assert.match(page,/selected && !selectedNewUne && selectedCustomDefinition && \(\['Component Data','Component Content'/);
 assert.match(page,/ribbonTab==='Component Properties' && !selectedNewUne && designRibbonGroups\.map/);
 assert.match(page,/selected && !selectedNewUne && ribbonTab==='Component Layout' && layoutRibbonGroups\.map/);
 assert.match(page,/selected && !selectedNewUne && ribbonTab === 'Component Properties' && <PageBuilderAdvancedStyle/);
 assert.match(page,/selectedNewUne && selected && \['Component Content','Component Responsive','Component Action'\]/);
 assert.match(page,/className="une-v2-tab-guide"/);
 assert.match(css,/data-une-v2="true"/);
 assert.match(css,/\.une-v2-tab-guide-links button/);
 assert.match(inventory,/UNE_RIBBON_PROPERTIES/);
 for(const slot of UNE_RIBBON_PROPERTIES){
   assert.ok(UNE_RIBBON_GROUPS[slot.tab].includes(slot.group),slot.label+' misplaced');
 }
});
test('Image action tab offers a declared click event without triggering it in the designer',async()=>{
 const registration=JSON.parse(src('../src/one/une_image/component.json'));
 assert.deepEqual(registration.propertyDefinitions,[]);
 assert.deepEqual(registration.eventDefinitions,[{apiName:'click',label:'When image is clicked'}]);
 const props={src:'https://example.com/photo.png',
   actionFlows:{click:{actionType:'Flow',flowApiName:'OpenPhoto'}}};
 const preview=await renderUne('une_image',{...props,previewOnly:true,builderPreview:true});
 assert.doesNotMatch(preview,/role="button"/);
 const published=await renderUne('une_image',{...props,onAction:()=>{}});
 assert.match(published,/role="button"/);
 assert.match(published,/tabindex="0"/i);
});
