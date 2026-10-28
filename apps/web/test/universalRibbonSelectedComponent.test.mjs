import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/core/builders/PageBuilder/UniversalRibbonInventory.tsx',import.meta.url),'utf8');

test('universal ribbon renders only properties belonging to selected component',()=>{
 assert.match(source,/filter\(\(\[,defs\]\)=>defs\.some\(item=>enabled\.has\(item\.propertyKey\)\)\)/);
 assert.match(source,/defs\.filter\(item=>enabled\.has\(item\.propertyKey\)\)\.map/);
 assert.match(source,/definition\?\.propertyDefinitions/);
});

test('absent component-specific fields cannot leak into unrelated components',()=>{
 const card=JSON.parse(readFileSync(new URL('../src/one/une_item_grid/component.json',import.meta.url),'utf8'));
 const keys=new Set(card.propertyDefinitions.map(definition=>definition.propertyKey));
 for(const unrelated of ['ageRestrictionFieldApiName','barcodeFieldApiName','channelAccountObjectApiName','stateObjectApiName'])
  assert.ok(!keys.has(unrelated),unrelated);
});
