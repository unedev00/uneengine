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

test('empty Actions tab shows the complete, disabled, stable five-group design surface',()=>{
  const html=render({});
  for(const section of ['Event','Component Custom','All actions','Selected action','Configuration'])
    assert.ok(html.includes('aria-label="'+section+'"'),'missing design section '+section);
  for(const slot of ['On Click','On Change','On Session Start','Qty Icon','Custom Button 1','Custom Button 2'])
    assert.match(html,new RegExp('aria-label="'+slot+' action"[^>]*disabled'));
  assert.match(html,/aria-label="Selected action trigger"[^>]*disabled/);
  assert.match(html,/aria-label="Flow for selected action"[^>]*disabled/);
  assert.match(html,/aria-label="Editable quantity action formulas"/);
  assert.match(html,/data-inactive="true"/);
});

test('Actions formula is a nonfunctional, readonly preview regardless of selection',()=>{
  for(const html of [render({}),render({qtyIcon:{actionType:'AdjustNumber',fieldApiName:'Quantity'}},'qtyIcon','smart_cart')]){
    assert.match(html,/aria-label="Actions formula bar preview"/);
    assert.match(html,/aria-label="Actions formula preview"[^>]*(?:readOnly|readonly)/);
    assert.match(html,/<button[^>]*disabled[^>]*aria-label="Formula options \(coming soon\)"/);
    assert.doesNotMatch(html,/oninput=|onchange=/i);
  }
  const source=read('../src/core/builders/PageBuilder/PageBuilderActionRibbon.tsx');
  const start=source.indexOf('aria-label="Actions formula bar preview"');
  const end=source.indexOf('className="office-ribbon-compact-strip page-unified-actions-ribbon"',start);
  assert.ok(start>=0&&end>start,'visual placeholder must remain separate from real numeric action formulas');
  assert.doesNotMatch(source.slice(start,end),/onChange=|onClick=|patch\(/);
});

test('selected action and number configuration mount without hiding longer options',()=>{
  const html=render({qtyIcon:{actionType:'AdjustNumber',fieldApiName:'Quantity',minValue:0,deleteOnZero:true}},'qtyIcon','smart_cart');
  assert.match(html,/aria-label="Number field to adjust"/);
  assert.match(html,/aria-label="Minimum number after adjustment"/);
  assert.match(html,/aria-label="Delete row when number reaches zero"/);
  assert.match(html,/aria-label="Optional unit price field"/);
  assert.match(html,/aria-label="Optional line total field"/);
  assert.doesNotMatch(html,/aria-label="Number field to adjust"[^>]*disabled/);
  const css=read('../src/core/builders/PageBuilder/PageBuilderEightTabRibbon.css');
  assert.match(css,/page-unified-actions-ribbon>\.page-action-target\{/);
  assert.match(css,/grid-auto-flow:column!important/);
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
