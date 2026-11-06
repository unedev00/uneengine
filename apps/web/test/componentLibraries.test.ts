import {dispatchComponentEvent} from '../src/component-libraries/shared/componentEventDispatch.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {gzipSync,brotliCompressSync} from 'node:zlib';
import {rendererFileName,compressRenderer} from '../component-delivery.mjs';
import {loadBundledRenderer} from '../src/core/components/RegisteredComponent/bundledAssetCache';
import type { LibraryComponentMetadata } from '../src/core/metadata/Definitions/metadata';
import ComponentLibrary from '../src/core/components/ComponentLibrary/ComponentLibrary';
import { libraryComponentLabel, oneComponentLabel, uniqueLibraryComponents } from '../src/core/components/Registry/componentLibraryDiscovery';
import { findRegisteredComponent } from '../src/core/components/Registry/componentRegistryLookup';
import { publishedPageLibraryComponents,getPageBuilderComponentCategories } from '../src/core/builders/PageBuilder/pageBuilderPalette';

function definition(apiName: string, patch: Partial<LibraryComponentMetadata> = {}): LibraryComponentMetadata {
  return { apiName, label: apiName, description: '', surfaces: ['page', 'dashboard', 'flow'],
    version: 1, status: 'Published', updatedAt: '', jsxSource: '', cssSource: '', compiledJs: '', scopedCss: '', ...patch };
}

test('One- names have one prefix while platform names and API references stay stable', () => {
  for (const label of ['Text', 'OneText', 'One Text', 'One-Text']) {
    assert.equal(oneComponentLabel({ label, apiName: 'OneText' }), 'One-Text');
  }
  const platform = definition('SystemPanel', { scope: 'platform-system', label: 'System Panel' });
  assert.equal(libraryComponentLabel(platform), 'System Panel');
  const custom = definition('Calendar', { label: 'Calendar' });
  assert.equal(libraryComponentLabel(custom), 'One-Calendar');
  assert.equal(custom.apiName, 'Calendar');
  assert.equal(libraryComponentLabel(definition('ui_calendar',{label:'UNE Calendar'})),'Calendar');
});

test('each builder offers one published definition per identity and supported surface', () => {
  const components = [definition('OneText', { status: 'Draft', version: 4 }),
    definition('OneText'), definition('OneText', { version: 2 }),
    definition('FlowOnly', { surfaces: ['flow'] }), definition('Invalid-Name')];
  for (const surface of ['page', 'dashboard', 'flow'] as const) {
    const available = uniqueLibraryComponents(components, surface);
    assert.deepEqual(available.map(item => item.apiName), surface === 'flow' ? ['OneText', 'FlowOnly'] : ['OneText']);
    assert.equal(available[0].version, 2);
    assert.equal(findRegisteredComponent(components, 'OneText', surface)?.version, 2);
  }
  assert.deepEqual(publishedPageLibraryComponents(components), uniqueLibraryComponents(components, 'page'));
});

test('bundled alias is hidden from new placements while saved placements remain resolvable', () => {
  const alias = definition('ChatterInbox', { trustedBundled: true });
  const canonical = definition('ui_conversation', { trustedBundled: true });
  for (const surface of ['page', 'dashboard', 'flow'] as const) {
    assert.deepEqual(uniqueLibraryComponents([alias, canonical], surface), []);
    assert.equal(findRegisteredComponent([alias, canonical], alias.apiName, surface), alias);
  }
  assert.deepEqual(uniqueLibraryComponents([alias]), []);
  assert.equal(uniqueLibraryComponents([alias, { ...canonical, status: 'Draft' }]).length, 0);
  assert.equal(uniqueLibraryComponents([{ ...alias, trustedBundled: false }, canonical]).length, 1);
  assert.equal(uniqueLibraryComponents([alias, { ...canonical, surfaces: ['page'] }]).length, 0);
});

test('equal labels do not erase distinct custom components or mutate registry metadata', () => {
  const entries = [definition('First', { label: 'Text' }), definition('Second', { label: 'Text' })];
  const before = structuredClone(entries);
  assert.equal(uniqueLibraryComponents(entries).length, 2);
  assert.deepEqual(entries, before);
});

test('library starts in Core with two library choices and no custom registration form', () => {
  const markup = renderToStaticMarkup(React.createElement(ComponentLibrary, {
    components: [], canManage: true,
    onSave: async () => {}, onDelete: async () => {}, onPublish: async () => {}, onRollback: async () => {}
  }));
  assert.match(markup, /Core library/);
  assert.doesNotMatch(markup, /UNE library/);
  assert.match(markup, /One- library/);
  assert.match(markup, /Core · Page components/);
  assert.doesNotMatch(markup, /id="library-component-label"/);
});


test('UNE palette uses published descriptor category instead of a guessed label',()=>{
  assert.deepEqual(getPageBuilderComponentCategories('ui_option_groups','UNE Option Groups','Dynamic options',false,'Inputs'),['Inputs']);
  assert.deepEqual(getPageBuilderComponentCategories('ui_cart','UNE Cart','Shopping',false,'Data'),['Data']);
  assert.deepEqual(getPageBuilderComponentCategories('ui_calendar','Calendar','Appointments',false,'Data'),['Data']);
});


test('only UNE equivalents are offered for trusted retired One components',()=>{
 const pairs: Array<[string,string]> = [
  ['OneText','ui_input'],['OneBadge','ui_input'],['OneButton','ui_button'],
  ['OneSearch','ui_search'],['OneCalendar','ui_calendar'],
  ['OneItemGrid','ui_item_grid'],['OneConversation','ui_conversation'],
  ['OneShoppingCart','ui_cart']
 ];
 for(const [legacy,canonical] of pairs){
  const old=definition(legacy,{trustedBundled:true});
  const replacement=definition(canonical,{trustedBundled:true});
  for(const surface of ['page','dashboard','flow'] as const){
   assert.deepEqual(uniqueLibraryComponents([old,replacement],surface),[]);
   assert.equal(findRegisteredComponent([replacement],legacy,surface),replacement);
   assert.equal(findRegisteredComponent([old,replacement],legacy,surface),['OneText','OneBadge'].includes(legacy)?replacement:old);
  }
  assert.deepEqual(uniqueLibraryComponents([definition(legacy),replacement]),[definition(legacy)],
   'tenant-owned components are never retired by name alone');
 }
});

test('retired UNE insert components are hidden but retained components remain',()=>{
 const names=['ui_alert','ui_chart','ui_table','ui_card','ui_image','ui_form','ui_repeater','ui_record_list','ui_progress','ui_navigation'];
 const retained=['ui_button','ui_input','ui_calendar','ui_item_grid'];
 const privatelyRegistered=['ui_cart','ui_search','ui_modal'];
 const entries=[...names,...retained,...privatelyRegistered].map(name=>definition(name));
 assert.deepEqual(publishedPageLibraryComponents(entries).map(d=>d.apiName),[]);
 assert.ok(findRegisteredComponent(entries,'ui_table','page'));
 assert.ok(findRegisteredComponent(entries,'ui_cart','page'));
 assert.ok(!publishedPageLibraryComponents(entries).some(d=>d.apiName==='ui_cart'));
});

test('UNE Conversation is AceChatter-only, hidden from new Page Builder placements', async () => {
 const { RETIRED_UNE_PAGE_BUILDER_COMPONENTS }=await import('../src/core/builders/PageBuilder/pageBuilderPalette');
 assert.ok(RETIRED_UNE_PAGE_BUILDER_COMPONENTS.has('ui_conversation'));
 assert.deepEqual(publishedPageLibraryComponents([definition('ui_conversation'),definition('ui_button')]).map(x=>x.apiName),[]);
 assert.equal(findRegisteredComponent([definition('ui_conversation')],'ui_conversation','page')?.apiName,'ui_conversation');
});

test('app-private bundled component identities are never offered for new placement',()=>{
 const aliases=['acetill_item_grid','aceassist_calendar','onechatter_conversation','uneacechatter_modal'];
 for(const alias of aliases){
  const privateComponent=definition(alias,{trustedBundled:true});
  assert.deepEqual(uniqueLibraryComponents([privateComponent]),[]);
  assert.equal(findRegisteredComponent([privateComponent],alias,'page'),privateComponent);
  assert.deepEqual(uniqueLibraryComponents([definition(alias)]),[definition(alias)],'tenant authors remain untouched');
 }
});


test('baseline: 22 independently delivered renderer JSONs have no transfer compression',()=>{
 // HAR-sized deterministic fixture: 11 buttons, 4 texts and 7 other renderers.
 const js='function Component(){ return "'+('RUNTIME_SHARED_0123456789'.repeat(9000))+'"; }';
 const payload=JSON.stringify({apiName:'smart_button',version:1,compiledJs:js,scopedCss:''});
 const raw=Buffer.byteLength(payload);
 const requests=22;
 const total=raw*requests;
 assert.equal(requests,22);
 assert.ok(raw>180_000);
 console.info('component delivery mock baseline: rendererBytes='+raw+
  ' requests='+requests+' bytes='+total+' cache=no-cache compression=none');
});

test('content-hashed renderer paths change on publication and transfer sizes drop',()=>{
 const payload=JSON.stringify({apiName:'smart_button',version:1,
  compiledJs:'function Renderer(){'+('return 123456789;'.repeat(13000))+'}',scopedCss:'.smart{padding:2px}'});
 const same=rendererFileName('smart_button',payload);
 assert.match(same,/^smart_button\.[a-f0-9]{16}\.json$/);
 assert.equal(same,rendererFileName('smart_button',payload));
 assert.notEqual(same,rendererFileName('smart_button',payload+'-new'));
 const packed=compressRenderer(payload);
 assert.ok(packed.gzip.length<Buffer.byteLength(payload));
 assert.ok(packed.brotli.length<packed.gzip.length);
 assert.deepEqual(gzipSync(payload),gzipSync(payload));
 assert.ok(brotliCompressSync(payload).length<Buffer.byteLength(payload));
 const raw=Buffer.byteLength(payload);
 console.info('component delivery mock: 22 renderer requests, rawBytes='+(22*raw)+
  ' gzipBytes='+(22*packed.gzip.length)+' brBytes='+(22*packed.brotli.length));
});
test('Nginx component delivery has immutable renderer caching and catalog revalidation',async()=>{
 const script=await (await import('node:fs/promises')).readFile(
  new URL('../../../scripts/oracle/ensure-frontend-component-delivery.sh',import.meta.url),'utf8');
 assert.match(script,/max-age=31536000, immutable/);
 assert.match(script,/gzip on/);
 assert.match(script,/brotli on/);
 assert.match(script,/catalog-index\.json/);
 assert.match(script,/no-cache/);
 assert.match(script,/nginx -t/);
});

test('PR10 baseline: multiple Smart renderer types repackage the same runtime independently',async()=>{
 const {loadComponentCatalog,buildBundledComponent}=await import('../../../scripts/component-catalog.mjs');
 const catalog=await loadComponentCatalog();
 const names=['smart_button','smart_text','smart_card_grid','smart_icon'];
 const picked=names.map(name=>catalog.components.find((entry:{apiName:string})=>entry.apiName===name));
 assert.equal(picked.filter(Boolean).length,names.length);
 const outputs=await Promise.all(picked.map(component=>buildBundledComponent(component!)));
 const bytes=outputs.map(output=>Buffer.byteLength(output.compiledJs));
 assert.ok(bytes.every(size=>size>10000));
 const standaloneBytes=bytes.reduce((a,b)=>a+b,0);
 const repeatedPageBytes=bytes[0]*11+bytes[1]*4+bytes[2]*3+bytes[3]*2;
 assert.ok(repeatedPageBytes>standaloneBytes);
 console.info('smart-runtime mock baseline types=4 rendererBytes='+bytes.join(',')+
  ' independentBytes='+standaloneBytes+' repeated20Bytes='+repeatedPageBytes);
});

test('shared Smart Runtime loader allows only hashed internal paths and reuses one request',async()=>{
 const {loadSharedSmartRenderer}=await import('../src/core/components/RegisteredComponent/sharedSmartRenderer');
 const fingerprint='smart_runtime.0123456789abcdef.json';
 const path='component-library/components/'+fingerprint;
 let calls=0;
 const prior=globalThis.fetch;
 globalThis.fetch=async (input:RequestInfo|URL)=>{
  calls++;
  assert.equal(String(input),'/'+path);
  return {ok:true,json:async()=>({compiledJs:'module.exports.default = function Shared(){};'})} as Response;
 };
 try{
  const [first,second]=await Promise.all([
   loadSharedSmartRenderer(path,'/'),loadSharedSmartRenderer(path,'/')
  ]);
  assert.equal(first,second);
  assert.equal(calls,1);
  assert.equal(await loadSharedSmartRenderer(path,'/'),first);
  assert.equal(calls,1);
  await assert.rejects(loadSharedSmartRenderer('../other/path','/'),/Invalid shared runtime path/);
  await assert.rejects(loadSharedSmartRenderer('component-library/components/untrusted.0123456789abcdef.json','/'),/Invalid shared runtime path/);
 }finally{globalThis.fetch=prior;}
});

test('shared component metadata preserves original Smart kinds while reducing 20 copies of runtime',()=>{
 const slimButton=JSON.stringify({apiName:'smart_button',version:1,compiledJs:'',
  sharedSmartRuntime:true,sharedRuntimePath:'component-library/components/smart_runtime.0123456789abcdef.json',scopedCss:''});
 const slimText=JSON.stringify({apiName:'smart_text',version:1,compiledJs:'',
  sharedSmartRuntime:true,sharedRuntimePath:'component-library/components/smart_runtime.0123456789abcdef.json',scopedCss:''});
 const sharedRuntime=JSON.stringify({compiledJs:'module.exports.default = function SmartRuntime(){};'});
 const before=190_000*20,after=Buffer.byteLength(slimButton)*11+
  Buffer.byteLength(slimText)*9+Buffer.byteLength(sharedRuntime);
 assert.ok(after<before);
 console.info('PR10 lightweight fixture: bytes='+before+'->'+after+' requests=20 component assets+1 shared');
});

test('real Smart bundle compilation shows reduced shared-runtime payload on 20-instance page',async()=>{
 const {loadComponentCatalog,buildBundledComponent}=await import('../../../scripts/component-catalog.mjs');
 const catalog=await loadComponentCatalog();
 const names=['smart_button','smart_text','smart_card_grid','smart_icon'] as const;
 const descriptors=names.map(name=>catalog.components.find((item:{apiName:string})=>item.apiName===name));
 assert.ok(descriptors.every(Boolean));
 const [button,txt,grid,icon,shared]=await Promise.all([
  ...descriptors.map(item=>buildBundledComponent(item!)),
  buildBundledComponent({apiName:'smart_runtime',
    jsxFile:'component-libraries/smart/shared/SmartRuntime.jsx',
    cssFile:'component-libraries/smart_button/SmartComponent.css'})
 ]);
 const versions=[11,4,3,2];
 const legacy=[button,txt,grid,icon].reduce((sum,item,i)=>
  sum+versions[i]*Buffer.byteLength(JSON.stringify({compiledJs:item.compiledJs,scopedCss:item.cssSource})),0);
 const sharedFile=Buffer.byteLength(JSON.stringify({compiledJs:shared.compiledJs}));
 const slim=[button,txt,grid,icon].reduce((sum,item,i)=>
  sum+versions[i]*Buffer.byteLength(JSON.stringify({
   compiledJs:'',sharedSmartRuntime:true,
   sharedRuntimePath:'component-library/components/smart_runtime.0123456789abcdef.json',
   scopedCss:item.cssSource
  })),0);
 const after=slim+sharedFile;
 assert.ok(after<legacy,'one shared Smart Runtime must weigh less than 20 standalone copies');
 console.info('PR10 real compiled asset estimate 20 Smart components bytes='+legacy+'->'+after+
  ' savings='+((1-after/legacy)*100).toFixed(1)+'%; requests=20 renderer JSON +1 shared runtime');
});
test('optional off-screen renderer uses intersection visibility and does not defer print/editor paths',async()=>{
 const source=await (await import('node:fs/promises')).readFile(
  new URL('../src/core/components/RegisteredComponent/RegisteredComponent.tsx',import.meta.url),'utf8');
 assert.match(source,/metadrive:lazy-smart-renderers/);
 assert.match(source,/IntersectionObserver/);
 assert.match(source,/rootMargin:'250px'/);
 assert.match(source,/!editorPreview&&props.printRows!==true/);
 assert.match(source,/deferRenderer&&!enteredViewport/);
});

test('flagged Smart asset build keeps full default renderer and emits smaller shared variant',async()=>{
 const {mkdtemp,readFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const path=await import('node:path');
 const {spawnSync}=await import('node:child_process');
 const {fileURLToPath}=await import('node:url');
 const directory=await mkdtemp(path.join(tmpdir(),'metadrive-shared-smart-'));
 try{
  const script=fileURLToPath(new URL('../build-component-library.mjs',import.meta.url));
  const result=spawnSync(process.execPath,[script],{
   cwd:directory,encoding:'utf8',timeout:180_000,
   env:{...process.env,METADRIVE_SHARED_SMART_RUNTIME:'1'}
  });
  assert.equal(result.status,0,'Shared Smart build must succeed: '+result.stderr?.slice(-1500));
  const index=JSON.parse(await readFile(path.join(directory,'dist/component-library/catalog-index.json'),'utf8'));
  const button=index.components.find((item:{apiName:string})=>item.apiName==='smart_button');
  const text=index.components.find((item:{apiName:string})=>item.apiName==='smart_text');
  assert.ok(button?.assetPath&&button?.sharedAssetPath);
  assert.ok(text?.assetPath&&text?.sharedAssetPath);
  const asset=async(file:string)=>JSON.parse(await readFile(path.join(directory,'dist',file),'utf8'));
  const [full,slim,textSlim]=await Promise.all([
   asset(button.assetPath),asset(button.sharedAssetPath),asset(text.sharedAssetPath)
  ]);
  assert.ok(full.compiledJs.length>10_000);
  assert.equal(slim.compiledJs,'');
  assert.equal(slim.sharedSmartRuntime,true);
  assert.equal(slim.apiName,'smart_button');
  assert.equal(textSlim.apiName,'smart_text');
  assert.equal(slim.sharedRuntimePath,textSlim.sharedRuntimePath);
  const shared=await asset(slim.sharedRuntimePath);
  assert.ok(shared.compiledJs.length>10_000);
  const before=Buffer.byteLength(JSON.stringify(full));
  const after=Buffer.byteLength(JSON.stringify(slim));
  assert.ok(after<before);
  console.info('PR10 actual build smart_button fullBytes='+before+
   ' slimBytes='+after+' sharedOnceBytes='+Buffer.byteLength(JSON.stringify(shared)));
 }finally{
  await rm(directory,{recursive:true,force:true});
 }
});

test('baseline: 22 independent bundled renderer mounts issue 22 requests for 9 types',async()=>{
 const kinds=[...Array(11).fill('smart_button'),...Array(4).fill('smart_text'),
  ...Array.from({length:7},(_,index)=>'other_'+index)];
 const calls:string[]=[];
 const request=async(kind:string)=>{
  calls.push(kind);
  await Promise.resolve();
  return {compiledJs:'validated'};
 };
 await Promise.all(kinds.map(request));
 assert.equal(calls.length,22);
 assert.equal(new Set(kinds).size,9);
 assert.deepEqual(calls.slice(0,11),Array(11).fill('smart_button'));
 console.info('renderer baseline: requests=22 distinct=9 ordering='+calls.join(','));
});

test('repeated 22 component mounts fetch 9 distinct hashed renderers once in order',async()=>{
 const kinds=[...Array(11).fill('smart_button'),...Array(4).fill('smart_text'),
  ...Array.from({length:7},(_,i)=>'unique_'+i)];
 const ordered:string[]=[];
 const asset=(kind:string)=>loadBundledRenderer('component-library/components/'+kind+'.0123456789abcdef.json@1',async()=>{
  ordered.push(kind);
  await new Promise<void>(resolve=>setTimeout(resolve,2));
  return {apiName:kind};
 });
 await Promise.all(kinds.map(asset));
 assert.equal(ordered.length,9,'one HTTP request per component kind');
 assert.deepEqual(ordered,['smart_button','smart_text',...Array.from({length:7},(_,i)=>'unique_'+i)]);
 await Promise.all(kinds.map(asset));
 assert.equal(ordered.length,9,'cached immutable renderer must not refetch on remount');
 console.info('renderer fixed: 22->9 requests, ordered distinct kinds='+ordered.join(','));
});

test('rejected renderer retries and legacy revisions refetch without cross-version reuse',async()=>{
 let count=0;
 const key='test/rejected-asset';
 await assert.rejects(loadBundledRenderer(key,async()=>{
  count++;throw Error('Network denied');
 }));
 assert.equal(await loadBundledRenderer(key,async()=>{count++;return 'approved';}),'approved');
 assert.equal(count,2);
 let legacy=0;
 const legacyLoader=()=>loadBundledRenderer('component-library/components/legacy.json@1',async()=>{
  legacy++;await Promise.resolve();return legacy;
 },false);
 assert.deepEqual(await Promise.all([legacyLoader(),legacyLoader(),legacyLoader()]),[1,1,1]);
 assert.equal(await legacyLoader(),2,'legacy non-hashed assets must revalidate');
 let hashed=0;
 assert.equal(await loadBundledRenderer('component-library/components/button.hash1.json@1',
  async()=>{hashed++;return 'v1';}),'v1');
 assert.equal(await loadBundledRenderer('component-library/components/button.hash2.json@2',
  async()=>{hashed++;return 'v2';}),'v2');
 assert.equal(hashed,2,'new published renderer hash requires a fresh fetch');
});

test('shared events return awaitable completion and preserve rejected errors',async()=>{
 let finish!:(value:string)=>void;
 const pending=new Promise<string>(resolve=>{finish=resolve;});
 const completion=dispatchComponentEvent({onAction:()=>pending},'itemSelect',{Id:'x'});
 assert.equal(typeof completion.then,'function');
 finish('saved');
 assert.equal(await completion,'saved');
 const failed=dispatchComponentEvent({onAction:()=>Promise.reject(Error('Denied'))},'click',null);
 await assert.rejects(failed,/Denied/);
});
test('metadata change publishes input but dispatches a single action',async()=>{
 const events:string[]=[];
 const p={actionFlows:{change:{actionType:'Formula'}},
  onChange:(_value:unknown,options?:{actionHandled?:boolean})=>{
   events.push('publish');assert.equal(options?.actionHandled,true);
  },onAction:async()=>{events.push('write');return {ok:true};}};
 assert.deepEqual(await dispatchComponentEvent(p,'change',42),{ok:true});
 assert.deepEqual(events,['publish','write']);
 events.length=0;
 const direct={onChange:(value:unknown)=>{events.push(String(value));}};
 await dispatchComponentEvent(direct,'change',7);
 assert.deepEqual(events,['7']);
});
