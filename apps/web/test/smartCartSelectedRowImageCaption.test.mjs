import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

globalThis.React=React;
const {default:SmartRuntime}=await import('../src/component-libraries/smart/shared/SmartRuntime.jsx');
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const render=(kind,p={})=>renderToStaticMarkup(React.createElement(SmartRuntime,{
 kind,records:[],builderPreview:true,previewOnly:true,...p
}));
const selectedStyle=html=>{
 const found=html.match(/<div class="smart-cart-row-wrap is-selected" style="([^"]*)"/);
 assert.ok(found,'Expected last Cart row to be selected');
 return found[1];
};

test('Cart selected-row colours appear only for Cart, at Design Row R2/C2 and R3/C2',()=>{
 const sql=read('../../server/src/system-support/migrations/20270307-smart-cart-selected-row-image-caption.sql');
 for(const [key,label,row] of [
  ['selectedRowColor','Selected Row Color',2],
  ['selectedRowBorderColor','Selected Row Border',3]
 ]){
  assert.ok(sql.includes("('"+key+"','"+label+"',"+row+",2)"),key+' ribbon slot');
  assert.ok(sql.includes("('smart_cart','"+key+"')"),key+' applicability');
 }
 assert.match(sql,/row_no,col_no,40,26,0/);
 assert.match(sql,/ON CONFLICT\(property_key\) DO NOTHING/);
 assert.match(sql,/ON CONFLICT\(component_api,property_key\) DO UPDATE SET enabled=true/);
 assert.doesNotMatch(sql,/UPDATE\s+md_page_|DELETE\s+FROM\s+md_page_/i);
 const geometry=read('../../server/src/system-support/migrations/20270215-smart-ribbon-data-design-geometry.sql');
 for(const [key,row,col,width] of [
  ['rowBorderColor',1,1,40],['rowLabelColor',1,2,40],
  ['rowRadius',2,1,58],['rowHeight',3,1,58]
 ])assert.ok(geometry.includes("('"+key+"','Row',"+row+","+col+","+width+")"),key+' existing slot');
});

test('Cart selection uses saved fill; Selected Row Border is retired (no border override)',()=>{
 const original=selectedStyle(render('smart_cart'));
 assert.match(original,/background-color:#f2f7ff/i);
 assert.doesNotMatch(original,/border-color/i);
 const changed=selectedStyle(render('smart_cart',{
  selectedRowColor:'#abc123',selectedRowBorderColor:'#123abc'
 }));
 assert.match(changed,/background-color:#abc123/i);
 assert.doesNotMatch(changed,/border-color|#123abc|#f2f7ff/i);
 const transparent=selectedStyle(render('smart_cart',{selectedRowColor:'transparent'}));
 assert.match(transparent,/background-color:transparent/i);
});

test('Image caption reuses shared Design controls, without duplicate property definitions',()=>{
 const sql=read('../../server/src/system-support/migrations/20270307-smart-cart-selected-row-image-caption.sql');
 for(const key of ['labelColor','labelAlignment','textSize'])
  assert.ok(sql.includes("('smart_image','"+key+"')"),'Image applicability for '+key);
 const geometry=read('../../server/src/system-support/migrations/20270215-smart-ribbon-data-design-geometry.sql');
 assert.match(geometry,/\('labelColor','Body',2,1,40\)/);
 assert.match(geometry,/\('labelAlignment','Typography',1,1,35\)/);
 assert.match(geometry,/\('textSize','Typography',3,1,58\)/);
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 assert.match(ribbon,/property\.components\.includes\(api\)/);
});

test('Image caption uses Label Color, Label Alignment and Text Size independently of header settings',()=>{
 const html=render('smart_image',{
  textSource:'Photo caption',headerBoxHeight:32,
  imageSource:'https://example.com/photo.png',
  labelColor:'#1a2b3c',labelAlignment:'right',textSize:24,
  headerAlignment:'left',defaultValueColor:'#abcdef'
 });
 const caption=html.match(/<div(?: data-md-bind="textSource")?(?: data-md-bind-titles="[^"]*")? class="smart-card-content" style="([^"]+)">Photo caption<\/div>/);
 assert.ok(caption,'Image caption must render from textSource');
 assert.match(caption[1],/color:#1a2b3c/i);
 assert.match(caption[1],/text-align:right/);
 assert.match(caption[1],/justify-content:flex-end/);
 assert.match(caption[1],/font-size:24px/);
 const fallback=render('smart_image',{textSource:'Photo caption',headerAlignment:'center'});
 assert.match(fallback,/text-align:center/);
});

test('Card Grid keeps its existing Header Alignment and Default Value Color precedence',()=>{
 const html=render('smart_card_grid',{
  records:[{Id:'1',Name:'Desk'}],textSource:'@Name',cardsPerRow:1,cardsPerColumn:1,
  headerAlignment:'left',labelAlignment:'right',defaultValueColor:'#abc123',labelColor:'#123abc'
 });
 const caption=html.match(/<div(?: data-md-bind="textSource")?(?: data-md-bind-titles="[^"]*")? class="smart-card-content" style="([^"]+)">Desk<\/div>/);
 assert.ok(caption,'Card Grid header must render');
 assert.match(caption[1],/text-align:left/);
 assert.match(caption[1],/color:#abc123/i);
});
