import assert from 'node:assert/strict';
import { readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { loadComponentCatalog, webSourceRoot } from './component-catalog.mjs';

const entries=await readdir(webSourceRoot,{withFileTypes:true});
assert.deepEqual(entries.filter(entry=>entry.isDirectory()).map(entry=>entry.name).sort(),['component-libraries','core']);
assert.deepEqual(entries.filter(entry=>entry.isFile()).map(entry=>entry.name).sort(),['main.tsx']);
const library=path.join(webSourceRoot,'component-libraries');
const directories=(await readdir(library,{withFileTypes:true})).filter(entry=>entry.isDirectory()).map(entry=>entry.name);
assert.equal(directories.filter(name=>/^(?:ui_|ui-runtime$|acetill_|aceassist_|onechatter_|uneacechatter_)/.test(name)).length,0,
 'Retired UI and Ace renderer folders must not be shipped');
const {components}=await loadComponentCatalog();
assert.equal(components.length,16,'Exactly 16 reusable Smart renderers must be registered');
assert.ok(components.every(component=>component.apiName.startsWith('smart_')),'No legacy renderer registration allowed');
for(const component of components){
 const prefix='component-libraries/'+component.apiName+'/';
 for(const file of [component.jsxFile,component.cssFile,prefix+'component.json'])
  await access(path.join(webSourceRoot,file));
}
console.log('Web layout verified: Core and 16 Smart components; no legacy bundles.');
