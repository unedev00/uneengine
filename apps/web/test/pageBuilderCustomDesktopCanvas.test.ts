import { readPageBuilderModules } from './helpers/builderSources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pageBuilderPreviewDevice} from '../src/core/builders/PageBuilder/pageBuilderPreviewDevice';
import {fitCanvasComponentToPage} from '../src/core/builders/PageBuilder/canvasLayerGroups';
import type {LightningPageMetadata,PageComponentMetadata} from '../src/core/metadata/Definitions/metadata';

const page=(layoutVariant:LightningPageMetadata['layoutVariant'],
  canvasWidth:number,devices:LightningPageMetadata['devices']=['Desktop'])=>
  ({layoutVariant,canvasWidth,devices});

test('explicit Desktop always stays Desktop, including narrow custom canvas widths',()=>{
  assert.equal(pageBuilderPreviewDevice(page('Desktop',1080)),'Desktop');
  assert.equal(pageBuilderPreviewDevice(page('Desktop',390,['Desktop','Phone'])),'Desktop');
  assert.equal(pageBuilderPreviewDevice(page('Custom',1080,['Desktop'])),'Desktop');
  assert.equal(pageBuilderPreviewDevice(page('Custom',900,['Desktop','Phone'])),'Desktop');
  assert.equal(pageBuilderPreviewDevice(page('Custom',1024,['Custom'])),'Desktop');
});
test('explicit Mobile/Tablet and restricted Custom targets resolve correctly',()=>{
  assert.equal(pageBuilderPreviewDevice(page('Mobile',1920,['Desktop','Phone'])),'Phone');
  assert.equal(pageBuilderPreviewDevice(page('Tablet',1920,['Desktop'])),'Tablet');
  assert.equal(pageBuilderPreviewDevice(page('Custom',1440,['Phone'])),'Phone');
  assert.equal(pageBuilderPreviewDevice(page('Custom',1440,['Tablet'])),'Tablet');
  assert.equal(pageBuilderPreviewDevice(page('Custom',1440,['Tablet','Phone'])),'Tablet');
});
test('legacy pages without layout variant retain their original inference',()=>{
  assert.equal(pageBuilderPreviewDevice(page(undefined,390)),'Phone');
  assert.equal(pageBuilderPreviewDevice(page(undefined,1024)),'Tablet');
  assert.equal(pageBuilderPreviewDevice(page(undefined,1440)),'Desktop');
});

const image=(id:string,properties:Record<string,unknown>={}):PageComponentMetadata=>({
  id,type:'Custom:smart_image',label:id,visible:true,properties,
  position:{x:0,y:0,width:1080,height:850}
});
test('Fill canvas changes only one unlocked root position and preserves all bindings',()=>{
  const selected=image('background',{src:'asset-id',imageFit:'cover',formula:'@product'});
  const another=image('product-card',{objectApiName:'Product'});
  const original=[selected,another];
  const result=fitCanvasComponentToPage(original,selected.id,{width:1440,height:900});
  assert.deepEqual(result[0].position,{x:0,y:0,width:1440,height:900});
  assert.deepEqual(result[0].properties,selected.properties);
  assert.strictEqual(result[1],another);
  assert.deepEqual(selected.position,{x:0,y:0,width:1080,height:850});
});
test('Fill canvas refuses locked, grouped, nested, missing and invalid targets',()=>{
  const locked=image('locked',{editorLocked:true});
  const grouped=image('grouped',{canvasGroupId:'g1'});
  const nested=image('nested',{layoutParentId:'parent'});
  const regular=image('regular');
  const items=[locked,grouped,nested,regular];
  for(const id of ['locked','grouped','nested','missing']){
    const result=fitCanvasComponentToPage(items,id,{width:1440,height:900});
    assert.deepEqual(result,items);
  }
  assert.deepEqual(fitCanvasComponentToPage(items,'regular',{width:0,height:900}),items);
  assert.deepEqual(fitCanvasComponentToPage(items,'regular',{width:Infinity,height:900}),items);
});
test('Arrange command uses metadata/Undo and preview device respects saved variant',()=>{
  const source=readPageBuilderModules();
  const arrange=readFileSync(new URL('../src/core/builders/PageBuilder/ArrangeRibbon.tsx',import.meta.url),'utf8');
  assert.match(source,/const device = pageBuilderPreviewDevice\(page\);/);
  assert.match(source,/onFitToCanvas:\(\)=>\{[\s\S]*?applyPage\(\{\.\.\.page,components:fitCanvasComponentToPage/);
  assert.match(source,/formFactor=\{device\} previewLayoutDevice=\{device\}/);
  assert.match(arrange,/label:'Fill canvas'/);
});
