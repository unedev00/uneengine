import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPageBuilderModules} from './helpers/builderSources.mjs';
test('active ribbons use shared responsive layouts without legacy override switches',()=>{
 const code=readFileSync(new URL('../src/core/builders/PageBuilder/editor/ribbon/createPageRibbon.tsx',import.meta.url),'utf8');
 const runtime=readPageBuilderModules();
 assert.match(code,/<SmartRibbon/);
 assert.match(code,/<SmartInsertRibbon/);
 assert.doesNotMatch(code,/hideOnDesktop|hideOnTablet|hideOnPhone/);
 assert.match(runtime,/PageBuilderVisibilityDialog/);
});
