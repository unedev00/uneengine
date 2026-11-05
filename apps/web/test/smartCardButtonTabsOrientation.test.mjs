import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildBundledComponent} from '../../../scripts/component-catalog.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
async function renderSmart(apiName,properties){
 const descriptor=JSON.parse(read('../src/component-libraries/'+apiName+'/component.json'));
 const {compiledJs}=await buildBundledComponent(descriptor);
 const sandbox={React,module:{exports:{}},Date,Intl,URL,crypto:globalThis.crypto};
 vm.runInNewContext(compiledJs,sandbox);
 return renderToStaticMarkup(React.createElement(sandbox.module.exports.default,properties));
}

test('Card Grid uses record-scoped formula text and native, independently styled button',async()=>{
 const html=await renderSmart('smart_card_grid',{
  records:[{Id:'product-1',Name:'Burger',Description:'Freshly made',Price:4.5}],
  textSource:'@Name',cardsPerRow:1,cardsPerColumn:1,imageHeight:100,
  imageBackgroundColor:'#eeeeee',cardDescription:'@Description',
  cardValue:'"£" & @Price',cardButtonText:'"Choose +"',
  cardButtonFill:'#123456',cardButtonBorderColor:'#654321',
  cardButtonShape:'shape:oval',cardButtonTextSize:18,cardButtonTextColor:'#ffffff',
  actionFlows:{click:{actionType:'Formula',formula:'@state.selected := @Id'}}
 });
 assert.match(html,/Freshly made/);
 assert.ok(html.includes('£4.5'));
 assert.ok(html.includes('Choose +'));
 assert.match(html,/class="smart-card-button"/);
 assert.match(html,/background-color:#123456/);
 assert.match(html,/border-color:#654321/);
 assert.match(html,/border-radius:50%/);
 assert.match(html,/font-size:18px/);
 assert.match(html,/color:#ffffff/);
 assert.match(html,/background-color:#eeeeee/);
 assert.doesNotMatch(html,/class="smart-grid-action"/,'no nested interactive buttons');
});

test('Unconfigured Card Grid retains the legacy whole-card click action',async()=>{
 const html=await renderSmart('smart_card_grid',{
  records:[{Id:'product-1',Name:'Burger'}],textSource:'@Name',
  actionFlows:{click:{actionType:'Formula',formula:'@state.selected := @Id'}}
 });
 assert.match(html,/class="smart-grid-action"/);
 assert.doesNotMatch(html,/class="smart-card-button"/);
});

test('Smart Tabs supports vertical list and retains horizontal default',async()=>{
 const props={tabs:['ALL','BURGERS','DRINKS'],tabCount:3,tabHeight:54,
  selectedTabColor:'#13579b'};
 const vertical=await renderSmart('smart_tabs',{...props,tabOrientation:'vertical'});
 assert.match(vertical,/aria-orientation="vertical"/);
 assert.match(vertical,/flex-direction:column/);
 assert.match(vertical,/flex-wrap:nowrap/);
 assert.match(vertical,/border-left:4px solid #13579b/);
 assert.match(vertical,/BURGERS/);
 const horizontal=await renderSmart('smart_tabs',props);
 assert.match(horizontal,/aria-orientation="horizontal"/);
 assert.match(horizontal,/flex-direction:row/);
 assert.match(horizontal,/flex-wrap:wrap/);
 assert.doesNotMatch(horizontal,/border-left:4px solid/);
});

test('Manual tab count edits configured static captions without overriding data bindings',async()=>{
 const total=async props=>{
  const html=await renderSmart('smart_tabs',props);
  return (html.match(/role="tab"/g)??[]).length;
 };
 const staticTabs={tabs:['All','Desserts','Wraps','Buckets']};
 assert.equal(await total({...staticTabs,tabCount:2}),2);
 assert.equal(await total({...staticTabs,tabCount:4}),4);
 assert.equal(await total({...staticTabs,tabCount:5}),5,
  'Increasing manual count appends an ordinary default caption');
 assert.equal(await total(staticTabs),4,'Existing configured tabs are preserved without a count override');
 const rows=[{Id:'1',Name:'All'},{Id:'2',Name:'Desserts'},{Id:'3',Name:'Wraps'}];
 assert.equal(await total({objectApiName:'MenuCategory',textSource:'@Name',records:rows,tabCount:2}),2,
  'Existing authorised Object-source cap is unchanged');
});

test('one SQL ribbon inventory owns new Data fx, Button Design and orientation controls',()=>{
 const sql=read('../../server/src/system-support/migrations/20270306-smart-card-button-tabs-orientation.sql');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 for(const id of ['cardDescription','cardValue','cardButtonText']){
  assert.ok(sql.includes("'"+id+"','")&&sql.includes("'Data','Card Grid','expression'"));
 }
 for(const id of ['cardButtonFill','cardButtonBorderColor','cardButtonShape',
                  'cardButtonTextSize','cardButtonTextColor']){
  assert.ok(sql.includes("'"+id+"','")&&sql.includes("'Design','Button'"));
 }
 assert.match(sql,/'tabOrientation','Orientation','Layout','Tabs','choice'/);
 assert.match(sql,/'smart_card_grid','imageBackgroundColor'/);
 assert.ok(sql.includes('ON CONFLICT(property_key) DO NOTHING'));
 assert.ok(sql.includes('ON CONFLICT(component_api,property_key) DO NOTHING'));
 assert.doesNotMatch(sql,/UPDATE md_page_|DELETE FROM md_page_|DROP TABLE/i);
 assert.ok(ribbon.includes("['Source','Values','Cart','Cart columns','Cart totals','Card Grid']"));
 assert.match(ribbon,/'Header Supporting','Button'/);
 assert.match(ribbon,/isDataFormula/);
 assert.ok(runtime.includes('scopedExpression(p,key,p[key]'));
 assert.ok(runtime.includes('if(actionable)fire("click",payload);'));
});


test('Smart Tabs Tab Index selects the correct zero-based default without altering vertical mode',async()=>{
 const selected=async props=>{
  const html=await renderSmart('smart_tabs',props);
  const match=html.match(/<button\b[^>]*aria-selected="true"[^>]*>([^<]*)<\/button>/);
  assert.ok(match,'One tab must be selected');
  return match[1];
 };
 const tabs={tabs:['ALL','FOOD','DRINKS'],tabCount:3};
 assert.equal(await selected(tabs),'ALL','legacy default stays zero');
 assert.equal(await selected({...tabs,tabIndex:0}),'ALL');
 assert.equal(await selected({...tabs,tabIndex:1}),'FOOD');
 assert.equal(await selected({...tabs,tabIndex:2}),'DRINKS');
 assert.equal(await selected({...tabs,tabIndex:99}),'DRINKS','out-of-range clamped');
 assert.equal(await selected({...tabs,tabIndex:-1}),'ALL','negative index rejected');
 assert.equal(await selected({...tabs,tabIndex:1.5}),'ALL','fractional index rejected');
 assert.equal(await selected({...tabs,tabIndex:1,tabOrientation:'vertical'}),'FOOD');
 const records=[{Id:'food',Name:'Food'},{Id:'drinks',Name:'Drinks'}];
 const collection={records,tabCount:2,tabIndex:1,dataCollection:{name:'Categories',items:records}};
 assert.equal(await selected(collection),'Drinks','collections default to the configured actual tab');
 assert.equal(await selected({...collection,pageState:{collectionSelections:{
  Categories:{Id:'food'}
 }}}),'Food','explicit PageState selection always wins');
});

test('SQL Tab Index owns one non-overlapping Layout slot with Orientation and preserves records',()=>{
 const sql=read('../../server/src/system-support/migrations/20270310-smart-tabs-default-index.sql');
 const orientation=read('../../server/src/system-support/migrations/20270306-smart-card-button-tabs-orientation.sql');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 const css=read('../src/core/builders/PageBuilder/SmartRibbonApprovedThreeRow.css');
 assert.match(sql,/'tabIndex','Tab Index','Layout','Tabs','number'/);
 assert.match(sql,/'0'::jsonb,0,20/);
 assert.match(sql,/'smart_tabs','tabIndex',true,NULL,NULL,NULL,NULL/);
 for(const [key,row,col] of [['tabWidth',1,1],['tabHeight',1,2],['tabIndex',2,1],['tabCount',3,1]])
  assert.ok(sql.includes("('"+key+"',"+row+","+col+","),'wrong or overlapping slot '+key);
 assert.match(orientation,/'tabOrientation','Orientation','Layout','Tabs','choice',9,[^\n]*,2,2,116/);
 assert.match(sql,/ON CONFLICT\(property_key\) DO NOTHING/);
 assert.match(sql,/ON CONFLICT\(component_api,property_key\) DO NOTHING/);
 assert.doesNotMatch(sql,/UPDATE md_page_|DELETE FROM md_page_|DROP TABLE/i);
 assert.match(ribbon,/if\(p\.id==='tabIndex'\)return p\.designWidth\?\?30/);
 assert.match(ribbon,/step=\{isTabIndex\?1:undefined\}/);
 assert.match(css,/data-property="tabIndex"/);
 assert.match(runtime,/indexForSelection>=0\?indexForSelection:defaultTabIndex/);
 assert.match(runtime,/selectTab\(defaultTabIndex,true\)/);
 assert.match(runtime,/if\(!initialisingDefault\)autoSelected\.current=null/);
 assert.match(runtime,/changeAction\.actionType!=="PageState"/);
 assert.doesNotMatch(runtime,/firstTabCustom/,'do not restore removed synthetic leading-tab logic');
});

test('Card Grid selectedCardColor follows formula Page State and highlights only its selected row',async()=>{
 const records=[{Id:'cat-food',Name:'FOOD'},{Id:'cat-drinks',Name:'DRINKS'}];
 const html=await renderSmart('smart_card_grid',{
  records,textSource:'@Name',cardsPerRow:1,cardsPerColumn:2,
  imageHeight:0,selectedCardColor:'#d92730',backgroundColor:'#ffffff',
  pageState:{category:'cat-drinks'},
  actionFlows:{click:{actionType:'Formula',formula:'@state.category := @Id'}}
 });
 assert.equal((html.match(/data-selected="true"/g)??[]).length,1);
 assert.match(html,/background:#d92730[^"]*" data-selected="true"/);
 assert.match(html,/FOOD/);
 assert.match(html,/DRINKS/);
});

test('Card Grid selectedCardColor follows authored PageState Name binding and named Collection selection',async()=>{
 const records=[{Id:'food',Name:'FOOD'},{Id:'drink',Name:'DRINKS'}];
 const state=await renderSmart('smart_card_grid',{
  records,textSource:'@Name',selectedCardColor:'#123456',
  pageState:{categoryName:'DRINKS'},
  actionFlows:{click:{actionType:'PageState',stateKey:'categoryName',value:'$event.record.Name'}}
 });
 assert.equal((state.match(/data-selected="true"/g)??[]).length,1);
 assert.match(state,/background:#123456[^"]*" data-selected="true"/);
 const collection=await renderSmart('smart_card_grid',{
  records,textSource:'@Name',selectedCardColor:'#abcdef',
  dataCollection:{name:'Categories',items:records},
  pageState:{collectionSelections:{categories:{Id:'food'}}}
 });
 assert.equal((collection.match(/data-selected="true"/g)??[]).length,1);
 assert.match(collection,/background:#abcdef[^"]*" data-selected="true"/);
 const none=await renderSmart('smart_card_grid',{
  records,textSource:'@Name',selectedCardColor:'#abcdef',
  pageState:{}
 });
 assert.doesNotMatch(none,/data-selected="true"/);
});

test('Card Grid imageWidth applies in left/right mode only, bounded to preserve content',async()=>{
 const common={records:[{Id:'id-1',Name:'Food',ImageUrl:'https://example.com/food.png'}],
  textSource:'@Name',imageSource:'@ImageUrl',imageHeight:100,
  imageWidth:150,headerBoxHeight:44,cardsPerRow:1,cardsPerColumn:1};
 for(const placement of ['left','right']){
  const html=await renderSmart('smart_card_grid',{...common,imagePlacement:placement});
  assert.match(html,/flex:0 0 150px/);
  assert.match(html,/max-width:calc\(100% - 96px\)/);
 }
 for(const placement of ['top','bottom']){
  const html=await renderSmart('smart_card_grid',{...common,imagePlacement:placement});
  assert.match(html,/flex:1 1 100px/);
  assert.doesNotMatch(html,/flex:0 0 150px/);
  assert.doesNotMatch(html,/max-width:calc\(100% - 96px\)/);
 }
 const horizontalWithoutWidth=await renderSmart('smart_card_grid',{...common,imageWidth:undefined,imagePlacement:'left'});
 assert.match(horizontalWithoutWidth,/flex:1 1 50%/,'default side split is preserved');
 const heightZero=await renderSmart('smart_card_grid',{...common,imageHeight:0,imagePlacement:'left'});
 assert.match(heightZero,/flex:0 0 150px/,'imageHeight is ignored for side images');
 const widthZero=await renderSmart('smart_card_grid',{...common,imageWidth:0,imagePlacement:'left'});
 assert.doesNotMatch(widthZero,/flex:0 0 0px/,'zero side width hides only that image');
 assert.match(widthZero,/flex:1 1 100%/,'label retains the full width');
});

test('Card Grid selection and imageWidth use shared SQL Ribbon metadata, no custom toolbar',()=>{
 const sql=read('../../server/src/system-support/migrations/20270311-smart-card-grid-selection-image-width.sql');
 const server=read('../../server/src/system-support/server.ts');
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const catalog=read('../src/core/builders/PageBuilder/uneBuilderPropertyInventory.ts');
 for(const property of ['selectedCardColor','imageWidth']){
  assert.match(sql,new RegExp("'"+property+"'"));
  assert.ok(sql.includes("'smart_card_grid'"),'only shared Card Grid applicability');
 }
 assert.match(sql,/'Design','Card Grid'/);
 assert.match(sql,/"property":"imagePlacement","in":\["left","right"\]/);
 assert.match(sql,/ON CONFLICT\(property_key\) DO NOTHING/);
 assert.match(sql,/ON CONFLICT\(component_api,property_key\) DO NOTHING/);
 assert.doesNotMatch(sql,/DELETE FROM md_page_|UPDATE md_page_|DROP TABLE/i);
 assert.match(server,/p\.enabled_when/);
 assert.match(ribbon,/condition\.in\.includes/);
 assert.match(catalog,/enabledWhen\?:/);
 assert.match(ribbon,/'Summary 2','Card Grid'/);
});
