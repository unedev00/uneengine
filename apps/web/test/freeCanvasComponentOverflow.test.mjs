import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');

test('all free-canvas components clip or scroll inside saved geometry without clipping resize handles', () => {
 const builder=src('core/builders/PageBuilder/editor/canvas/createPageCanvasRenderer.tsx');
 const handles=src('core/builders/PageBuilder/SmartCanvasHandles.css');
 assert.match(builder,/const ContentHost = page\.layoutMode === 'free-canvas' && !nested && !libraryPreview \? 'div' : React\.Fragment/);
 assert.match(builder,/<ContentHost \{\.\.\.contentHostProps\}>/);
 assert.match(builder,/<\/ContentHost>/);
 assert.match(handles,/\.free-canvas-component\.selected\{overflow:visible!important\}/);
 assert.match(handles,/\.free-canvas-component > \.free-canvas-content-viewport\{/);
 assert.match(handles,/position:absolute;inset:0;width:100%;height:100%/);
 assert.match(handles,/overflow:auto;overscroll-behavior:contain/);
});

test('Smart Card Grid, Cart and other scrolling Smart components remain bounded', () => {
 const smart=src('component-libraries/smart/shared/smart.css');
 const cart=src('component-libraries/smart_cart/SmartComponent.css');
 const grid=src('component-libraries/smart/shared/SmartRuntime.jsx');
 assert.match(smart,/\.smart-runtime\.smart_card_grid>\.smart-grid/);
 assert.match(smart,/overflow:auto!important/);
 assert.match(smart,/\.smart-runtime\.smart_cart > \.smart-cart-root\{overflow:auto\}/);
 assert.match(cart,/width:100%;height:100%;min-height:0;padding:8px 8px 3px;overflow:auto/);
 assert.match(grid,/gridAutoRows:"max\("/);
});

test('existing appearance selectors still work when the canvas adds a viewport',()=>{
 const appearance=src('core/pages/TemplatePageRuntime/pageComponentAppearance.css');
 for(const target of ['record-detail-grid','record-fields-card','page-nested-layout','fake-tabs']){
  assert.ok(appearance.includes('> .free-canvas-content-viewport > .'+target),target+' is styled through viewport');
 }
});

test('floating actions use the visible portion of tall or scrolled components',()=>{
 const floating=src('core/builders/PageBuilder/CanvasFloatingActions.tsx');
 assert.match(floating,/const visibleTop=Math\.max\(target\.top,visible\.top\)/);
 assert.match(floating,/const visibleBottom=Math\.min\(target\.bottom,visible\.bottom\)/);
 assert.match(floating,/visibleTop\+12/);
});

test('native scroll controls remain usable without moving the page component',()=>{
 const css=src('core/builders/PageBuilder/sections/01-page-builder.css');
 const builder=src('core/builders/PageBuilder/editor/canvas/createPageCanvasRenderer.tsx');
 const workspace=src('core/workspace/WorkspaceTheme/sections/07-workspace.css');
 assert.match(css,/free-canvas-content-viewport > \.canvas-design-interaction-shield/);
 assert.match(css,/\.smart-grid,\.smart-cart-root,\.smart-tabs-shell,\.smart-calendar,\.smart-navigation/);
 assert.match(css,/canvas-design-interaction-shield\{pointer-events:none;\}/);
 assert.match(builder,/canvasScrollbarHit\(target,event\.clientX,event\.clientY,event\.currentTarget\)/);
 assert.match(builder,/event\.pointerType==='touch'/);
 assert.doesNotMatch(builder,/component\.type==='Custom:smart_cart'&&target\.closest/);
 const scrollLogic=src('core/builders/PageBuilder/canvasPointerInteractions.ts');
 assert.match(scrollLogic,/canvasScrollbarRailHit/);
 assert.match(scrollLogic,/while\(node&&node!==container\)/);
 assert.match(workspace,/layout-container-component > \.free-canvas-content-viewport > \.registered-component/);
});


test('Smart Cart preview has no footer note and totals sit 3px above the inner bottom edge',()=>{
 const cart=src('component-libraries/smart_cart/SmartComponent.css');
 const renderer=src('component-libraries/smart_cart/SmartCart.jsx');
 assert.match(cart,/\.smart-cart-root\{[^}]*padding:8px 8px 3px;overflow:auto\}/);
 assert.doesNotMatch(cart,/\.smart-cart-preview-note\{/);
 assert.doesNotMatch(renderer,/smart-cart-preview-note|Visual preview — totals and actions are configured separately/);
});
