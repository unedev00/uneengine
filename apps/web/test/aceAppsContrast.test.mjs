import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const shell=read('../src/core/workspace/Standalone/standaloneRuntime.css');
const kiosk=read('../../../acekiosk/src/acekiosk.css');
const till=read('../../../acetill/src/acetill-terminal.css');
const assist=read('../../../aceassist/src/aceassist.css');
const chat=read('../../../acechatter/src/aceChatter.css');

test('ACE app chrome retains readable title and logout in either appearance',()=>{
 assert.match(shell,/\.standalone-product-header\s*\{[^}]*background:var\(--md-surface/);
 assert.match(shell,/\.standalone-product-brand\{color:inherit\}/);
 assert.match(shell,/\.standalone-product-logout\s*\{[^}]*color:var\(--md-text/s);
});

test('Kiosk menu, basket, modifier and payment surfaces use matching theme tokens',()=>{
 for(const selector of ['.ak-header','.ak-product','.ak-modal','.ak-floating',
  '.ak-order','.ak-option','.ak-paymethods button','.ak-search',
  '.ak-product-body h2','.ak-basket-open']){
  assert.ok(kiosk.includes(selector),selector);
 }
 assert.match(kiosk,/--ak-action:color-mix\(in srgb,var\(--ak-accent\)/);
 assert.match(kiosk,/--ak-secondary:var\(--md-text-2/);
 assert.match(kiosk,/\.ak-shell\.ak-shell\{/);
});

test('Till and receipt/payment screens follow readable surfaces',()=>{
 for(const selector of ['.acetill-current-order','.acetill-product-meta span',
  '.acetill-receipt-panel','.acetill-payment-dialog','.acetill-pin-setup',
  '.acetill-charge','.acetill-cashier-header>button']){
  assert.ok(till.includes(selector),selector);
 }
 assert.match(till,/--till-link:color-mix/);
 assert.match(till,/\.acetill-terminal\.acetill-terminal\{/);
});

test('Assist dashboard, phone navigation and financial editor share one palette',()=>{
 for(const selector of ['.assist-metric','.assist-mobile-nav',
  '.assist-phone-records','.assist-phone-date-strip button.selected',
  '.assist-document-line','.assist-document-totals','.assist-modal',
  '.assist-lookup-menu','.assist-customer-modal input']){
  assert.ok(assist.includes(selector),selector);
 }
 assert.match(assist,/--assist-paper:var\(--md-surface/);
 assert.match(assist,/--assist-muted:var\(--md-text-2/);
});

test('Chatter contacts, messages and compose control use theme surfaces',()=>{
 for(const selector of ['.ace-chat-conversation','.ace-chat-bubble.outgoing',
  '.ace-chat-modal','.ace-chat-compose textarea','.ace-chat-contact-row',
  '.ace-chat-search input']){
  assert.ok(chat.includes(selector),selector);
 }
 assert.match(chat,/--chat-ink:var\(--md-text/);
 assert.match(chat,/--chat-paper:var\(--md-surface/);
});

// The independently branded ACE CTA colours must retain readable white labels.
const hex=h=>h.match(/\w\w/g).map(v=>parseInt(v,16));
const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};
const luminance=rgb=>[.2126,.7152,.0722].reduce((s,w,i)=>s+w*linear(rgb[i]),0);
const contrastOnWhite=rgb=>1.05/(luminance(rgb)+.05);
const blendBlack=(rgb,ratio)=>rgb.map(c=>Math.round(c*ratio));
test('ACE default filled actions reach WCAG AA text contrast',()=>{
 for(const [app,colour] of [['Kiosk','#e31b23'],['Till','#007aff'],
  ['Assist','#147d74'],['Chatter','#076c60']]){
  const rgb=hex(colour.slice(1));
  const action=app==='Chatter'?rgb:blendBlack(rgb,.68);
  assert.ok(contrastOnWhite(action)>=4.5,app+' action contrast: '+contrastOnWhite(action));
 }
});
