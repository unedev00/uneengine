import { readPageBuilderModules } from './helpers/builderSources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import PageBuilderActionRibbon from '../src/core/builders/PageBuilder/PageBuilderActionRibbon';

const read=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');
const render=(actions:Record<string,unknown>,event='',api='smart_cart')=>
 renderToStaticMarkup(React.createElement(PageBuilderActionRibbon,{
  api,actions,selectedEvent:event,eventDefinitions:[],flows:[],
  onSelectEvent:()=>{},onChange:()=>{},
  dataFields:[{apiName:'Quantity',label:'Quantity',dataType:'Number'}]
 }));

test('Event is exactly three rows and Component Custom exactly two rows',()=>{
 for(const html of [
  render({}),render({click:{actionType:'Flow',flowApiName:'Some_Flow'}},'click'),
  render({qtyIncrease:{actionType:'Formula',formula:'@Quantity + 2'}},'qtyIncrease')
 ]){
  assert.match(html,/aria-label="Event"/);
  assert.match(html,/aria-label="Component Custom"/);
  assert.equal((html.match(/class="page-action-compact-event-rows"/g)||[]).length,1);
  assert.equal((html.match(/class="page-action-compact-custom-grid"/g)||[]).length,1);
  for(const name of ['On Click','On Change','On Session Start',
    '+ Icon','− Icon','Custom Button 1','Custom Button 2']){
   assert.ok(html.includes('aria-label="'+name+' action"'),name);
  }
  // Flow input/output declarations belong in Flow Builder, not the Page Builder ribbon.
  for(const section of ['Flow inputs','Flow outputs'])
   assert.ok(!html.includes('aria-label="'+section+'"'));
  for(const old of ['Custom action trigger','All component actions','Show action details',
   'Number field to adjust','Minimum number after adjustment','Shared filter key',
   'Optional unit price field','Optional Page State collection to refresh'])
   assert.ok(!html.includes('aria-label="'+old+'"'),old+' should not occupy the ribbon');
 }
});

test('Cart Actions expose independent eye controls without editing Flow or Formula mappings',()=>{
 const html=render({customButton1:{actionType:'Flow',flowApiName:'Stored'},
   customButton2:{actionType:'Formula',formula:'@Quantity + 1'}},'customButton1');
 for(const slot of ['+ Icon','− Icon','Custom Button 1','Custom Button 2']){
   assert.ok(html.includes('aria-label="Hide '+slot+'"'),slot);
 }
 assert.ok(!render({},'','smart_button').includes('aria-label="Hide Custom Button 1"'));
 assert.ok(!render({},'','smart_button').includes('aria-label="Hide + Icon"'));
 const action=read('../src/core/builders/PageBuilder/PageBuilderActionRibbon.tsx');
 assert.match(action,/buttonVisibility\?\.\[slot\.key as CartButtonKey\]===false/);
 assert.match(action,/onButtonVisibilityChange\?\.\(slot\.key as CartButtonKey/);
 const page=readPageBuilderModules();
 assert.match(page,/applyCartButtonVisibility/);
 assert.match(page,/item\.properties,\[property\]:visible/);
});

test('Formula bar remains mounted and editable for Flow and Formula actions',()=>{
 const blank=render({});
 const flow=render({click:{actionType:'Flow',flowApiName:'Some_Flow'}},'click');
 const plus=render({qtyIncrease:{actionType:'Formula',formula:'@Quantity + 2'}},'qtyIncrease');
 const minus=render({qtyDecrease:{actionType:'Formula',formula:'@Quantity - 3'}},'qtyDecrease');
 for(const html of [blank,flow,plus,minus])assert.match(html,/aria-label="Actions formula bar"/);
 assert.doesNotMatch(flow,/aria-label="Selected action formula"[^>]*disabled/);
 assert.match(blank,/aria-label="Selected action formula"[^>]*disabled/);
 assert.match(plus,/@Quantity \+ 2/);
 assert.match(minus,/@Quantity - 3/);
 assert.doesNotMatch(plus,/aria-label="Selected action formula"[^>]*disabled/);
 assert.match(plus,/aria-label="Remove \+ Icon action"/);
 const source=read('../src/core/builders/PageBuilder/PageBuilderActionRibbon.tsx');
 assert.match(flow,/=FLOW\(Some_Flow\)/);
 assert.match(source,/delete next\[slot\.key\]/);
});

test('legacy action configs are preserved without hiding or reinterpreting them',()=>{
 const nav=render({click:{actionType:'Navigate',navigationTargetType:'App Page',
   navigationPageApiName:'Dashboard'}},'click');
 assert.match(nav,/Existing: Open another page/);
 assert.match(nav,/value="legacy:Navigate" selected/);
 const css=read('../src/core/builders/PageBuilder/PageBuilderActionRibbonCompact.css');
 assert.match(css,/grid-template-rows:repeat\(3,26px\)/);
 assert.match(css,/grid-template-rows:repeat\(2,26px\)/);
 assert.match(css,/gap:2px/);
 assert.match(css,/page-action-icon-remove/);
 const main=readPageBuilderModules();
 assert.doesNotMatch(main,/page-builder-inline-actions|Configure details|Collapse details/);
});

test('Actions tab retains natural horizontal scrolling at 127px',()=>{
 const view=read('../src/core/builders/PageBuilder/editor/ribbon/createPageRibbon.tsx');
 const base=read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css');
 const compact=read('../src/core/builders/PageBuilder/PageBuilderActionRibbonCompact.css');
 assert.match(view,/\{ribbonTab==='Component Action' &&\s*<PageBuilderActionRibbon/);
 assert.match(view,/disabled=\{!selected\|\|actionSelectionDisabled\}/);
 assert.match(base,/overflow-x: auto !important/);
 assert.match(compact,/--page-ribbon-scroll-strip-height:127px/);
});
