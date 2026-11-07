import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const base=new URL('../src/core/builders/PageBuilder/',import.meta.url);
test('retired duplicate Page Builder components are no longer compiled as source',()=>{
 for(const file of [
  'UneBuilderRibbon.tsx','PageBuilderRibbonData.tsx','PageBuilderRibbonContent.tsx',
  'PageBuilderRibbonEditors.tsx','PageBuilderRibbonStyle.tsx',
  'PageBuilderAdvancedStyle.tsx','PageBuilderAdvancedResponsive.tsx',
  'RibbonCapabilityControls.tsx','RibbonImageContent.tsx',
  'PageBuilderRibbonMetadataPager.tsx','UneExpressionEditor.tsx',
  'UneBuilderRibbon.css','PageBuilderRibbonGallery.css'
 ])assert.equal(existsSync(new URL(file,base)),false,file+' must stay retired');
});
test('active Page Builder preserves Smart ribbons, component palette and metadata editing',()=>{
 const page=readFileSync(new URL('editor/ribbon/createPageRibbon.tsx',base),'utf8');
 const insert=readFileSync(new URL('SmartInsertRibbon.tsx',base),'utf8');
 const editor=readFileSync(new URL('../ComponentProperties/ComponentPresentationProperties.tsx',base),'utf8');
 assert.match(page,/<SmartRibbon/);
 assert.match(page,/<SmartInsertRibbon/);
 assert.match(insert,/onInsert\(item\.type\)/);
 assert.match(editor,/RibbonFieldExpressionInput/);
});
