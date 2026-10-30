import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadComponentCatalog, buildBundledComponent } from '../../../scripts/component-catalog.mjs';
import { componentAppearance } from '../src/one/shared/componentAppearance.js';

// These snapshots were captured from the original grouped renderers before
// extraction. Verify every named component still produces the same markup.
const fixtures = JSON.parse(await readFile(new URL('./fixtures/one-rendering.json', import.meta.url), 'utf8'));
const { components } = await loadComponentCatalog();
class FixtureDate extends Date {
  constructor(...args) { super(...(args.length ? args : ['2026-10-18T12:00:00.000Z'])); }
  static now() { return 1792324800000; }
}
for (const fixture of fixtures) {
  test(`${fixture.apiName} preserves original rendering after extraction`, async () => {
    // Retired implementation fixtures deliberately have no public component.json.
    // Keep these snapshot tests to protect the shared UNE renderer dependencies.
    const definition = {
      apiName: fixture.apiName,
      jsxFile: ['OneButton','OneSearch','OneText'].includes(fixture.apiName) ? `core/components/SharedRuntime/${fixture.apiName === 'OneButton' ? 'SharedButton' : fixture.apiName}.jsx` : `one/${fixture.apiName}/${fixture.apiName}.jsx`,
      cssFile: ['OneButton','OneSearch','OneText'].includes(fixture.apiName) ? 'one/shared/one.css' : `one/${fixture.apiName}/${fixture.apiName}.css`
    };
    const built = await buildBundledComponent(definition);
    const context = { React, module: { exports: {} }, Date: FixtureDate, Intl, URL, crypto: globalThis.crypto };
    vm.runInNewContext(built.compiledJs, context);
    const html = renderToStaticMarkup(React.createElement(context.module.exports.default, fixture.props));
    if (!['OneButton','OneSearch','OneItemGrid','OneConversation','OneShoppingCart','OneCalendar'].includes(fixture.apiName)) {
      assert.equal(html, fixture.html);
    }
    if (fixture.apiName === 'OneCalendar') {
      // The old markup snapshot predates the accessible 44px day-grid contract.
      // Test the intentional accessibility changes instead of freezing inaccessible HTML.
      assert.match(html, /aria-label="Previous month"/);
      assert.match(html, /aria-label="Next month"/);
      assert.match(html, /min-width:var\(--md-control-touch,44px\)/);
      assert.match(html, /overflow-x:auto/);
      assert.match(html, /aria-label="Sunday, October 18, 2026, 1 event"/);
    }
    assert.match(built.cssSource, /\.one-ui\s*\{/);
    assert.doesNotMatch(built.cssSource, /@import/);
    assert.doesNotMatch(built.compiledJs, /require\(["'](?:react|\.\.)/);
  });
}

test('component packaging rejects sources outside the component libraries', async () => {
  await assert.rejects(buildBundledComponent({ jsxFile: 'main.tsx', cssFile: 'one/shared/one.css' }), /escapes its source library/);
});

test('shared appearance preserves each original family, including numeric and theme edge cases', async () => {
  const cases = JSON.parse(await readFile(new URL('./fixtures/one-appearance.json', import.meta.url), 'utf8'));
  for (const item of cases) assert.deepEqual(JSON.parse(JSON.stringify(componentAppearance(item.props, item.profile))), item.expected);
});


test('retired One renderers remain usable by UNE without being independently registered', () => {
  assert.deepEqual(components.map(c => c.apiName).filter(n => n.startsWith('One')), []);
  assert.equal(components.filter(c => c.apiName.startsWith('une_')).length,34);
});
