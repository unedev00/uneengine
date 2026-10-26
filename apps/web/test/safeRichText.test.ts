import assert from 'node:assert/strict';
import test from 'node:test';
import {parseSafeRichText,safeRichTextLink} from '../src/core/pages/PageRuntime/safeRichText';

test('rich-text markup has no executable HTML and preserves ordinary text',()=>{
  const tokens=parseSafeRichText('<img src=x onerror=alert(1)> **bold** and *italics*');
  assert.deepEqual(tokens.map(token=>token.kind),['text','bold','text','italic']);
  assert.match(tokens[0].text,/onerror/);
  assert.equal(tokens[1].text,'bold');
  assert.equal(tokens[3].text,'italics');
});
test('rich-text links only permit safe protocols and unsafe links render literally',()=>{
  assert.equal(safeRichTextLink('javascript:alert(1)'),null);
  assert.equal(safeRichTextLink('data:text/html,hello'),null);
  assert.equal(safeRichTextLink('https://example.com/path'),'https://example.com/path');
  const tokens=parseSafeRichText('[safe](https://example.com) [unsafe](javascript:alert(1))');
  assert.equal(tokens[0].kind,'link');
  assert.equal(tokens[0].href,'https://example.com/');
  assert.equal(tokens[2].kind,'text');
  assert.match(tokens[2].text,/javascript/);
});
test('multi-line rich text supports underline and keeps line breaks',()=>{
  const tokens=parseSafeRichText('Hello\n__line__\nEnd');
  assert.equal(tokens[1].kind,'underline');
  assert.equal(tokens[0].text,'Hello\n');
  assert.equal(tokens[2].text,'\nEnd');
});
