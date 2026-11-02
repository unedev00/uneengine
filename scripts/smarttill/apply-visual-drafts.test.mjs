import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pageNames,visualBlocks,prepareVisualDraft,verifyVisualDraft} from './apply-visual-drafts.mjs';

const page=(name,components=[],variant='Desktop')=>({
 apiName:name,label:name,pageType:'App Page',targetObject:'',status:'Draft',
 layoutMode:components.length?'free-canvas':'template',draftRevision:0,
 publishedRevision:0,canvasWidth:1440,canvasHeight:900,
 activationAssignments:[],components
});

test('both UI-only pages use the existing registered component types in all 4 variants',()=>{
 assert.deepEqual(Object.keys(pageNames),['customer','lock']);
 const variants=['Desktop','Tablet','Mobile','Custom'];
 const allowed=new Set(['smart_container','smart_cart','smart_icon','smart_button','ui_input']);
 for(const variant of variants)for(const type of Object.keys(pageNames)){
  const blocks=visualBlocks(type,variant),ids=new Set(blocks.map(b=>b.id));
  assert.equal(ids.size,blocks.length);
  assert.equal(blocks[0].position.x,0);
  assert.equal(blocks[0].position.y,0);
  for(const b of blocks){
   assert(allowed.has(b.type.slice(7)),b.type);
   assert.equal(b.properties.libraryComponentId,b.type.slice(7));
   assert(!Object.hasOwn(b.properties,'objectApiName'));
   assert(!Object.hasOwn(b.properties,'actionFlows'));
   assert(!Object.hasOwn(b.properties,'filters'));
   assert(!Object.hasOwn(b.properties,'textSource'));
   assert(!Object.hasOwn(b.properties,'subtotalValue'));
   assert(!Object.hasOwn(b.properties,'totalValue'));
   assert(b.position.width>0&&b.position.height>0);
   if(b.parentId){
    assert(ids.has(b.parentId),'Missing parent: '+b.id);
    assert.equal(b.properties.layoutParentId,b.parentId);
   }
  }
 }
});
test('customer display prepares nine blocks including a hidden thank-you state',()=>{
 const blocks=visualBlocks('customer');
 assert.equal(blocks.length,9);
 assert.equal(blocks.filter(b=>b.visible===false).length,4);
 const cart=blocks.find(b=>b.id==='stcd-order-cart');
 assert.deepEqual(cart.properties.columnVisibility,['Column 1','Column 4']);
 assert.equal(cart.properties.qtyIncreaseVisible,false);
 assert.equal(cart.properties.customButton1Visible,false);
});
test('lock screen uses secure generic input and has no authentication behaviour',()=>{
 for(const variant of ['Desktop','Tablet','Mobile','Custom']){
  const blocks=visualBlocks('lock',variant);
  const pin=blocks.find(b=>b.id==='stls-pin-input');
  assert.equal(pin.type,'Custom:ui_input');
  assert.equal(pin.properties.inputType,'password');
  assert.equal(pin.properties.allowTyping,true);
  assert.equal(pin.properties.maxLength,8);
  assert.equal(pin.properties.value,'');
  for(const name of ['stls-unlock','stls-logout']){
   const button=blocks.find(b=>b.id===name);
   assert.equal(button.type,'Custom:smart_button');
   assert(!Object.hasOwn(button.properties,'actionFlows'));
  }
 }
});
test('draft creation is additive and idempotent',()=>{
 const initial=page('smarttill_customerdisplay');
 const once=prepareVisualDraft(initial,'customer','Desktop');
 assert(once.changed);
 assert.equal(once.draft.components.length,9);
 assert.equal(once.draft.layoutMode,'free-canvas');
 const saved={...once.draft,draftRevision:2};
 verifyVisualDraft(initial,saved,'customer','Desktop',once.added);
 const again=prepareVisualDraft(saved,'customer','Desktop');
 assert.equal(again.changed,false);
 assert.deepEqual(again.draft,saved);
});
test('preserves unrelated author metadata, page binding and actionFlows',()=>{
 const original={
  id:'user-authored',type:'Custom:smart_button',label:'My existing button',
  region:'main',visible:true,position:{x:0,y:0,width:1400,height:80},
  properties:{label:'My button',actionFlows:{click:{actionType:'Flow',flowApiName:'Existing'}}}
 };
 const initial={...page('smarttill_lockscreen',[original]),
  targetObject:'Account',draftRevision:4,publishedRevision:3};
 const result=prepareVisualDraft(initial,'lock','Desktop');
 assert(result.changed);
 assert.deepEqual(result.draft.components.find(c=>c.id==='user-authored'),original);
 assert.equal(result.draft.targetObject,'Account');
 assert.equal(result.draft.publishedRevision,3);
 const saved={...result.draft,draftRevision:5};
 verifyVisualDraft(initial,saved,'lock','Desktop',result.added);
});
test('rejects incompatible ID, nonempty template, undersized existing canvas',()=>{
 const colliding={...visualBlocks('lock')[0],type:'Custom:smart_text'};
 assert.throws(()=>prepareVisualDraft(page('p',[colliding]),'lock'),/incompatible type/);
 const nonempty={...page('p',[{id:'unknown'}]),layoutMode:'template'};
 assert.throws(()=>prepareVisualDraft(nonempty,'customer'),/free-canvas/);
 const small={...page('p',[{id:'other',type:'Custom:ui_input'}]),
  layoutMode:'free-canvas',canvasWidth:1000};
 assert.throws(()=>prepareVisualDraft(small,'customer'),/smaller/);
});
