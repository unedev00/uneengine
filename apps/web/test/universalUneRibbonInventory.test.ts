import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
test('universal catalog indexes all installed UNE manifests without app-specific group selection',()=>{
 const catalog=load('../src/core/builders/PageBuilder/UniversalRibbonInventory.tsx');
 const manifest=JSON.parse(load('../src/one/manifest.json')) as {components:string[]};
 assert.equal(manifest.components.length,36);
 assert.match(catalog,/import\.meta\.glob\('\.\.\/\.\.\/\.\.\/one\/\*\/component\.json'/);
 assert.match(catalog,/validManifests=manifests\.filter/);
 assert.match(catalog,/for\(const component of validManifests\)/);
 assert.match(catalog,/for\(const \[key,definition\] of definitionMap\)/);
 assert.match(catalog,/enabled\.has\(def\.propertyKey\)/);
 assert.match(catalog,/Not supported by selected component/);
 assert.match(catalog,/isExcludedRibbonProperty/);
});
test('all six property tabs use a fixed section catalog without component-specific layout',()=>{
 const view=load('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const catalog=load('../src/core/builders/PageBuilder/UniversalRibbonInventory.tsx');
 for(const name of ['Component Data','Component Content','Component Properties','Component Layout','Component Responsive','Component Action']){
   assert.ok(catalog.includes("'"+name+"'"),name);
   assert.ok(view.includes("'"+name+"'"),name);
 }
 assert.match(view,/<UniversalRibbonInventory tab=\{ribbonTab as/);
 assert.match(catalog,/Array\.from\(groups\)\.map/);
});
test('media property and structured values are handled without converting persisted objects to strings',()=>{
 const catalog=load('../src/core/builders/PageBuilder/UniversalRibbonInventory.tsx');
 assert.match(catalog,/createPortal/);
 assert.match(catalog,/TenantMediaPicker assetOnly initiallyOpen/);
 assert.match(catalog,/JSON\.parse\(e\.target\.value\)/);
 assert.match(catalog,/update\(parsed\)/);
});

test('UNE components do not render the legacy second Data ribbon',()=>{
 const view=load('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(view,/selected && !selectedCustomDefinition && ribbonTab==='Component Data' && <PageBuilderRibbonData/);
 assert.match(view,/selected && selectedCustomDefinition && \(\['Component Data'/);
});

test('obsolete and duplicate Source Object controls are omitted rather than greyed out',()=>{
 const source=load('../src/core/builders/PageBuilder/UniversalRibbonInventory.tsx');
 assert.match(source,/ageRestriction\|barcode/);
 assert.match(source,/ObjectApiName\|SourceObjectApi\|ObjectAPI/);
 assert.match(source,/key!=='objectApiName'/);
 assert.match(source,/excluded=new Set\(Array\.from\(definitionMap\.keys\(\)\)\.filter\(isExcludedRibbonProperty\)\)/);
 assert.match(source,/\['fontFamily','fontStyle','textDecoration','theme'\]/);
});
