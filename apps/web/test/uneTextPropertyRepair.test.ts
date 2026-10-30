import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import vm from 'node:vm';
import {loadComponentCatalog,buildBundledComponent} from '../../../scripts/component-catalog.mjs';
const load=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('UNE Input replaces public UNE Text and keeps shared styling and data binding',async()=>{
 const catalog=await loadComponentCatalog();
 assert.ok(!catalog.components.some(c=>c.apiName==='une_text'));
 const component=catalog.components.find(c=>c.apiName==='une_input');
 assert.ok(component);
 const keys=new Set(component.propertyDefinitions.map(p=>p.propertyKey));
 for(const key of ['value','allowTyping','label','disabled','radius','padding','shadow','glassBlur',
                   'backgroundColor','textColor','borderColor','fontSize'])assert.ok(keys.has(key),key);
 assert.ok(!keys.has('text'));
 const manifest=JSON.parse(load('../src/component-libraries/manifest.json'));
 assert.ok(!manifest.components.includes('une_text/component.json'));
});

test('same UNE Input renders display-only text and an editable text box',async()=>{
 const catalog=await loadComponentCatalog();
 const component=catalog.components.find(c=>c.apiName==='une_input');
 const built=await buildBundledComponent(component);
 const context={React,module:{exports:{}},Intl,Date,URL,crypto:globalThis.crypto};
 vm.runInNewContext(built.compiledJs,context);
 const render=props=>renderToStaticMarkup(React.createElement(context.module.exports.default,props));
 const display=render({value:'Account name',allowTyping:false,fontSize:22,
   surface:'glass',backgroundColor:'#ffffff',borderColor:'#123456',radius:9});
 assert.match(display,/Account name/);
 assert.match(display,/une-input-display/);
 assert.doesNotMatch(display,/<input[^>]+value="Account name"/);
 assert.match(display,/une-input-surface/);
 const edit=render({value:'Jane',allowTyping:true,placeholder:'Enter name'});
 assert.match(edit,/<input/);
 assert.match(edit,/value="Jane"/);
 const legacy=render({text:'Legacy title'});
 assert.match(legacy,/Legacy title/);
 assert.match(legacy,/une-input-display/);
 const multiline=render({value:'First\nSecond',allowTyping:false,gap:18});
 assert.match(multiline,/une-input-lines/);
});
