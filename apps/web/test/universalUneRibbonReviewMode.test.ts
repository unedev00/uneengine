import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=(name:string)=>readFileSync(new URL(name,import.meta.url),'utf8');

test('every declared UNE property occupies one fixed slot regardless of selected component',()=>{
 const source=load('../src/core/builders/PageBuilder/UniversalRibbonInventory.tsx');
 const inventory=load('../src/core/builders/PageBuilder/universalRibbonCoverage.mjs');
 assert.match(source,/const excluded=new Set<string>\(\)/);
 assert.match(source,/defs\.map\(def=>/);
 assert.match(source,/Array\.from\(groups\)\.map/);
 assert.match(source,/const enabled=new Set\(selectedDefinitions\.keys\(\)\)/);
 assert.match(source,/definition=\{controlDefinition\}/);
 assert.match(source,/const supported=enabled\.has\(def\.propertyKey\)/);
 assert.match(source,/if\(supported\)onChange/);
 assert.match(source,/disabled:!enabled/);
 assert.doesNotMatch(source,/if\(definition\?\.apiName===.*return null/);
 assert.doesNotMatch(source,/if\(canEditCanvas&&.*return null/);
 assert.doesNotMatch(source,/definition=\{supported\?definition\?\.propertyDefinitions/);
 assert.match(source,/componentId/);
 assert.match(source,/disabled=\{!canEditCanvas\}/);
 assert.match(source,/onPositionChange/);
 assert.match(inventory,/auditUniversalRibbonCoverage/);
});

test('component unrelated source mappings are not declared on Card Grid',()=>{
 const component=JSON.parse(load('../src/component-libraries/ui_item_grid/component.json')) as {propertyDefinitions:{propertyKey:string}[]};
 const keys=new Set(component.propertyDefinitions.map(item=>item.propertyKey));
 for(const forbidden of ['ageRestrictionFieldApiName','barcodeFieldApiName','channelAccountObjectApiName','stateObjectApiName'])
  assert.ok(!keys.has(forbidden),forbidden);
});

test('the coverage check has an ESM TypeScript declaration',()=>{
 const declaration=load('../src/core/builders/PageBuilder/universalRibbonCoverage.d.mts');
 assert.match(declaration,/export function auditUniversalRibbonCoverage/);
 assert.match(declaration,/RibbonCoverage/);
});
