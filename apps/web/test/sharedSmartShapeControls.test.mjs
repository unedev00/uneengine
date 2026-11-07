import { readPageBuilderModules } from './helpers/builderSources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildBundledComponent} from '../../../scripts/component-catalog.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
async function renderSmart(apiName,props={}){
 const descriptor=JSON.parse(read('../src/component-libraries/'+apiName+'/component.json'));
 const built=await buildBundledComponent(descriptor);
 const sandbox={React,module:{exports:{}},Date,Intl,URL,crypto:globalThis.crypto};
 vm.runInNewContext(built.compiledJs,sandbox);
 return renderToStaticMarkup(React.createElement(sandbox.module.exports.default,props));
}
test('global Shape is SQL owned, enabled only for requested components, and icons only for Button',()=>{
 const sql=read('../../server/src/system-support/migrations/20270213-global-smart-shapes.sql');
 for(const api of ['smart_button','smart_container','smart_text','smart_toggle','smart_lookup'])
  assert.match(sql,new RegExp("'"+api+"'"));
 assert.match(sql,/'shapeId','Shape','Layout','Shape','choice'/);
 assert.match(sql,/WHEN c.component_api='smart_button' THEN '\["shapes","icons"\]'/);
 assert.match(sql,/'smart_button','iconFillColor'/);
 assert.doesNotMatch(sql,/DELETE FROM md_page_|DELETE FROM md_component_definitions/i);
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 assert.match(ribbon,/property.id==='shapeId'/);
 assert.match(ribbon,/allowIcons=\{property\.id==='footerShape'\?false:\(selectedApis\?\.length\?selectedApis:\[api\]\)\.every/);
 assert.match(ribbon,/choicesOverrides\?\.\[member\]/);
 const gallery=read('../src/core/builders/PageBuilder/SmartIconGallery.tsx');
 assert.match(gallery,/allowIcons&&<section><strong>Icons<\/strong>/);
 const builder=readPageBuilderModules();
 assert.match(builder,/component.apiName!=='smart_icon'/);
 assert.match(builder,/selectedApis=\{ribbonSelectedMembers\.map/);
 assert.match(builder,/selected\?\.type==='Custom:smart_icon'/);
});
test('Button preserves empty labels and renders selected icons using the shared runtime',async()=>{
 const icon=await renderSmart('smart_button',{label:'',shapeId:'lock',iconFillColor:'#123456'});
 assert.match(icon,/class="smart-button"/);
 assert.match(icon,/smart-button-glyph/);
 assert.match(icon,/aria-label=/);
 assert.doesNotMatch(icon,/>Button<\/button>/);
 const blank=await renderSmart('smart_button',{label:'',shapeId:'shape:rectangle'});
 assert.doesNotMatch(blank,/>Button<\/button>/);
 const filled=await renderSmart('smart_button',{label:'Save',shapeId:'shape:oval'});
 assert.match(filled,/Save/);
 assert.match(filled,/border-radius:50%/);
 const right=await renderSmart('smart_button',{label:'Save',labelAlignment:'right'});
 assert.match(right,/justify-content:flex-end/);
 const fancy=await renderSmart('smart_button',{label:'',shapeId:'shape:triangle'});
 assert.match(fancy,/mask-image:url/);
});
test('Container, Input Box, Toggle and Lookup Record share the same shape renderer',async()=>{
 for(const api of ['smart_container','smart_text','smart_toggle','smart_lookup']){
  const html=await renderSmart(api,{shapeId:'shape:oval',builderPreview:true});
  assert.match(html,/border-radius:50%/,api);
  const triangle=await renderSmart(api,{shapeId:'shape:triangle',builderPreview:true});
  assert.match(triangle,/mask-image:url/,api);
 }
 const lookup=await renderSmart('smart_lookup',{shapeId:'shape:triangle'});
 assert.match(lookup,/role="combobox"/);
 const toggle=await renderSmart('smart_toggle',{shapeId:'shape:triangle'});
 assert.match(toggle,/role="switch"/);
 const rectangularToggle=await renderSmart('smart_toggle',{shapeId:'shape:rectangle'});
 assert.match(rectangularToggle,/border-radius:0/);
});

test('Shape and Shape Fill occupy exact Design tracks and reuse effective surface colours',()=>{
 const placement=read('../../server/src/system-support/migrations/20270215-design-shape-fill-ribbon.sql');
 assert.match(placement,/SET tab='Design', section_group='Shape'/);
 assert.match(placement,/design_row=1, design_order=1, design_width=94, design_height=26/);
 assert.match(placement,/'shapeFill','Shape Fill','Design','Shape','color'/);
 assert.match(placement,/NULL::jsonb,'\[\]'::jsonb,'component',2,1,40,26/);
 for(const api of ['smart_button','smart_toggle','smart_lookup','smart_text','smart_container'])
  assert.match(placement,new RegExp("'"+api+"'"));
 assert.match(placement,/THEN 'imageBackgroundColor' ELSE 'backgroundColor'/);
 assert.match(placement,/ON CONFLICT\(property_key\) DO NOTHING/);
 assert.match(placement,/ON CONFLICT\(component_api,property_key\) DO NOTHING/);
 assert.doesNotMatch(placement,/ALTER TABLE|UPDATE md_page_|DELETE FROM md_page_/i);
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 assert.match(ribbon,/\['Body','Shape','Typography'/);
 assert.match(ribbon,/if\(p\.id==='shapeId'\)return p\.designWidth\?\?94/);
 assert.match(ribbon,/property\.valueKeys\?\.\[api\]\?\?property\.id/);
 assert.match(ribbon,/else if\(kind==='color'\)editor=<RibbonColorPalette variant="property"/);
 const shared=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 assert.match(shared,/background:p\.backgroundColor\|\|"#2267bc"/);
 assert.match(shared,/background:p\.imageBackgroundColor\?\?p\.backgroundColor\?\?"transparent"/);
});
