import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../../../',import.meta.url);
const remarks=readFileSync(new URL('docs/page-builder-ribbon-remarks-source-20261028.md',root),'utf8');
const rows=remarks.split(/\r?\n/).map(line=>line.split('|').slice(1,4).map(part=>part?.trim()))
 .filter(row=>row.length===3&&row[0]&&row[0]!=='Component'&&!row[0].startsWith('--'));
const manifest=JSON.parse(readFileSync(new URL('../src/one/manifest.json',import.meta.url),'utf8'));
const aliases={'UNE Card Grid':'une_item_grid'};
const apiName=label=>aliases[label]??label.toLowerCase().replaceAll(' ','_');
const components=new Map(manifest.components.map(path=>{
 const component=JSON.parse(readFileSync(new URL('../src/one/'+path,import.meta.url),'utf8'));
 return [component.apiName,component];
}));

test('the complete approved remarks inventory is checked rather than screenshot examples',()=>{
 assert.equal(rows.length,713,'approved remarks file must be complete');
 assert.equal(components.size,36);
 const checked=new Set();
 for(const [name,label,remark] of rows){
  if(!name.startsWith('UNE '))continue;
  const api=apiName(name);
  const component=components.get(api);
  assert.ok(component,name+' missing from audited source manifests');
  if(/Delete Compoenent properties and from ribbon|don’t need theme|Not relevant/.test(remark)){
   assert.ok(!component.propertyDefinitions.some(property=>property.label===label),
    api+' still declares explicitly deleted property '+label);
   checked.add(api+'|'+label);
  }
  if(remark==='Source Object'){
   assert.ok(component.propertyDefinitions.some(property=>property.label==='Source Object'||
    property.label.startsWith('Source Object — ')),
    api+' has no consolidated Source Object metadata');
  }
  if(remark==='Use flow to parse value')
   assert.ok(!component.propertyDefinitions.some(property=>property.label===label),
    api+' still exposes Flow/Page State collection');
 }
 assert.ok(checked.size>=300,'must audit all explicit UNE property deletions');
 for(const component of components.values())
  for(const label of ['Lock position','Edit visibility rules','Show on desktop','Show on tablet','Show on mobile','Show component'])
   assert.ok(!component.propertyDefinitions.some(property=>property.label===label),
    component.apiName+' still contains '+label);
});
