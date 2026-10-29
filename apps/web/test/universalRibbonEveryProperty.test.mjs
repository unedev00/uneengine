import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditUniversalRibbonCoverage} from '../src/core/builders/PageBuilder/universalRibbonCoverage.mjs';

const root=new URL('../src/one/',import.meta.url);
const catalog=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const manifests=catalog.components.map(path=>JSON.parse(readFileSync(new URL(path,root),'utf8')))
  .filter(component=>/^une_[a-z0-9_]+$/.test(component.apiName));

test('every active property from every UNE component is registered in the universal ribbon',()=>{
  assert.equal(manifests.length,34);
  const allKeys=[...new Set(manifests.flatMap(component=>
    (component.propertyDefinitions??[]).map(def=>def.propertyKey)))].sort();
  assert.ok(allKeys.length>100,'unexpectedly small shared inventory');
  const coverage=auditUniversalRibbonCoverage(manifests,allKeys);
  assert.deepEqual(coverage.missing,[]);
  assert.deepEqual(coverage.duplicates,[]);
  assert.deepEqual(coverage.unexpected,[]);
  assert.equal(coverage.displayedPropertyCount,coverage.declaredPropertyCount);
  const code=readFileSync(new URL('../src/core/builders/PageBuilder/UniversalRibbonInventory.tsx',import.meta.url),'utf8');
  assert.match(code,/const excluded=new Set<string>\(\)/);
  assert.match(code,/for\(const component of validManifests\)/);
  assert.match(code,/for\(const \[key,definition\] of definitionMap\)/);
  assert.match(code,/definition=\{controlDefinition\}/);
  assert.doesNotMatch(code,/retiredItemGridProps|retiredItemGridProperties|if\(definition\?\.apiName===.*return null/);
});

test('selected UNE component affects only whether a shared key is editable',()=>{
  const source=readFileSync(new URL('../src/core/builders/PageBuilder/UniversalRibbonInventory.tsx',import.meta.url),'utf8');
  assert.match(source,/const selectedDefinitions=new Map/);
  assert.match(source,/const supported=enabled\.has\(def\.propertyKey\)/);
  assert.match(source,/enabled=\{supported\}/);
  assert.match(source,/const controlDefinition=supported&&selectedDefinition/);
  assert.match(source,/\.\.\.def,choices:selectedDefinition\.choices\?\?def\.choices/);
  assert.doesNotMatch(source,/if\(canEditCanvas&&\(def\.propertyKey==='width'/);
  for(const component of manifests){
    const declared=new Set((component.propertyDefinitions??[]).map(d=>d.propertyKey));
    for(const key of declared)assert.ok(manifests.some(other=>
      other.propertyDefinitions?.some(d=>d.propertyKey===key)),
      component.apiName+' lost '+key);
  }
});
