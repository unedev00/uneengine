import { readPageBuilderModules } from './helpers/builderSources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('View exposes the visibility rule filter dialog without a duplicate Logic ribbon editor',()=>{
 const view=readPageBuilderModules();
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
 const view=readPageBuilderModules();
 assert.match(view,/onClick=\{\(\) => selectRibbonTab\('Component Design 2'\)\} title="Edit block"/);
 assert.match(view,/onClick=\{\(\) => selectRibbonTab\('Component Layout'\)\} title="Position and size"/);
 assert.match(view,/onClick=\{\(\) => selectRibbonTab\('Component Layout'\)\}>Align and position/);
 assert.match(view,/onClick=\{\(\) => selectRibbonTab\('Component Data'\)\}>Data, links and actions/);
 assert.match(view,/style=\{ribbonTab !== 'Component Layout' && ribbonTab !== 'Advanced' && !ribbonTab\.startsWith\('Component '\)/);
});

test('Smart Insert differentiates button/navigation, container/icon, and input/toggle',()=>{
 const view=read('../src/core/builders/PageBuilder/editor/ribbon/usePagePalette.tsx');
 assert.match(view,/case 'Custom:smart_navigation':return <Menu/);
 assert.match(view,/case 'Custom:smart_container':return <Layers3/);
 assert.match(view,/case 'Custom:smart_icon':return <Star/);
 assert.match(view,/case 'Custom:smart_toggle':return <ToggleRight/);
 assert.ok(view.includes('return <MousePointer2 size={15} />'));
 assert.ok(view.includes('return <FormInput size={15} />'));
});

test('Shared canvas popup has legible enabled and disabled text across all pages',()=>{
 const css=read('../src/core/builders/PageBuilder/sections/01-page-builder.css');
 const view=readPageBuilderModules();
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

test('Filter Records has viewport-aware height without resizing the visibility dialog',()=>{
 const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
 const css=read('../src/core/builders/PageBuilder/SmartRibbon.css');
 assert.match(ribbon,/smart-dialog smart-filter-dialog smart-record-filter-dialog/);
 assert.match(css,/\.smart-filter-backdrop \.smart-dialog\.smart-record-filter-dialog\s*\{[^}]*height:min\(72dvh,720px\)/);
 assert.match(css,/\.smart-filter-backdrop \.smart-record-filter-dialog \.smart-filter-dialog-body\s*\{[^}]*flex:1 1 auto/);
});

test('Shared filter field options escape the scroll container but remain anchored and dismissible',()=>{
 const editor=read('../src/component-libraries/shared/primitives/RecordFilterEditor/RecordFilterEditor.tsx');
 const css=read('../src/component-libraries/shared/primitives/RecordFilterEditor/RecordFilterEditor.css');
 assert.match(editor,/createPortal\(<div ref=\{dropdownRef\} className="metadata-filter-field-dropdown"/);
 assert.match(editor,/window\.addEventListener\('scroll', positionDropdown, true\)/);
 assert.match(editor,/dropdownRef\.current\?\.contains\(target\)/);
 assert.match(editor,/dropdownRef\.current\?\.contains\(next\)/);
 assert.match(editor,/const placeAbove = below < 260 && above > below/);
 assert.match(css,/\.metadata-filter-field-dropdown\{position:fixed;z-index:2147483001/);
 assert.match(css,/\.metadata-filter-field-options\{flex:1 1 auto;min-height:0;max-height:205px;overflow-y:auto/);
});
