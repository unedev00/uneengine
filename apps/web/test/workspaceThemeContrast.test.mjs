import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path,import.meta.url),'utf8');
const baseline=read('../src/core/workspace/WorkspaceTheme/workspaceContrastBaseline.css');
const workspace=read('../src/core/workspace/WorkspaceTheme/sections/07-workspace.css');
const toolbar=read('../src/core/records/RecordWorkspace/recordsListToolbar.css');
const emptyState=read('../src/core/workspace/WorkspaceTheme/sections/08-workspace.css');
const startup=read('../src/main.tsx');
const apple=read('../src/core/workspace/WorkspaceTheme/appleTheme.css');

test('shared appearance baseline loads with authenticated workspace, not public bundle',()=>{
  const workspaceStart=startup.indexOf('const Workspace = lazy(async () => {');
  const workspaceEnd=startup.indexOf('return import(',workspaceStart);
  const importIndex=startup.indexOf("await import('./core/workspace/WorkspaceTheme/workspaceContrastBaseline.css');");
  assert.ok(importIndex>workspaceStart && importIndex<workspaceEnd);
  assert.match(baseline,/never override tenant-authored Page Runtime/);
  assert.match(baseline,/\.lightning :is\(/);
  assert.doesNotMatch(baseline, /!important/);
});
test('record switcher, options, global search and row actions retain contrasting semantic surfaces',()=>{
  for(const selector of ['.header-record-picker-control','.header-record-picker-options',
    '.global-record-search-results','.header-list-search']){
    assert.ok(workspace.includes(selector),selector);
  }
  assert.match(workspace,/\.header-record-picker-control input[^\n]*color:var\(--md-text/);
  assert.match(workspace,/\.header-record-picker-options button \{[\s\S]*?color:var\(--md-text/);
  assert.match(workspace,/\.global-record-search-results > button \{[\s\S]*?background:var\(--md-surface/);
  assert.match(toolbar,/\.records-layout-switcher button\.active \{ background:var\(--md-surface/);
  assert.match(toolbar,/\.records-tool-count[\s\S]*?color:var\(--md-action-ink/);
});
test('record empty-state button no longer stretches away from its label',()=>{
  assert.match(emptyState,/\.records-empty-action \{ display:flex; flex-direction:column; align-items:flex-start; justify-content:flex-start; gap:10px; min-height:0;/);
  assert.match(baseline,/\.records-list-card > \.records-empty-action/);
  assert.match(toolbar,/row-gap:10px;/);
});
test('light/dark visual tokens include readable primary and secondary text',()=>{
  assert.match(apple,/--md-text: #f5f5f7/);
  assert.match(apple,/--md-text-2: #c2c2c8/);
  assert.match(apple,/--md-text: #1d1d1f/);
  assert.match(apple,/--md-action-ink:#9acaff/);
  const toRgb = hex => hex.slice(1).match(/../g).map(v=>parseInt(v,16));
  const channel = c => { const n=c/255; return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4; };
  const luminosity = h => toRgb(h).map(channel).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const ratio=(a,b)=>{const [h,l]=[luminosity(a),luminosity(b)].sort((x,y)=>y-x);return (h+.05)/(l+.05);};
  for(const [fg,bg] of [
    ['#f5f5f7','#2c2c2e'],['#c2c2c8','#2c2c2e'],
    ['#1d1d1f','#ffffff'],['#5c5c63','#ffffff'],
    ['#9acaff','#2c2c2e'],['#ffffff','#0054aa']]){
    assert.ok(ratio(fg,bg)>=4.5,`${fg} on ${bg}: ${ratio(fg,bg).toFixed(2)}`);
  }
});
test('ACE themes remain app-scoped and never overridden by the global admin stylesheet',()=>{
  for(const cls of ['.ak-shell','.acetill-terminal','.custom-aceassist','.ace-chat']){
    assert.ok(!baseline.includes(cls),cls+' must retain its own theme contract');
  }
  for(const path of ['../../acekiosk/src/acekiosk.css','../../acetill/src/acetill-terminal.css',
    '../../aceassist/src/aceassist.css','../../acechatter/src/aceChatter.css']){
    const css=read(path);
    assert.match(css,/--md-surface/);
    assert.match(css,/--md-text/);
  }
});
