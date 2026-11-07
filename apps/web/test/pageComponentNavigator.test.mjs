import { readPageBuilderModules } from './helpers/builderSources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPageNavigatorEntries,filterPageNavigatorEntries} from '../src/core/builders/PageBuilder/pageComponentNavigatorModel.mjs';

const instance=(id,type,label,properties={},extra={})=>
  ({id,type,label,properties,visible:true,...extra});

test('empty search browses all placed components, with human captions and placeholders',()=>{
  const components=[
    instance('a','Custom:smart_button','Button',{label:'Customer display'}),
    instance('b','Custom:smart_button','Button',{buttonText:'Held sales'}),
    instance('c','Custom:smart_input','Input',{placeholder:'Search or scan products'}),
    instance('grid','Custom:smart_card_grid','Product catalogue',{sourceObject:'Product'})
  ];
  const snapshot=JSON.stringify(components);
  const entries=buildPageNavigatorEntries(components,{smart_button:'Button',smart_input:'Input',smart_card_grid:'Card Grid'});
  assert.equal(filterPageNavigatorEntries(entries,'').length,4);
  assert.deepEqual(entries.map(item=>item.name),['Customer display','Held sales','Search or scan products','Product catalogue']);
  assert.equal(JSON.stringify(components),snapshot,'navigation must not rewrite metadata or create record rows');
});

test('same-caption instances remain separate and can be located by type, ID, region and position',()=>{
  const components=[
    instance('home-1','Custom:smart_button','Button',{caption:'Home'},{region:'header',position:{x:8,y:10,width:64,height:48}}),
    instance('home-2','Custom:smart_button','Button',{caption:'Home'},{region:'header',position:{x:78,y:10,width:64,height:48}}),
    instance('home-3','Custom:smart_button','Button',{caption:'Home'},{region:'sidebar',position:{x:8,y:100,width:64,height:48}})
  ];
  const entries=buildPageNavigatorEntries(components,{smart_button:'Button'});
  assert.deepEqual(entries.map(item=>item.name),['Home · 1','Home · 2','Home · 3']);
  assert.equal(filterPageNavigatorEntries(entries,'button header').length,2);
  assert.deepEqual(filterPageNavigatorEntries(entries,'x:78').map(item=>item.id),['home-2']);
  assert.deepEqual(filterPageNavigatorEntries(entries,'home-3').map(item=>item.id),['home-3']);
});

test('nested hierarchy, hidden components, and formulated bindings are discoverable',()=>{
  const components=[
    instance('container','Custom:smart_container','Container',{label:'Current order'}),
    instance('discount','Custom:smart_badge','Badge',{badgeTextFormula:'"£" & @price',layoutParentId:'container'}, {visible:false}),
    instance('cart','Custom:smart_cart','Cart',{navigatorName:'Checkout basket',text:'Current order'})
  ];
  const entries=buildPageNavigatorEntries(components,{smart_container:'Container',smart_badge:'Badge',smart_cart:'Cart'});
  const child=entries.find(item=>item.id==='discount');
  assert.equal(child.path,'Canvas / Current order');
  assert.equal(child.hidden,true);
  assert.equal(child.depth,1);
  assert.deepEqual(filterPageNavigatorEntries(entries,'@price').map(item=>item.id),['discount']);
  assert.equal(entries.find(item=>item.id==='cart').name,'Checkout basket');
  assert.equal(filterPageNavigatorEntries(entries,'', 'Cart').length,1);
});

test('cycles and orphaned parents cannot suppress components or loop indefinitely',()=>{
  const components=[
    instance('a','Container','A',{layoutParentId:'b'}),
    instance('b','Container','B',{layoutParentId:'a'}),
    instance('c','Button','C',{layoutParentId:'missing'})
  ];
  const entries=buildPageNavigatorEntries(components);
  assert.deepEqual(new Set(entries.map(item=>item.id)),new Set(['a','b','c']));
});

test('View tab wires the navigator into existing selection, persisted rename and hidden canvas ancestors',()=>{
  const view=readPageBuilderModules();
  const navigator=readFileSync(new URL('../src/core/builders/PageBuilder/PageComponentNavigator.tsx',import.meta.url),'utf8');
  assert.match(view,/<PageComponentNavigator components=\{page.components\}/);
  assert.match(view,/selectCanvasIds\(page\.components,selectionIds,id,mode,selectedId\)/,
    'Layers selection must support replace, toggle, range and individual member modes');
  assert.match(view,/setSelectionIds\(next\)/);
  assert.match(navigator,/selectionIds\.includes\(item\.id\)/,
    'the navigator must show every multi-selected component');
  assert.match(view,/scrollIntoView\(\{block:'nearest'/);
  assert.match(view,/navigatorName:proposed/);
  assert.match(view,/Component Name already exists on this page layout/);
  assert.match(view,/isDescendantOf\(page.components,selectedId,component.id\)/);
  assert.match(navigator,/setOpen\(true\)/);
  assert.match(navigator,/matches.map\(/);
  assert.match(navigator,/componentInstanceNames\(components\)/);
  assert.match(navigator,/const name=names\.get\(entry\.id\)\?\?entry\.name/);
  assert.match(navigator,/onKeyDown=\{onSearchKeyDown\}/);
  assert.doesNotMatch(navigator,/query.trim\(\)\s*&&\s*createPortal/);
});
