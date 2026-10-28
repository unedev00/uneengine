import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
test('unused legacy Accordion and Dashboard selectors are not shown in component properties',()=>{
 assert.doesNotMatch(source,/page-component-accordion-content/);
 assert.doesNotMatch(source,/page-component-dashboard["']/);
 assert.doesNotMatch(source,/Published dashboard<\/label>/);
});
test('existing authored Accordion content and Dashboard bindings are preserved for runtime compatibility',()=>{
 assert.match(source,/const accordionContent=typeof component\.properties\.content/);
 assert.match(source,/dashboards\.find\(d=>d\.apiName===component\.properties\.dashboardApiName\)/);
});
