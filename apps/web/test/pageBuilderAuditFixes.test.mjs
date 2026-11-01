import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('Logic visibility and rule enablement have separate non-overlapping ribbon rows',()=>{
 const css=read('../src/core/builders/PageBuilder/PageBuilderEightTabRibbon.css');
 assert.match(css,/\.preview-visibility-controls\s*\{[^}]*flex-direction:row!important/);
 assert.match(css,/\.preview-visibility-controls>\.office-ribbon-compact-strip\s*\{[^}]*height:90px!important/);
 assert.match(css,/\.preview-visibility-controls \.office-ribbon-mini-group\s*\{[^}]*max-height:90px!important/);
 assert.match(css,/\.ribbon-logic-rules \.office-ribbon-stack\s*\{[^}]*grid-template-rows:repeat\(2,28px\)/);
 assert.match(css,/#page-builder-tab-content\.office-ribbon-content:has\(>\.preview-visibility-group\)/);
 const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(view,/Visible on this page<\/label>/);
 const editor=read('../src/core/builders/PageBuilder/PageBuilderRibbonEditors.tsx');
 assert.match(editor,/Enable<\/label>/);
});
test('Actions picker has room for the entire label and stays Cart-scoped',()=>{
 const css=read('../src/core/builders/PageBuilder/PageBuilderEightTabRibbon.css');
 assert.match(css,/\.smart-event-actions-ribbon>\.smart-event-group\s*\{[^}]*min-width:270px!important/);
 const events=read('../src/core/builders/PageBuilder/SmartEventActionsRibbon.tsx');
 assert.match(events,/enabled:members\.every\(member=>member==='smart_cart'\)/);
});
test('Smart Button confines overlarge labels and retains full accessible tooltip',()=>{
 const css=read('../src/component-libraries/smart/shared/smart.css');
 const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');
 assert.match(css,/\.smart-runtime\.smart_button>\.smart-button\s*\{[^}]*white-space:nowrap;overflow:hidden;text-overflow:ellipsis/);
 assert.match(runtime,/title=\{label\|\|"Button"\}/);
 assert.match(runtime,/fontSize:number\(p\.textSize,16\)/);
});
