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
