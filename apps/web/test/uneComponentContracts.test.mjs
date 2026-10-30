import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadComponentCatalog,buildBundledComponent} from '../../../scripts/component-catalog.mjs';
import {propertyKinds} from '../src/core/components/Properties/componentSettingDefinitions.ts';
const {components}=await loadComponentCatalog(),une=components.filter(x=>x.apiName.startsWith('une_'));
const names=['image','calendar','button','card','input','toggle','stack','tabs',
 'container','grid','split_pane','navigation','menu','modal','drawer','item_grid','repeater','record_list',
 'search','lookup','choice','cart','conversation','form','table','line_items','date_picker','slot_picker',
 'metric','alert','progress','document_viewer','chart','option_groups'].map(s=>'une_'+s);
const updated=new Set(['une_conversation','une_search','une_lookup','une_repeater','une_modal','une_tabs','une_input']);
const allowed=new Set(propertyKinds);
class FixtureDate extends Date {
 constructor(...args){super(...(args.length?args:['2026-10-24T12:00:00Z']));}
 static now(){return new Date('2026-10-24T12:00:00Z').getTime();}
}
test('UNE is the only published system component family',()=>{
 assert.deepEqual(components.filter(x=>x.apiName.startsWith('One')).map(x=>x.apiName),[]);
 assert.deepEqual(une.map(x=>x.apiName),names);
 assert.equal(une.length,new Set(une.map(x=>x.apiName)).size);
});
test('every UNE property has a supported visual editor contract',()=>{
 for(const d of une){
  const keys=new Set();
  assert.deepEqual(d.surfaces,['page','dashboard','flow']);assert.equal(d.version,updated.has(d.apiName)?2:1);
  for(const prop of d.propertyDefinitions){
   assert.ok(allowed.has(prop.kind),d.apiName+' unknown kind '+prop.kind);
   assert.match(prop.propertyKey,/^[A-Za-z][A-Za-z0-9_]*$/);
   assert.ok(!keys.has(prop.propertyKey),d.apiName+' duplicate '+prop.propertyKey);
   assert.ok(prop.label);keys.add(prop.propertyKey);
   if(prop.kind==='RECORD_LIST')assert.deepEqual(prop.defaultValue,[]);
   if(prop.kind==='COLLECTION'){
    assert.ok(Array.isArray(prop.fields)&&prop.fields.length>0,d.apiName+' '+prop.propertyKey+' requires row property definitions');
    assert.deepEqual(prop.defaultValue,[],d.apiName+' '+prop.propertyKey+' defaults to an empty collection');
    for(const field of prop.fields)assert.ok(allowed.has(field.kind),d.apiName+' '+prop.propertyKey+' invalid nested kind '+field.kind);
   }
  }
  // Removed optional manifest controls must not be reintroduced by the contract test.
  // Ensure retained declarations are valid above; do not mandate deleted styling keys.
  assert.ok(keys.size>0,d.apiName+' has no property definitions');
  for(const event of d.eventDefinitions??[])assert.match(event.apiName,/^[A-Za-z][A-Za-z0-9_]*$/);
 }
});
const fixtures={
une_image:{src:'https://example.com/image.png',alt:'Picture'},
 une_calendar:{records:[{Id:'1',BookedOn:'2026-10-24',Subject:'Meeting'}],dateFieldApiName:'BookedOn',titleFieldApiName:'Subject'},
 une_button:{label:'Continue'},une_card:{title:'Card'},une_input:{value:'Hello UNE',allowTyping:false},
 une_toggle:{label:'Setting'},une_tabs:{tabs:'First, Second'},
 une_item_grid:{currencyCode:'GBP',titleFieldApiName:'Name',priceFieldApiName:'Price'},
 une_cart:{currencyCode:'GBP'},une_conversation:{conversations:[],messages:[]},
 une_table:{items:[{Name:'Row'}],columns:[{key:'Name',label:'Name'}]},
 une_line_items:{fields:[{apiName:'Quantity',label:'Quantity',inputType:'number'}]},
 une_metric:{value:'42'},une_alert:{text:'Status'},une_progress:{value:50,max:100},
 une_slot_picker:{items:[{Id:'slot',Name:'10:00',Available:true}],optionAvailableFieldApiName:'Available'},
 une_chart:{items:[{Name:'Orders',Value:4}],chartLabelFieldApiName:'Name',chartValueFieldApiName:'Value'},
 une_option_groups:{groups:[{id:'g1',label:'Choose sauce',required:true,choices:[{id:'c1',label:'Mayo'}]}]}
};
for(const d of une)test(d.apiName+' bundles and renders with a scoped UNE surface',async()=>{
 const built=await buildBundledComponent(d);
 assert.match(built.cssSource,/\.une-ui/);
 assert.doesNotMatch(built.cssSource,/@import/);
 assert.doesNotMatch(built.compiledJs,/require\(["'](?:react|\.\.)/);
 const context={React,module:{exports:{}},Date:FixtureDate,Intl,URL,crypto:globalThis.crypto};
 vm.runInNewContext(built.compiledJs,context);
 const html=renderToStaticMarkup(React.createElement(context.module.exports.default,
  {theme:'light',surface:'glass',...fixtures[d.apiName]}));
 assert.match(html,/class="une-ui"/);
 assert.match(html,/data-une-theme="light"/);
 assert.doesNotMatch(html,/<script/i);
 if(d.apiName==='une_input')assert.match(html,/Hello UNE/);
 if(d.apiName==='une_metric')assert.match(html,/42/);
});

test('device show/hide properties are not available in UNE metadata or the Page Builder ribbon', async () => {
 const appearance=(await import('../src/component-libraries/une/shared/appearance-properties.mjs')).appearanceProperties;
 const manifest=JSON.parse(await readFile(new URL('../src/component-libraries/manifest.json',import.meta.url),'utf8'));
 const ribbon=await readFile(new URL('../src/core/builders/PageBuilder/PageBuilderRibbonStyle.tsx',import.meta.url),'utf8');
 for(const key of ['hideOnPhone','hideOnTablet','hideOnDesktop']){
  assert.ok(!appearance.some(property=>property.propertyKey===key),key+' in shared metadata');
  assert.ok(!JSON.stringify(manifest).includes('"propertyKey":"'+key+'"'),key+' in UNE manifest');
  assert.ok(!ribbon.includes(key),key+' in ribbon');
 }
 assert.ok(!ribbon.includes('Show on '),'no per-device visibility switches');
});

test('all 14 requested UNE components omit public Flow/Page State record collections',()=>{
 const targets=['calendar','item_grid','chart','choice','form','line_items','lookup','menu',
  'navigation','record_list','repeater','search','slot_picker','table'].map(name=>'une_'+name);
 for(const name of targets){
  const component=une.find(item=>item.apiName===name);
  assert.ok(component,name+' exists');
  assert.ok(!component.propertyDefinitions.some(property=>property.propertyKey==='items'&&property.kind==='RECORD_LIST'),
   name+' must not expose an items record collection');
   assert.ok(!component.propertyDefinitions.some(property=>property.label.includes('Flow/Page State record collection')||property.label.includes('Flow / Page State records')),
   name+' must not expose legacy collection labels');
 }
});

test('Theme is absent from all UNE manifests and shared defaults after remarks cleanup',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../src/component-libraries/manifest.json',import.meta.url),'utf8'));
 assert.ok(!manifest.commonProperties.some(property=>property.propertyKey==='theme'));
 for(const component of une)
  assert.ok(!component.propertyDefinitions.some(property=>property.propertyKey==='theme'),component.apiName+' still exposes Theme');
});

test('AceChatter Conversation button controls are internal code defaults, not metadata',async()=>{
 const conversation=une.find(component=>component.apiName==='une_conversation');
 assert.ok(conversation);
 for(const key of ['showRefresh','refreshLabel','newMessageNoticeLabel'])
  assert.ok(!conversation.propertyDefinitions.some(property=>property.propertyKey===key),key+' still in metadata');
 const code=await readFile(new URL('../src/component-libraries/une_conversation/UneConversation.jsx',import.meta.url),'utf8');
 assert.match(code,/"showRefresh": false/);
 assert.match(code,/"refreshLabel": "Refresh conversations"/);
 assert.match(code,/"newMessageNoticeLabel": "New messages"/);
});

test('only common shared settings remain in AceChatter Conversation metadata',async()=>{
 const conversation=une.find(item=>item.apiName==='une_conversation');
 const common=new Set(['surface','tone','accentColor','backgroundColor','textColor','borderColor',
   'density','radius','padding','gap','shadow','glassBlur','objectApiName','helpText']);
 const raw=JSON.parse(await readFile(new URL('../src/component-libraries/une_conversation/component.json',import.meta.url),'utf8'));
 assert.deepEqual(raw.propertyDefinitions,[]);
 const owned=(await import('../src/component-libraries/une_conversation/app-properties.mjs')).propertyDefinitions;
 assert.deepEqual(new Set(owned.map(item=>item.propertyKey)),common);
 const catalogShared=new Set((await import('../src/component-libraries/common-properties.mjs')).commonProperties.map(item=>item.propertyKey));
 for(const key of conversation.propertyDefinitions.map(item=>item.propertyKey))
  assert.ok(common.has(key)||catalogShared.has(key),key+' is not a shared property');
 const code=await readFile(new URL('../src/component-libraries/une_conversation/UneConversation.jsx',import.meta.url),'utf8');
 for(const key of ['conversations','messages','contactChoices','channelAccounts','canSend',
  'showRefresh','refreshLabel','newMessageNoticeLabel','conversationSourceMode','messageMaxLength',
  'conversationIdFieldApiName','showComposer','filterOptions'])
  assert.ok(code.includes('"'+key+'":'),key+' missing from internal runtime defaults');
 assert.match(code,/\.\.\.uneProps\(props,"Conversation"\)/);
});

test('Cart-specific settings are internal defaults while shared styling remains public',async()=>{
 const cart=une.find(component=>component.apiName==='une_cart');
 const common=new Set(['surface','tone','accentColor','backgroundColor','textColor','borderColor','density','radius','padding','gap','shadow','glassBlur','objectApiName','helpText']);
 const raw=JSON.parse(await readFile(new URL('../src/component-libraries/une_cart/component.json',import.meta.url),'utf8'));
 assert.deepEqual(raw.propertyDefinitions,[]);
 const owned=(await import('../src/component-libraries/une_cart/app-properties.mjs')).propertyDefinitions;
 assert.deepEqual(new Set(owned.map(p=>p.propertyKey)),common);
 const code=await readFile(new URL('../src/component-libraries/une_cart/UneCart.jsx',import.meta.url),'utf8');
 for(const key of ['viewMode','checkoutLabel','stateSyncEnabled','stateReadFlowApiName','stateWriteFlowApiName','showVatTotal','customerDisplayUrl','ageRestrictedFieldApiName'])
  assert.ok(code.includes('"'+key+'":'),key+' must be internal');
 assert.ok(!cart.propertyDefinitions.some(p=>p.propertyKey==='checkoutLabel'));
 assert.match(code,/\.\.\.uneProps\(props,"ShoppingCart"\)/);
});

test('UNE Search and Modal expose only shared properties while retaining internal runtime defaults',async()=>{
 const shared=new Set(['surface','tone','accentColor','backgroundColor','textColor','borderColor','density','radius','padding','gap','shadow','glassBlur','objectApiName','helpText']);
 for(const [name,internal] of [['search',['placeholder','searchKey','value','label','showSubmitButton','submitLabel','showSuggestions','controlledValue']],['modal',['layoutContainer','title','openLabel','startOpen','controlledOpen','isOpen','showTrigger','showCloseButton','closeOnBackdrop','closeOnEscape','fullScreenOnMobile']]]){
  const raw=JSON.parse(await readFile(new URL('../src/component-libraries/une_'+name+'/component.json',import.meta.url),'utf8'));
  assert.deepEqual(raw.propertyDefinitions,[],name+' must have no SQL/UI settings');
  const owned=(await import('../src/component-libraries/une_'+name+'/app-properties.mjs')).propertyDefinitions;
  assert.ok(owned.every(item=>shared.has(item.propertyKey)),name+' owns only existing common defaults');
  assert.ok(owned.length>=12,name+' lost app-owned shared defaults');
  const code=await readFile(new URL('../src/component-libraries/une_'+name+'/Une'+name[0].toUpperCase()+name.slice(1)+'.jsx',import.meta.url),'utf8');
  for(const key of internal){assert.ok(!raw.propertyDefinitions.some(item=>item.propertyKey===key),key+' remains public');assert.ok(code.includes('"'+key+'":'),key+' missing from code defaults');}
  assert.match(code,/\.\.\.uneProps\(props,/);
 }
});


test('Card Grid retires only its 16 removed settings; original runtime remains backward compatible',async()=>{
 const component=une.find(x=>x.apiName==='une_item_grid');
 assert.ok(component);
 const retired=["accentColor","tone","descriptionExpression","emptyText","showDescription","valueTextAlign","missingImageBehavior","showAddIcon","showHeading","badgeExpression","cartTargetKey","currencyCode","headingExpression","separateAddButton","valueColor","valueLineLimit"];
 const declared=new Set(component.propertyDefinitions.map(x=>x.propertyKey));
 for(const name of retired)assert.ok(!declared.has(name),name);
 for(const name of ['title','helpText','imageFieldApiName','badgeFieldApiName','priceFieldApiName'])
   assert.ok(declared.has(name),name);
 const runtime=await readFile(new URL('../src/component-libraries/OneItemGrid/OneItemGrid.jsx',import.meta.url),'utf8');
 assert.ok(runtime.includes('p.cartTargetKey'));
 assert.ok(runtime.includes('p.showAddIcon'));
});
