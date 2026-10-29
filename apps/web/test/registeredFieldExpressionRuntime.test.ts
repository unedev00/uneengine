import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveFieldText,resolveRegisteredTextProperties} from '../src/core/components/RegisteredComponent/fieldExpressionRuntime';

test('registered components resolve authorised record fields without executing code',()=>{
  const record={Name:'Tea',Price:2.5,Currency:'£'};
  assert.equal(resolveFieldText('@Name',record),'Tea');
  assert.equal(resolveFieldText('@Currency & " " & @Price',record),'£ 2.5');
  assert.equal(resolveFieldText('@Currency  &  " "  &  @Name',record),'£ Tea');
  assert.equal(resolveFieldText('"Hello " & @Name',record),'Hello Tea');
  assert.equal(resolveFieldText('@Missing',record),'');
  assert.equal(resolveFieldText('@Name.constructor',record),'');
  assert.equal(resolveFieldText('@Name & alert(1)',record),'');
  assert.equal(resolveFieldText('contact@example.com',record),'contact@example.com');
});

test('text-only metadata substitution leaves layouts and original properties unchanged',()=>{
  const input={record:{Name:'Tea'},text:'@Name',title:'@Name',width:'@Name',value:42};
  input.text='"Hello " & @Name';
  const definitions=[{propertyKey:'text',kind:'TEXT'},{propertyKey:'title',kind:'STRING'},{propertyKey:'width',kind:'NUMBER'}];
  const resolved=resolveRegisteredTextProperties(definitions,input);
  assert.equal(resolved.text,'Hello Tea');
  assert.equal(resolved.title,'Tea');
  assert.equal(resolved.width,'@Name');
  assert.equal(input.text,'"Hello " & @Name');
  assert.strictEqual(resolved.record,input.record);
  assert.strictEqual(resolveRegisteredTextProperties(definitions,{text:'"Hello " & @Name'}).text,'"Hello " & @Name');
});
