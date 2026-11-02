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

test('Shared canvas popup has legible enabled and disabled text across all pages',()=>{
 const css=read('../src/core/builders/PageBuilder/sections/01-page-builder.css');
 const view=read('../src/core/builders/PageBuilder/pageBuilderView.tsx');
 const rule=selector=>{
  const escaped=selector.replace(/[.*+?^$()|[\]{}]/g,'\\$&');
  const block=css.match(new RegExp(escaped+'\\s*\\{([^}]*)\\}'));
  assert.ok(block,'Missing shared menu rule: '+selector);
  return block[1];
 };
 const colour=value=>{
  const chars=value.slice(1);
  const full=chars.length===3?[...chars].map(c=>c+c).join(''):chars;
  return [0,2,4].map(n=>parseInt(full.slice(n,n+2),16)/255)
   .map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 };
 const luminance=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
 const contrast=(one,two)=>{
  const [a,b]=[luminance(colour(one)),luminance(colour(two))].sort((a,b)=>b-a);
  return (a+.05)/(b+.05);
 };
 const ink=rule('.canvas-unified-builder .canvas-action-menu button')
  .match(/(?:^|;)\s*color:(#[0-9a-f]{3,6})\s*;/i)?.[1];
 const disabled=rule('.canvas-unified-builder .canvas-action-menu button:disabled');
 const disabledInk=disabled.match(/(?:^|;)\s*color:(#[0-9a-f]{3,6})\s*;/i)?.[1];
 const disabledBg=disabled.match(/(?:^|;)\s*background:(#[0-9a-f]{3,6})\s*;/i)?.[1];
 assert.ok(ink&&disabledInk&&disabledBg);
 assert.ok(contrast(ink,'#ffffff')>=4.5,'enabled text must meet WCAG AA');
 assert.ok(contrast(disabledInk,disabledBg)>=4.5,'disabled labels must remain legible');
 assert.match(disabled,/\bopacity:1\b/,'disabled actions must not fade the labels');
 assert.match(css,/\.canvas-unified-builder \.canvas-action-menu button:hover:not\(:disabled\)/);
 assert.match(view,/disabled=\{!componentClipboard\}/,'Paste remains gated');
 assert.match(view,/disabled=\{isCanvasLocked\(component\)\}/,'locked actions remain gated');
 assert.match(view,/disabled=\{!canMoveCanvasLayer\(page\.components,component\.id,'front'\)\}/,'layer permissions unchanged');
 assert.doesNotMatch(rule('.canvas-unified-builder .canvas-action-menu button'),/color:inherit/);
});
