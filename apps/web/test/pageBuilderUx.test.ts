import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import { pageBuilderPaletteCategories } from '../src/core/builders/PageBuilder/pageBuilderPalette';
import {
  addRecentPageBlock, describeBuilderFilters, loadRecentPageBlocks, pageBuilderCategoryLabels, pageBuilderStartOptions
} from '../src/core/builders/PageBuilder/pageBuilderUx';

test('all builder palette groups have short non-technical display labels', () => {
  assert.deepEqual(Object.keys(pageBuilderCategoryLabels).sort(), [...pageBuilderPaletteCategories].sort());
  for (const category of pageBuilderPaletteCategories) {
    assert.ok(pageBuilderCategoryLabels[category].length > 0);
    assert.ok(pageBuilderCategoryLabels[category].split(/\s+/).length <= 3);
  }
});

test('reused page types remain metadata-backed and human-readable', () => {
  assert.deepEqual(pageBuilderStartOptions.map(option => option.type), [
    'Home Page', 'Record Page', 'App Page'
  ]);
  for (const choice of pageBuilderStartOptions) {
    assert.ok(choice.title.length > 0 && choice.description.length > 0);
  }
});

test('recent blocks are bounded, deduplicated and reject invalid preferences', () => {
  assert.deepEqual(addRecentPageBlock(['Text','Image','Button'], 'Image'), ['Image','Text','Button']);
  assert.equal(addRecentPageBlock(['a','b','c'], 'd', 2).length, 2);
  assert.deepEqual(loadRecentPageBlocks('invalid'), []);
  assert.deepEqual(loadRecentPageBlocks('{"foo":"bar"}'), []);
  assert.deepEqual(loadRecentPageBlocks('["Text","Text",false,null,"Button"]'), ['Text','Button']);
  assert.equal(loadRecentPageBlocks(JSON.stringify(Array.from({length:20},(_,i)=>'Block'+i))).length,8);
});

test('journey mounts record filters inline and saves draft separately from publishing', () => {
  const source=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
  const engine=readFileSync(new URL('../src/core/builders/ComponentProperties/componentPropertiesView.tsx',import.meta.url),'utf8');
  assert.match(source,/Component Content/);
  assert.doesNotMatch(source,/page-ribbon-expanded-editor/);
  assert.match(source,/ribbonTab==='Source'/);
  assert.match(source,/ribbonFilterDraft/);
  assert.doesNotMatch(source,/onApply=\{\(\)=>\{/);
  assert.doesNotMatch(source,/onCancel=\{\(\)=>selectRibbonTab\('Component Data'\)\}/);
  assert.doesNotMatch(source,/dataEditorOpen|visibilityDialogOpen/);
  assert.match(engine,/mode==='filters-editor'/);
  assert.match(engine,/RecordFilterEditor/);
});

test('ribbon inline labels wrap and controls stay within their group dividers',()=>{
  const styles=readFileSync(new URL('../src/core/builders/PageBuilder/sections/04-page-builder.css',import.meta.url),'utf8');
  assert.match(styles,/\.office-ribbon-stack \.office-ribbon-inline-field \{[\s\S]*?display:flex!important;flex-wrap:nowrap/);
  assert.match(styles,/\.office-ribbon-field-name \{[\s\S]*?min-width:0;white-space:normal;overflow-wrap:anywhere/);
  assert.match(styles,/input:not\(\[type=checkbox\]\),select,textarea\) \{[\s\S]*?min-width:0!important;max-width:116px!important/);
});

test('ribbon keeps accessible component tabs without Home and Parity',()=>{
  const source=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
  for(const label of ['Insert','Data','Design','Layout','Arrange','Actions','Logic','View'])
    assert.ok(source.includes(`'${label}'`),label+' tab label remains available');
  for(const icon of ['Puzzle','Database','Type','SlidersHorizontal','Layers3','Smartphone','Workflow','Eye'])
    assert.ok(source.includes(icon),icon+' tab icon remains available');
  assert.match(source,/className="office-ribbon-topbar"/);
  assert.match(source,/role="tablist" aria-label="Page Builder tabs"/);
  assert.match(source,/aria-controls="page-builder-tab-content"/);
  assert.doesNotMatch(source,/ribbonTabsVisible.push\('Parity'\)/);
  assert.doesNotMatch(source,/\['Home','Add Block'/);
  assert.match(source,/title=\{selected\?\.label\|\|selected\?\.type\|\|'Welcome'\}/);
});

test('card gallery properties live in application code and are consumed by runtime', async () => {
  const component={propertyDefinitions:(await import('../src/component-libraries/ui_item_grid/app-properties.mjs')).propertyDefinitions};
  const registration=JSON.parse(readFileSync(new URL('../src/component-libraries/ui_item_grid/component.json',import.meta.url),'utf8'));
  assert.deepEqual(registration.propertyDefinitions,[]);
  const runtime=readFileSync(new URL('../src/component-libraries/shared/primitives/ItemGrid/ItemGrid.jsx',import.meta.url),'utf8');
  const keys=new Set(component.propertyDefinitions.map((definition:{propertyKey:string})=>definition.propertyKey));
  for(const key of ['imageWidth','imageHeight','imageFit','imageAspectRatio','imageShape',
    'headingFontSize','headingColor','descriptionFontSize','descriptionColor','valueFontSize']) {
    assert.equal(keys.has(key),true,key+' must be configurable');
    const computedTextProperty=/^(heading|description|value)(FontSize|Color|FontWeight|TextAlign|LineLimit)$/.test(key);
    assert.ok(computedTextProperty
      ? runtime.includes('p[part+"'+key.replace(/^(heading|description|value)/,'')+'"]')
        && runtime.includes('textStyleFor("'+key.match(/^(heading|description|value)/)?.[0]+'")')
      : runtime.includes('p.'+key),key+' must change rendering');
  }
  assert.ok(!keys.has('valueColor'),'retired Card Grid value color is not a public setting');
  for(const part of ['Image','Heading','Supporting text','Value','Card','Gallery'])
    assert.equal(component.propertyDefinitions.some((definition:{group?:string})=>definition.group===part),true,part);
});

test('Data ribbon uses friendly field labels, readable values and safe missing-field summaries',()=>{
  const fields=[{apiName:'IsActive',label:'Active',dataType:'Checkbox'},
    {apiName:'Department',label:'Department',dataType:'Picklist'}];
  assert.equal(describeBuilderFilters([],fields),'Add record filters');
  assert.equal(describeBuilderFilters([{field:'IsActive',operator:'Equals',value:'true'}],fields),'Active is Yes');
  assert.equal(describeBuilderFilters([
    {field:'Department',operator:'Equals',value:{source:'PageState',key:'selector'}},
    {field:'IsActive',operator:'Equals',value:'true'},
    {field:'Deleted',operator:'Equals',value:'foo'}
  ],fields),'Department is a page value; Active is Yes; +1 more');
});

test('Card Grid Add button remains compatible with saved values without exposing retired settings',()=>{
  const component=JSON.parse(readFileSync(new URL('../src/component-libraries/ui_item_grid/component.json',import.meta.url),'utf8'));
  const runtime=readFileSync(new URL('../src/component-libraries/shared/primitives/ItemGrid/ItemGrid.jsx',import.meta.url),'utf8');
  assert.ok(component.eventDefinitions.some((event:{apiName:string})=>event.apiName==='itemAdd'));
  assert.ok(!component.propertyDefinitions.some((property:{propertyKey:string})=>property.propertyKey==='separateAddButton'));
  assert.ok(!component.propertyDefinitions.some((property:{propertyKey:string})=>property.propertyKey==='showAddIcon'));
  assert.match(runtime,/hasSeparateAddButton=p.showAddIcon===true&&p.separateAddButton===true/);
  assert.match(runtime,/event.stopPropagation\(\);addSelectedRecord\(\)/);
  assert.match(runtime,/if\(p.actionFlows\?\.itemAdd\)fire\(p,"itemAdd",r\)/);
  assert.match(runtime,/onKeyDown=\{event=>/);
});

test('SQL-defined page controls move to Layout and all Quick Access commands stay on topbar',()=>{
  const source=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
  const content=source.slice(source.indexOf('className="office-ribbon-topbar"'),source.indexOf('id="page-builder-tab-content"'));
  assert.doesNotMatch(content,/aria-label="Page name"/);
  assert.match(content,/office-ribbon-quick-access/);
  assert.match(content,/quickAccessOrder\.map\(key=>/);
  for(const key of ['save','activate','resetIcon','undo','redo','cut','copy','paste'])
    assert.match(source,new RegExp("case '"+key+"'"));
  assert.match(source,/data-shared-group=\{group\}/);
  assert.match(source,/ribbonCatalog\.properties\.filter\(row=>row\.tab==='Home'&&/);
  assert.match(source,/office-ribbon-page-layout-groups/);
  const sql=readFileSync(new URL('../../server/src/system-support/migrations/20270122-global-shared-builder-ribbon.sql',import.meta.url),'utf8');
  assert.match(sql,/md_builder_shared_properties/);
  for(const property of ['backIcon','pageName','deviceLayout','canvasMode','canvasWidth','canvasHeight',
    'selectVersion','resetIcon','cut','copy','paste','undo','redo','save','activate'])
    assert.ok(sql.includes("'"+property+"'"),'Missing SQL Home control '+property);
  assert.doesNotMatch(source,/case 'pageName':/);
 assert.match(source,/id="new-lightning-page-label"/);
  assert.match(source,/aria-label="Choose page layout"/);
  assert.match(source,/aria-label="Cut"/);
  assert.match(source,/aria-label="Copy"/);
  assert.match(source,/aria-label="Paste"/);
  const advanced=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderAdvancedStyle.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/<PageBuilderAdvancedStyle/);
  assert.match(advanced,/office-ribbon-extra-grid/);
  assert.doesNotMatch(advanced,/createPortal/);
  assert.match(source,/office-ribbon-quick-access/);
  assert.doesNotMatch(source,/ribbonTab==='Component Responsive'/);
  assert.doesNotMatch(source,/<RibbonResponsive/);
});

test('colour pickers share a single accessible, metadata-backed palette',()=>{
  const source=readFileSync(new URL('../src/core/builders/PageBuilder/RibbonColorPalette.tsx',import.meta.url),'utf8');
  for(const token of ['Theme colours','Standard colours','More colours','aria-haspopup="dialog"','onChange(colour)'])
    assert.ok(source.includes(token),token);
  const styles=readFileSync(new URL('../src/core/builders/PageBuilder/sections/04-page-builder.css',import.meta.url),'utf8');
  assert.match(styles,/Excel-style 10-tab ribbon/);
  assert.match(styles,/height:146px!important;min-height:146px!important;max-height:146px!important/);
  assert.match(styles,/overflow:visible!important;padding:5px 6px/);
  assert.match(styles,/flex-wrap:nowrap!important/);
  assert.match(styles,/office-ribbon-colour-palette/);
});

test('design canvas selects Button and other live controls without firing actions',()=>{
  const view=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/core/builders/PageBuilder/sections/01-page-builder.css',import.meta.url),'utf8');
  const button=readFileSync(new URL('../src/core/components/SharedRuntime/SharedButton.jsx',import.meta.url),'utf8');
  assert.match(view,/const selectOnlyInDesigner = !previewMode && !libraryPreview/);
  assert.match(view,/onClick=\{selectOnlyInDesigner \? selectCanvasComponent : undefined\}/);
  assert.match(view,/onClickCapture=\{libraryPreview && !interactivePreview/);
  assert.match(view,/event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?selectCanvasComponent\(event\)/);
  assert.match(view,/hit\.closest\('\[data-component-id\]'\)!==event\.currentTarget/);
  assert.match(view,/canvas-design-interaction-shield/);
  assert.match(view,/selectOnlyInDesigner && !isLayoutContainer\(component\) && !isLayoutType\(component\.type\)/);
  assert.match(view,/builderPreview: !previewMode/);
  assert.match(css,/\.record-component > \.canvas-design-interaction-shield\{/);
  assert.match(css,/position:absolute;inset:0;z-index:90/);
  assert.match(button,/p\.builderPreview!==true/);
  // Saved click and Flow behaviour must remain available outside the designer.
  assert.match(button,/fire\(p,"click",p\.value\?\?true\)/);
});

test('Quick Access commands are real buttons, remain on the top rail, and Layout includes page settings',()=>{
 const view=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonBlueprint.css',import.meta.url),'utf8');
 for(const [key,label] of [['save','Save'],['activate','Activate'],['resetIcon','Reset component'],
  ['undo','Undo'],['redo','Redo'],['cut','Cut'],['copy','Copy'],['paste','Paste']]){
  assert.ok(view.includes("case '"+key+"':return <button"),key+' uses existing callbacks');
  assert.match(view,new RegExp('aria-label="'+label+'"'));
 }
 assert.match(view,/quickAccessOrder\.map\(key=>/);
 assert.match(view,/aria-label="Quick Access Toolbar"/);
 assert.match(view,/ribbonTab==='Component Layout' && ribbonCatalog/);
 for(const group of ['Page','Device','Canvas','Version'])
  assert.ok(view.includes("'"+group+"'"),group+' remains in Layout');
 assert.doesNotMatch(view,/Unsaved edits/);
 assert.match(view,/selected \? \(selected\.label\|\|selected\.type\)\+' selected' : 'Welcome'/);
 assert.match(css,/\.office-ribbon-topbar-back/);
 assert.match(css,/\.office-ribbon-quick-access/);
 assert.match(css,/\.office-ribbon-page-layout-groups/);
});
