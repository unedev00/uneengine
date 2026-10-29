import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadComponentCatalog} from '../../../scripts/component-catalog.mjs';

const root=new URL('../src/one/',import.meta.url);
const read=url=>readFileSync(url,'utf8');
const manifest=JSON.parse(read(new URL('manifest.json',root)));

test('all UNE component settings are owned by app source, not the Component Library manifest',async()=>{
 assert.equal(manifest.components.length,34);
 assert.deepEqual(manifest.commonProperties,[]);
 const catalog=await loadComponentCatalog();
 const keys=new Set();
 for(const descriptor of manifest.components){
  const registration=JSON.parse(read(new URL(descriptor,root)));
  assert.deepEqual(registration.propertyDefinitions,[],registration.apiName+' leaked SQL property metadata');
  const module=await import(new URL(descriptor.replace('component.json','app-properties.mjs'),root));
  assert.ok(Array.isArray(module.propertyDefinitions),registration.apiName+' lost app properties');
  const runtime=catalog.components.find(c=>c.apiName===registration.apiName);
  assert.ok(runtime,registration.apiName+' renderer missing');
  for(const setting of module.propertyDefinitions){
   assert.ok(runtime.propertyDefinitions.some(p=>p.propertyKey===setting.propertyKey),
    registration.apiName+' missing code-owned setting '+setting.propertyKey);
   keys.add(setting.propertyKey);
  }
 }
 assert.ok(keys.size>100,'Expected a complete code-owned settings catalog');
});

test('UNE settings stay out of public catalog, ribbon and registration UI',()=>{
 const build=read(new URL('../build-component-library.mjs',import.meta.url));
 const builder=read(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url));
 const css=read(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonPolish.css',import.meta.url));
 const library=read(new URL('../src/core/components/ComponentLibrary/ComponentLibrary.tsx',import.meta.url));
 const palette=read(new URL('../src/core/builders/PageBuilder/pageBuilderPalette.ts',import.meta.url));
 assert.match(build,/propertyDefinitions: appOwned \? \[\] :/);
 assert.match(build,/defaultProps/);
 assert.match(builder,/data-app-owned-une=\{selectedAppOwnedUne/);
 assert.match(css,/data-app-owned-une="true"/);
 assert.match(library,/!component\.apiName\.startsWith\('une_'\)/);
 assert.match(palette,/!component\.apiName\.startsWith\('une_'\)/);
});

test('SQL cleanup removes UNE property inventory only, retaining component identities and page instances',()=>{
 const migration=read(new URL('../../server/src/system-support/migrations/20270120-remove-une-sql-property-inventory.sql',import.meta.url));
 assert.match(migration,/DELETE FROM md_component_library_contract_properties/);
 assert.match(migration,/left\(component_api,4\)='une_'/);
 assert.doesNotMatch(migration,/DELETE\s+FROM\s+md_component_definitions/i);
 assert.doesNotMatch(migration,/DELETE\s+FROM\s+md_page_definitions/i);
});
