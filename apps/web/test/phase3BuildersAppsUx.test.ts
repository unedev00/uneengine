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
 assert.doesNotMatch(builder,/\:is\(button,summary\)\{color:inherit\}/,'Primary button text must retain its own contrasting colour');
});

test('Schema Builder renders accessible scrollable canvas and responsive search/editor',()=>{
 const objects=[{apiName:'Account',label:'Account',kind:'Standard Object',fields:[]}] as unknown as ObjectMetadata[];
 const html=renderToStaticMarkup(createElement(SchemaBuilder,{
  objects,selectedObjectApiName:'Account',
  onOpenObject:()=>{},onOpenField:()=>{},onCreateObject:()=>{},onNewField:()=>{}
 }));
 assert.match(html,/aria-label="Scrollable object relationship diagram" tabindex="0"/);
 assert.match(html,/md-schema-toolbar/);
 assert.match(html,/md-schema-relation-grid/);
 assert.match(html,/aria-label="Schema diagram zoom controls"/);
 assert.match(schemaCss,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(schemaCss,/@media\(max-width:700px\)/);
});

test('No Builder chrome changes enter the published Page Runtime',()=>{
 const entry=read('../src/core/builders/Entries/optionalBuilderEntries.ts');
 assert.match(entry,/Published pages, flows and dashboards must continue/);
 const main=read('../src/main.tsx');
 assert.doesNotMatch(main,/adaptiveBuilder\.css|schemaBuilderUsability\.css/);
 const builderEntry=read('../src/core/builders/ObjectManager/objectManagerView.tsx');
 assert.match(builderEntry,/schemaBuilderUsability\.css/);
});
