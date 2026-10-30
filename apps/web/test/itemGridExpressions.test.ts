import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateFieldExpression} from '../src/component-libraries/shared/FieldExpression.js';

test('Card Grid expressions concatenate fields and quoted literals without executing code',()=>{
  const record={CurrencySymbol:'£',Price:1.25,Name:'Cola',Category:'Drinks'};
  assert.equal(evaluateFieldExpression('@CurrencySymbol & " " & @Price',record),'£ 1.25');
  assert.equal(evaluateFieldExpression('@Name & " · " & @Category',record),'Cola · Drinks');
  assert.equal(evaluateFieldExpression('@Missing & "x"',record),'x');
  assert.equal(evaluateFieldExpression('record.Name',record),'');
  assert.equal(evaluateFieldExpression('@Name &',record),'');
  assert.equal(evaluateFieldExpression('@__proto__',record),'');
});
test('Card Grid expression slots preserve legacy field mappings',()=>{
  const src=readFileSync(new URL('../src/component-libraries/shared/primitives/ItemGrid/ItemGrid.jsx',import.meta.url),'utf8');
  assert.match(src,/p\.headingExpression \? evaluateFieldExpression/);
  assert.match(src,/p\.badgeExpression \? evaluateFieldExpression/);
  assert.match(src,/p\.descriptionExpression \? evaluateFieldExpression/);
  assert.match(src,/p\.imageExpression \? evaluateFieldExpression/);
  assert.match(src,/r\?\.\[badgeField\]/);
});
