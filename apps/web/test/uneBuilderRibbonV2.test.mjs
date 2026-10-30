import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildBundledComponent} from '../../../scripts/component-catalog.mjs';

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateFieldExpression} from '../src/component-libraries/shared/OneFieldExpression.js';


const src=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const sql=readFileSync(new URL('../../server/src/system-support/migrations/20270122-global-shared-builder-ribbon.sql',import.meta.url),'utf8');
const components=['une_button','une_toggle','une_lookup','une_tabs','une_input','une_item_grid','une_image','une_calendar','une_navigation','une_container'];
const slots=[...sql.matchAll(/^\\s*\\('([a-z][A-Za-z0-9_]*)','([^']+)','(Home|Data|Design|Layout)','([^']+)','([^']+)',(\\d+),/gm)]
 .map(m=>({id:m[1],label:m[2],tab:m[3],group:m[4],kind:m[5],order:Number(m[6])}));
const rules=[...sql.matchAll(/^\\s*\\('(une_[a-z_]+)','([A-Za-z0-9_]+)',true,/gm)]
 .map(m=>({component:m[1],id:m[2]}));
const slot=id=>slots.find(p=>p.id===id);
const supported=(id,component)=>rules.some(r=>r.id===id&&r.component===component);
test('one SQL global inventory: 58 unique slots, ten components, default-disabled applicability',()=>{
 assert.equal(slots.length,58);
 assert.equal(new Set(slots.map(s=>s.id)).size,58,'No duplicate property definitions');
 assert.equal(slots.filter(s=>s.tab!=='Home').length,43);
 assert.equal(slots.filter(s=>s.tab==='Home').length,15);
 assert.equal(components.length,10);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS md_builder_shared_properties/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS md_builder_ribbon_component_rules/);
 assert.match(sql,/enabled boolean NOT NULL DEFAULT false/);
 for(const name of components){
  assert.match(sql,new RegExp("'"+name+"'"));
  const manifest=JSON.parse(src('../src/component-libraries/'+name+'/component.json'));
  assert.deepEqual(manifest.propertyDefinitions,[],'App renderer must not duplicate SQL property definitions');
 }
 for(const rule of rules){assert.ok(components.includes(rule.component),rule.component);assert.ok(slot(rule.id),rule.id)}
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
 for(const id of ['imageSource','textSource','badgeText']){assert.equal(slot(id)?.kind,'expression');assert.match(sql,new RegExp("WHERE property_key='"+id+"'"))}
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
test('Image renders ONE Card and Card Grid renders the same shared Card repeatedly',()=>{
 const image=src('../src/component-libraries/une_image/UneImage.jsx');
 const grid=src('../src/component-libraries/OneItemGrid/OneItemGrid.jsx');
 const card=src('../src/component-libraries/shared/OneCardCore.jsx');
 assert.match(image,/import OneCardCore/);
 assert.match(grid,/import OneCardCore/);
 assert.match(image,/<OneCardCore /);
 assert.match(grid,/<OneCardCore/);
 for(const key of ['headerBoxHeight','badgeVisible','badgeAlignment','imagePlacement','imageFill','imageBorderColor','headerBorderColor'])
   assert.ok(card.includes(key),'Shared Card missing '+key);
 assert.match(card,/Header \/ text/);
 assert.match(card,/Image area/);
 const builder=src('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(builder,/selectedNewUne/);
 assert.match(builder,/<UneBuilderRibbon tab=/);
 const palette=src('../src/core/builders/PageBuilder/pageBuilderPalette.ts');
 assert.match(palette,/!component\\.apiName\\.startsWith\\('une_'\\)/);
});
test('Excel property locations and component rules are globally shared',()=>{
 assert.deepEqual([slot('labelAlignment').tab,slot('labelAlignment').group],['Design','Typography']);
 assert.deepEqual([slot('imageSource').tab,slot('imageSource').group],['Data','Source']);
 assert.deepEqual([slot('showDays').tab,slot('showDays').group],['Layout','Calendar']);
 assert.deepEqual([slot('firstDay').tab,slot('firstDay').group],['Layout','Calendar']);
 assert.deepEqual([slot('navigationDirection').tab,slot('navigationDirection').group],['Layout','Navigation']);
 assert.deepEqual([slot('imageFill').tab,slot('imageFill').group],['Design','Image']);
 assert.equal(supported('labelAlignment','une_button'),true);
 assert.equal(supported('labelAlignment','une_image'),false);
 assert.equal(supported('labelAlignment','une_calendar'),true);
 assert.equal(supported('imageSource','une_image'),true);
 assert.equal(supported('imageSource','une_button'),false);
 assert.equal(supported('showDays','une_calendar'),true);
 assert.equal(supported('showDays','une_navigation'),false);
 assert.match(sql,/calendarMonthTitleColor/);
 assert.match(sql,/calendarHeaderColor/);
 assert.match(sql,/calendarShadowColor/);
});
test('new Calendar Layout controls and navigation, container and image renderers are wired',()=>{
 const ribbon=src('../src/core/builders/PageBuilder/UneBuilderRibbon.tsx');
 assert.match(ribbon,/WeekdaysPicker/);
 assert.match(ribbon,/role="dialog"/);
 assert.match(ribbon,/kindOverrides/);
 const calendar=src('../src/component-libraries/une/shared/UneSchedule.jsx');
 for(const term of ['showDays','firstDay','defaultValue','defaultValueColor','dayEnabled','activeDayCount'])
  assert.ok(calendar.includes(term),'Calendar missing '+term);
 const layout=src('../src/component-libraries/une/shared/UneLayout.jsx');
 for(const term of ['navigationDirection','imageFill','badgeText','badgeVisible','textSource','imageSource','textFrom'])
  assert.ok(layout.includes(term),'Container/Navigation missing '+term);
 const grid=src('../src/component-libraries/OneItemGrid/OneItemGrid.jsx');
 const image=src('../src/component-libraries/une_image/UneImage.jsx');
 assert.ok(src('../src/component-libraries/shared/OneCardCore.jsx').includes("imageFill"),'shared Card image fit missing');
 for(const name of components){
  const registration=JSON.parse(src('../src/component-libraries/'+name+'/component.json'));
  assert.deepEqual(registration.propertyDefinitions,[],'SQL metadata leaked into '+name);
 }
 const builder=src('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(builder,/component.apiName==='une_navigation'\?'Navigation Bar'/);
 assert.match(builder,/data-une-v2/);
});

async function renderUne(apiName,props){
 const descriptor=JSON.parse(src('../src/component-libraries/'+apiName+'/component.json'));
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

test('Page Builder renders only the SQL-backed ribbon, without invented Content shortcuts',()=>{
 const page=src('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const ribbon=src('../src/core/builders/PageBuilder/UneBuilderRibbon.tsx');
 const inventory=src('../src/core/builders/PageBuilder/uneBuilderPropertyInventory.ts');
 assert.match(page,/request<SharedRibbonCatalog>\\('\/metadata\/builder-ribbon'\\)/);
 assert.match(page,/<UneBuilderRibbon tab=/);
 assert.match(page,/!selectedNewUne && selectedCustomDefinition/);
 assert.doesNotMatch(page,/className="une-v2-tab-guide"/);
 assert.doesNotMatch(inventory,/export const UNE_RIBBON_PROPERTIES/);
 assert.match(ribbon,/sharedPropertyGroups\\(definitions,tab\\)/);
 assert.match(ribbon,/definitions\\.filter\\(prop=>prop.tab===tab/);
});
test('Image action tab offers a declared click event without triggering it in the designer',async()=>{
 const registration=JSON.parse(src('../src/component-libraries/une_image/component.json'));
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
