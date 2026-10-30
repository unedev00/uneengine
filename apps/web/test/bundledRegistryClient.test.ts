import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveSqlComponentLibrary } from '../src/core/components/Registry/bundledRegistryClient';

test('unregistered SQL component keys never become trusted built-ins',async()=>{
  const result=await resolveSqlComponentLibrary([{apiName:'OneShoppingCart',rendererKey:'custom'}],'/');
  assert.deepEqual(result,[]);
});

test('SQL-enabled reviewed components hydrate from a lightweight catalog, not executable code',async()=>{
  const previous=globalThis.fetch;
  const requested:string[]=[];
  globalThis.fetch=async(input:RequestInfo|URL)=>{
    requested.push(String(input));
    return new Response(JSON.stringify({components:[
      {apiName:'OneShoppingCart',label:'One-Shopping-Cart',version:9,surfaces:['page','dashboard','flow']},
      {apiName:'OneItemGrid',label:'One-Item-Grid',version:9,surfaces:['page','dashboard','flow']}
    ]}),{status:200});
  };
  try{
    const components=await resolveSqlComponentLibrary([
      {apiName:'OneShoppingCart',rendererKey:'one-bundled:OneShoppingCart'},
      {apiName:'OneItemGrid',rendererKey:'one-bundled:OneItemGrid'},
      {apiName:'CustomX',rendererKey:'Other'}],'/');
    assert.deepEqual(components.map(c=>c.apiName),['OneShoppingCart','OneItemGrid']);
    assert.ok(components.every(c=>c.trustedBundled===true&&c.compiledJs===''));
    assert.deepEqual(requested,['/component-library/catalog-index.json']);
  }finally {globalThis.fetch=previous;}
});

test('retired OneAccordion in tenant SQL never blocks valid metadata hydration',async()=>{
  const previous=globalThis.fetch;
  const previousWarn=console.warn;
  const warnings:unknown[][]=[];
  let fetches=0;
  globalThis.fetch=async()=>{
    fetches++;
    return new Response(JSON.stringify({components:[
      {apiName:'OneText',label:'One-Text',version:1,surfaces:['page','dashboard','flow']}
    ]}),{status:200});
  };
  console.warn=(...args:unknown[])=>{warnings.push(args);};
  try {
    const registered=[
      {apiName:'OneAccordion',rendererKey:'one-bundled:OneAccordion'},
      {apiName:'OneText',rendererKey:'one-bundled:OneText'},
      {apiName:'CustomX',rendererKey:'one-bundled:WrongKey'}
    ];
    const resolved=await resolveSqlComponentLibrary(registered,'/');
    assert.deepEqual(resolved.map(component=>component.apiName),['OneText']);
    assert.equal(resolved[0]?.trustedBundled,true);
    assert.equal(fetches,1);
    assert.equal(warnings.length,1);
    assert.equal(warnings[0]?.[1],1);
    assert.deepEqual(await resolveSqlComponentLibrary(
      [{apiName:'OneAccordion',rendererKey:'one-bundled:OneAccordion'}],'/'),[]);
  }finally {
    globalThis.fetch=previous;
    console.warn=previousWarn;
  }
});

test('all shipped One components have a reviewed catalog entry and lazy asset source',async()=>{
  const {readFile}=await import('node:fs/promises');
  const manifest=JSON.parse(await readFile(new URL('../src/component-libraries/manifest.json',import.meta.url),'utf8')) as {components:string[]};
  const apiNames=manifest.components.map(path=>path.split('/')[0]);
  assert.equal(new Set(apiNames).size,apiNames.length);
  for(const path of manifest.components){
    const descriptor=JSON.parse(await readFile(new URL('../src/component-libraries/'+path,import.meta.url),'utf8')) as {
      apiName:string;jsxFile:string;surfaces:string[];
    };
    assert.equal(descriptor.apiName,path.split('/')[0]);
    assert.ok(descriptor.surfaces?.includes('page'),descriptor.apiName+' missing page surface');
    assert.ok((await readFile(new URL('../src/'+descriptor.jsxFile,import.meta.url),'utf8')).length>0);
  }
});
