import { readPageBuilderModules } from './helpers/builderSources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('custom cart buttons are independently controlled by persisted component visibility properties',()=>{
 const cart=read('component-libraries/smart_cart/SmartCart.jsx');
 for(const key of ['customButton1','customButton2'])
  assert.match(cart,new RegExp('p\.'+key+'Visible!==false'));
 assert.match(cart,/\]\.filter\(action=>action\.visible\)/);
 assert.match(cart,/selected&&expandedActions\.length>0&&<div className="smart-cart-expanded-actions"/);
 assert.match(cart,/\{expandedActions\.map\(action=>/);
 // Existing saved carts still show the buttons unless the user explicitly hides them.
 assert.ok(!cart.includes('Boolean(actions.customButton1)&&'));
 assert.ok(!cart.includes('Boolean(actions.customButton2)&&'));
});

test('cart quantity icon eye settings hide controls without changing numeric field validation',()=>{
 const cart=read('component-libraries/smart_cart/SmartCart.jsx');
 assert.match(cart,/showIncrease=p\.qtyIncreaseVisible!==false/);
 assert.match(cart,/showDecrease=p\.qtyDecreaseVisible!==false/);
 assert.match(cart,/\{showIncrease&&<button/);
 assert.match(cart,/\{showDecrease&&<button/);
 assert.match(cart,/if\(!numeric\)return <span/);
});

test('Action ribbon eye controls are cart-only and stay compact',()=>{
 const action=read('core/builders/PageBuilder/PageBuilderActionRibbon.tsx');
 const view=readPageBuilderModules();
 const css=read('core/builders/PageBuilder/PageBuilderActionRibbonCompact.css');
 assert.match(action,/members\.every\(member=>member==='smart_cart'\)/);
 assert.match(action,/page-action-visibility-toggle/);
 assert.match(action,/EyeOff size=\{15\}/);
 assert.match(action,/Eye size=\{15\}/);
 assert.match(action,/onButtonVisibilityChange/);
 assert.match(view,/properties:\{\.\.\.selected\.properties,\[property\]:visible\}/);
 assert.match(view,/properties:\{\.\.\.item\.properties,\[property\]:visible\}/);
 assert.match(css,/page-action-visibility-toggle/);
 assert.match(css,/flex:0 0 23px/);
});
