import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const manifest=JSON.parse(readFileSync(new URL('../src/one/manifest.json',import.meta.url),'utf8')) as {components:string[]};

test('all 35 registered UNE components own a separate valid lightweight SVG ribbon icon',()=>{
  assert.equal(manifest.components.length,35);
  const paths=new Set<string>();
  for(const component of manifest.components){
    const id=component.split('/')[0];
    const path=new URL(`../public/une/ribbon-icons/${id}.svg`,import.meta.url);
    assert.equal(existsSync(path),true,`Missing independent SVG icon for ${id}`);
    const svg=readFileSync(path,'utf8');
    assert.match(svg,/<svg[^>]+viewBox="0 0 24 24"/);
    assert.match(svg,/<\/(?:svg)>/);
    assert.doesNotMatch(svg,/<script|<foreignObject|<image|javascript:/i);
    paths.add(id);
  }
  assert.equal(paths.size,35);
});

test('the Insert ribbon resolves registered UNE SVGs and keeps legacy icon fallback',()=>{
  const resolver=readFileSync(new URL('../src/core/builders/PageBuilder/uneRibbonIcon.tsx',import.meta.url),'utf8');
  const page=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
  assert.match(resolver,/bundledUneIcons\.has\(id\)/);
  assert.match(resolver,/if\(!bundledUneIcons\.has\(id\)\) return fallback/);
  assert.match(resolver,/import\.meta\.env\.BASE_URL/);
  assert.match(page,/const svgIcon=uneRibbonIcon\(component\.type,null\)/);
  assert.match(page,/if\(svgIcon\)return svgIcon/);
});
