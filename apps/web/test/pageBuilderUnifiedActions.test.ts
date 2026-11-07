import { readPageBuilderModules } from './helpers/builderSources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import PageBuilderActionRibbon from '../src/core/builders/PageBuilder/PageBuilderActionRibbon';
import {supportsSmartActionEvent} from '../src/core/builders/PageBuilder/SmartEventActionsRibbon';
import type {FlowDefinitionMetadata} from '../src/core/metadata/Definitions/metadata';
const read=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');
const flows=[{id:'flow-id',apiName:'Send_Message',label:'Send Message',
 status:'Active',flowType:'Autolaunched Flow'}] as FlowDefinitionMetadata[];
const events=[{apiName:'click',label:'On Click'},{apiName:'itemSelect',label:'When a card is selected'}];
const render=(actions:Record<string,unknown>,selectedEvent='',api='smart_cart')=>
 renderToStaticMarkup(React.createElement(PageBuilderActionRibbon,{
  api,actions,eventDefinitions:events,flows,selectedEvent,
  onSelectEvent:()=>{},onChange:()=>{}
 }));
test('component slots show Formula and Flow, without duplicated global actions',()=>{
 const html=render({},'');
 assert.match(html,/aria-label="On Click action"/);
 assert.match(html,/aria-label="On Session Start action"/);
 assert.doesNotMatch(html,/aria-label="Flow inputs"/);
 assert.doesNotMatch(html,/aria-label="Flow outputs"/);
 assert.match(html,/<option value="formula">Formula<\/option>/);
 assert.match(html,/<option value="flow">Flow<\/option>/);
 assert.match(html,/<option value="flow:Send_Message">Send Message<\/option>/);
 assert.doesNotMatch(html,/Custom event ID|Add trigger|Run automation \/ choose Flow/);
 assert.doesNotMatch(html,/aria-label="All component actions"/);
});
test('saved metadata reference to published Flow resolves without conversion',()=>{
 const html=render({click:{actionType:'Flow',flowApiName:'metadata:flow-id'}},'click');
 assert.match(html,/value="flow:Send_Message" selected/);
});
test('unusual declared events and existing custom events remain reachable',()=>{
 const html=render({itemSelect:{actionType:'Flow',flowApiName:'metadata:flow-id'},
  legacyEvent:{actionType:'PageState',stateKey:'filterId'}},'itemSelect','smart_card_grid');
 assert.match(html,/aria-label="Other events"/);
 assert.match(html,/When a card is selected/);
 assert.match(html,/legacyEvent/);
 const legacy=render({legacyEvent:{actionType:'PageState',stateKey:'filterId'}},
  'legacyEvent','smart_card_grid');
 assert.match(legacy,/Existing: Update page value/);
});
test('unsupported smart component slots remain mounted disabled',()=>{
 const html=render({},'','smart_button');
 for(const title of ['On Change','+ Icon','− Icon','Custom Button 1','Custom Button 2'])
  assert.ok(html.includes('aria-label="'+title+' action" disabled'),title);
 for(const key of ['smart_cart','smart_button'])
  assert.equal(supportsSmartActionEvent(key,'click'),true);
});
test('Flow mapping UI is hidden in Actions but saved metadata helpers remain available',()=>{
 const code=read('../src/core/builders/PageBuilder/CompactActionFlowBindings.tsx');
 assert.match(code,/decodeInputSource,encodeInputSource,declaredFlowInputs,declaredFlowOutputs,mappedInputNames/);
 assert.match(code,/aria-label="Flow input variable"/);
 assert.match(code,/aria-label="Flow output Page State target"/);
 const actionRibbon=read('../src/core/builders/PageBuilder/PageBuilderActionRibbon.tsx');
 assert.doesNotMatch(actionRibbon,/CompactActionFlowBindings|onInputsChange|onOutputsChange/);
 assert.match(actionRibbon,/inputs:asBinding\(previous.inputs\)/);
 const view=readPageBuilderModules();
 assert.doesNotMatch(view,/mode="actions-inline"/);
});
