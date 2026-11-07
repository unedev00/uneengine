import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=(relative:string)=>readFileSync(new URL(relative,import.meta.url),'utf8');
test('Insert connects registered Smart components to clickable two-row tiles',()=>{
 const palette=file('../src/core/builders/PageBuilder/editor/ribbon/usePagePalette.tsx');
 const ribbon=file('../src/core/builders/PageBuilder/editor/ribbon/createPageRibbon.tsx');
 const gallery=file('../src/core/builders/PageBuilder/SmartInsertRibbon.tsx');
 const css=file('../src/core/builders/PageBuilder/SmartInsertRibbon.css');
 assert.match(palette,/RETIRED_UNE_PAGE_BUILDER_COMPONENTS/);
 assert.match(ribbon,/<SmartInsertRibbon\s+items=\{paletteComponents\}\s+onInsert=\{addPaletteComponent\}/);
 assert.match(gallery,/items\.filter\(isSmartInsertItem\)/);
 assert.match(gallery,/key=\{item\.type\}[\s\S]*?onClick=\{\(\)=>onInsert\(item\.type\)\}/);
 assert.match(css,/grid-template-rows:repeat\(2,55px\)/);
 assert.match(css,/flex-direction:column!important/);
});
test('Data commands grey out unsupported records and filters for image component',()=>{
 const data=file('../src/core/builders/PageBuilder/PageBuilderRibbonData.tsx');
 assert.match(data,/disabled=\{!supportsFilters\}/);
 assert.match(data,/disabled=\{!supportsLogic\}/);
 assert.match(data,/disabled=\{!objectDef\}/);
 assert.match(data,/Not supported by selected component/);
});
test('Image Content uses the existing tenant media picker and full-width separate controls',()=>{
 const view=file('../src/core/builders/PageBuilder/editor/PageBuilderWorkspace.tsx');
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
