import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Insert gallery CSS targets the current JSX wrapper, not only the removed browser sidebar',()=>{
  const jsx=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonGallery.css',import.meta.url),'utf8');
  assert.match(jsx,/className="office-ribbon-add-library"/);
  assert.match(jsx,/className="office-ribbon-gallery-pages"/);
  assert.match(css,/#page-builder-tab-content > \.office-ribbon-add-library > \.office-ribbon-gallery-pages/);
  assert.match(jsx,/className="office-ribbon-gallery-group-tiles"/);
  assert.match(jsx,/components\.slice\(index\*4,index\*4\+4\)/);
  assert.match(css,/\.office-ribbon-component-tile > span \{/);
});
