import test from 'node:test';
import assert from 'node:assert/strict';
import {loadComponentCatalog} from '../../../scripts/component-catalog.mjs';
import {
  groupedPresentationProperties, isPresentationProperty, presentationValue
} from '../src/core/builders/ComponentProperties/presentationPropertyModel.mjs';

const catalog=await loadComponentCatalog();
const component = name => catalog.components.find(component=>component.apiName===name);
const fields = name => groupedPresentationProperties(component(name).propertyDefinitions)
  .flatMap(group => group.definitions.map(definition => definition.propertyKey));

test('new UNE Input can edit its declared Text default in the Editing panel with no binding', () => {
  const text = component('une_input').propertyDefinitions.find(p => p.propertyKey === 'value');
  assert.ok(isPresentationProperty(text));
  assert.equal(presentationValue({libraryComponentId:'une_input'}, text), text.defaultValue);
  assert.ok(fields('une_input').includes('value'));
  assert.ok(fields('une_input').includes('allowTyping'));
});

test('UNE Button label and shared appearance are available without adding technical settings', () => {
  const names = fields('une_button');
  for (const name of ['label','backgroundColor','width','height','radius']) assert.ok(names.includes(name), name);
  assert.ok(!names.includes('actionFlowApiName'));
});

test('data binding, object fields, record collections and action configuration stay out of Editing', () => {
  for (const name of ['une_item_grid', 'une_cart', 'une_repeater', 'une_search']) {
    const names = fields(name);
    for (const key of ['objectApiName', 'items', 'actionFlowApiName','stateReadFlowApiName','titleFieldApiName',
      'priceFieldApiName','searchKey','cartTargetKey']) assert.ok(!names.includes(key), name+': '+key);
  }
  const cart = fields('une_cart');
  for (const name of ['viewMode','basketTitle','currencyCode','emptyBasketText']) assert.ok(!cart.includes(name), name+' stays in the custom app');
});

test('reading defaults never mutates or binds the component', () => {
  const original = {libraryComponentId:'une_input'};
  const definition = component('une_input').propertyDefinitions.find(p => p.propertyKey === 'value');
  presentationValue(original, definition);
  assert.deepEqual(original,{libraryComponentId:'une_input'});
  assert.equal(presentationValue({...original,value:'Acetill'},definition),'Acetill');
});
