import test from 'node:test';
import assert from 'node:assert/strict';
import {hasLegacyCartReference,rewriteLegacyCartText,rewriteLegacyCartFlow,rewriteLegacyCartPage} from './cart-legacy-references.mjs';

test('Formula GETRECORD uses selected cart, not ambiguous browser SessionKey',()=>{
 assert.equal(rewriteLegacyCartText('=GETRECORD(CartSession, SessionKey, $session.id, AS(cart))'),
  '=GETRECORD(Cart, Id, $session.cartId, AS(cart))');
 assert.equal(rewriteLegacyCartText('=GETRECORD("CartSession", "SessionKey", $session, AS(cart))'),
  '=GETRECORD(Cart, Id, $session.cartId, AS(cart))');
 assert.equal(rewriteLegacyCartText('=GETRECORD(CartSession, SessionKey, {!sessionKey}, AS(cart))'),
  '=GETRECORD(Cart, Id, {!cartId}, AS(cart))');
 assert.equal(rewriteLegacyCartText('=GETRECORD(CartSession, SessionKey, anything, AS(cart))',{page:true}),
  '=GETRECORD(Cart, Id, $session.cartId, AS(cart))');
 assert.equal(rewriteLegacyCartText('=COUNTIFS(CartSession, Status, "Open", UserId, $session.user.id)'),
  '=COUNTIFS(Cart, Status, "Open", UserId, $session.user.id)');
 assert.equal(rewriteLegacyCartText('=$state.cartSessionId & CartLine.CartSession'),
  '=$state.activeCartId & CartLine.Cart');
 assert.equal(rewriteLegacyCartText('Open carts use $session.user.id'), 'Open carts use $session.user.id');
});
test('custom Flow preserves other nodes, changes SessionKey single lookup, CartLine parent, ownership',()=>{
 const original={
  apiName:'CustomCashierFlow',resources:[{name:'cartSessionId',type:'Variable',dataType:'Text',availableForOutput:true}],
  elements:[
   {id:1,type:'Get Records',config:{object:'CartSession',recordLimit:'1',outputVariable:'basket',
    conditions:[{field:'SessionKey',operator:'Equals',value:'{!sessionKey}'}]}},
   {id:2,type:'Create Records',config:{object:'CartSession',fieldValues:[{field:'Status',value:'Open'}]}},
   {id:3,type:'Create Records',config:{object:'CartLine',fieldValues:[{field:'CartSession',value:'{!cartSessionId}'}]}},
   {id:4,type:'Assignment',config:{variable:'foo',value:'unrelated'}},
  ],connectors:[{from:1,to:2},{from:2,to:3},{from:3,to:4}],
  customExtensions:{formula:'=GETRECORD(CartSession, SessionKey, $session, AS(cart))'}
 };
 const result=rewriteLegacyCartFlow(original);
 assert.equal(result.changed,true);
 assert.deepEqual(result.graph.elements[0].config.conditions,[
  {field:'Id',operator:'Equals',value:'{!cartId}'},
  {field:'UserId',operator:'Equals',value:'{!$User.Id}'}
 ]);
 assert.ok(result.graph.elements[1].config.fieldValues.some(f=>f.field==='UserId'));
 assert.equal(result.graph.elements[2].config.fieldValues[0].field,'Cart');
 assert.equal(result.graph.elements[2].config.fieldValues[0].value,'{!cartId}');
 assert.equal(result.graph.elements[3].config.value,'unrelated');
 assert.ok(result.graph.resources.some(v=>v.name==='cartId'&&v.availableForInput));
 assert.ok(!hasLegacyCartReference(JSON.stringify(result.graph)));
 assert.ok(hasLegacyCartReference(JSON.stringify(original)),'never mutate customer graph');
 assert.equal(rewriteLegacyCartFlow(result.graph).changed,false);
});
test('page metadata rewrites saved card grid, formula, output state without clobbering custom fields',()=>{
 const original={components:[{id:'grid',properties:{objectApiName:'CartSession',
  relatedFieldApiName:'CartSession',relatedFilterKey:'cartSessionId',
  autoRecordScope:true,otherFormula:'=GETRECORD(CartSession, SessionKey, $session.id, AS(c))',
  actionFlows:{click:{flowApiName:'CustomFlow',inputs:{cartSessionId:'$state.cartSessionId'},
  outputs:{cartSessionId:'cartSessionId'}},hello:{other:'untouched'}}}}]};
 const {page,changed}=rewriteLegacyCartPage(original);
 assert.equal(changed,true);
 const p=page.components[0].properties;
 assert.equal(p.objectApiName,'Cart');
 assert.equal(p.relatedFilterKey,'activeCartId');
 assert.equal(p.relatedFieldApiName,'Cart');
 assert.equal(p.autoRecordScope,false);
 assert.equal(p.actionFlows.click.inputs.cartId,'$session.cartId');
 assert.equal(p.actionFlows.click.outputs.cartId,'activeCartId');
 assert.equal(p.actionFlows.hello.other,'untouched');
 assert.ok(!hasLegacyCartReference(JSON.stringify(page)));
 assert.equal(rewriteLegacyCartPage(page).changed,false);
});
test('unknown resource collisions stop conversion rather than drop Flow/Page state',()=>{
 assert.throws(()=>rewriteLegacyCartFlow({elements:[],resources:[],
  variables:{cartSessionId:'a',cartId:'b'}}),/collides/);
 assert.throws(()=>rewriteLegacyCartPage({components:[],cartSessionId:'a',activeCartId:'b'}),/collides/);
});

test('literal stored CartSession record identifiers resolve to their migrated Cart IDs',()=>{
 const from='11111111-1111-4111-8111-111111111111';
 const to='22222222-2222-4222-8222-222222222222';
 const cartIds=new Map([[from,to]]);
 assert.equal(rewriteLegacyCartText('=GETRECORD(CartSession,Id,"'+from+'",AS(c))',{cartIds}),
  '=GETRECORD(Cart,Id,"'+to+'",AS(c))');
 const custom={apiName:'UserAuthored',elements:[{id:2,type:'Get Records',
  config:{object:'Cart',conditions:[{field:'Id',operator:'Equals',value:from}]}}]};
 assert.equal(rewriteLegacyCartFlow(custom,{cartIds}).graph.elements[0].config.conditions[0].value,to);
 assert.equal(rewriteLegacyCartPage({components:[],formula:'=REF("'+from+'")'},{cartIds}).page.formula,
  '=REF("'+to+'")');
});
