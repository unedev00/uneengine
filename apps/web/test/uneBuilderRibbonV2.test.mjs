import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Smart Ribbon uses live metadata-driven design and data editors',()=>{
 const root=new URL('../src/core/builders/PageBuilder/',import.meta.url);
 const current=readFileSync(new URL('editor/ribbon/createPageRibbon.tsx',root),'utf8');
 const smart=readFileSync(new URL('SmartRibbon.tsx',root),'utf8');
 const inventory=readFileSync(new URL('uneBuilderPropertyInventory.ts',root),'utf8');
 assert.match(current,/<SmartRibbon/);
 assert.doesNotMatch(current,/<UneBuilderRibbon tab=/);
 assert.match(smart,/tab/);
 assert.match(inventory,/sharedPropertyGroups/);
});
