import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Resolve local CSS imports so stylesheet contract tests work with modular CSS.
async function readModularCss(url: URL): Promise<string> {
  const filename = fileURLToPath(url);
  const source = await readFile(filename, 'utf8');
  const imports = [...source.matchAll(/^@import\s+["'](\.\/[^"']+\.css)["'];\s*$/gm)];
  let expanded = source;
  for (const entry of imports) {
    const importedUrl = new URL('file://' + resolve(dirname(filename), entry[1]));
    const contents = await readModularCss(importedUrl);
    expanded = expanded.replace(entry[0], contents);
  }
  return expanded;
}

import { pageAppearanceTarget, pageAppearanceStyleKeys, resolvePageComponentStyle, visualDefaults } from '../src/core/pages/TemplatePageRuntime/pageComponentLayout';
import { snapCanvasPosition, snapCanvasSize, wrapCanvasComponent, ungroupCanvasComponent, alignCanvasComponents, distributeCanvasComponents } from '../src/core/builders/PageBuilder/canvasInteractions';
import { copyComponentTree, cloneComponentTree, assignTabOnReparent } from '../src/core/builders/PageBuilder/pageComponentTree';

test('canvas movement aligns with adjacent element edges and returns visible guide flags', () => {
  const result = snapCanvasPosition(
    { x:96, y:119, width:100, height:80 },
    { width:1000, height:600 },
    [{ x:100, y:120, width:150, height:80 }],
    false
  );
  assert.equal(result.position.x,100);
  assert.equal(result.position.y,120);
  assert.deepEqual(result.guides,{x:true,y:true});
});

test('snap works at canvas bounds without shrinking elements', () => {
  const result = snapCanvasPosition(
    { x:900, y:540, width:200, height:120 },
    { width:1000, height:600 },[],true
  );
  assert.equal(result.position.x,800);
  assert.equal(result.position.y,480);
  assert.equal(result.position.width,200);
  assert.equal(result.position.height,120);
});

test('resizing constrains dimensions to the canvas without corrupting metadata', () => {
  const result = snapCanvasSize(
    { x:100, y:120, width:80, height:80 },1000,1000,
    { width:800, height:600 },{width:40,height:40},false
  );
  assert.equal(result.width,700);
  assert.equal(result.height,480);
});

test('group and ungroup retain the original component position and properties', () => {
  const original = [{
    id:'card1',type:'Custom:Example',label:'Example',visible:true,region:'main' as const,
    properties:{value:'User customization'},position:{x:32,y:64,width:240,height:180}
  }];
  const wrapped = wrapCanvasComponent(original,'card1','group1');
  assert.equal(wrapped.length,2);
  assert.equal(wrapped[1].parentId,'group1');
  const restored = ungroupCanvasComponent(wrapped,'group1');
  assert.equal(restored.length,1);
  assert.equal(restored[0].position?.x,32);
  assert.equal(restored[0].position?.y,64);
  assert.equal(restored[0].properties.value,'User customization');
});


test('multi-select alignment updates every selected unlocked component in one immutable result', () => {
  const components = [
    {id:'a',type:'Card',label:'A',visible:true,region:'main' as const,properties:{},position:{x:80,y:20,width:100,height:60}},
    {id:'b',type:'Card',label:'B',visible:true,region:'main' as const,properties:{},position:{x:220,y:90,width:200,height:80}},
    {id:'locked',type:'Card',label:'Locked',visible:true,region:'main' as const,properties:{canvasLocked:true},position:{x:60,y:40,width:120,height:60}},
    {id:'other',type:'Card',label:'Other',visible:true,region:'main' as const,properties:{},position:{x:30,y:10,width:80,height:40}}
  ];
  const aligned = alignCanvasComponents(components,['a','b','locked'],'x','center',{width:800,height:600});
  assert.equal(aligned[0].position?.x,200);
  assert.equal(aligned[1].position?.x,150);
  assert.equal(aligned[2].position?.x,60);
  assert.equal(aligned[3].position?.x,30);
  assert.notEqual(aligned,components);
  assert.equal(components[0].position?.x,80,'original component objects are not mutated');
});


test('dragging or adding a nested block preserves the selected tab identity',()=>{
  const items=[
    {id:'tabs',type:'Tabs',label:'Tabs',visible:true,properties:{tabs:['Overview','Related']}},
    {id:'content',type:'Rich Text',label:'Content',visible:true,parentId:'tabs',
      properties:{layoutParentId:'tabs',tabLabel:'Overview'}}
  ];
  const moved=assignTabOnReparent(items,'content','tabs','Related');
  assert.equal(moved[1].properties.tabLabel,'Related');
  assert.equal(items[1].properties.tabLabel,'Overview');
  const fallback=assignTabOnReparent(moved,'content','tabs','Missing');
  assert.equal(fallback[1].properties.tabLabel,'Overview');
});

test('nested component clipboard duplicates every descendant with remapped IDs', () => {
  const original = [
    {id:'root',type:'Tabs',label:'Tabs',visible:true,properties:{tabs:['Details','Related']}},
    {id:'nested',type:'Accordion',label:'Accordion',visible:true,parentId:'root',
      properties:{layoutParentId:'root',tabLabel:'Details'}},
    {id:'inner',type:'Custom:Demo',label:'Data',visible:true,parentId:'nested',
      properties:{layoutParentId:'nested',dataSource:'Customer'}}
  ];
  const clipboard=copyComponentTree(original,'root');
  let index=0;
  const copy=cloneComponentTree(clipboard,null,()=>String(++index),0);
  assert.equal(copy.components.length,3);
  assert.equal(copy.rootId,'1');
  assert.equal(copy.components[1].parentId,'1');
  assert.equal(copy.components[2].parentId,'2');
  assert.equal(copy.components[2].properties.layoutParentId,'2');
  assert.equal(copy.components[2].properties.dataSource,'Customer');
  assert.equal(original[2].parentId,'nested');
});

test('distribution uses selected bounds and ignores locked elements', () => {
  const source=[
    {id:'a',type:'Card',label:'A',visible:true,properties:{},position:{x:0,y:0,width:100,height:60}},
    {id:'b',type:'Card',label:'B',visible:true,properties:{},position:{x:260,y:0,width:100,height:60}},
    {id:'c',type:'Card',label:'C',visible:true,properties:{},position:{x:400,y:0,width:100,height:60}},
    {id:'locked',type:'Card',label:'Locked',visible:true,properties:{canvasLocked:true},
      position:{x:32,y:0,width:50,height:60}}
  ];
  const result=distributeCanvasComponents(source,['a','b','c','locked'],'x');
  assert.deepEqual(result.slice(0,3).map(item=>item.position?.x),[0,200,400]);
  assert.equal(result[3].position?.x,32);
});

test('Page Builder records and restores selection state with undo and redo', async () => {
  const source = await readFile(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx', import.meta.url), 'utf8');
  assert.match(source, /setSelectionUndoStack\(current =>/);
  assert.match(source, /selectionIds: \[\.\.\.selectionIds\]/);
  assert.match(source, /const snapshot = selectionRedoStack\[selectionRedoStack\.length - 1\]/);
  assert.match(source, /alignCanvasComponents\(page\.components/);
});

test('Free Canvas uses clean component objects and a compact ribbon-based palette', async () => {
  const source = await readFile(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx', import.meta.url), 'utf8');
  const styles = await readModularCss(new URL('../src/core/builders/PageBuilder/styles-md227.css', import.meta.url));

  assert.doesNotMatch(source, /className="record-component-head"/);
  assert.doesNotMatch(source, /Select a component to add it, or drag it onto the canvas\./);
  assert.doesNotMatch(source, /Free Canvas uses registered components from the shared library\./);
  assert.match(source, /className="office-ribbon-add-library"/);
  assert.match(source, /className="office-ribbon-component-tiles"/);
  assert.match(source, /ribbonComponentGroups\.flatMap\(group=>group\.components\)/);
  assert.doesNotMatch(source, /ribbonComponentSearch\.trim\(\)/);
  assert.match(source, /ribbonAddOffset/);
  assert.match(source, /aria-label="Component category"/);
  assert.match(source, /onClick=\{\(\)=>addPaletteComponent\(component\.type\)\}/);
  assert.doesNotMatch(source, /remainingRibbonComponents\.map\(component=>/);
  assert.doesNotMatch(source, /<aside className="component-panel"/);
  assert.doesNotMatch(source, /renderPaletteComponentPreview/);
  assert.match(styles, /\.office-ribbon-library-items/);
  assert.match(styles, /\.page-builder-layout \.page-preview-area/);
});

test('Page Builder property editors filter controls by selected component capabilities', async () => {
  const builder = await readFile(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx', import.meta.url), 'utf8');
  const visual = await readFile(new URL('../src/core/builders/ComponentStyleEditor/PageComponentVisualEditor.tsx', import.meta.url), 'utf8');
  const advanced = await readFile(new URL('../src/core/builders/ComponentStyleEditor/PageComponentStyleEditor.tsx', import.meta.url), 'utf8');
  const capabilities = await readFile(new URL('../src/core/builders/ComponentStyleEditor/componentAppearanceCapabilities.ts', import.meta.url), 'utf8');

  // A single metadata-aware editor owns each responsibility.
  const ribbonStyle=await readFile(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonStyle.tsx',import.meta.url),'utf8');
  assert.match(builder, /<RibbonDesign properties=\{selected\.properties\}/);
  assert.match(builder, /<RibbonFormat properties=\{selected\.properties\}/);
  assert.match(builder, /<RibbonResponsive properties=\{selected\.properties\}/);
  assert.match(ribbonStyle, /RibbonColorPalette kind="text"/);
  assert.match(ribbonStyle, /availableComponentSettings/);
  assert.doesNotMatch(builder, /<PageComponentStyleEditor section="all"/);
  assert.match(visual, /numericPresets\.filter\(preset => supportsAppearanceProperty\(componentType, preset\.key\)\)/);
  assert.match(visual, /appearanceNumberFields\.filter\(\(\{key\}\) => supportsAppearanceProperty\(componentType, key\)\)/);
  assert.match(advanced, /numeric\.filter\(\(\[key\]\)=>supportsAppearanceProperty\(componentType,key\)\)/);
  assert.match(advanced, /componentAppearanceCapabilities\(componentType\)\.container/);
  assert.match(capabilities, /return capabilities\.container/);
  assert.match(capabilities, /return capabilities\.text \|\| capabilities\.data/);
});

test('Appearance targets the control without creating a rounded outer shell', () => {
  assert.equal(pageAppearanceTarget('Custom:OneSearch'),'input');
  assert.equal(pageAppearanceTarget('Custom:UneInput'),'input');
  assert.equal(pageAppearanceTarget('Custom:OneButton'),'button');
  assert.equal(pageAppearanceTarget('Custom:UneBadge'),'badge');
  assert.equal(pageAppearanceTarget('Custom:UneCard'),'surface');
  assert.equal(pageAppearanceTarget('Custom:UneImage'),'image');
  assert.equal(pageAppearanceTarget('Custom:UneProgress'),'progress');
  assert.equal(pageAppearanceTarget('Container'),'layout');
  assert.equal(pageAppearanceTarget('Custom:UneToggle'),'toggle');
  assert.equal(pageAppearanceTarget('Custom:UneTable'),'table');
  assert.equal(pageAppearanceTarget('Custom:OneItemGrid'),'collection');
  assert.equal(pageAppearanceTarget('Custom:UneCalendar'),'calendar');
  assert.equal(pageAppearanceTarget('Custom:UneModal'),'overlay');

  const pill = resolvePageComponentStyle({visualStyle:{borderRadius:64}},'Custom:OneSearch');
  assert.equal(pageAppearanceStyleKeys(pill),'radius');
  assert.equal((pill as Record<string,unknown>)['--md-page-radius'],'64px');
  assert.equal(pill.borderRadius,undefined,'the bounding box must not receive the pill');
  assert.equal(pill.backgroundColor,undefined);
  assert.equal((pill as Record<string,unknown>)['--md-page-padding'],undefined);

  const unstyled = resolvePageComponentStyle({},'Custom:OneSearch');
  assert.equal(pageAppearanceStyleKeys(unstyled),'');
  assert.equal(unstyled.padding,undefined);
  assert.equal(unstyled.backgroundColor,undefined);

  const legacy = resolvePageComponentStyle({visualStyle:{...visualDefaults,borderRadius:64}},'Custom:OneSearch');
  assert.equal(pageAppearanceStyleKeys(legacy),'radius','legacy full snapshots cannot add default borders/padding');
  assert.equal((legacy as Record<string,unknown>)['--md-page-radius'],'64px');

  const noBorder = resolvePageComponentStyle({visualStyle:{borderWidth:0}},'Custom:OneSearch');
  assert.equal(pageAppearanceStyleKeys(noBorder),'border');
  assert.equal((noBorder as Record<string,unknown>)['--md-page-border-width'],'0px');

  const responsive = resolvePageComponentStyle({layoutStyle:{borderRadius:6},layoutResponsive:{Tablet:{borderRadius:28}}},'Custom:UneButton','Tablet');
  assert.equal(pageAppearanceStyleKeys(responsive),'radius');
  assert.equal((responsive as Record<string,unknown>)['--md-page-radius'],'28px');

  const container = resolvePageComponentStyle({visualStyle:{borderRadius:28}},'Container');
  assert.equal(container.borderRadius,28,'layout containers retain their actual surface styles');
});

test('builder and published runtime use the same appearance targeting and preserve native control defaults', async () => {
  const root = new URL('../src/core/',import.meta.url);
  const builder = await readFile(new URL('builders/PageBuilder/pageBuilderView.tsx',root),'utf8');
  const runtime = await readFile(new URL('pages/PageRuntime/pageRuntimeViews.tsx',root),'utf8');
  const css = await readFile(new URL('pages/TemplatePageRuntime/pageComponentAppearance.css',root),'utf8');
  const editor = await readFile(new URL('builders/ComponentStyleEditor/PageComponentVisualEditor.tsx',root),'utf8');
  const search = await readFile(new URL('../src/one/OneSearch/OneSearch.jsx',import.meta.url),'utf8');
  for (const code of [builder,runtime]) {
    assert.match(code,/data-page-appearance=\{/);
    assert.match(code,/data-page-style=\{pageAppearanceStyleKeys\(/);
    assert.match(code,/pageComponentAppearance.css/);
  }
  assert.match(css,/data-page-style~="radius"/);
  assert.ok(css.includes('background:transparent!important'),'editor frames must not become visible shells');
  assert.match(css,/--md-page-radius/);
  assert.match(editor,/onChange\(\{ \.\.\.authored, \[key\]: next \}\)/);
  assert.match(search,/p\.showLabel===true/);
  assert.match(search,/aria-label=\{p\.label\|\|"Search"\}/);
});

test('every bundled UNE Page component has an explicitly verified appearance target', async () => {
  const manifest = JSON.parse(await readFile(new URL('../src/one/manifest.json', import.meta.url), 'utf8'));
  const expected: Record<string,string> = {
    une_text:'text',une_image:'image',une_calendar:'calendar',
    une_button:'button',une_card:'surface',une_input:'input',une_toggle:'toggle',
    une_badge:'badge',une_stack:'layout',une_tabs:'tabs',
    une_container:'layout',une_grid:'layout',une_split_pane:'layout',
    une_navigation:'button',une_menu:'button',une_modal:'overlay',une_drawer:'overlay',
    une_item_grid:'collection',une_repeater:'collection',
    une_record_list:'collection',une_search:'input',une_lookup:'input',
    une_choice:'input',une_cart:'cart',une_conversation:'conversation',
    une_form:'form',une_table:'table',une_line_items:'table',
    une_date_picker:'input',une_slot_picker:'input',une_metric:'surface',
    une_alert:'surface',une_progress:'progress',une_document_viewer:'surface',
    une_chart:'table',une_option_groups:'collection'
  };
  const components: string[] = manifest.components.map((name:string)=>name.split('/')[0]);
  assert.deepEqual([...components].sort(),Object.keys(expected).sort(),
    'every new bundled Page component must be audited for outer-shell styling');
  for(const name of components)
    assert.equal(pageAppearanceTarget('Custom:'+name),expected[name],name);
});

test('all published visual properties style the visible element, not the canvas selection frame', () => {
  const style=resolvePageComponentStyle({layoutStyle:{
    padding:11,borderRadius:64,borderWidth:3,borderColor:'#123456',
    backgroundColor:'#eeeeee',boxShadow:'md',fontSize:19,fontWeight:'700',
    textAlign:'right',opacity:80,gap:14,alignItems:'center',
    justifyContent:'space-between',overflowY:'auto',
    margin:12,top:20,zIndex:4
  }},'Custom:OneSearch');
  const flags=pageAppearanceStyleKeys(style).split(' ');
  assert.deepEqual(flags,[
    'radius','padding','border','stroke','background','shadow',
    'font-size','font-weight','text-align','opacity','gap','align-items',
    'justify-content','overflow'
  ]);
  for(const key of ['padding','borderRadius','borderWidth','borderColor',
    'backgroundColor','boxShadow','fontSize','fontWeight','textAlign','opacity',
    'gap','alignItems','justifyContent','overflowY'])
    assert.equal((style as Record<string,unknown>)[key],undefined,key+' cannot style the editor frame');
  assert.equal(style.margin,12,'external spacing remains geometric');
  assert.equal(style.top,20,'positioning remains geometric');
  assert.equal(style.zIndex,4,'stacking order remains geometric');
  assert.equal((style as unknown as Record<string,string>)['--md-page-radius'],'64px');
  assert.equal((style as unknown as Record<string,string>)['--md-page-font-size'],'19px');
  assert.equal((style as unknown as Record<string,string>)['--md-page-opacity'],'0.8');
});

test('component surface CSS covers every target without styling collection frames', async () => {
  const css=await readFile(new URL('../src/core/pages/TemplatePageRuntime/pageComponentAppearance.css',import.meta.url),'utf8');
  for(const target of ['input','toggle','button','badge','text','image','surface',
    'collection','table','calendar','progress','layout','tabs','conversation','cart','form','overlay']) {
    assert.match(css,new RegExp('data-page-appearance="'+target+'"'),
      'missing appearance target '+target);
  }
  for(const property of ['radius','padding','border','stroke','background',
    'color','shadow','font-size','font-weight','text-align','opacity',
    'gap','align-items','justify-content','overflow'])
    assert.ok(css.includes('data-page-style~="'+property+'"'),property);
  assert.ok(css.includes('background:transparent!important'),'editor frames must remain unstyled');
  assert.match(css,/data-page-appearance="collection"\]\[data-page-style~="background"\] \.registered-component \.one-item/);
});

test('standard record components and layout primitives have real visual targets', async () => {
  const catalog = await readFile(new URL('../src/core/components/Catalog/catalog.ts',import.meta.url),'utf8');
  for (const name of ['Accordion','Activities','Chatter','Highlights Panel','Related List',
    'Tabs','Record Detail','Report Chart','Dashboard'])
    assert.ok(catalog.includes("apiName: '"+name+"'"),name+' remains a standard component');
  const kinds: Record<string,string> = {
    Accordion:'surface',Activities:'surface',Chatter:'surface',
    'Highlights Panel':'surface','Related List':'surface',
    Tabs:'tabs','Record Detail':'surface','Report Chart':'surface',Dashboard:'surface',
    Container:'layout',Row:'layout',Column:'layout',Card:'layout',Grid:'layout'
  };
  for(const [name,target] of Object.entries(kinds))
    assert.equal(pageAppearanceTarget(name),target,name);
});

test('native/common component settings style actual controls without outer chrome', async () => {
  const style=resolvePageComponentStyle({
    radius:28,padding:6,borderWidth:2,borderColor:'#aabbcc',
    backgroundColor:'#f1f5f9',textColor:'#112233',
    shadow:'small',opacity:70,fontSize:18,textAlign:'center',margin:9
  },'Custom:OneButton');
  assert.deepEqual(pageAppearanceStyleKeys(style).split(' '),
    ['radius','padding','border','stroke','background','color','shadow',
      'font-size','text-align','opacity']);
  assert.equal(style.margin,9,'margin is external spacing, not decorative chrome');
  for(const key of ['borderWidth','borderRadius','padding','backgroundColor',
    'boxShadow','opacity','fontSize','textAlign'])
    assert.equal((style as unknown as Record<string,unknown>)[key],undefined,key);
  assert.equal((style as unknown as Record<string,string>)['--md-page-radius'],'28px');
  assert.equal((style as unknown as Record<string,string>)['--md-page-padding'],'6px');
  assert.equal((style as unknown as Record<string,string>)['--md-page-border-width'],'2px');
  assert.equal((style as unknown as Record<string,string>)['--md-page-opacity'],'0.7');

  const path=new URL('../src/core/',import.meta.url);
  const builder=await readFile(new URL('builders/PageBuilder/pageBuilderView.tsx',path),'utf8');
  const runtime=await readFile(new URL('pages/PageRuntime/pageRuntimeViews.tsx',path),'utf8');
  assert.match(builder,/layoutTransparent props=\{/);
  assert.match(runtime,/layoutTransparent props=\{/);
  assert.doesNotMatch(builder,/layoutTransparent=\{!isLayoutContainer\(component\)\}/);
});

test('Page Builder Office ribbon keeps each control in one permanent logical group', async () => {
  const root = new URL('../src/core/builders/', import.meta.url);
  const builder = await readFile(new URL('PageBuilder/pageBuilderView.tsx', root), 'utf8');
  const styles = await readModularCss(new URL('PageBuilder/styles-md227.css', root));
  const presentation = await readFile(new URL('ComponentProperties/ComponentPresentationProperties.tsx', root), 'utf8');
  const data = await readFile(new URL('ComponentProperties/componentPropertiesView.tsx', root), 'utf8');
  const visual = await readFile(new URL('ComponentStyleEditor/PageComponentVisualEditor.tsx', root), 'utf8');
  const responsive = await readFile(new URL('ComponentStyleEditor/PageComponentStyleEditor.tsx', root), 'utf8');

  assert.match(builder, /'Component Style'/);
  assert.match(builder, /selectedHistoryVersion/);
  assert.match(builder, /aria-label="Choose page layout"/);
  assert.match(builder, /aria-label="Page width"/);
  assert.match(builder, /aria-label="Page height"/);
  assert.doesNotMatch(builder, /office-ribbon-page-controls/);
  assert.doesNotMatch(builder, /Save creates a private version/);
  assert.doesNotMatch(builder, /These settings belong only to the selected/);
  assert.doesNotMatch(builder, /<div className="reference-canvas-toolbar">/);
  assert.doesNotMatch(builder, /<button className="btn btn-full" onClick=\{\(\) => setActivePanel\(null\)\}>Done<\/button>/);
  assert.match(builder, /className="office-ribbon-add-library"/);
  assert.match(builder, /className="office-ribbon-component-tile"/);
  assert.doesNotMatch(builder, /remainingRibbonComponents\.map\(component=>/);
  assert.match(styles, /grid-template-rows:repeat\(3,28px\)/);
  assert.match(styles, /office-ribbon-data-section/);
  assert.doesNotMatch(data, /builder-connect-steps/);
  assert.match(data, /Connect data/);
  assert.match(data, /Choose records/);
  assert.match(data, /Set actions/);
  assert.match(data, /Configure record filters/);
  assert.match(data, /Configure component actions/);
  assert.match(builder, /Visibility rules/);
  assert.doesNotMatch(builder, /Group <ChevronDown/);
  assert.match(builder, /aria-label="Grouping"/);
  assert.doesNotMatch(builder, /Technical page ID/);
  assert.doesNotMatch(builder, /page-property-summary/);
  assert.doesNotMatch(presentation, /<details/);
  assert.match(presentation, /office-ribbon-presentation-group/);
  assert.match(visual, /section === 'colors' \|\| section === 'all'/);
  assert.match(responsive, /section!=='layout' && responsiveColorFields/);
});

test('Grouping selected canvas components preserves children and absolute bounds', async () => {
  const { groupCanvasComponents, ungroupCanvasComponent } = await import('../src/core/builders/PageBuilder/canvasInteractions');
  const components=[
    {id:'a',type:'Custom:OneText',label:'A',visible:true,region:'main' as const,properties:{},position:{x:20,y:30,width:110,height:40}},
    {id:'b',type:'Custom:OneText',label:'B',visible:true,region:'main' as const,properties:{},position:{x:170,y:90,width:100,height:50}}
  ];
  const grouped=groupCanvasComponents(components,['a','b'],'office-group');
  const parent=grouped.find(item=>item.id==='office-group');
  assert.deepEqual(parent?.position,{x:20,y:30,width:250,height:110});
  assert.equal(grouped.find(item=>item.id==='b')?.parentId,'office-group');
  const restored=ungroupCanvasComponent(grouped,'office-group');
  assert.deepEqual(restored.map(item=>item.position),components.map(item=>item.position));
  assert.equal(groupCanvasComponents(components,['a','missing'],'not-allowed').length,components.length);
});

test('Page Builder contextual ribbon respects the fixed-height no-scroll contract',async()=>{
  const root=new URL('../src/core/builders/',import.meta.url);
  const builder=await readFile(new URL('PageBuilder/pageBuilderView.tsx',root),'utf8');
  const css=await readModularCss(new URL('PageBuilder/styles-md227.css',root));
  const filters=await readFile(new URL('PageBuilder/PageBuilderRibbonEditors.tsx',root),'utf8');
  const actions=await readFile(new URL('PageBuilder/PageBuilderActionRibbon.tsx',root),'utf8');
  assert.match(builder,/ribbonTab==='Filters' && <RibbonFilters/);
  assert.match(builder,/ribbonTab==='Visibility Rules' && <RibbonVisibilityRules/);
  assert.match(builder,/ribbonTab==='Source'/);
  assert.match(builder,/ribbonTab === 'Component Content'/);
  assert.match(builder,/ribbonTab === 'Component Style' && <RibbonFormat/);
  assert.match(filters,/validateVisibilityRule/);
  assert.match(filters,/examineRecordFilter/);
  assert.match(actions,/actionType/);
  assert.match(css,/height:146px!important;min-height:146px!important;max-height:146px!important/);
  assert.match(css,/overflow:visible!important;padding:5px 6px/);
  assert.doesNotMatch(builder,/ribbonComponentSearch/);
});

test('Page Builder contextual ribbon is generated from aligned three-row groups',async()=>{
  const root=new URL('../src/core/builders/',import.meta.url);
  const builder=await readFile(new URL('PageBuilder/pageBuilderView.tsx',root),'utf8');
  const css=await readModularCss(new URL('PageBuilder/styles-md227.css',root));
  const responsive=await readFile(new URL('ComponentStyleEditor/PageComponentStyleEditor.tsx',root),'utf8');
  assert.match(builder,/office-ribbon-inline-options/);
  assert.doesNotMatch(builder,/additionalPropertyDialogOpen && selectedCustomDefinition && createPortal/);
  assert.match(responsive,/numberGroups\.flatMap/);
  assert.match(responsive,/items\.slice\(index\*3,index\*3\+3\)/);
  assert.match(responsive,/office-ribbon-responsive-group/);
  assert.match(css,/office-ribbon-config-modal \.modal-header h2/);
  assert.match(css,/color:#1b283a!important/);
  assert.match(css,/office-ribbon-responsive-editor>\.office-ribbon-responsive-group/);
  assert.match(css,/grid-template-rows:repeat\(3,28px\)!important/);
});

test('Card Grid surface colour and individual card colour stay separate in builder and runtime',async()=>{
  const css=await readFile(new URL('../src/core/pages/TemplatePageRuntime/pageComponentAppearance.css',import.meta.url),'utf8');
  const ribbon=await readFile(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonStyle.tsx',import.meta.url),'utf8');
  const renderer=await readFile(new URL('../src/one/OneItemGrid/OneItemGrid.jsx',import.meta.url),'utf8');
  // Native collection cards must not inherit the component-wide background or
  // border tokens; only the surrounding Card Grid surface uses those tokens.
  for(const flag of ['background','stroke','border']){
    assert.match(css,new RegExp('data-page-style~="'+flag+'"\\] \\.registered-component:not\\(\\.metadrive-component-une_item_grid\\) \\.md-product-card'));
    assert.doesNotMatch(css,new RegExp('data-page-style~="'+flag+'"\\] \\.registered-component \\.md-product-card'));
  }
  assert.match(css,/\\.registered-component\\.metadrive-component-une_item_grid > section\\s*\\{\\s*background-color: var\\(--md-page-background\\) !important;/);
  assert.match(css,/\\.registered-component\\.metadrive-component-une_item_grid > section\\s*\\{\\s*border-style: solid !important;/);
  assert.match(renderer,/backgroundColor: typeof p\\.cardBackgroundColor === "string" \\? p\\.cardBackgroundColor : undefined/);
  assert.match(renderer,/borderColor: typeof p\\.cardBorderColor === "string" \\? p\\.cardBorderColor : undefined/);
  assert.match(ribbon,/isItemGrid\\?'Component background':'Background \\/ Fill'/);
  assert.match(ribbon,/responsive\\[key\\]\\?\\?base\\[key\\]\\?\\?visual\\[key\\]\\?\\?properties\\[metadataKey\\]/);
  const result=resolvePageComponentStyle({backgroundColor:'#223344',cardBackgroundColor:'#cc4422',borderColor:'#776655',cardBorderColor:'#004488'},'Custom:une_item_grid');
  const vars=result as Record<string,unknown>;
  assert.equal(vars['--md-page-background'],'#223344');
  assert.equal(vars['--md-page-border-color'],'#776655');
  assert.equal(vars['--md-card-background'],undefined);
});
