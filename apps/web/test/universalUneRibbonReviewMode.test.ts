import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=(name:string)=>readFileSync(new URL(name,import.meta.url),'utf8');

test('ribbon displays stable slots and disables unsupported properties',()=>{
 const source=load('../src/core/builders/PageBuilder/UniversalRibbonInventory.tsx');
 assert.match(source,/data-review-mode="all-disabled"/);
 assert.match(source,/defs\.map\(def=>/);
 assert.match(source,/Array\.from\(groups\)\.map/);
 assert.match(source,/if\(supported\)onChange/);
 assert.match(source,/componentId/);
 assert.match(source,/disabled=\{!canEditCanvas\}/);
 assert.match(source,/disabled=\{!canOpenSource\}/);
 assert.match(source,/disabled=\{!canOpenFilters\}/);
 assert.match(source,/onPositionChange/);
 assert.match(source,/editCanvas\(key,1,event\.target\.value\)/);
});

test('component unrelated source mappings are not declared on Card Grid',()=>{
 const component=JSON.parse(load('../src/one/une_item_grid/component.json')) as {propertyDefinitions:{propertyKey:string}[]};
 const keys=new Set(component.propertyDefinitions.map(item=>item.propertyKey));
 for(const forbidden of ['ageRestrictionFieldApiName','barcodeFieldApiName','channelAccountObjectApiName','stateObjectApiName'])
  assert.ok(!keys.has(forbidden),forbidden);
});

test('the coverage check has an ESM TypeScript declaration',()=>{
 const declaration=load('../src/core/builders/PageBuilder/universalRibbonCoverage.d.mts');
 assert.match(declaration,/export function auditUniversalRibbonCoverage/);
 assert.match(declaration,/RibbonCoverage/);
});
