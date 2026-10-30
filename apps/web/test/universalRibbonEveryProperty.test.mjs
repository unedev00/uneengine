import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadComponentCatalog} from '../../../scripts/component-catalog.mjs';

const root=new URL('../src/component-libraries/',import.meta.url);
const read=url=>readFileSync(url,'utf8');
const manifest=JSON.parse(read(new URL('manifest.json',root)));

test('all UNE component settings are owned by app source, not the Component Library manifest',async()=>{
 assert.equal(manifest.components.filter(path=>path.startsWith('une_')||path.startsWith('acetill_cart/')).length,35);
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
 assert.doesNotMatch(builder,/data-app-owned-une=\{selectedAppOwnedUne/);
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

test('app-owned renderers and styles are code owned rather than UNE wrapper reexports',()=>{
 const appTypes=['acetill','aceassist','onechatter','uneacechatter'];
 const own=manifest.components.filter(path=>appTypes.some(app=>path.startsWith(app+'_')));
 assert.equal(own.length,17);
 for(const path of own){
  const descriptor=JSON.parse(read(new URL(path,root)));
  assert.deepEqual(descriptor.propertyDefinitions,[]);
  assert.equal(descriptor.cssFile,descriptor.apiName==='acetill_cart'
   ?'component-libraries/acetill_cart/AcetillCart.css':`component-libraries/${descriptor.apiName}/AppComponent.css`);
  const jsx=read(new URL('../src/'+descriptor.jsxFile,import.meta.url));
  assert.doesNotMatch(jsx,/from ['"]\.\.\/une_[a-z_]+\//,descriptor.apiName+' imports a deprecated wrapper');
  assert.ok(read(new URL('../src/'+descriptor.cssFile,import.meta.url)).length>0);
 }
});
