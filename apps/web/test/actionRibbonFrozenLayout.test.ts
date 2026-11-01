import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import PageBuilderActionRibbon from '../src/core/builders/PageBuilder/PageBuilderActionRibbon';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const render=(actions:Record<string,unknown>,selectedEvent='',api='')=>
  renderToStaticMarkup(React.createElement(PageBuilderActionRibbon,{
    api,actions,selectedEvent,eventDefinitions:[],flows:[],
    onSelectEvent:()=>{},onChange:()=>{},showDetails:false,onToggleDetails:()=>{},
    dataFields:[{apiName:'Quantity',label:'Quantity',dataType:'Number'}]
  }));

test('all three component selections keep exactly six fixed Actions sections and disabled placeholders',()=>{
 const scenarios=[
  render({},'','smart_text'),
  render({click:{actionType:'Flow',flowApiName:'Example'}},'click','smart_card_grid'),
  render({qtyIncrease:{actionType:'Formula',fieldApiName:'Quantity',formula:'@Quantity + 2'}},'qtyIncrease','smart_cart')
 ];
 for(const html of scenarios){
  for(const section of ['Event','Component Custom','All actions','Selected action','Configuration','Action parameters'])
   assert.ok(html.includes('aria-label="'+section+'"'),'missing '+section);
  assert.equal((html.match(/class="office-ribbon-mini-group /g)||[]).length,6);
  for(const slot of ['On Click','On Change','On Session Start','+ Icon','− Icon','Custom Button 1','Custom Button 2'])
   assert.ok(html.includes('aria-label="'+slot+' action"'),slot+' disappears');
  for(const control of ['Flow for selected action','Number field to adjust',
    'Minimum number after adjustment','Destination type for selected action',
    'Shared filter key','Page state key','Optional unit price field',
    'Optional line total field','Optional Page State collection to refresh'])
   assert.ok(html.includes('aria-label="'+control+'"'),control+' disappears');
 }
 const blank=scenarios[0];
 assert.match(blank,/aria-label="Selected action trigger"[^>]*disabled/);
 assert.match(blank,/aria-label="Flow for selected action"[^>]*disabled/);
 assert.match(blank,/aria-label="Number field to adjust"[^>]*disabled/);
 assert.match(blank,/aria-label="Selected action formula"[^>]*disabled/);
});

test('existing permanent formula bar edits only Formula actions and is disabled for Flow',()=>{
 const none=render({});
 const flow=render({click:{actionType:'Flow',flowApiName:'Example',formula:'@Quantity + 9'}},'click','smart_button');
 const plus=render({qtyIncrease:{actionType:'Formula',fieldApiName:'Quantity',formula:'@Quantity + 2'}},'qtyIncrease','smart_cart');
 const minus=render({qtyDecrease:{actionType:'Formula',fieldApiName:'Quantity',formula:'@Quantity - 3'}},'qtyDecrease','smart_cart');
 for(const html of [none,flow,plus,minus])
  assert.match(html,/aria-label="Actions formula bar"/);
 for(const html of [none,flow])
  assert.match(html,/aria-label="Selected action formula"[^>]*disabled/);
 for(const html of [plus,minus])
  assert.doesNotMatch(html,/aria-label="Selected action formula"[^>]*disabled/);
 assert.match(plus, /@Quantity \+ 2/);
 assert.match(minus, /@Quantity - 3/);
 assert.match(flow, /aria-label="Flow for selected action"/);
 const source=read('../src/core/builders/PageBuilder/PageBuilderActionRibbon.tsx');
 assert.match(source,/onChange=\{value=>patch\(\{formula:value\}\)\}/);
 assert.doesNotMatch(source,/Editable quantity action formulas|page-action-formula-group/);
});

test('numeric configuration and extended settings stay mounted for Flow and no selection',()=>{
 for(const html of [render({}),render({click:{actionType:'Flow',flowApiName:'Example'}},'click','smart_card_grid')]){
  for(const label of ['Number field to adjust','Minimum number after adjustment',
    'Delete row when number reaches zero','Optional unit price field','Optional line total field'])
   assert.ok(html.includes('aria-label="'+label+'"'));
  assert.match(html,/aria-label="Number field to adjust"[^>]*disabled/);
 }
 const html=render({qtyIncrease:{actionType:'Formula',fieldApiName:'Quantity',
  formula:'@Quantity + 2',deleteOnZero:true}},'qtyIncrease','smart_cart');
 assert.doesNotMatch(html,/aria-label="Number field to adjust"[^>]*disabled/);
 const css=read('../src/core/builders/PageBuilder/PageBuilderEightTabRibbon.css');
 assert.match(css,/grid-auto-flow:column!important/);
 assert.match(css,/page-action-parameters/);
});

test('Actions tab stays mounted without a selected canvas component and owns its scroll height',()=>{
  const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
  const geometry=read('../src/core/builders/PageBuilder/PageBuilderRibbonLayout.css');
  assert.match(view,/\{ribbonTab==='Component Action' &&\s*<PageBuilderActionRibbon/);
  assert.match(view,/disabled=\{!selected\|\|actionSelectionDisabled\}/);
  assert.match(geometry,/\[aria-label="Component Action"\]/);
  assert.match(geometry,/--page-ribbon-scroll-strip-height: 164px/);
  assert.match(geometry,/> \.page-action-ribbon-workspace/);
});
