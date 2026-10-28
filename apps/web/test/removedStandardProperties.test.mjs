import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/core/builders/PageBuilder/pageBuilderView.tsx',import.meta.url),'utf8');
test('legacy standard component property panels are not rendered in Page Builder',()=>{
 for(const name of ['Highlights Panel','Rich Text','List View','Path','Screen Flow','Related List','Tabs','Report Chart','Field Section']){
  assert.doesNotMatch(source,new RegExp("selected\\.type === '"+name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+"' && <>"),name);
 }
 for(const id of ['field-section-columns','page-component-tabs','page-component-report','record-field-selection'])
  assert.ok(!source.includes('id="'+id+'"'),id);
 assert.ok(!source.includes('builder-highlights-settings'));
 assert.ok(!source.includes('builder-path-settings'));
 assert.ok(!source.includes('builder-related-list-settings'));
});
test('published runtime references remain present',()=>{
 assert.match(source,/component\.properties\.dashboardApiName/);
 assert.match(source,/component\.properties\.listObjectApiName/);
});
