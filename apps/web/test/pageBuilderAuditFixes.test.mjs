import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('View exposes the visibility rule filter dialog without a duplicate Logic ribbon editor',()=>{
 const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(view,/ribbonTab==='Preview' && <div className="office-ribbon-group preview-visibility-group"/);
 assert.match(view,/Visible on this page<\/label>/);
 assert.match(view,/aria-label="Edit conditional visibility"/);
 const dialog=read('../src/core/builders/PageBuilder/PageBuilderVisibilityDialog.tsx');
 assert.match(dialog,/smart-dialog smart-filter-dialog/);
 assert.match(view,/<PageBuilderVisibilityDialog/);
 assert.doesNotMatch(view,/ribbonTab==='Logic'/);
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

test('Floating canvas editor commands open the ribbon tabs that actually render those properties',()=>{
 const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(view,/onClick=\{\(\) => selectRibbonTab\('Component Properties'\)\} title="Edit block"/);
 assert.match(view,/onClick=\{\(\) => selectRibbonTab\('Component Layout'\)\} title="Position and size"/);
 assert.match(view,/onClick=\{\(\) => selectRibbonTab\('Component Layout'\)\}>Align and position/);
 assert.match(view,/onClick=\{\(\) => selectRibbonTab\('Component Data'\)\}>Data, links and actions/);
 assert.match(view,/style=\{ribbonTab !== 'Component Layout' && ribbonTab !== 'Advanced' && !ribbonTab\.startsWith\('Component '\)/);
});

test('Smart Insert differentiates button/navigation, container/icon, and input/toggle',()=>{
 const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 assert.match(view,/case 'Custom:smart_navigation':return <Menu/);
 assert.match(view,/case 'Custom:smart_container':return <Layers3/);
 assert.match(view,/case 'Custom:smart_icon':return <Star/);
 assert.match(view,/case 'Custom:smart_toggle':return <ToggleRight/);
 assert.ok(view.includes('return <MousePointer2 size={15} />'));
 assert.ok(view.includes('return <FormInput size={15} />'));
});
