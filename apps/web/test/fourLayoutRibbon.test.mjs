import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ribbon=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonStyle.tsx',import.meta.url),'utf8');
const responsive=ribbon.slice(ribbon.indexOf('export function RibbonResponsive'));

test('independent page layouts have no redundant per-device ribbon visibility switches',()=>{
 for(const label of ['Desktop','Tablet','Mobile']){
  assert.doesNotMatch(responsive,new RegExp('Show on '+label));
 }
 for(const key of ['hideOnDesktop','hideOnTablet','hideOnPhone']){
  assert.doesNotMatch(responsive,new RegExp(key));
 }
});

test('visibility rules and selected-layout component visibility remain editable',()=>{
 const builder=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(responsive,/onVisibleChange\(event\.target\.checked\)/);
 assert.match(builder,/RibbonVisibilityRules/);
 assert.match(builder,/Edit visibility rules/);
 assert.match(builder,/onApply=\{applyVisibilityEditor\}/);
});
