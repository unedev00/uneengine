import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// Smart components also run in the common JSX runtime where React is supplied
// globally; provide the same contract when exercising their real DOM tree.
globalThis.React = React;
const {default: SmartRuntime} = await import('../src/component-libraries/smart/shared/SmartRuntime.jsx');

const render = properties => renderToStaticMarkup(React.createElement(SmartRuntime, {
  kind:'smart_image',imageSource:'https://example.com/test-logo.png',...properties
}));
const native = (html, tag) => {
  const node = html.match(new RegExp('<'+tag+'\\b[^>]*>'))?.[0] ?? '';
  assert.ok(node,'Missing native '+tag+' in '+html.slice(0,400));
  return node.match(/style="([^"]*)"/)?.[1] ?? '';
};

test('Smart Image never paints an outer card border, even if both border colours are authored', () => {
  const html = render({borderColor:'#111111',imageBorderColor:'#222222',radius:16});
  const article = native(html,'article'), img = native(html,'img');
  assert.match(article,/border:none/);
  assert.doesNotMatch(article,/1px solid/);
  assert.match(img,/border:1px solid #222222/);
  assert.match(img,/border-radius:16px/);
});

test('Smart Image borderColor is backwards compatible and defaults to no border', () => {
  const configured = render({borderColor:'#123456'});
  assert.match(native(configured,'article'),/border:none/);
  assert.match(native(configured,'img'),/border:1px solid #123456/);
  const blank = render({});
  assert.match(native(blank,'article'),/border:none/);
  assert.doesNotMatch(native(blank,'img'),/border:/);
});

test('Smart Image borderWidth zero removes all authored visible strokes', () => {
  const html = render({borderWidth:0,borderColor:'#111111',imageBorderColor:'#222222'});
  assert.match(native(html,'article'),/border:none/);
  assert.doesNotMatch(native(html,'img'),/border:1px solid/);
});

test('Card Grid retains its independently configurable card and image borders', () => {
  const html = renderToStaticMarkup(React.createElement(SmartRuntime,{
    kind:'smart_card_grid',records:[{id:'a'}],cardsPerRow:1,cardsPerColumn:1,
    imageSource:'https://example.com/test-logo.png',
    borderColor:'#333333',imageBorderColor:'#444444'
  }));
  assert.match(native(html,'article'),/border:1px solid #333333/);
  assert.match(native(html,'img'),/border:1px solid #444444/);
});


test('Smart Card Grid keeps every record and derives card height from configured visible rows', () => {
  for (const rowCount of [1,2,3,6]) {
    const items=Array.from({length:23},(_,i)=>({Id:'item-'+i,Name:'Product '+(i+1)}));
    const html=renderToStaticMarkup(React.createElement(SmartRuntime,{
      kind:'smart_card_grid',records:items,cardsPerRow:3,cardsPerColumn:rowCount,
      width:640,height:420,gap:10,imageSource:'@ImageUrl',textSource:'@Name'
    }));
    assert.equal((html.split('<article').length-1),23,
      'Rows per column must never discard records');
    assert.match(html,/height:100%;min-height:0/);
    assert.ok(html.includes('grid-auto-rows:max(96px, calc((100% - 8px - '+(rowCount-1)*10+'px) / '+rowCount+'))'));

    assert.match(html,/overflow-y:auto/);
  }
});

test('Card Grid preview shows image and title placeholders but hides blank badges', () => {
  const preview=renderToStaticMarkup(React.createElement(SmartRuntime,{
    kind:'smart_card_grid',records:[],cardsPerRow:3,cardsPerColumn:2,
    width:640,height:400,previewOnly:true,badgeVisible:true
  }));
  assert.equal((preview.split('<article').length-1),6);
  assert.equal((preview.split('Image Here').length-1),6);
  assert.equal((preview.split('Text here').length-1),6);
  assert.equal((preview.split('>Badge</span>').length-1),0);
  const published=renderToStaticMarkup(React.createElement(SmartRuntime,{
    kind:'smart_card_grid',records:[],cardsPerRow:3,cardsPerColumn:2
  }));
  assert.doesNotMatch(published,/Image Here|Text here|card-preview-/);
});

test('Card Grid appearance applies typography, alignment, visible header and image constraints', () => {
  const html=renderToStaticMarkup(React.createElement(SmartRuntime,{
    kind:'smart_card_grid',records:[{Id:'1',Name:'Product'}],
    cardsPerRow:1,cardsPerColumn:1, imageSource:'https://example.com/product.png',
    textSource:'@Name',textSize:20,labelAlignment:'right',imageHeight:180,
    headerBoxHeight:48,backgroundColor:'#aabbcc',borderColor:'#334455',
    imageBorderColor:'#445566',headerBorderColor:'#556677',radius:15
  }));
  assert.match(html,/font-size:20px/);
  assert.match(html,/text-align:right/);
  assert.match(html,/height:48px/);
  assert.match(html,/max-height:180px/);
  assert.match(html,/border:1px solid #334455/);
  assert.match(html,/border:1px solid #445566/);
  assert.match(html,/border:1px solid #556677/);
  assert.match(html,/background:#aabbcc/);
  const noHeader=renderToStaticMarkup(React.createElement(SmartRuntime,{
    kind:'smart_card_grid',records:[{Id:'1',Name:'Product'}],textSource:'@Name',headerBoxHeight:0
  }));
  assert.doesNotMatch(noHeader,/smart-card-content/);
});


test('Card Grid handles every image placement, zero-height image/header and blank badge',()=>{
 for(const placement of ['top','bottom','left','right']){
   const html=renderToStaticMarkup(React.createElement(SmartRuntime,{
     kind:'smart_card_grid',records:[{Id:'i1',Name:'Product'}],
     textSource:'@Name',imageSource:'https://example.com/a.png',
     imagePlacement:placement,imageHeight:100,headerBoxHeight:28,
     cardsPerRow:1,cardsPerColumn:1,
     badgeVisible:true,badgeText:''
   }));
   assert.match(html,/height:28px/,'Header height must apply to '+placement);
   assert.doesNotMatch(html,/smart-badge/,'An empty badge must not appear');
   assert.equal(html.split('<article').length-1,1);
 }
 const collapsed=renderToStaticMarkup(React.createElement(SmartRuntime,{
   kind:'smart_card_grid',records:[{Id:'i1',Name:'Product'}],
   textSource:'@Name',imageHeight:0,headerBoxHeight:0
 }));
 assert.doesNotMatch(collapsed,/smart-card-content|smart-card-image-placeholder/);
 assert.doesNotMatch(collapsed,/<img /);
});


test('Smart Image uses the requested 122px caption size without a 44px clipping mask',()=>{
  const html=render({textSource:'"Eat in"',textSize:122,headerBoxHeight:44,
    imagePlacement:'left',imageWidth:165,wrapText:true});
  const article=native(html,'article');
  const caption=html.match(/<div[^>]*class="smart-card-content"[^>]*>/)?.[0]??'';
  assert.ok(caption,'Smart Image caption was not rendered');
  assert.match(article,/font-size:122px/,'Editor font size must equal rendered size');
  assert.match(article,/overflow-y:auto/,'Oversized card content must remain reachable');
  assert.match(caption,/height:44px/,'Existing Header Box Height is preserved');
  assert.match(caption,/min-height:max-content/,'Header height must grow with its text');
  assert.match(caption,/font-size:122px/);
  assert.match(caption,/overflow:visible/,'Text cannot be hidden by its caption wrapper');
  assert.match(caption,/align-self:safe center/,'A tall side caption cannot overflow above the card');
});

test('Card Grid applies large and focused caption sizes without clipping or disabling Wrap Text',()=>{
  for(const focused of [false,true]){
    const html=renderToStaticMarkup(React.createElement(SmartRuntime,{
      kind:'smart_card_grid',records:[{Id:'one',Name:'Two line card header'}],
      textSource:'@Name',imageHeight:0,cardsPerRow:1,cardsPerColumn:1,
      textSize:122,headerBoxHeight:44,wrapText:true,
      ...(focused?{
        focusedTextSize:144,pageState:{selected:'one'},
        actionFlows:{click:{actionType:'Formula',formula:'@state.selected := @Id'}}
      }:{})
    }));
    const caption=html.match(/<div[^>]*class="smart-card-content"[^>]*>/)?.[0]??'';
    assert.ok(caption,'Card Grid caption must be rendered');
    assert.match(native(html,'article'),new RegExp('font-size:'+(focused?144:122)+'px'));
    assert.match(native(html,'article'),/overflow-y:auto/);
    assert.match(caption,/height:44px/);
    assert.match(caption,/min-height:max-content/);
    assert.match(caption,/white-space:normal/);
    assert.match(caption,/overflow:visible/);
  }
  const noWrap=render({textSource:'"A very long caption"',textSize:122,wrapText:false});
  assert.match(noWrap,/class="smart-card-content"[^>]*white-space:nowrap;overflow:auto/,
    'No-wrap titles need a horizontal scroll path rather than silent clipping');
});

test('Smart Image preview placeholder shares native image radius and clips all four corners',()=>{
  const html=render({imageSource:'',builderPreview:true,radius:18,
    imageBorderColor:'#123456',borderWidth:1});
  const node=html.match(/<div class="smart-image-empty smart-editor-image-placeholder"[^>]*>/)?.[0]??'';
  assert.ok(node,'Missing Image Here preview placeholder');
  assert.match(node,/border:1px solid #123456/);
  assert.match(node,/border-radius:18px/);
  assert.match(node,/box-sizing:border-box/);
  assert.match(node,/overflow:hidden/);
  assert.match(native(html,'article'),/border-radius:18px/);
  assert.match(native(html,'article'),/overflow:hidden/);
});
