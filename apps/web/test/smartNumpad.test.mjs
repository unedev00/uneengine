import {readRetiredMigration} from '../../../scripts/read-retired-migration.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import SmartNumpad from '../src/component-libraries/smart_numpad/SmartNumpad.jsx';
// Production provides React globally to bundled Smart renderers.
globalThis.React=React;
import {applyNumpadKey,normalizeNumpadValue,numpadSettings}
 from '../src/component-libraries/smart_numpad/numpadValue.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('PIN values preserve leading zeroes and Clear/Backspace edit one local string',()=>{
 const pin=numpadSettings({numpadInputMode:'pin',numpadMaxDigits:4});
 assert.equal(normalizeNumpadValue('0012',pin),'0012');
 assert.equal(applyNumpadKey('0012','3',pin),'0012');
 assert.equal(applyNumpadKey('0012','backspace',pin),'001');
 assert.equal(applyNumpadKey('001','C',pin),'');
 assert.equal(applyNumpadKey('','0',pin),'0');
});
test('decimal limits and duplicate dot handling are deterministic',()=>{
 const settings=numpadSettings({numpadInputMode:'decimal',numpadDecimalPlaces:2,numpadMaxDigits:8});
 assert.equal(normalizeNumpadValue('125.5023',settings),'125.50');
 assert.equal(applyNumpadKey('125.5','0',settings),'125.50');
 assert.equal(applyNumpadKey('125.50','. ',settings),'125.50');
 assert.equal(applyNumpadKey('125.50','.',settings),'125.50');
 assert.equal(applyNumpadKey('125.50','backspace',settings),'125.5');
 assert.equal(normalizeNumpadValue('1.a2',settings),'1.2');
});
test('rendered numpad has one header input, 12 keys, three custom buttons',()=>{
 const markup=renderToStaticMarkup(React.createElement(SmartNumpad,{
  p:{numpadInputMode:'pin',numpadMaxDigits:4,numpadKeyFill:'#ededed',
   customButton3Fill:'#0033cc',headerBodyColor:'#fefefe'},
  fire:()=>{},sourceValue:'0012',buttonLabels:['One','Two','Submit']
 }));
 assert.match(markup,/type="password"/);
 assert.match(markup,/value="0012"/);
 assert.equal((markup.match(/class="smart-numpad-input"/g)||[]).length,1);
 assert.equal((markup.match(/class="smart-numpad-key"/g)||[]).length,15);
 assert.match(markup,/data-numpad-custom="true"/);
 assert.match(markup,/Submit/);
 assert.match(markup,/#0033cc/);
});
test('numpad uses SQL-backed seven Design sections and shared event routing',()=>{
 const migration=readRetiredMigration('20271118-smart-numpad.sql');
 const sectionNames=['Body','Header','Focused','Button','Button 2','Button 3','Button 4'];
 for(const area of sectionNames)assert.ok(migration.includes("('"+area+"'"),area+' not mapped');
 for(const item of ['numpadInputMode','numpadDecimalPlaces','numpadMaxDigits',
  'numpadMask','numpadPrefix','numpadSuffix','numpadPlaceholder']){
  assert.ok(migration.includes(item),item+' not declared');
 }
 assert.match(migration,/ON CONFLICT\(tenant_id,api_name\) DO NOTHING/);
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 assert.match(ribbon,/design2AreaExtraProperties/);
 const actions=read('../src/core/builders/PageBuilder/SmartEventActionsRibbon.tsx');
 assert.match(actions,/smart_numpad/);
 assert.match(actions,/customButton3/);
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 assert.match(runtime,/name==="smart_numpad"/);
 assert.match(runtime,/sourceValue=\{scopedExpression/);
});
