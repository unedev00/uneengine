import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import SchemaBuilder from '../src/core/builders/SchemaBuilder/SchemaBuilder';
import type {ObjectMetadata} from '../src/core/metadata/Definitions/metadata';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const builder=read('../src/core/builders/SharedBuilderFrame/adaptiveBuilder.css');
const schemaCss=read('../src/core/builders/SchemaBuilder/schemaBuilderUsability.css');
const till=read('../../../acetill/src/acetill-terminal.css');
const kiosk=read('../../../acekiosk/src/acekiosk.css');
const assist=read('../../../aceassist/src/aceassist.css');
const chat=read('../../../acechatter/src/aceChatter.css');
const visual=read('../../../acetill/src/acetill-visual-editor.css');

test('shared Builder layout is editor-only and loaded from optional modules',()=>{
 for(const name of ['PageBuilder/pageBuilderView.tsx','FlowBuilder/FlowBuilder.tsx',
  'DashboardBuilder/DashboardBuilder.tsx','ReportBuilder/reportBuilderView.tsx',
  'ObjectManager/objectManagerView.tsx']){
  const source=read('../src/core/builders/'+name);
  assert.match(source,/adaptiveBuilder\.css/,name);
 }
 assert.match(builder,/Builder EDITOR chrome only/);
 assert.match(builder,/\.builder-page \.properties-panel/);
 assert.match(builder,/\.flow-builder \.flow-settings/);
 assert.match(builder,/\.dashboard-builder-layout \.dashboard-properties/);
 assert.match(builder,/\.report-builder-layout \.report-fields-panel/);
 assert.match(builder,/\.md-object-editor-split/);
 assert.doesNotMatch(builder,/\.free-canvas-component|\.page-runtime-component/);
});

test('Schema Builder renders accessible scrollable canvas and responsive search/editor',()=>{
 const objects=[{apiName:'Account',label:'Account',kind:'Standard Object',fields:[]}] as unknown as ObjectMetadata[];
 const html=renderToStaticMarkup(createElement(SchemaBuilder,{
  objects,selectedObjectApiName:'Account',
  onOpenObject:()=>{},onOpenField:()=>{},onCreateObject:()=>{},onNewField:()=>{}
 }));
 assert.match(html,/aria-label="Scrollable object relationship diagram" tabIndex="0"/);
 assert.match(html,/md-schema-toolbar/);
 assert.match(html,/md-schema-relation-grid/);
 assert.match(html,/aria-label="Schema diagram zoom controls"/);
 assert.match(schemaCss,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(schemaCss,/@media\(max-width:700px\)/);
});

test('ACE apps retain independent brand tokens, real navigation and bounded modal sizes',()=>{
 for(const [name,css,root] of [
  ['Till',till,'.acetill-terminal'],['Kiosk',kiosk,'.ak-shell'],
  ['Assist',assist,'.custom-aceassist'],['Chatter',chat,'.ace-chat']
 ] as const){
  assert.match(css,/Phase 3/,name);
  assert.ok(css.includes(root),name+' root missing');
  assert.match(css,/@media\(max-width:/,name+' responsive breakpoint missing');
  assert.match(css,/:focus-visible/,name+' keyboard focus missing');
  assert.match(css,/prefers-reduced-motion/,name+' reduced-motion missing');
 }
 assert.match(till,/\.acetill-terminal \.acetill-checkout/);
 assert.match(till,/\.acetill-terminal \.acetill-product-grid/);
 assert.match(till,/\.acetill-payment-buttons/);
 assert.match(kiosk,/\.ak-shell \.ak-orderline/);
 assert.match(kiosk,/\.ak-shell \.ak-modal-backdrop/);
 assert.match(assist,/\.assist-document-header-fields/);
 assert.match(chat,/\.ace-chat-conversation-meta/);
 assert.match(visual,/live tenant-rendered till/);
});

test('Kiosk category/payment controls and quantity affordances expose selection state',()=>{
 const source=read('../../../acekiosk/src/AceKiosk.tsx');
 assert.match(source,/aria-pressed=\{c===category\}/);
 assert.match(source,/aria-pressed=\{subcategory===c\}/);
 assert.match(source,/aria-pressed=\{paymentMethod==='Cash'\}/);
 assert.match(source,/aria-pressed=\{paymentMethod==='Card'\}/);
 assert.match(source,/aria-label=\{'Remove one '\+l\.product\.name\}/);
 assert.match(source,/aria-label="Basket and checkout actions"/);
 assert.match(source,/aria-label="Menu products"/);
 const modal=read('../../../acekiosk/src/ProductCustomiser.tsx');
 assert.match(modal,/aria-modal="true"/);
 assert.match(modal,/event\.key==='Escape'/);
});

test('Till payment, cart and Chatter selection have keyboard and screen-reader semantics',()=>{
 const terminal=read('../../../acetill/src/AcetillTerminal.tsx');
 assert.match(terminal,/paymentDialogRef/);
 assert.match(terminal,/event\.key==='Escape'/);
 assert.match(terminal,/document\.addEventListener\('keydown',onKey\)/);
 assert.match(terminal,/aria-label="Current order items"/);
 assert.match(terminal,/aria-label="Payment method"/);
 const chatter=read('../../../acechatter/src/AceChatterRuntime.tsx');
 assert.match(chatter,/aria-current=\{selected===rowId\?'true':undefined\}/);
 assert.match(chatter,/newChatDialogRef/);
 assert.match(chatter,/event\.key==='Escape'/);
});

test('No Builder chrome changes enter the published Page Runtime',()=>{
 const entry=read('../src/core/builders/Entries/optionalBuilderEntries.ts');
 assert.match(entry,/Published pages, flows and dashboards must continue/);
 const main=read('../src/main.tsx');
 assert.doesNotMatch(main,/adaptiveBuilder\.css|schemaBuilderUsability\.css/);
 const builderEntry=read('../src/core/builders/ObjectManager/objectManagerView.tsx');
 assert.match(builderEntry,/schemaBuilderUsability\.css/);
});
