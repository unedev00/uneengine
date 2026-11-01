import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');

test('all free-canvas components clip or scroll inside saved geometry without clipping resize handles', () => {
 const builder=src('core/builders/PageBuilder/pageBuilderView.tsx');
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
 assert.match(cart,/width:100%;height:100%;min-height:0;padding:8px;overflow:auto/);
 assert.match(grid,/gridAutoRows:"max\("/);
});

test('existing appearance selectors still work when the canvas adds a viewport',()=>{
 const appearance=src('pages/TemplatePageRuntime/pageComponentAppearance.css');
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
