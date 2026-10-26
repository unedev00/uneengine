import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Setup shortcut cards reserve the full icon column and responsive text area',()=>{
 const styles=read('src/core/workspace/WorkspaceTheme/styles.css');
 const polish=read('src/core/workspace/WorkspaceTheme/applicationPolish.css');
 assert.match(styles,/\.shortcut-card\s*\{[^}]*grid-template-columns:50px minmax\(0,1fr\) 18px/s);
 assert.match(styles,/\.shortcut-icon\s*\{[^}]*width:50px/);
 assert.match(styles,/\.shortcut-title\s*\{[^}]*grid-column:2/);
 assert.match(styles,/\.shortcut-description\s*\{[^}]*grid-column:2/);
 assert.match(polish,/\.lightning \.shortcut-grid\{grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,240px\),1fr\)\)/);
 assert.doesNotMatch(polish,/\.lightning \.shortcut-icon\{width:50px/,'Icon geometry must have one owner');
 assert.match(styles,/prefers-color-scheme: dark/);
 assert.match(styles,/#8cc5ff/,'Dark-mode links must meet readable contrast');
});

test('Setup resources have working controls and security events have honest status',()=>{
 const home=read('src/core/settings/SetupHome/setupHomeView.tsx');
 const shell=read('src/core/workspace/SetupShell/setupShellPresentation.tsx');
 assert.match(home,/onClick=\{\(\)=>setHelpOpen\(open=>!open\)\}/);
 assert.match(home,/onClick=\{onShowShortcuts\}/);
 assert.match(shell,/onShowShortcuts=\{\(\)=>setShortcutHelpOpen\(true\)\}/);
 assert.match(home,/failed\|denied\|blocked\|rejected/);
 assert.match(home,/<AlertCircle size=\{16\}\/>/);
 assert.doesNotMatch(home,/<button className="resource-row">/);
});

test('Preview chrome is not interactive and search suggestions support touch clicks',()=>{
 const builder=read('src/core/builders/PageBuilder/pageBuilderView.tsx');
 const search=read('src/one/OneSearch/OneSearch.jsx');
 assert.doesNotMatch(builder,/<button className="btn">Follow<\/button>/);
 assert.doesNotMatch(builder,/aria-label="More record actions"/);
 assert.match(search,/onClick=\{\(\)=>choose\(option\)\}/);
});

test('published ONE controls have no unbound dummy actions or placeholders',()=>{
 const button=read('src/one/OneButton/OneButton.jsx');
 const textComponent=read('src/one/OneText/OneText.jsx');
 const badge=read('src/one/OneBadge/OneBadge.jsx');
 const appearance=read('src/one/shared/componentAppearance.js');
 const native=read('src/core/components/RegisteredComponent/registeredComponentAppearance.ts');
 const css=read('src/core/pages/TemplatePageRuntime/pageComponentAppearance.css');
 assert.match(button,/p\.actionFlows\?\.click/);
 assert.match(button,/disabled=\{disabled\}/);
 assert.match(textComponent,/p\.builderPreview === true/);
 assert.match(badge,/p\.builderPreview === true/);
 assert.doesNotMatch(appearance,/#3176cc/);
 assert.doesNotMatch(native,/style\.borderWidth=border/);
 assert.doesNotMatch(css,/\[data-page-appearance="tabs"\]\[data-page-style~="[^"]+"\] \.registered-component \.one-tab,/);
});

test('Ace Assist navigation follows tenant App Manager metadata without exposing invoice lines',async()=>{
 const {resolveAssistTabs}=await import('../../aceassist/src/assistNavigation.mjs');
 const objects=['Appointment','Invoice','Customer','Quotation','InvoiceLine'].map(apiName=>({apiName,label:apiName}));
 const app={navigationOrder:[{type:'Object',apiName:'Customer'},{type:'Object',apiName:'InvoiceLine'},{type:'Object',apiName:'Appointment'}]};
 assert.deepEqual(resolveAssistTabs(app,objects).map(x=>x.object),['Customer','Appointment']);
 assert.deepEqual(resolveAssistTabs({navigationItems:['Invoice']},objects).map(x=>x.object),['Invoice']);
 assert.ok(resolveAssistTabs(null,objects).some(x=>x.object==='Appointment'));
 const seed=readFileSync(new URL('../../server/src/app-seeders/aceassist-app.ts',import.meta.url),'utf8');
 assert.match(seed,/if\(created\.length\)for\(const \[index,objectApi\]/);
 assert.match(seed,/md_tenant_app_navigation/);
 const runtime=readFileSync(new URL('../../aceassist/src/AceAssistRuntime.tsx',import.meta.url),'utf8');
 assert.match(runtime,/resolveAssistTabs\(appNavigation,objects\)/);
 assert.match(runtime,/\/metadata\/apps/);
});
