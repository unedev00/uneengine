import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');
const sql=read('../../server/src/system-support/migrations/20270305-smart-tabs-default-index-ribbon.sql');
const ribbon=read('../src/core/builders/PageBuilder/SmartRibbon.tsx');
const css=read('../src/core/builders/PageBuilder/SmartRibbonApprovedThreeRow.css');
const runtime=read('../src/component-libraries/smart/shared/SmartRuntime.jsx');

test('Tab Index is a reusable SQL metadata property enabled only for Smart Tabs',()=>{
 assert.match(sql,/INSERT INTO md_builder_shared_properties/);
 assert.match(sql,/'tabIndex','Tab Index','Layout','Tabs','number'/);
 assert.match(sql,/'0'::jsonb,0,20/);
 assert.match(sql,/VALUES \('smart_tabs','tabIndex',true,NULL,NULL,NULL,NULL\)/);
 assert.doesNotMatch(sql,/UPDATE md_page_components|DELETE FROM md_/i);
});

test('Layout Tabs slots have stable sizes, rows and no duplicate positions',()=>{
 assert.match(sql,/VALUES \('tabWidth',1,1\),\('tabHeight',1,2\),\('tabCount',3,1\)/);
 assert.match(sql,/design_row=2,design_order=1/);
 assert.match(sql,/design_width=30,design_height=26,design_caption='Tab Index'/);
 assert.match(sql,/design_caption_width=45/);
 assert.match(sql,/design_width=58,design_height=26/);
 assert.match(ribbon,/if\(p\.id==='tabIndex'\)return p\.designWidth\?\?30/);
 assert.match(ribbon,/step=\{isTabIndex\?1:undefined\}/);
 assert.match(css,/data-property="tabIndex"/);
});

test('Configured selection drives display and safe state initialisation',()=>{
 assert.match(runtime,/configuredTabIndex=Number\.isInteger\(Number\(p\.tabIndex\)\)/);
 assert.match(runtime,/indexForSelection>=0\?indexForSelection:defaultTabIndex/);
 assert.match(runtime,/selectTab\(defaultTabIndex\)/);
 assert.match(runtime,/changeAction\.actionType!=="PageState"/);
 assert.match(runtime,/autoSelected\.current===key/);
});
