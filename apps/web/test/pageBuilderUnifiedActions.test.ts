import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import PageBuilderActionRibbon from '../src/core/builders/PageBuilder/PageBuilderActionRibbon';
import {supportsSmartActionEvent} from '../src/core/builders/PageBuilder/SmartEventActionsRibbon';
import type {FlowDefinitionMetadata} from '../src/core/metadata/Definitions/metadata';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const flows=[{id:'flow-id',apiName:'Send_Message',label:'Send Message',
  status:'Active',flowType:'Autolaunched Flow'}] as FlowDefinitionMetadata[];
const events=[{apiName:'click',label:'On Click'},{apiName:'qtyIcon',label:'Qty Icon'}];
const render=(actions:Record<string,unknown>,selectedEvent:string)=>
  renderToStaticMarkup(React.createElement(PageBuilderActionRibbon,{
    actions,eventDefinitions:events,flows,selectedEvent,
    onSelectEvent:()=>{},onChange:()=>{},showDetails:false,onToggleDetails:()=>{}
  }));

test('one global action menu groups triggers, live Flows, navigation and page actions',()=>{
  const html=render({},'');
  for(const group of ['Triggers','Flows','Navigation','Page actions'])
    assert.match(html,new RegExp('label="'+group+'"'));
  assert.match(html,/aria-label="All component actions"/);
  assert.match(html,/On Click/);
  assert.match(html,/Send Message/);
  assert.match(html,/Open another page/);
  assert.match(html,/Filter a list/);
  assert.match(html,/Update page value/);
  assert.match(html,/Choose a trigger first/);
});
test('saved metadata-ID Flow is displayed correctly on the Actions ribbon',()=>{
  const html=render({click:{actionType:'Flow',flowApiName:'metadata:flow-id'}},'click');
  assert.match(html,/aria-label="Flow for selected action"/);
  assert.match(html,/<option value="Send_Message" selected="">Send Message<\/option>/);
  assert.match(html,/aria-label="Show action details"/);
});
test('global action definitions preserve smart component applicability',()=>{
  assert.equal(supportsSmartActionEvent('smart_cart','qtyIcon'),true);
  assert.equal(supportsSmartActionEvent('smart_button','qtyIcon'),false);
  assert.equal(supportsSmartActionEvent('smart_button','click'),true);
  assert.equal(supportsSmartActionEvent('smart_button','change'),false);
  assert.equal(supportsSmartActionEvent('smart_cart','start'),true);
});
test('Page Builder shows inline configuration but no Advanced Actions modal/button',()=>{
  const page=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
  const advanced=read('../src/core/builders/PageBuilder/PageBuilderAdvancedRibbon.tsx');
  const properties=read('../src/core/builders/ComponentProperties/componentPropertiesView.tsx');
  const css=read('../src/core/builders/PageBuilder/PageBuilderEightTabRibbon.css');
  assert.match(page,/<PageBuilderActionRibbon/);
  assert.match(page,/mode="actions-inline" actionEvent=\{activeActionEvent\}/);
  assert.match(page,/page-builder-inline-actions/);
  assert.doesNotMatch(page,/openAdvanced\('actions'\)|advancedEditor==='actions'/);
  assert.doesNotMatch(advanced,/key:'actions',label:'Advanced actions'/);
  assert.match(properties,/mode!=='actions-inline'\|\|eventName===actionEvent/);
  assert.match(css,/\.page-builder-inline-actions/);
});
