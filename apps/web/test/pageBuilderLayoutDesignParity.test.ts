import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HIDDEN_RIBBON_PROPERTY_KEYS,hasDesign2LayoutEquivalent} from
 '../src/core/builders/PageBuilder/layoutRibbonVisibility';
import {smartTabsHaveDataSource} from '../src/core/builders/PageBuilder/smartTabsCountSource';
import type {Design2Slot,Design2SlotRule} from
 '../src/core/builders/PageBuilder/uneBuilderPropertyInventory';

const file=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const matrix=file('../../server/src/system-support/migrations/20271104-zz-design2-exact-approved-matrix.sql');
const slots:Design2Slot[]=[...matrix.matchAll(/\('([^']+)',\d+,'([^']+)',\d+,\d+,\d+,\d+,'[^']+','[^']+'\)/g)]
 .map(([,area,slotKey])=>({area,slotKey,areaOrder:0,row:1,order:1,width:40,height:26,propertyKey:null,fallbackKey:''}));
const rules:Design2SlotRule[]=[...matrix.matchAll(/\('(smart_[^']+)','([^']+)','([^']+)','([^']+)'\)/g)]
 .map(([,componentApi,area,slotKey,propertyKey])=>({componentApi,area,slotKey,propertyKey}));
const matches=(key:string,apis:string[],supported=apis)=>
 hasDesign2LayoutEquivalent(key,apis,supported,slots,rules);

test('Layout yields to reachable Design controls across different components',()=>{
 for(const [key,api] of [
   ['width','smart_card_grid'],['height','smart_cart'],
   ['imagePlacement','smart_image'],['imageFill','smart_cart'],
   ['imageBackgroundColor','smart_image'],
   ['headerBoxHeight','smart_textbox'],
   ['headerBoxHeight','smart_table'],
   ['supportingBoxHeight','smart_cart'],
   ['navigationDirection','smart_navigation'],
   ['tabOrientation','smart_tabs']
 ]){
   assert.ok(matches(key,[api]),key+' must be edited in Design 2 for '+api);
 }
 for(const key of ['x','y','badgeVisible'])
   assert.ok(matches(key,['smart_card_grid']),key+' has a Design 2 context control');
});

test('Layout retains distinct or missing Design controls',()=>{
 for(const key of ['tabWidth','tabHeight','tabCount','tabIndex',
   'cardsPerRow','cardsPerColumn','showDays','firstDay'])
   assert.equal(matches(key,['smart_card_grid']),false,key+' is Layout-only');

 // A SQL rule by itself does not make a Design control reachable. Image height
 // has no Image area slot in the approved matrix until one is added.
 const missingImageHeightRule=[
   ...rules,
   {componentApi:'smart_card_grid',area:'Image',slotKey:'height',propertyKey:'imageHeight'}
 ];
 assert.equal(hasDesign2LayoutEquivalent('imageHeight',['smart_card_grid'],
   ['smart_card_grid'],slots,missingImageHeightRule),false);
 assert.equal(matches('imageBackgroundColor',['smart_cart']),false);
 assert.equal(matches('imageFill',['smart_image'],['smart_cart']),false);
});

test('Mixed selection only suppresses Layout when every component has Design coverage',()=>{
 assert.equal(matches('imageFill',['smart_image','smart_card_grid']),true);
 assert.equal(matches('imageBackgroundColor',['smart_image','smart_cart']),false);
 assert.equal(matches('width',['smart_image','smart_cart'],['smart_image']),false);
});

test('Only Card Grid has a contextual Image Border editor; Icon Fill stays hidden',()=>{
 assert.equal(HIDDEN_RIBBON_PROPERTY_KEYS.has('imageBorderColor'),true);
 assert.equal(HIDDEN_RIBBON_PROPERTY_KEYS.has('iconFillColor'),true);
 assert.equal(HIDDEN_RIBBON_PROPERTY_KEYS.has('tabIndex'),true);
 assert.equal(HIDDEN_RIBBON_PROPERTY_KEYS.has('borderColor'),false);
 assert.equal(HIDDEN_RIBBON_PROPERTY_KEYS.has('imageBackgroundColor'),false);
 const ribbon=file('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 assert.match(ribbon,/!HIDDEN_RIBBON_PROPERTY_KEYS\.has\(p\.id\)/);
 assert.match(ribbon,/hasDesign2LayoutEquivalent\(/);
 assert.match(ribbon,/tab==='Layout'&&hasDesign2LayoutEquivalent/);
 assert.match(ribbon,/area==='Image'&&api==='smart_card_grid'/);
});

test('Manual tab count disables for any real Tabs Object or Collection source',()=>{
 assert.equal(smartTabsHaveDataSource({}),false);
 assert.equal(smartTabsHaveDataSource({objectApiName:'   ',collectionFormula:'  '}),false);
 assert.equal(smartTabsHaveDataSource({tabs:['All','Desserts'],tabCount:2}),false);
 assert.equal(smartTabsHaveDataSource({objectApiName:'MenuCategory'}),true);
 assert.equal(smartTabsHaveDataSource({objectApiName:'MenuCategory',textSource:'@Name'}),true);
 assert.equal(smartTabsHaveDataSource({collectionFormula:'=COLLECTION("Categories")'}),true);
 assert.equal(smartTabsHaveDataSource({dataCollection:{name:'Categories',items:[]}}),true);
 assert.equal(smartTabsHaveDataSource({dataSource:'Collection:Categories'}),true);
});
