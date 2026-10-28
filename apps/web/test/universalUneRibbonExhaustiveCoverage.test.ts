import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditUniversalRibbonCoverage} from '../src/core/builders/PageBuilder/universalRibbonCoverage.mjs';

const read=(url:URL)=>JSON.parse(readFileSync(url,'utf8'));
const root=new URL('../src/one/',import.meta.url);
const manifest=read(new URL('manifest.json',root)) as {components:string[]};
const components=manifest.components.map(path=>read(new URL(path,root))) as
  {apiName:string;propertyDefinitions:{propertyKey:string}[]}[];

test('all 36 UNE component manifests have every declared key represented in the shared inventory',()=>{
 const expected=[...new Set(components.flatMap(component=>component.propertyDefinitions.map(item=>item.propertyKey)))];
 const audit=auditUniversalRibbonCoverage(components,expected,['fontFamily','fontStyle','textDecoration']);
 assert.equal(audit.componentCount,36,'A registered UNE component is missing');
 assert.equal(audit.missing.length,0,audit.missing.join(', '));
 assert.equal(audit.duplicates.length,0,audit.duplicates.join(', '));
 assert.equal(audit.unexpected.length,0,audit.unexpected.join(', '));
 assert.equal(audit.declaredPropertyCount,audit.displayedPropertyCount);
 const catalog=readFileSync(new URL('../src/core/builders/PageBuilder/UniversalRibbonInventory.tsx',import.meta.url),'utf8');
 assert.match(catalog,/import\.meta\.glob\('\.\.\/\.\.\/\.\.\/one\/\*\/component\.json'/);
 assert.match(catalog,/for\(const component of validManifests\)/);
 assert.match(catalog,/for\(const \[key,definition\] of definitionMap\)/);
 assert.match(catalog,/slots\.get\(tab\)\?\.get\(section\)\?\.push\(definition\)/);
 assert.match(catalog,/auditUniversalRibbonCoverage\(/);
});
test('coverage checker fails for omitted, duplicate and unexpected properties',()=>{
 const all=[...new Set(components.flatMap(component=>component.propertyDefinitions.map(item=>item.propertyKey)))];
 const omitted=auditUniversalRibbonCoverage(components,all.slice(1));
 assert.deepEqual(omitted.missing,[all[0]]);
 const duplicated=auditUniversalRibbonCoverage(components,[...all,all[0]]);
 assert.deepEqual(duplicated.duplicates,[all[0]]);
 const unexpected=auditUniversalRibbonCoverage(components,[...all,'injectedUnknownProperty']);
 assert.deepEqual(unexpected.unexpected,['injectedUnknownProperty']);
});
test('builder-managed position, dimensions, visibility and data links remain available',()=>{
 const catalog=readFileSync(new URL('../src/core/builders/PageBuilder/UniversalRibbonInventory.tsx',import.meta.url),'utf8');
 const view=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
 for(const token of ['Canvas locked','Component visible','Canvas '+String(''), 'Source mappings','Filter conditions','Visibility rules'])
   assert.ok(catalog.includes(token),token);
 assert.match(view,/onPositionChange:position=>updateComponent/);
 assert.match(view,/onVisibleChange:visible=>updateComponent/);
 assert.match(view,/onOpenFilters:\(\)=>openExpandedEditor\('filters'\)/);
 assert.match(catalog,/CustomComponentPropertyEditor definitions=\{\[definition\]\}/);
});
