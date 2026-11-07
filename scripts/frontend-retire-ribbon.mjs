import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
const root=process.cwd();
const prefix='apps/web/src/core/builders/PageBuilder/';
const retired=['UneBuilderRibbon','PageBuilderRibbonData','PageBuilderRibbonContent',
 'PageBuilderRibbonEditors','PageBuilderRibbonStyle','PageBuilderAdvancedStyle',
 'PageBuilderAdvancedResponsive','RibbonCapabilityControls',
 'RibbonImageContent','PageBuilderRibbonMetadataPager','UneExpressionEditor'];
const targets=retired.map(name=>prefix+name+'.tsx');
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const write=(rel,s)=>fs.writeFileSync(path.join(root,rel),s);
const sources=tracked.filter(p=>p.startsWith('apps/web/src/')&&/\.(tsx?|jsx?|mjs)$/.test(p)&&!targets.includes(p));
const refs=[];
for(const stem of retired)for(const file of sources){
 if(read(file).includes(stem))refs.push({module:stem,consumer:file});
}
if(refs.length)throw Error('Still referenced by runtime, cannot retire: '+JSON.stringify(refs));
for(const rel of targets)fs.unlinkSync(path.join(root,rel));
for(const name of ['UneBuilderRibbon.css','PageBuilderRibbonGallery.css'])
 fs.unlinkSync(path.join(root,prefix+name));
const view=prefix+'pageBuilderView.tsx';
const oldView=read(view);
const galleryImport="import './PageBuilderRibbonGallery.css';\n";
if(!oldView.includes(galleryImport))throw Error('Expected obsolete gallery CSS import missing');
write(view,oldView.replace(galleryImport,''));
const nonDesign=prefix+'PageBuilderRibbonNonDesign.css';
const disabled=read(nonDesign).match(/\.office-builder-ribbon #page-builder-tab-content\[aria-label="Component Data"\] :is\(input,select,button\):disabled\s*\{[^}]*\}/);
if(!disabled)throw Error('Generic disabled controls style missing');
write(nonDesign,'/* Preserved active disabled-control styling; retired gallery/image rules removed. */\n'+disabled[0]+'\n');
const removedTests=[];
const tests=tracked.filter(p=>p.startsWith('apps/web/test/')&&/\.(?:ts|tsx|js|mjs)$/.test(p));
for(const file of tests){
 if(['apps/web/test/fourLayoutRibbon.test.mjs','apps/web/test/pageBuilderInsertGalleryLayout.test.ts'].includes(file))continue;
 let input=read(file);
 if(!retired.some(stem=>input.includes(stem)))continue;
 const sf=ts.createSourceFile(file,input,ts.ScriptTarget.Latest,true,file.endsWith('.ts')?ts.ScriptKind.TS:ts.ScriptKind.JS);
 if(sf.parseDiagnostics.length)throw Error('Cannot safely parse test '+file);
 const edits=[];
 for(const node of sf.statements){
  if(!ts.isExpressionStatement(node)||!ts.isCallExpression(node.expression))continue;
  const c=node.expression;
  if(c.expression.getText(sf)!=='test'&&c.expression.getText(sf)!=='it')continue;
  if(!retired.some(stem=>node.getText(sf).includes(stem)))continue;
  edits.push([node.getFullStart(),node.end]);
  removedTests.push(file+' '+(c.arguments[0]?.getText(sf)||'unnamed'));
 }
 for(const [start,end] of edits.sort((a,b)=>b[0]-a[0]))input=input.slice(0,start)+input.slice(end);
 write(file,input);
}
write('apps/web/test/fourLayoutRibbon.test.mjs',"import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {readFileSync} from 'node:fs';\nimport {readPageBuilderModules} from './helpers/builderSources.mjs';\ntest('active ribbons use shared responsive layouts without legacy override switches',()=>{\n const code=readFileSync(new URL('../src/core/builders/PageBuilder/editor/ribbon/createPageRibbon.tsx',import.meta.url),'utf8');\n const runtime=readPageBuilderModules();\n assert.match(code,/<SmartRibbon/);\n assert.match(code,/<SmartInsertRibbon/);\n assert.doesNotMatch(code,/hideOnDesktop|hideOnTablet|hideOnPhone/);\n assert.match(runtime,/PageBuilderVisibilityDialog/);\n});\n");
write('apps/web/test/pageBuilderInsertGalleryLayout.test.ts',"import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {existsSync,readFileSync} from 'node:fs';\ntest('Insert uses the current Smart component gallery, not retired browser markup',()=>{\n const base=new URL('../src/core/builders/PageBuilder/',import.meta.url);\n const ribbon=readFileSync(new URL('SmartInsertRibbon.tsx',base),'utf8');\n const styles=readFileSync(new URL('SmartInsertRibbon.css',base),'utf8');\n const page=readFileSync(new URL('editor/ribbon/createPageRibbon.tsx',base),'utf8');\n assert.match(ribbon,/items\\.filter\\(isSmartInsertItem\\)/);\n assert.match(ribbon,/className=\"smart-insert-tiles\"/);\n assert.match(ribbon,/onClick=\\{\\(\\)=>onInsert\\(item\\.type\\)\\}/);\n assert.match(styles,/grid-template-rows:repeat\\(2,55px\\)/);\n assert.match(page,/<SmartInsertRibbon/);\n assert.doesNotMatch(page,/office-ribbon-add-library/);\n assert.equal(existsSync(new URL('PageBuilderRibbonGallery.css',base)),false);\n});\n");
write('apps/web/test/retiredPageBuilderRuntime.test.mjs',"import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {existsSync,readFileSync} from 'node:fs';\nconst base=new URL('../src/core/builders/PageBuilder/',import.meta.url);\ntest('retired duplicate Page Builder components are no longer compiled as source',()=>{\n for(const file of [\n  'UneBuilderRibbon.tsx','PageBuilderRibbonData.tsx','PageBuilderRibbonContent.tsx',\n  'PageBuilderRibbonEditors.tsx','PageBuilderRibbonStyle.tsx',\n  'PageBuilderAdvancedStyle.tsx','PageBuilderAdvancedResponsive.tsx',\n  'RibbonCapabilityControls.tsx','RibbonImageContent.tsx',\n  'PageBuilderRibbonMetadataPager.tsx','UneExpressionEditor.tsx',\n  'UneBuilderRibbon.css','PageBuilderRibbonGallery.css'\n ])assert.equal(existsSync(new URL(file,base)),false,file+' must stay retired');\n});\ntest('active Page Builder preserves Smart ribbons, component palette and metadata editing',()=>{\n const page=readFileSync(new URL('editor/ribbon/createPageRibbon.tsx',base),'utf8');\n const insert=readFileSync(new URL('SmartInsertRibbon.tsx',base),'utf8');\n const editor=readFileSync(new URL('../ComponentProperties/ComponentPresentationProperties.tsx',base),'utf8');\n assert.match(page,/<SmartRibbon/);\n assert.match(page,/<SmartInsertRibbon/);\n assert.match(insert,/onInsert\\(item\\.type\\)/);\n assert.match(editor,/RibbonFieldExpressionInput/);\n});\n");
const pkg=JSON.parse(read('package.json'));
pkg.scripts['test:components']=pkg.scripts['test:components'].replace(
 'apps/web/test/canvasInteractionUX.test.ts',
 'apps/web/test/canvasInteractionUX.test.ts apps/web/test/retiredPageBuilderRuntime.test.mjs apps/web/test/pageBuilderInsertGalleryLayout.test.ts');
write('package.json',JSON.stringify(pkg,null,2)+'\n');
fs.writeFileSync('/tmp/retired-ribbon-summary.json',JSON.stringify({
 removedModules:targets,removedStyles:['UneBuilderRibbon.css','PageBuilderRibbonGallery.css'],
 slimmedStyle:nonDesign,removedStaleTestCases:removedTests
},null,2)+'\n');
console.log(JSON.stringify({removedModules:targets.length,removedCssFiles:2,staleSourceBasedTestsReplaced:removedTests.length},null,2));
