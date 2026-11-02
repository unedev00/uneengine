import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildBundledComponent} from '../../../scripts/component-catalog.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

async function renderCart(properties){
 const descriptor=JSON.parse(read('../src/component-libraries/smart_cart/component.json'));
 const bundled=await buildBundledComponent(descriptor);
 const sandbox={React,module:{exports:{}},Date,Intl,URL,crypto:globalThis.crypto};
 vm.runInNewContext(bundled.compiledJs,sandbox);
 return renderToStaticMarkup(React.createElement(sandbox.module.exports.default,{
  builderPreview:true,previewOnly:true,records:[],...properties
 }));
}

test('Cart Header Body Color is a single Cart-only SQL-backed fill palette at Design Header R3/C2',()=>{
 const sql=read('../../server/src/system-support/migrations/20270306-smart-cart-header-body-color.sql');
 assert.match(sql,/'headerBodyColor','Header Body Color','Design','Header','color'/);
 assert.match(sql,/NULL,'\[\]'::jsonb,'component',3,2,35,26,0/);
 assert.match(sql,/SELECT 'smart_cart','headerBodyColor',true/);
 assert.match(sql,/ON CONFLICT\(property_key\) DO NOTHING/);
 assert.match(sql,/ON CONFLICT\(component_api,property_key\) DO UPDATE SET enabled=true/);
 assert.doesNotMatch(sql,/UPDATE\s+md_page_|DELETE\s+FROM\s+md_page_/i);
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 assert.match(ribbon,/kind==='color'/);
 assert.match(ribbon,/property\.components\.includes\(api\)/);
 const css=read('../src/core/builders/PageBuilder/SmartRibbon.css');
 assert.match(css,/\[data-smart-api="smart_cart"\][\s\S]*?\[data-property="headerBodyColor"\]/);
});

test('Smart Cart header keeps original blue when unset and uses authored colour in preview and runtime',async()=>{
 const original=await renderCart({});
 assert.match(original,/<header class="smart-cart-header" style="[^"]*background-color:#255d9d/i);
 const altered=await renderCart({headerBodyColor:'#ff6600'});
 assert.match(altered,/<header class="smart-cart-header" style="[^"]*background-color:#ff6600/i);
 assert.doesNotMatch(altered,/<header class="smart-cart-header" style="[^"]*background-color:#255d9d/i);
 const noFill=await renderCart({headerBodyColor:'transparent'});
 assert.match(noFill,/<header class="smart-cart-header" style="[^"]*background-color:transparent/i);
});
