import assert from 'node:assert/strict';
import { readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { loadComponentCatalog, webSourceRoot } from './component-catalog.mjs';

const entries = await readdir(webSourceRoot, { withFileTypes: true });
assert.deepEqual(entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort(), ['core', 'one']);
assert.deepEqual(entries.filter(entry => entry.isFile()).map(entry => entry.name).sort(), ['README.md', 'main.tsx']);
const { components } = await loadComponentCatalog();
const publishedOne=components.filter(component=>component.apiName.startsWith('One'));
assert.deepEqual(publishedOne,[], 'No legacy One components may be independently registered');
const registered=components.filter(component=>component.apiName.startsWith('une_'));
assert.equal(registered.length,34,'All 34 canonical UNE component descriptors must be registered');
const retained=['OneText','OneSearch','OneCalendar','OneItemGrid','OneConversation','OneShoppingCart'];
for(const name of retained){
  // UNE wrappers still reuse the old implementation code; it is not a public component.
  for(const extension of ['jsx','css'])
    await access(path.join(webSourceRoot,`one/${name}/${name}.${extension}`));
  await assert.rejects(access(path.join(webSourceRoot,`one/${name}/component.json`)),
    {code:'ENOENT'},name+' must not retain a standalone descriptor');
}
await access(path.join(webSourceRoot,'core/components/SharedRuntime/SharedButton.jsx'));
await assert.rejects(access(path.join(webSourceRoot,'one/OneButton/OneButton.jsx')), {code:'ENOENT'});
for (const component of registered) {
  const prefix = `one/${component.apiName}/`;
  assert.equal(component.jsxFile, prefix + component.apiName.split('_').slice(1).map(part=>part[0].toUpperCase()+part.slice(1)).join('').replace(/^/, 'Une') + '.jsx');
  for (const file of [component.jsxFile,component.cssFile,prefix+'component.json'])
    await access(path.join(webSourceRoot,file));
}
console.log(`Web layout verified: Core, UNE and ${registered.length} published components.`);
