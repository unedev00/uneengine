import { readPageBuilderModules } from './helpers/builderSources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');

test('Smart Button supports compact icon-only sizing on canvas and template layouts', () => {
  const component = JSON.parse(read('component-libraries/smart_button/component.json'));
  const builder = readPageBuilderModules();
  const runtime = read('component-libraries/smart/shared/SmartRuntime.jsx');

  assert.equal(component.resize.minWidth, 32);
  assert.match(builder, /component\.type === 'Custom:smart_button' \? 32/);
  assert.match(builder, /minimumWidth = component\?\.type === 'Custom:smart_button' \? 32 : 80/);
  assert.match(builder, /Math\.max\(minimumWidth, Math\.min\(maximumWidth,/);
  assert.match(runtime, /padding:buttonIcon&&!label\?"4px":undefined/);
});
