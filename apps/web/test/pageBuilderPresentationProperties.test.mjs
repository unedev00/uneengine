import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  groupedPresentationProperties, isPresentationProperty, presentationValue
} from '../src/core/builders/ComponentProperties/presentationPropertyModel.mjs';

const component = name => JSON.parse(readFileSync(
  fileURLToPath(new URL('../src/one/'+name+'/component.json', import.meta.url)), 'utf8'));
const fields = name => groupedPresentationProperties(component(name).propertyDefinitions)
  .flatMap(group => group.definitions.map(definition => definition.propertyKey));

test('new UNE Text can edit its declared Text default in the Editing panel with no binding', () => {
  const text = component('une_text').propertyDefinitions.find(p => p.propertyKey === 'text');
  assert.ok(isPresentationProperty(text));
  assert.equal(presentationValue({libraryComponentId:'une_text'}, text), text.defaultValue);
  assert.ok(fields('une_text').includes('text'));
  assert.ok(fields('une_text').includes('fontSize'));
});

test('UNE Button label and visual variants are available without adding technical settings', () => {
  const names = fields('une_button');
  for (const name of ['label','variant','width','height','radius']) assert.ok(names.includes(name), name);
  assert.ok(!names.includes('actionFlowApiName'));
});

test('data binding, object fields, record collections and action configuration stay out of Editing', () => {
  for (const name of ['une_item_grid', 'une_cart', 'une_repeater', 'une_search']) {
    const names = fields(name);
    for (const key of ['objectApiName', 'items', 'actionFlowApiName','stateReadFlowApiName','titleFieldApiName',
      'priceFieldApiName','searchKey','cartTargetKey']) assert.ok(!names.includes(key), name+': '+key);
  }
  const cart = fields('une_cart');
  for (const name of ['viewMode','basketTitle','currencyCode','emptyBasketText']) assert.ok(cart.includes(name), name);
});

test('reading defaults never mutates or binds the component', () => {
  const original = {libraryComponentId:'une_text'};
  const definition = component('une_text').propertyDefinitions.find(p => p.propertyKey === 'text');
  presentationValue(original, definition);
  assert.deepEqual(original,{libraryComponentId:'une_text'});
  assert.equal(presentationValue({...original,text:'Acetill'},definition),'Acetill');
});
