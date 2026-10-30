import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=(relative:string)=>readFileSync(new URL(relative,import.meta.url),'utf8');
test('Insert exposes unique eligible standard and registered components in two-row vertical tiles',()=>{
 const view=file('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const css=file('../src/core/builders/PageBuilder/PageBuilderRibbonNonDesign.css');
 assert.match(view,/seenRibbonComponents=new Set<string>\(\)/);
 assert.doesNotMatch(view,/if\(!\/\^une_/);
 assert.match(view,/RETIRED_UNE_PAGE_BUILDER_COMPONENTS/);
 assert.match(view,/seenRibbonComponents\.has\(component\.type\)/);
 assert.match(view,/components\.slice\(index\*4,index\*4\+4\)/);
 assert.match(css,/grid-template-rows:repeat\(2,39px\)/);
 assert.match(css,/flex-direction:column!important/);
 assert.match(css,/grid-template-columns:var\(--une-ribbon-tile-width\)/);
 assert.doesNotMatch(css,/\[aria-label="Component Properties"\]/);
});
test('Data commands grey out unsupported records and filters for image component',()=>{
 const data=file('../src/core/builders/PageBuilder/PageBuilderRibbonData.tsx');
 assert.match(data,/disabled=\{!supportsFilters\}/);
 assert.match(data,/disabled=\{!supportsLogic\}/);
 assert.match(data,/disabled=\{!objectDef\}/);
 assert.match(data,/Not supported by selected component/);
});
test('Image Content uses the existing tenant media picker and full-width separate controls',()=>{
 const view=file('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const image=file('../src/core/builders/PageBuilder/RibbonImageContent.tsx');
 const picker=file('../src/core/builders/ComponentProperties/TenantMediaPicker.tsx');
 assert.match(view,/selectedCustomDefinition\?\.apiName==='ui_image'/);
 assert.match(view,/RibbonImageContent/);
 for(const action of ['Upload image','Choose from library','Image URL','Dynamic source','Image fit'])
   assert.ok(image.includes(action),action);
 assert.match(image,/TenantMediaPicker value=\{src\} initiallyOpen assetOnly/);
 assert.match(picker,/useState\(initiallyOpen\)/);
 assert.match(image,/createPortal/);
});
