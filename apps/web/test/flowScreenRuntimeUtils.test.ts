import assert from 'node:assert/strict';
import test from 'node:test';
import { screenFieldIsVisible } from '../src/core/automation/FlowScreen/flowScreenRuntimeUtils';

function visible(operator: string, actual: unknown, value: unknown): boolean {
  return screenFieldIsVisible({
    visibilityConditions: [{ field: 'Controller', operator, value }]
  }, { Controller: actual });
}

test('screen visibility supports numeric comparisons from Flow number inputs', () => {
  assert.equal(visible('Greater Than', 10, '9'), true);
  assert.equal(visible('Greater Than or Equal To', '10', 10), true);
  assert.equal(visible('Less Than', 9, '10'), true);
  assert.equal(visible('Less Than or Equal To', '10', 10), true);
  assert.equal(visible('Greater Than', '', 0), false);
  assert.equal(visible('Less Than', 'not-a-number', 2), false);
});

test('screen visibility compares valid ISO dates chronologically and rejects invalid dates', () => {
  assert.equal(visible('Greater Than', '2026-10-29', '2026-10-28'), true);
  assert.equal(visible('Less Than or Equal To', '2026-10-28T12:30', '2026-10-28T12:30'), true);
  assert.equal(visible('Greater Than', '2026-02-30', '2026-02-28'), false);
});

test('screen visibility supports negative string and multi-select membership checks', () => {
  assert.equal(visible('Does Not Equal', 'Retail', 'Wholesale'), true);
  assert.equal(visible('Does Not Contain', 'north-region', 'south'), true);
  assert.equal(visible('Includes', ['Sales', 'Service'], 'Service'), true);
  assert.equal(visible('Includes', 'Sales;Service', 'Service'), true);
  assert.equal(visible('Includes', ['Sales'], 'Service'), false);
});

test('screen visibility keeps all/any behavior and fails closed on unknown operators', () => {
  const field = {
    visibilityLogic: 'Any',
    visibilityConditions: [
      { field: 'Quantity', operator: 'Greater Than', value: 5 },
      { field: 'Status', operator: 'Unknown Operator', value: 'Open' }
    ]
  };
  assert.equal(screenFieldIsVisible(field, { Quantity: 6, Status: 'Open' }), true);
  assert.equal(screenFieldIsVisible({ ...field, visibilityLogic: 'All' }, {
    Quantity: 6, Status: 'Open'
  }), false);
});

test('empty arrays count as null for multi-select screen controls', () => {
  assert.equal(visible('Is Null', [], ''), true);
  assert.equal(visible('Is Not Null', ['Sales'], ''), true);
});
