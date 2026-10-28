import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('ribbon expression picker matches and replaces the token before the caret',()=>{
 const src=readFileSync(new URL('../src/core/builders/PageBuilder/RibbonFieldExpressionInput.tsx',import.meta.url),'utf8');
 assert.match(src,/value\.slice\(0,at\)/);
 assert.match(src,/value\.slice\(at\)/);
 assert.match(src,/selectionStart/);
 assert.match(src,/setSelectionRange\(nextCaret,nextCaret\)/);
});
